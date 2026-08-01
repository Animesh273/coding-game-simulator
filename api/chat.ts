/**
 * Serverless AI proxy.
 *
 * Holds the API key **server-side** so visitors get the mentor without one of
 * their own. This is the only way a static site can offer AI without shipping
 * a spendable credential: anything in a VITE_ variable is readable in the
 * bundle, an env var read here is not.
 *
 * Supports Groq (OpenAI-compatible) and Anthropic, and normalises both into a
 * single plain-text stream so the browser never has to parse two SSE dialects.
 *
 * Configure exactly one of these in Vercel → Settings → Environment Variables:
 *   GROQ_API_KEY       (recommended — generous free tier, very fast)
 *   ANTHROPIC_API_KEY  (higher quality, paid per token)
 */

export const config = { runtime: 'edge' }

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

/**
 * `fast` is used for hints and quick feedback, `quality` for interviews and
 * debriefs. Keeping the mapping server-side means model names never reach the
 * bundle and can be changed without a redeploy of the client.
 */
const GROQ_MODELS = {
  fast: 'llama-3.1-8b-instant',
  quality: 'llama-3.3-70b-versatile',
} as const

const ANTHROPIC_MODELS = {
  fast: 'claude-opus-5',
  quality: 'claude-opus-5',
} as const

/** Hard ceiling regardless of what the client asks for. */
const MAX_TOKENS_CAP = 1500

type Tier = keyof typeof GROQ_MODELS

interface ChatRequest {
  system?: string
  messages?: { role: 'user' | 'assistant'; content: string }[]
  maxTokens?: number
  tier?: Tier
}

function provider(): 'groq' | 'anthropic' | null {
  if (process.env.GROQ_API_KEY) return 'groq'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  return null
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

export default async function handler(req: Request): Promise<Response> {
  const which = provider()

  // Health probe — lets the client discover whether server-side AI exists
  // without burning a request or leaking which key is configured.
  if (req.method === 'GET') {
    return json({ available: which !== null, provider: which }, 200)
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!which) {
    return json(
      { error: 'No AI key is configured on this deployment.', code: 'not_configured' },
      501,
    )
  }

  let body: ChatRequest
  try {
    body = (await req.json()) as ChatRequest
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  if (messages.length === 0) return json({ error: 'messages is required.' }, 400)
  // Bound the conversation so a crafted request cannot run up a large bill.
  if (messages.length > 40) return json({ error: 'Conversation too long.' }, 400)

  const tier: Tier = body.tier === 'quality' ? 'quality' : 'fast'
  const maxTokens = Math.min(Math.max(64, body.maxTokens ?? 600), MAX_TOKENS_CAP)

  try {
    const upstream =
      which === 'groq'
        ? await callGroq(body.system ?? '', messages, maxTokens, tier)
        : await callAnthropic(body.system ?? '', messages, maxTokens, tier)

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '')
      // 429 is the expected failure on Groq's free tier. Surface it distinctly
      // so the client can fall back to the offline coach rather than showing
      // an error the student can do nothing about.
      const code = upstream.status === 429 ? 'rate_limited' : 'upstream_error'
      return json({ error: text.slice(0, 400) || upstream.statusText, code }, upstream.status)
    }

    return new Response(toTextStream(upstream, which), {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-ai-provider': which,
      },
    })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Upstream request failed.' }, 502)
  }
}

/* ------------------------------------------------------------------ groq */

function callGroq(system: string, messages: ChatRequest['messages'], maxTokens: number, tier: Tier) {
  return fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODELS[tier],
      max_tokens: maxTokens,
      stream: true,
      messages: [...(system ? [{ role: 'system', content: system }] : []), ...(messages ?? [])],
    }),
  })
}

/* ------------------------------------------------------------- anthropic */

function callAnthropic(system: string, messages: ChatRequest['messages'], maxTokens: number, tier: Tier) {
  return fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODELS[tier],
      max_tokens: maxTokens,
      stream: true,
      system,
      messages,
      thinking: { type: 'adaptive' },
      output_config: { effort: tier === 'quality' ? 'medium' : 'low' },
    }),
  })
}

/* ------------------------------------------------------ stream normaliser */

/**
 * Both providers stream SSE, but with different envelopes:
 *   Groq (OpenAI):  data: {"choices":[{"delta":{"content":"..."}}]}
 *   Anthropic:      data: {"type":"content_block_delta","delta":{"text":"..."}}
 *
 * Flattening them here means the browser reads plain text either way, and
 * swapping providers needs no client change at all.
 */
function toTextStream(upstream: Response, which: 'groq' | 'anthropic'): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader()
      if (!reader) {
        controller.close()
        return
      }
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // SSE frames are separated by a blank line; keep any partial tail.
          const frames = buffer.split('\n')
          buffer = frames.pop() ?? ''

          for (const line of frames) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (!payload || payload === '[DONE]') continue

            try {
              const parsed = JSON.parse(payload)
              const text =
                which === 'groq'
                  ? parsed?.choices?.[0]?.delta?.content
                  : parsed?.type === 'content_block_delta' && parsed?.delta?.type === 'text_delta'
                    ? parsed.delta.text
                    : undefined
              if (typeof text === 'string' && text.length > 0) {
                controller.enqueue(encoder.encode(text))
              }
            } catch {
              // A partial frame — ignore it; the next chunk completes it.
            }
          }
        }
      } catch {
        // Upstream dropped mid-stream. Close cleanly so the client keeps
        // whatever text already arrived rather than discarding the answer.
      } finally {
        controller.close()
      }
    },
  })
}
