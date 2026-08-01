import type { Achievement, AchievementSnapshot } from './types'

/**
 * Badges. Deliberately a mix of "you will get this in your first ten minutes"
 * and "this will take a month" — the near ones prove the system rewards you,
 * the far ones give the grind a destination.
 */
export const ACHIEVEMENTS: Achievement[] = [
  // --- first steps ---------------------------------------------------------
  { id: 'first-blood', name: 'First Blood', desc: 'Answer your first question correctly.', icon: '🩸', tier: 'bronze', check: (s) => s.totalCorrect >= 1 },
  { id: 'level-5', name: 'Finding Your Feet', desc: 'Reach level 5.', icon: '🥾', tier: 'bronze', check: (s) => s.level >= 5 },
  { id: 'combo-5', name: 'Warmed Up', desc: 'Hit a 5x combo.', icon: '🔥', tier: 'bronze', check: (s) => s.bestCombo >= 5 },
  { id: 'streak-3', name: 'Habit Forming', desc: 'Maintain a 3-day streak.', icon: '📅', tier: 'bronze', check: (s) => s.streak >= 3 },
  { id: 'skills-5', name: 'Branching Out', desc: 'Unlock 5 skill nodes.', icon: '🌿', tier: 'bronze', check: (s) => s.skillsUnlocked >= 5 },
  { id: 'curious', name: 'Curious Mind', desc: 'Ask the AI mentor 5 questions.', icon: '💭', tier: 'bronze', check: (s) => s.aiChats >= 5 },

  // --- getting serious -----------------------------------------------------
  { id: 'century', name: 'Century', desc: 'Answer 100 questions.', icon: '💯', tier: 'silver', check: (s) => s.totalAnswered >= 100 },
  { id: 'combo-10', name: 'On Fire', desc: 'Hit a 10x combo.', icon: '🔥', tier: 'silver', check: (s) => s.bestCombo >= 10 },
  { id: 'first-boss', name: 'Giant Slayer', desc: 'Win your first boss interview.', icon: '⚔️', tier: 'silver', check: (s) => s.bossesDefeated >= 1 },
  { id: 'streak-7', name: 'Seven Day Siege', desc: 'Maintain a 7-day streak.', icon: '🗓️', tier: 'silver', check: (s) => s.streak >= 7 },
  { id: 'level-12', name: 'Gold Standard', desc: 'Reach Gold rank (level 12).', icon: '🏅', tier: 'silver', check: (s) => s.level >= 12 },
  { id: 'flawless', name: 'Flawless', desc: 'Complete a run without a single mistake.', icon: '💠', tier: 'silver', check: (s) => s.perfectRuns >= 1 },
  { id: 'rich', name: 'Gem Hoarder', desc: 'Hold 1,000 gems at once.', icon: '💰', tier: 'silver', check: (s) => s.gems >= 1000 },
  { id: 'reviser', name: 'Dungeon Delver', desc: 'Clear 50 revision cards.', icon: '🗝️', tier: 'silver', check: (s) => s.revisionsCleared >= 50 },

  // --- long haul -----------------------------------------------------------
  { id: 'combo-20', name: 'Unstoppable', desc: 'Hit a 20x combo.', icon: '☄️', tier: 'gold', check: (s) => s.bestCombo >= 20 },
  { id: 'streak-30', name: 'Iron Discipline', desc: 'Maintain a 30-day streak.', icon: '🛡️', tier: 'gold', check: (s) => s.streak >= 30 },
  { id: 'world-master', name: 'World Master', desc: 'Master every skill in a world.', icon: '🌍', tier: 'gold', check: (s) => s.worldsMastered >= 1 },
  { id: 'boss-5', name: 'Offer Collector', desc: 'Defeat 5 boss interviews.', icon: '📜', tier: 'gold', check: (s) => s.bossesDefeated >= 5 },
  { id: 'level-20', name: 'Platinum Tier', desc: 'Reach Platinum rank (level 20).', icon: '💎', tier: 'gold', check: (s) => s.level >= 20 },
  { id: 'thousand', name: 'Grinder', desc: 'Answer 1,000 questions.', icon: '⛏️', tier: 'gold', check: (s) => s.totalAnswered >= 1000 },
  { id: 'sharp', name: 'Sharpshooter', desc: '85% accuracy over 200+ answers.', icon: '🎯', tier: 'gold', check: (s) => s.totalAnswered >= 200 && s.totalCorrect / s.totalAnswered >= 0.85 },

  // --- legend --------------------------------------------------------------
  { id: 'level-42', name: 'Master Rank', desc: 'Reach Master rank (level 42).', icon: '👑', tier: 'legend', check: (s) => s.level >= 42 },
  { id: 'all-worlds', name: 'Cartographer', desc: 'Master every skill in 4 worlds.', icon: '🗺️', tier: 'legend', check: (s) => s.worldsMastered >= 4 },
  { id: 'all-bosses', name: 'Placement Ready', desc: 'Defeat every boss interview.', icon: '🏆', tier: 'legend', check: (s) => s.bossesDefeated >= 7 },
  { id: 'streak-100', name: 'Centurion', desc: 'Maintain a 100-day streak.', icon: '🔱', tier: 'legend', check: (s) => s.streak >= 100 },
]

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]))

export const TIER_COLOR: Record<Achievement['tier'], string> = {
  bronze: '#c98b52',
  silver: '#c8d3e0',
  gold: '#f5c542',
  legend: '#c58cff',
}

export const TIER_XP: Record<Achievement['tier'], number> = {
  bronze: 50,
  silver: 150,
  gold: 400,
  legend: 1000,
}

export const TIER_GEMS: Record<Achievement['tier'], number> = {
  bronze: 25,
  silver: 75,
  gold: 200,
  legend: 500,
}

/** Returns the ids newly satisfied by this snapshot. */
export function newlyEarned(snapshot: AchievementSnapshot, already: string[]): Achievement[] {
  const have = new Set(already)
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(snapshot))
}
