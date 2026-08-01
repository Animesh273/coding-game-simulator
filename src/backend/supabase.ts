import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client.
 *
 * ── On the anon key being in the bundle ─────────────────────────────────
 * `VITE_` variables are inlined into the shipped JavaScript, so the anon key
 * IS public. That is by design for Supabase: the anon key only identifies the
 * project, and every table is guarded by row-level security policies that run
 * on the server. A signed-in user can only ever read or write their own row,
 * whatever the client asks for.
 *
 * This is the opposite of an Anthropic API key, which grants spend and must
 * never reach the browser. Do not put a Supabase *service_role* key here —
 * that one bypasses RLS and is a real secret.
 * ───────────────────────────────────────────────────────────────────────
 */

/**
 * `import.meta.env` only exists under Vite. This module is also imported by
 * the headless smoke suite running in plain Node, so read it defensively
 * rather than crashing at import time.
 */
const env = (import.meta as { env?: Partial<ImportMetaEnv> }).env ?? {}

const URL_ENV = env.VITE_SUPABASE_URL
const KEY_ENV = env.VITE_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

/**
 * True when the project is wired up. Everything auth-related degrades to a
 * clear "not configured" state rather than throwing, so a fork of this repo
 * with no Supabase project still runs perfectly as a local-only game.
 */
export function isBackendConfigured(): boolean {
  return Boolean(URL_ENV && KEY_ENV)
}

/**
 * Loads the Supabase SDK on demand.
 *
 * The import is dynamic so the ~120 kB client is only downloaded by
 * deployments that actually configured a project — a fork with no backend
 * never pays for it. `isBackendConfigured()` above is a plain env read and
 * stays synchronous, so the UI can branch without awaiting anything.
 */
export async function supabase(): Promise<SupabaseClient | null> {
  if (!isBackendConfigured()) return null
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(URL_ENV!, KEY_ENV!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The game is a single page with no OAuth redirect, so there is never
        // a session to recover from the URL.
        detectSessionInUrl: false,
      },
    })
  }
  return client
}

/** Human-readable reason the backend is unavailable, for the account screen. */
export function backendStatus(): { ok: boolean; message: string } {
  if (!URL_ENV && !KEY_ENV) {
    return {
      ok: false,
      message:
        'No Supabase project connected. Progress is saved in this browser only. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable accounts.',
    }
  }
  if (!URL_ENV) return { ok: false, message: 'VITE_SUPABASE_URL is missing.' }
  if (!KEY_ENV) return { ok: false, message: 'VITE_SUPABASE_ANON_KEY is missing.' }
  return { ok: true, message: 'Connected.' }
}
