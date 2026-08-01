import Anthropic from '@anthropic-ai/sdk'
import type { ChatTurn } from '../game/types'

/**
 * Claude client for the in-game mentor and interviewer.
 *
 * ── Security note, read this ─────────────────────────────────────────────
 * This calls the Anthropic API directly from the browser, which requires the
 * `dangerouslyAllowBrowser` escape hatch and means the API key is visible to
 * anyone who opens devtools on the page.
 *
 * That is acceptable for the intended use — a student running ASCEND locally
 * with their own key, which never leaves their machine. It is NOT acceptable
 * for a deployed multi-user build. For that, set `proxyUrl` in AI Settings to
 * point at a small backend you control that holds the key server-side and
 * forwards to the Anthropic API; the SDK is configured to honour it via
 * `baseURL`, and `apiKey` can then be a dummy value.
 * ─────────────────────────────────────────────────────────────────────────
 */

const KEY_STORAGE = 'ascend.anthropic.key'
const PROXY_STORAGE = 'ascend.anthropic.proxy'

/**
 * Always the latest and most capable model — the mentor's quality *is* the
 * product here, so this is not a place to economise.
 */
export const MODEL = 'claude-opus-5'

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function setApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim())
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* storage disabled — AI features simply stay off */
  }
}

export function getProxyUrl(): string {
  try {
    return localStorage.getItem(PROXY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function setProxyUrl(url: string): void {
  try {
    if (url) localStorage.setItem(PROXY_STORAGE, url.trim())
    else localStorage.removeItem(PROXY_STORAGE)
  } catch {
    /* ignore */
  }
}

/** True when a key (or a proxy that supplies one) is configured. */
export function isAiConfigured(): boolean {
  return getApiKey().length > 0 || getProxyUrl().length > 0
}

function makeClient(): Anthropic {
  const proxy = getProxyUrl()
  return new Anthropic({
    apiKey: getApiKey() || 'proxied',
    ...(proxy ? { baseURL: proxy } : {}),
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  })
}

export interface StreamOptions {
  system: string
  messages: ChatTurn[]
  /**
   * Lower effort keeps the mentor snappy — it is answering a focused question,
   * not solving a research problem. The interviewer runs at 'medium'.
   *
   * Note we keep adaptive thinking ON and reduce effort rather than disabling
   * thinking: on Opus 5, disabled thinking can leak internal tags into the
   * visible response, and low effort achieves the same latency saving.
   */
  effort?: 'low' | 'medium' | 'high'
  maxTokens?: number
  signal?: AbortSignal
}

export class AiError extends Error {
  constructor(message: string, readonly kind: 'auth' | 'rate' | 'refusal' | 'network' | 'unknown') {
    super(message)
    this.name = 'AiError'
  }
}

/**
 * Streams a response, yielding text deltas as they arrive.
 *
 * Streaming is not a nicety here: watching the mentor type is a large part of
 * why it reads as a character rather than a database lookup.
 */
export async function* streamReply(opts: StreamOptions): AsyncGenerator<string, void, unknown> {
  const client = makeClient()

  let stream
  try {
    stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: opts.maxTokens ?? 1024,
        system: opts.system,
        messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
        thinking: { type: 'adaptive' },
        output_config: { effort: opts.effort ?? 'low' },
        // Opus 5's safety classifiers can decline a request. Server-side
        // fallbacks re-serve it on the recommended model inside the same call
        // rather than leaving the student staring at an error.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { signal: opts.signal },
    )
  } catch (err) {
    throw toAiError(err)
  }

  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
    const final = await stream.finalMessage()
    // Always check stop_reason before trusting content — a refusal returns a
    // successful HTTP 200 with empty or partial content.
    if (final.stop_reason === 'refusal') {
      throw new AiError(
        "I can't help with that one — let's get back to the question in front of you.",
        'refusal',
      )
    }
  } catch (err) {
    if (err instanceof AiError) throw err
    throw toAiError(err)
  }
}

/** Convenience wrapper for callers that only want the finished string. */
export async function completeReply(opts: StreamOptions): Promise<string> {
  let out = ''
  for await (const chunk of streamReply(opts)) out += chunk
  return out
}

function toAiError(err: unknown): AiError {
  if (err instanceof Anthropic.AuthenticationError) {
    return new AiError('That API key was rejected. Check it in AI Settings.', 'auth')
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new AiError('That key does not have access to this model.', 'auth')
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AiError('Rate limited — give it a few seconds and try again.', 'rate')
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AiError('Could not reach the API. Check your connection.', 'network')
  }
  if (err instanceof Anthropic.APIError) {
    return new AiError(err.message || 'The API returned an error.', 'unknown')
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return new AiError('Cancelled.', 'network')
  }
  return new AiError('Something went wrong talking to the mentor.', 'unknown')
}
