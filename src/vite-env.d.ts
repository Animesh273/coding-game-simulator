/// <reference types="vite/client" />

/**
 * Build-time configuration.
 *
 * Both are safe to ship in the bundle: the Supabase anon key only identifies
 * the project and every table is guarded by row-level security. A service_role
 * key must never appear here.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
