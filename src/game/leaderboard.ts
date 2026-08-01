import { seededRng } from './quests'
import { levelFromXp, rankFromLevel } from './progression'

/**
 * Local-first leaderboard.
 *
 * There is no server, so rivals are simulated: each has a fixed personality
 * (a daily XP rate plus noise) and their score is a pure function of how long
 * the player has been playing. That gives a solo learner a real race — some
 * rivals are catchable this week, some are not — without pretending to be a
 * multiplayer service. Rivals are labelled as simulated in the UI.
 */

export interface Rival {
  id: string
  name: string
  avatar: string
  xp: number
  level: number
  rankTier: string
  rankColor: string
  /** True for the human player's own row. */
  isPlayer?: boolean
}

const NAMES = [
  'Aarav', 'Diya', 'Rohan', 'Meera', 'Kabir', 'Ananya', 'Vikram', 'Ishita',
  'Arjun', 'Sneha', 'Karthik', 'Priya', 'Rahul', 'Nisha', 'Aditya', 'Tara',
  'Farhan', 'Divya', 'Siddharth', 'Riya', 'Neha', 'Manav', 'Pooja', 'Yash',
]

const AVATARS = ['🧑‍💻', '🧑‍🎓', '🥷', '🧙', '🧑‍🚀', '🕵️', '🤖', '👩‍💻', '👨‍🔬', '🦊', '🐼', '🦁']

interface RivalSeed {
  name: string
  avatar: string
  /** XP per day this rival earns. */
  rate: number
  /**
   * Small head start, so rivals aren't all sitting on zero at signup.
   *
   * Deliberately small: an earlier version handed out up to 900 XP here, which
   * guaranteed every rival was ahead of a new account and ranked a first-day
   * player dead last. The board is supposed to have people above *and* below
   * you — being last on day one is the opposite of motivating.
   */
  base: number
}

function buildSeeds(count: number): RivalSeed[] {
  const rng = seededRng('ascend-rivals-v1')
  const seeds: RivalSeed[] = []
  const used = new Set<string>()
  for (let i = 0; i < count; i++) {
    let name = NAMES[Math.floor(rng() * NAMES.length)]
    while (used.has(name)) name = `${NAMES[Math.floor(rng() * NAMES.length)]} ${String.fromCharCode(65 + Math.floor(rng() * 26))}.`
    used.add(name)
    seeds.push({
      name,
      avatar: AVATARS[Math.floor(rng() * AVATARS.length)],
      // Spread from casual (35/day) to relentless (520/day) so there is always
      // someone just ahead and someone just behind.
      rate: Math.round(35 + rng() * 485),
      base: Math.round(rng() * 140),
    })
  }
  return seeds
}

const SEEDS = buildSeeds(23)

export function buildLeaderboard(
  playerName: string,
  playerAvatar: string,
  playerXp: number,
  firstPlayedAt: number,
  now: number = Date.now(),
): Rival[] {
  const days = Math.max(0.5, (now - firstPlayedAt) / 86_400_000)
  const rows: Rival[] = SEEDS.map((s, i) => {
    // Gentle diminishing returns so rivals don't run away to infinity.
    const xp = Math.round(s.base + s.rate * Math.pow(days, 0.92))
    const { level } = levelFromXp(xp)
    const rank = rankFromLevel(level)
    return {
      id: `rival-${i}`,
      name: s.name,
      avatar: s.avatar,
      xp,
      level,
      rankTier: rank.tier,
      rankColor: rank.color,
    }
  })

  const { level } = levelFromXp(playerXp)
  const rank = rankFromLevel(level)
  rows.push({
    id: 'player',
    name: playerName || 'You',
    avatar: playerAvatar,
    xp: playerXp,
    level,
    rankTier: rank.tier,
    rankColor: rank.color,
    isPlayer: true,
  })

  return rows.sort((a, b) => b.xp - a.xp)
}

export function playerPosition(rows: Rival[]): number {
  return rows.findIndex((r) => r.isPlayer) + 1
}

/** The rival immediately above the player — the one worth chasing today. */
export function nextTarget(rows: Rival[]): Rival | null {
  const idx = rows.findIndex((r) => r.isPlayer)
  return idx > 0 ? rows[idx - 1] : null
}
