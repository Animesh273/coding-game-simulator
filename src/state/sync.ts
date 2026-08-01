import { useGame, type GameState } from './store'
import { currentUser, onAuthChange, type AccountUser } from '../backend/auth'
import { loadRemote, saveRemote, mergeSaves, type SaveData } from '../backend/sync'
import { isBackendConfigured } from '../backend/supabase'

/**
 * Bridges the local zustand store to the remote save.
 *
 * Push is debounced: the store changes on every answered question, and firing
 * a network write per question would be both wasteful and rate-limitable. A
 * few seconds of batching is invisible to the player and turns a run into one
 * or two writes instead of ten.
 */

const PUSH_DEBOUNCE_MS = 4000

export type SyncState = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error'

let listeners: ((s: SyncState, detail?: string) => void)[] = []
let state: SyncState = isBackendConfigured() ? 'signed-out' : 'off'
let detail: string | undefined
let user: AccountUser | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let unsubStore: (() => void) | null = null
let started = false

function emit(next: SyncState, why?: string) {
  state = next
  detail = why
  listeners.forEach((l) => l(next, why))
}

export function getSyncState(): { state: SyncState; detail?: string; email?: string } {
  return { state, detail, email: user?.email }
}

export function onSyncChange(cb: (s: SyncState, detail?: string) => void): () => void {
  listeners.push(cb)
  return () => {
    listeners = listeners.filter((l) => l !== cb)
  }
}

/** Extracts the persisted slice — must mirror the store's `partialize`. */
function snapshot(s: GameState): SaveData {
  const { run: _r, events: _e, ...rest } = s
  void _r
  void _e
  return rest as unknown as SaveData
}

async function push() {
  if (!user) return
  try {
    emit('syncing')
    await saveRemote(user.id, snapshot(useGame.getState()))
    emit('synced')
  } catch (err) {
    emit('error', err instanceof Error ? err.message : 'Could not save to the cloud.')
  }
}

function schedulePush() {
  if (!user) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void push(), PUSH_DEBOUNCE_MS)
}

/** Pull remote, merge into local, then write the merged result back. */
async function pullAndMerge(u: AccountUser) {
  try {
    emit('syncing')
    const remote = await loadRemote(u.id)
    const local = snapshot(useGame.getState())

    if (remote) {
      const merged = mergeSaves(local, remote)
      // Cast through unknown: SaveData is structurally the persisted slice.
      useGame.setState(merged as unknown as Partial<GameState>)
    }

    await saveRemote(u.id, snapshot(useGame.getState()))
    emit('synced')
  } catch (err) {
    emit('error', err instanceof Error ? err.message : 'Could not load your saved progress.')
  }
}

/**
 * Starts the bridge. Safe to call once at app start whether or not a backend
 * is configured — with no project it simply reports 'off' and does nothing.
 */
export function startSync() {
  if (started) return
  started = true

  if (!isBackendConfigured()) {
    emit('off')
    return
  }

  // Subscribe once; the callback is a no-op while signed out.
  unsubStore = useGame.subscribe(() => schedulePush())

  void currentUser().then((u) => {
    if (u) {
      user = u
      void pullAndMerge(u)
    } else {
      emit('signed-out')
    }
  })

  onAuthChange((u) => {
    const wasSignedIn = Boolean(user)
    user = u
    if (u) {
      void pullAndMerge(u)
    } else {
      if (timer) clearTimeout(timer)
      emit('signed-out')
      if (wasSignedIn) {
        // Deliberately leave local progress alone on sign-out. Wiping it would
        // punish someone for signing out on a shared machine, and the local
        // save is merged (not overwritten) on the next sign-in anyway.
      }
    }
  })
}

/** Forces an immediate write — used by the account screen's manual button. */
export async function syncNow(): Promise<void> {
  if (timer) clearTimeout(timer)
  await push()
}

export function stopSync() {
  unsubStore?.()
  unsubStore = null
  if (timer) clearTimeout(timer)
  started = false
}
