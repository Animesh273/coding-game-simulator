import { supabase } from './supabase'
import type { Mastery, SrsCard } from '../game/types'
import { levelFromXp } from '../game/progression'

/**
 * The persisted slice of the game state — everything except the transient
 * `run` and `events`. Kept structurally typed rather than importing GameState
 * so the sync layer does not drag the whole store into scope.
 */
export interface SaveData {
  name: string
  avatar: { base: string; color: string; aura: string; title: string }
  ownedCosmetics: string[]
  unlockedTitles: string[]
  createdAt: number
  onboarded: boolean
  totalXp: number
  gems: number
  hints: number
  freezes: number
  pendingChests: string[]
  mastery: Record<string, Mastery>
  srs: Record<string, SrsCard>
  recent: boolean[]
  lessonsRead: string[]
  streak: { count: number; best: number; lastActiveDay: string; todayXp: number; loginClaimedDay: string }
  quests: unknown
  achievements: string[]
  defeatedCompanies: string[]
  stats: Record<string, number>
}

export const SAVE_VERSION = 1

/* ------------------------------------------------------------------ merge */

const union = <T,>(a: T[] = [], b: T[] = []): T[] => Array.from(new Set([...a, ...b]))
const maxOf = (a = 0, b = 0) => Math.max(a, b)

/**
 * Merges a local save with a remote one **without losing progress from either
 * side**.
 *
 * The rule is: monotonic things take the maximum, collections take the union,
 * and per-item records take whichever side has more evidence. That is
 * deliberately generous — a student who grinds offline on their phone and then
 * signs in on a laptop should never watch a level disappear, and the cost of
 * being generous is a few extra gems, which is nothing next to losing a streak.
 *
 * Account identity (display name, chosen avatar) prefers the remote side,
 * because that is what the account *is*.
 */
export function mergeSaves(local: SaveData, remote: SaveData): SaveData {
  const mastery: Record<string, Mastery> = { ...local.mastery }
  for (const [skill, r] of Object.entries(remote.mastery ?? {})) {
    const l = mastery[skill]
    // More attempts means a better-informed estimate; keep that side.
    if (!l || r.seen > l.seen) mastery[skill] = r
  }

  const srs: Record<string, SrsCard> = { ...local.srs }
  for (const [qid, r] of Object.entries(remote.srs ?? {})) {
    const l = srs[qid]
    if (!l || (r.lastSeenAt ?? 0) > (l.lastSeenAt ?? 0)) srs[qid] = r
  }

  const localNewer = (local.streak?.lastActiveDay ?? '') >= (remote.streak?.lastActiveDay ?? '')

  return {
    // --- identity: the account wins ---
    name: remote.name || local.name,
    avatar: remote.avatar ?? local.avatar,
    createdAt: Math.min(local.createdAt || Date.now(), remote.createdAt || Date.now()),
    onboarded: local.onboarded || remote.onboarded,

    // --- collections: union, never subtract ---
    ownedCosmetics: union(local.ownedCosmetics, remote.ownedCosmetics),
    unlockedTitles: union(local.unlockedTitles, remote.unlockedTitles),
    achievements: union(local.achievements, remote.achievements),
    defeatedCompanies: union(local.defeatedCompanies, remote.defeatedCompanies),
    lessonsRead: union(local.lessonsRead, remote.lessonsRead),
    pendingChests: union(local.pendingChests, remote.pendingChests),

    // --- monotonic: take the max ---
    totalXp: maxOf(local.totalXp, remote.totalXp),
    gems: maxOf(local.gems, remote.gems),
    hints: maxOf(local.hints, remote.hints),
    freezes: maxOf(local.freezes, remote.freezes),

    mastery,
    srs,
    // The recent-answers window is a short-lived tone signal; the device you
    // are actually on has the truthful one.
    recent: local.recent ?? [],

    streak: {
      count: maxOf(local.streak?.count, remote.streak?.count),
      best: maxOf(local.streak?.best, remote.streak?.best),
      lastActiveDay: localNewer ? local.streak.lastActiveDay : remote.streak.lastActiveDay,
      todayXp: localNewer ? local.streak.todayXp : remote.streak.todayXp,
      loginClaimedDay: localNewer ? local.streak.loginClaimedDay : remote.streak.loginClaimedDay,
    },

    // Quests regenerate daily from a date seed, so the local board is already
    // correct for today; taking it avoids importing a stale board from a
    // device that was last used a week ago.
    quests: local.quests,

    stats: Object.fromEntries(
      union(Object.keys(local.stats ?? {}), Object.keys(remote.stats ?? {})).map((k) => [
        k,
        maxOf(local.stats?.[k], remote.stats?.[k]),
      ]),
    ),
  }
}

/* --------------------------------------------------------------- transport */

export class SyncError extends Error {}

export async function loadRemote(userId: string): Promise<SaveData | null> {
  const c = await supabase()
  if (!c) return null
  const { data, error } = await c.from('saves').select('data, save_version').eq('user_id', userId).maybeSingle()
  if (error) throw new SyncError(error.message)
  if (!data) return null
  return data.data as SaveData
}

export async function saveRemote(userId: string, save: SaveData): Promise<void> {
  const c = await supabase()
  if (!c) return
  const { level } = levelFromXp(save.totalXp)
  const { error } = await c.from('saves').upsert(
    {
      user_id: userId,
      save_version: SAVE_VERSION,
      data: save,
      // Denormalised so a cohort dashboard can rank without unpacking JSON.
      total_xp: save.totalXp,
      level,
      streak: save.streak?.count ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new SyncError(error.message)
}

export async function loadProfile(userId: string): Promise<{ displayName: string | null; cohortCode: string | null }> {
  const c = await supabase()
  if (!c) return { displayName: null, cohortCode: null }
  const { data } = await c.from('profiles').select('display_name, cohort_code').eq('id', userId).maybeSingle()
  return { displayName: data?.display_name ?? null, cohortCode: data?.cohort_code ?? null }
}

export async function setCohortCode(userId: string, code: string | null): Promise<void> {
  const c = await supabase()
  if (!c) return
  const { error } = await c.from('profiles').update({ cohort_code: code }).eq('id', userId)
  if (error) throw new SyncError(error.message)
}
