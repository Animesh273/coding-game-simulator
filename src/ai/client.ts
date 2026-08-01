/**
 * Thin compatibility layer over `providers.ts`.
 *
 * The provider abstraction (server proxy / Groq / Anthropic / offline) lives in
 * providers.ts; this file exists so `mentor.ts` and the settings UI have one
 * stable import, and so the rest of the app never needs to know which service
 * answered.
 */
import { streamFromProvider, type CallOptions, type Provider, type Tier } from './providers'

export {
  AiError,
  isAiAvailable,
  resolveProvider,
  probeServer,
  getGroqKey,
  setGroqKey,
  getAnthropicKey,
  setAnthropicKey,
  getPreferredProvider,
  setPreferredProvider,
} from './providers'

export type { Provider, Tier }

export interface StreamOptions extends CallOptions {}

/** Streams a reply from whichever provider is active. */
export function streamReply(opts: StreamOptions): AsyncGenerator<string> {
  return streamFromProvider(opts)
}

/** Convenience wrapper for callers that only want the finished string. */
export async function completeReply(opts: StreamOptions): Promise<string> {
  let out = ''
  for await (const chunk of streamReply(opts)) out += chunk
  return out
}

/** Human-readable label for the active provider, for the settings screen. */
export const PROVIDER_LABEL: Record<Provider, string> = {
  server: 'This site (no key needed)',
  groq: 'Groq — your key',
  anthropic: 'Anthropic — your key',
  offline: 'Built-in coach',
}
