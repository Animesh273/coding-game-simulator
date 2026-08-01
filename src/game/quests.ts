import type { Quest, QuestKind, WorldId } from './types'
import { WORLDS } from '../content/worlds'

/**
 * Daily missions and weekly challenges.
 *
 * Quests are generated deterministically from the date key so a student sees
 * the same board all day (and the same board on every device), but a fresh one
 * tomorrow. That predictability is what makes "come back tomorrow" land.
 */

/** Small deterministic PRNG so a given seed always yields the same board. */
export function seededRng(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface QuestTemplate {
  kind: QuestKind
  label: (n: number, world?: string) => string
  icon: string
  targets: number[]
  xpPer: number
  gemsPer: number
  needsWorld?: boolean
}

const DAILY_TEMPLATES: QuestTemplate[] = [
  { kind: 'answer', label: (n) => `Answer ${n} questions`, icon: '📝', targets: [10, 15, 20], xpPer: 4, gemsPer: 1.5 },
  { kind: 'correct', label: (n) => `Get ${n} correct answers`, icon: '✅', targets: [8, 12, 16], xpPer: 5, gemsPer: 2 },
  { kind: 'combo', label: (n) => `Reach a ${n}x combo`, icon: '🔥', targets: [5, 8, 10], xpPer: 10, gemsPer: 4 },
  { kind: 'world', label: (n, w) => `Answer ${n} questions in ${w}`, icon: '🗺️', targets: [6, 10], xpPer: 7, gemsPer: 3, needsWorld: true },
  { kind: 'perfect', label: (n) => `Finish ${n} flawless run${n > 1 ? 's' : ''}`, icon: '💎', targets: [1, 2], xpPer: 60, gemsPer: 25 },
  { kind: 'revise', label: (n) => `Clear ${n} cards in the Revision Dungeon`, icon: '🗝️', targets: [5, 8], xpPer: 8, gemsPer: 3 },
  { kind: 'xp', label: (n) => `Earn ${n} XP today`, icon: '⚡', targets: [150, 250], xpPer: 0.25, gemsPer: 0.12 },
]

const WEEKLY_TEMPLATES: QuestTemplate[] = [
  { kind: 'correct', label: (n) => `Land ${n} correct answers this week`, icon: '🎯', targets: [60, 90, 120], xpPer: 3, gemsPer: 1.2 },
  { kind: 'boss', label: (n) => `Defeat ${n} boss interview${n > 1 ? 's' : ''}`, icon: '👑', targets: [2, 3], xpPer: 120, gemsPer: 60 },
  { kind: 'combo', label: (n) => `Hit a ${n}x combo`, icon: '⚔️', targets: [15, 20], xpPer: 25, gemsPer: 12 },
  { kind: 'perfect', label: (n) => `Complete ${n} flawless runs`, icon: '🌟', targets: [3, 5], xpPer: 70, gemsPer: 30 },
  { kind: 'xp', label: (n) => `Earn ${n} XP this week`, icon: '📈', targets: [1200, 1800], xpPer: 0.2, gemsPer: 0.1 },
]

function build(t: QuestTemplate, rng: () => number, idPrefix: string, i: number, unlockedWorlds: WorldId[]): Quest {
  const target = t.targets[Math.floor(rng() * t.targets.length)]
  let world: WorldId | undefined
  let worldName: string | undefined
  if (t.needsWorld) {
    const pool = unlockedWorlds.length > 0 ? unlockedWorlds : (['python'] as WorldId[])
    world = pool[Math.floor(rng() * pool.length)]
    worldName = WORLDS.find((w) => w.id === world)?.name ?? 'the wilds'
  }
  return {
    id: `${idPrefix}-${i}-${t.kind}-${target}`,
    kind: t.kind,
    label: t.label(target, worldName),
    icon: t.icon,
    target,
    progress: 0,
    rewardXp: Math.round(target * t.xpPer),
    rewardGems: Math.round(target * t.gemsPer),
    claimed: false,
    world,
  }
}

function pickDistinct(pool: QuestTemplate[], count: number, rng: () => number): QuestTemplate[] {
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function generateDailyQuests(dayKey: string, unlockedWorlds: WorldId[]): Quest[] {
  const rng = seededRng(`daily:${dayKey}`)
  return pickDistinct(DAILY_TEMPLATES, 3, rng).map((t, i) => build(t, rng, `d${dayKey}`, i, unlockedWorlds))
}

export function generateWeeklyQuests(weekKey: string, unlockedWorlds: WorldId[]): Quest[] {
  const rng = seededRng(`weekly:${weekKey}`)
  return pickDistinct(WEEKLY_TEMPLATES, 2, rng).map((t, i) => build(t, rng, `w${weekKey}`, i, unlockedWorlds))
}

/** ISO-ish week key — quests roll over on Monday. */
export function weekKey(ts: number = Date.now()): string {
  const d = new Date(ts)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - day)
  return `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + 6) / 7)).padStart(2, '0')}-${d.getMonth()}`
}

export interface QuestEvent {
  kind: QuestKind
  amount: number
  world?: WorldId
}

/** Applies an event to a quest list, returning the updated list. */
export function advanceQuests(quests: Quest[], ev: QuestEvent): Quest[] {
  let changed = false
  const next = quests.map((q) => {
    if (q.claimed || q.kind !== ev.kind) return q
    if (q.world && q.world !== ev.world) return q
    // Combo quests track a high-water mark rather than a running total.
    const raw = q.kind === 'combo' ? Math.max(q.progress, ev.amount) : q.progress + ev.amount
    const progress = Math.min(q.target, raw)
    if (progress === q.progress) return q
    changed = true
    return { ...q, progress }
  })
  return changed ? next : quests
}

export function isComplete(q: Quest): boolean {
  return q.progress >= q.target
}

export function claimableCount(quests: Quest[]): number {
  return quests.filter((q) => isComplete(q) && !q.claimed).length
}
