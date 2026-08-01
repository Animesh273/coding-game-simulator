import type { ChatTurn } from '../game/types'

/**
 * Where the mentor's words come from.
 *
 * - `server`  — this deployment's /api/chat, which holds the key server-side.
 *               Visitors need no key of their own. Preferred when available.
 * - `groq`    — the visitor's own Groq key, called directly from the browser.
 * - `anthropic` — the visitor's own Anthropic key, likewise.
 * - `offline` — no AI at all; the authored coach answers.
 */
export type Provider = 'server' | 'groq' | 'anthropic' | 'offline'

export type Tier = 'fast' | 'quality'

const KEY_STORAGE = {
  anthropic: 'ascend.anthropic.key',
  groq: 'ascend.groq.key',
} as const

const PROVIDER_STORAGE = 'ascend.ai.provider'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

/** Client-side model choice, only used when calling Groq directly. */
const GROQ_MODELS: Record<Tier, string> = {
  fast: 'llama-3.1-8b-instant',
  quality: 'llama-3.3-70b-versatile',
}

/* --------------------------------------------------------------- storage */

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function write(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value.trim())
    else localStorage.removeItem(key)
  } catch {
    /* storage disabled — AI simply stays off */
  }
}

export const getGroqKey = () => read(KEY_STORAGE.groq)
export const setGroqKey = (k: string) => write(KEY_STORAGE.groq, k)
export const getAnthropicKey = () => read(KEY_STORAGE.anthropic)
export const setAnthropicKey = (k: string) => write(KEY_STORAGE.anthropic, k)

/** Explicit user preference; 'auto' lets availability decide. */
export function getPreferredProvider(): Provider | 'auto' {
  const v = read(PROVIDER_STORAGE)
  return v === 'server' || v === 'groq' || v === 'anthropic' || v === 'offline' ? v : 'auto'
}

export function setPreferredProvider(p: Provider | 'auto'): void {
  write(PROVIDER_STORAGE, p === 'auto' ? '' : p)
}

/* ------------------------------------------------------- server discovery */

let serverProbe: Promise<{ available: boolean; provider: string | null }> | null = null

/**
 * Asks the deployment whether it has a server-side key. Cached for the page's
 * lifetime — the answer cannot change without a redeploy.
 */
export function probeServer(): Promise<{ available: boolean; provider: string | null }> {
  if (!serverProbe) {
    serverProbe = fetch('/api/chat', { method: 'GET' })
      .then((r) => (r.ok ? r.json() : { available: false, provider: null }))
      .catch(() => ({ available: false, provider: null }))
  }
  return serverProbe
}

/** Resolves the provider actually used for the next call. */
export async function resolveProvider(): Promise<Provider> {
  const preferred = getPreferredProvider()
  if (preferred === 'offline') return 'offline'
  if (preferred === 'groq') return getGroqKey() ? 'groq' : 'offline'
  if (preferred === 'anthropic') return getAnthropicKey() ? 'anthropic' : 'offline'
  if (preferred === 'server') return (await probeServer()).available ? 'server' : 'offline'

  // auto: prefer the deployment's own key, then whatever the visitor supplied.
  if ((await probeServer()).available) return 'server'
  if (getGroqKey()) return 'groq'
  if (getAnthropicKey()) return 'anthropic'
  return 'offline'
}

/* ----------------------------------------------------------------- errors */

export class AiError extends Error {
  constructor(
    message: string,
    readonly kind: 'auth' | 'rate' | 'refusal' | 'network' | 'not_configured' | 'unknown',
  ) {
    super(message)
    this.name = 'AiError'
  }
}

/* ---------------------------------------------------------------- calling */

export interface CallOptions {
  system: string
  messages: ChatTurn[]
  tier?: Tier
  maxTokens?: number
  signal?: AbortSignal
}

/** Streams text from this deployment's proxy. */
async function* viaServer(opts: CallOptions): AsyncGenerator<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: opts.signal,
    body: JSON.stringify({
      system: opts.system,
      messages: opts.messages,
      tier: opts.tier ?? 'fast',
      maxTokens: opts.maxTokens ?? 600,
    }),
  })

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}) as { error?: string; code?: string })
    if (detail.code === 'rate_limited' || res.status === 429) {
      throw new AiError(
        "The shared AI is busy right now — here's the built-in coach instead.",
        'rate',
      )
    }
    if (detail.code === 'not_configured' || res.status === 501) {
      throw new AiError('This deployment has no AI key configured.', 'not_configured')
    }
    throw new AiError(detail.error || `Request failed (${res.status}).`, 'unknown')
  }

  yield* readTextStream(res)
}

/** The slice of Groq's OpenAI-compatible SSE frame we actually read. */
interface GroqChunk {
  choices?: { delta?: { content?: string } }[]
}

/** Streams text straight from Groq using the visitor's own key. */
async function* viaGroq(opts: CallOptions): AsyncGenerator<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${getGroqKey()}`,
    },
    body: JSON.stringify({
      model: GROQ_MODELS[opts.tier ?? 'fast'],
      max_tokens: opts.maxTokens ?? 600,
      stream: true,
      messages: [
        ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
        ...opts.messages,
      ],
    }),
  })

  if (!res.ok) {
    if (res.status === 401) throw new AiError('That Groq key was rejected. Check it in AI Settings.', 'auth')
    if (res.status === 429) throw new AiError('Groq rate limit reached — try again shortly.', 'rate')
    const text = await res.text().catch(() => '')
    throw new AiError(text.slice(0, 200) || `Groq request failed (${res.status}).`, 'unknown')
  }

  yield* readSse(res, (parsed) => (parsed as GroqChunk)?.choices?.[0]?.delta?.content)
}

/* ------------------------------------------------------------- stream I/O */

async function* readTextStream(res: Response): AsyncGenerator<string> {
  const reader = res.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (chunk) yield chunk
  }
}

async function* readSse(
  res: Response,
  extract: (parsed: unknown) => string | undefined,
): AsyncGenerator<string> {
  const reader = res.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const text = extract(JSON.parse(payload))
        if (typeof text === 'string' && text) yield text
      } catch {
        /* partial frame — the next chunk completes it */
      }
    }
  }
}

/* -------------------------------------------------------------- dispatch */

/**
 * Routes to whichever provider is active. Throws AiError; never returns empty.
 *
 * The Anthropic path is imported dynamically: its SDK is by far the largest
 * dependency here, and most visitors will be on the server proxy or Groq and
 * should never download it.
 */
export async function* streamFromProvider(opts: CallOptions): AsyncGenerator<string> {
  const provider = await resolveProvider()
  if (provider === 'offline') {
    throw new AiError('No AI provider is configured.', 'not_configured')
  }
  if (provider === 'server') {
    yield* viaServer(opts)
    return
  }
  if (provider === 'groq') {
    yield* viaGroq(opts)
    return
  }
  const { viaAnthropic } = await import('./anthropic')
  yield* viaAnthropic(opts)
}

/** True when anything other than the offline coach will answer. */
export async function isAiAvailable(): Promise<boolean> {
  return (await resolveProvider()) !== 'offline'
}
