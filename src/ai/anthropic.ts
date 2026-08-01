import Anthropic from '@anthropic-ai/sdk'
import { AiError, getAnthropicKey, type CallOptions } from './providers'

/**
 * Direct browser → Anthropic path, used when a visitor supplies their own key.
 *
 * Loaded dynamically from `providers.ts` so the SDK stays out of the main
 * bundle for everyone else.
 *
 * The key is stored in this browser's localStorage and is visible to anyone
 * with devtools access on this machine. That is acceptable for a student
 * running ASCEND with their own key; it is not acceptable for a shared
 * deployment, which should use the server-side proxy instead.
 */

export const ANTHROPIC_MODEL = 'claude-opus-5'

export async function* viaAnthropic(opts: CallOptions): AsyncGenerator<string> {
  const client = new Anthropic({
    apiKey: getAnthropicKey(),
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  })

  let stream
  try {
    stream = client.beta.messages.stream(
      {
        model: ANTHROPIC_MODEL,
        max_tokens: opts.maxTokens ?? 600,
        system: opts.system,
        messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
        // Adaptive thinking at low effort rather than disabled: on Opus 5,
        // disabling thinking can leak internal tags into the visible reply,
        // and low effort achieves the same latency saving.
        thinking: { type: 'adaptive' },
        output_config: { effort: opts.tier === 'quality' ? 'medium' : 'low' },
        // Safety classifiers can decline; a server-side fallback re-serves the
        // request rather than leaving the student staring at an error.
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
    // A refusal is a successful HTTP 200 with empty or partial content, so
    // stop_reason must be checked before the content is trusted.
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

function toAiError(err: unknown): AiError {
  if (err instanceof Anthropic.AuthenticationError) {
    return new AiError('That Anthropic key was rejected. Check it in AI Settings.', 'auth')
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
