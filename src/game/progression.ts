import type { Rank, RankTier, ChestRarity, ChestReward } from './types'

/* ------------------------------------------------------------------ levels */

/**
 * XP needed to advance *from* `level` to `level + 1`.
 *
 * Quadratic-ish so early levels come fast (a first session should produce two
 * or three level-ups — that's the hook) while later levels stay meaningful.
 */
export function xpToNext(level: number): number {
  return Math.round(80 + 42 * level + 5 * level * level)
}

/** Cumulative XP required to *reach* `level`. */
export function xpAtLevel(level: number): number {
  let total = 0
  for (let l = 1; l < level; l++) total += xpToNext(l)
  return total
}

export function levelFromXp(totalXp: number): { level: number; into: number; need: number } {
  let level = 1
  let remaining = totalXp
  // Guard-railed: the loop terminates because xpToNext is strictly increasing.
  while (remaining >= xpToNext(level) && level < 200) {
    remaining -= xpToNext(level)
    level++
  }
  return { level, into: remaining, need: xpToNext(level) }
}

/* ------------------------------------------------------------------- ranks */

const RANK_BANDS: { tier: RankTier; from: number; color: string; glow: string }[] = [
  { tier: 'Bronze', from: 1, color: '#c98b52', glow: 'rgba(201,139,82,.55)' },
  { tier: 'Silver', from: 6, color: '#c8d3e0', glow: 'rgba(200,211,224,.55)' },
  { tier: 'Gold', from: 12, color: '#f5c542', glow: 'rgba(245,197,66,.6)' },
  { tier: 'Platinum', from: 20, color: '#5fe3d0', glow: 'rgba(95,227,208,.6)' },
  { tier: 'Diamond', from: 30, color: '#7db8ff', glow: 'rgba(125,184,255,.65)' },
  { tier: 'Master', from: 42, color: '#c58cff', glow: 'rgba(197,140,255,.7)' },
]

const NUMERALS = ['V', 'IV', 'III', 'II', 'I']

export function rankFromLevel(level: number): Rank {
  let band = RANK_BANDS[0]
  let next = Infinity
  for (let i = 0; i < RANK_BANDS.length; i++) {
    if (level >= RANK_BANDS[i].from) {
      band = RANK_BANDS[i]
      next = RANK_BANDS[i + 1]?.from ?? band.from + 25
    }
  }
  const span = Math.max(1, next - band.from)
  const step = Math.min(4, Math.floor(((level - band.from) / span) * 5))
  return {
    tier: band.tier,
    division: band.tier === 'Master' ? '' : NUMERALS[step],
    color: band.color,
    glow: band.glow,
  }
}

export function rankProgress(level: number): number {
  let band = RANK_BANDS[0]
  let next = Infinity
  for (let i = 0; i < RANK_BANDS.length; i++) {
    if (level >= RANK_BANDS[i].from) {
      band = RANK_BANDS[i]
      next = RANK_BANDS[i + 1]?.from ?? band.from + 25
    }
  }
  return Math.min(1, (level - band.from) / Math.max(1, next - band.from))
}

/* -------------------------------------------------------------- xp rewards */

/** Base XP for a correct answer, before combo and difficulty scaling. */
export const BASE_XP = 12

/**
 * Combo multiplier. Caps at 3x so a long run is rewarding without letting one
 * lucky streak eclipse a week of steady practice.
 */
export function comboMultiplier(combo: number): number {
  if (combo < 3) return 1
  if (combo < 5) return 1.25
  if (combo < 8) return 1.5
  if (combo < 12) return 2
  if (combo < 20) return 2.5
  return 3
}

export function comboLabel(combo: number): string | null {
  if (combo < 3) return null
  if (combo < 5) return 'WARM'
  if (combo < 8) return 'HOT'
  if (combo < 12) return 'BLAZING'
  if (combo < 20) return 'UNSTOPPABLE'
  return 'LEGENDARY'
}

export function answerXp(difficulty: number, combo: number, speedBonus: number): number {
  const base = BASE_XP + (difficulty - 1) * 5
  return Math.round(base * comboMultiplier(combo) + speedBonus)
}

export function answerGems(difficulty: number, combo: number): number {
  return Math.max(1, Math.round((difficulty + combo * 0.4) / 2))
}

