import { supabase, isBackendConfigured } from './supabase'

export interface AccountUser {
  id: string
  email: string
}

export class AuthError extends Error {
  constructor(message: string, readonly kind: 'config' | 'credentials' | 'exists' | 'confirm' | 'network' | 'unknown') {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Supabase returns terse, sometimes cryptic messages. Map the ones a student
 * will actually hit into something they can act on.
 */
function toAuthError(err: unknown): AuthError {
  const raw = err instanceof Error ? err.message : String(err)
  const m = raw.toLowerCase()
  if (m.includes('invalid login credentials')) {
    return new AuthError('That email and password combination is not recognised.', 'credentials')
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return new AuthError('An account with that email already exists — try signing in instead.', 'exists')
  }
  if (m.includes('email not confirmed')) {
    return new AuthError('Check your inbox and confirm your email address first.', 'confirm')
  }
  if (m.includes('password') && m.includes('6')) {
    return new AuthError('Password must be at least 6 characters.', 'credentials')
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return new AuthError('Could not reach the server. Check your connection.', 'network')
  }
  return new AuthError(raw || 'Something went wrong.', 'unknown')
}

async function requireClient() {
  const c = await supabase()
  if (!c) throw new AuthError('No Supabase project is connected to this build.', 'config')
  return c
}

export async function signUp(email: string, password: string, displayName: string): Promise<{ needsConfirmation: boolean }> {
  const c = await requireClient()
  const { data, error } = await c.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim() } },
  })
  if (error) throw toAuthError(error)
  // With email confirmation enabled, Supabase returns a user but no session.
  return { needsConfirmation: !data.session }
}

export async function signIn(email: string, password: string): Promise<AccountUser> {
  const c = await requireClient()
  const { data, error } = await c.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw toAuthError(error)
  if (!data.user) throw new AuthError('Signed in but no user was returned.', 'unknown')
  return { id: data.user.id, email: data.user.email ?? '' }
}

export async function signOut(): Promise<void> {
  const c = await supabase()
  if (!c) return
  await c.auth.signOut()
}

export async function currentUser(): Promise<AccountUser | null> {
  const c = await supabase()
  if (!c) return null
  const { data } = await c.auth.getUser()
  if (!data.user) return null
  return { id: data.user.id, email: data.user.email ?? '' }
}

/**
 * Fires on sign-in, sign-out and token refresh. Returns an unsubscribe.
 *
 * Stays synchronous even though the client now loads lazily: callers use this
 * inside `useEffect`, which needs its cleanup function immediately. The
 * subscription is attached once the SDK resolves, and unsubscribing before
 * that simply cancels it.
 */
export function onAuthChange(cb: (user: AccountUser | null) => void): () => void {
  let unsubscribe: (() => void) | null = null
  let cancelled = false

  void supabase().then((c) => {
    if (!c || cancelled) return
    const { data } = c.auth.onAuthStateChange((_event, session) => {
      cb(session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null)
    })
    unsubscribe = () => data.subscription.unsubscribe()
  })

  return () => {
    cancelled = true
    unsubscribe?.()
  }
}

export { isBackendConfigured }