/* ------------------------------------------------------------------ chests */

const CHEST_TABLE: Record<ChestRarity, { gems: [number, number]; xp: [number, number]; hint: number; freeze: number }> = {
  common: { gems: [15, 35], xp: [20, 50], hint: 0.25, freeze: 0.05 },
  rare: { gems: [40, 80], xp: [60, 120], hint: 0.5, freeze: 0.15 },
  epic: { gems: [90, 160], xp: [140, 260], hint: 0.85, freeze: 0.35 },
  legendary: { gems: [200, 380], xp: [300, 550], hint: 1.6, freeze: 0.8 },
}

export const CHEST_LABEL: Record<ChestRarity, string> = {
  common: 'Wooden Cache',
  rare: 'Silver Vault',
  epic: 'Arcane Coffer',
  legendary: 'Placement Relic',
}

export const CHEST_COLOR: Record<ChestRarity, string> = {
  common: '#9aa4b5',
  rare: '#5db1ff',
  epic: '#c58cff',
  legendary: '#ffcc4d',
}

const COSMETICS = [
  'aura:ember',
  'aura:frost',
  'aura:voltage',
  'aura:nebula',
  'title:Bug Whisperer',
  'title:Complexity Slayer',
  'title:Query Sommelier',
  'title:Deadlock Breaker',
  'title:Offer Magnet',
]

function randBetween(rng: () => number, [lo, hi]: [number, number]): number {
  return Math.round(lo + rng() * (hi - lo))
}

export function rollChest(rarity: ChestRarity, rng: () => number = Math.random): ChestReward {
  const t = CHEST_TABLE[rarity]
  const hints = Math.floor(t.hint) + (rng() < t.hint % 1 ? 1 : 0)
  const freezes = Math.floor(t.freeze) + (rng() < t.freeze % 1 ? 1 : 0)
  const cosmeticChance = rarity === 'legendary' ? 0.9 : rarity === 'epic' ? 0.45 : rarity === 'rare' ? 0.15 : 0.04
  return {
    rarity,
    gems: randBetween(rng, t.gems),
    xp: randBetween(rng, t.xp),
    hints,
    freezes,
    cosmetic: rng() < cosmeticChance ? COSMETICS[Math.floor(rng() * COSMETICS.length)] : undefined,
  }
}

/** Weighted rarity roll — luck rises with the player's daily streak. */
export function rollChestRarity(streak: number, rng: () => number = Math.random): ChestRarity {
  const luck = Math.min(0.35, streak * 0.012)
  const r = rng()
  if (r < 0.04 + luck * 0.5) return 'legendary'
  if (r < 0.18 + luck) return 'epic'
  if (r < 0.48 + luck) return 'rare'
  return 'common'
}

/* ------------------------------------------------------------------ streak */

export const DAILY_GOAL_XP = 120

/** Login-reward ladder — day 7 and day 30 are the big beats. */
export function loginReward(streakDay: number): { gems: number; chest?: ChestRarity } {
  const day = ((streakDay - 1) % 30) + 1
  if (day % 30 === 0) return { gems: 250, chest: 'legendary' }
  if (day % 7 === 0) return { gems: 120, chest: 'epic' }
  if (day % 3 === 0) return { gems: 45, chest: 'rare' }
  return { gems: 20, chest: day % 2 === 0 ? 'common' : undefined }
}

export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface StreakLike {
  count: number
  best: number
  lastActiveDay: string
  todayXp: number
}

/**
 * Registers activity for `today`.
 *
 * The streak belongs to *playing*, not to remembering to press a button —
 * answering a question is what keeps it alive. `claimLogin` uses this too, so
 * both paths agree on the count and there is only one place gap logic lives.
 */
export function bumpStreak<T extends StreakLike>(s: T, today: string): T {
  if (s.lastActiveDay === today) return s
  const gap = s.lastActiveDay ? daysBetween(s.lastActiveDay, today) : Infinity
  const count = gap === 1 ? s.count + 1 : 1
  return { ...s, count, best: Math.max(s.best, count), lastActiveDay: today, todayXp: 0 }
}

/** Whole-day difference between two day keys. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const ta = Date.UTC(ay, am - 1, ad)
  const tb = Date.UTC(by, bm - 1, bd)
  return Math.round((tb - ta) / 86_400_000)
}
