/**
 * Core domain types for ASCEND.
 *
 * Design note: everything a student "earns" is a plain serialisable value so the
 * entire save file round-trips through localStorage without custom revivers.
 */

export type Difficulty = 1 | 2 | 3 | 4 | 5

export type WorldId =
  | 'python'
  | 'cpp'
  | 'dsa'
  | 'sql'
  | 'os'
  | 'networking'
  | 'dbms'
  | 'aptitude'
  | 'hr'

/**
 * What a world is training you *for*. The two language tracks are deliberately
 * pointed at different goals — Python at building software, C++ at contest
 * speed — and the UI labels them so a student picks the right one.
 */
export type WorldFocus = 'development' | 'competitive' | 'fundamentals' | 'interview'

export type QuestionKind = 'mcq' | 'multi' | 'predict-output' | 'order' | 'fill'

export interface Question {
  id: string
  world: WorldId
  /** Skill-tree node this question trains. */
  skill: string
  kind: QuestionKind
  difficulty: Difficulty
  prompt: string
  /** Optional monospace block rendered above the choices. */
  code?: string
  choices: string[]
  /** Indices into `choices`. Single-answer kinds use exactly one. */
  answer: number[]
  /** Shown after answering — the "mistake becomes a lesson" payload. */
  explain: string
  /** Short nudge shown when a hint token is spent. Never gives the answer away. */
  hint: string
  /** Interview-flavoured follow-up the AI interviewer can escalate to. */
  followUp?: string
  tags?: string[]
}

export interface SkillNode {
  id: string
  world: WorldId
  name: string
  icon: string
  blurb: string
  /** Skill ids that must reach `masteryToUnlock` before this opens. */
  requires: string[]
  /** Position on the world's skill-tree canvas (grid units). */
  x: number
  y: number
  tier: number
}

export interface World {
  id: WorldId
  name: string
  subtitle: string
  icon: string
  /** Two-stop gradient used across the map node, header and cards. */
  hue: [string, string]
  /** Account level required to enter. */
  unlockLevel: number
  lore: string
  focus: WorldFocus
  skills: SkillNode[]
}

export interface Company {
  id: string
  name: string
  icon: string
  tier: 'startup' | 'service' | 'product' | 'faang'
  unlockLevel: number
  /** Worlds the boss draws questions from. */
  focus: WorldId[]
  /** Boss HP — higher tiers take more correct answers to fell. */
  hp: number
  /** Seconds per question in the boss interview. */
  timer: number
  /** Persona fed to the AI interviewer. */
  persona: string
  rewardGems: number
  rewardXp: number
}

export type RankTier =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master'

export interface Rank {
  tier: RankTier
  division: string
  color: string
  glow: string
}

export interface Mastery {
  /** Latent ability estimate on the same 1–5 scale as question difficulty. */
  theta: number
  seen: number
  correct: number
  /** Rolling streak of correct answers for this skill. */
  hot: number
}

export interface SrsCard {
  qid: string
  ease: number
  intervalDays: number
  dueAt: number
  lapses: number
  /** Epoch ms of the last review — drives the anti-repeat recency penalty. */
  lastSeenAt: number
}

export type QuestKind =
  | 'answer'
  | 'correct'
  | 'combo'
  | 'world'
  | 'boss'
  | 'perfect'
  | 'revise'
  | 'xp'

export interface Quest {
  id: string
  kind: QuestKind
  label: string
  icon: string
  target: number
  progress: number
  rewardXp: number
  rewardGems: number
  claimed: boolean
  /** Restricts `world`-kind quests. */
  world?: WorldId
}

export interface Achievement {
  id: string
  name: string
  desc: string
  icon: string
  tier: 'bronze' | 'silver' | 'gold' | 'legend'
  /** Evaluated against a read-only snapshot of the save. */
  check: (s: AchievementSnapshot) => boolean
}

export interface AchievementSnapshot {
  level: number
  totalXp: number
  totalCorrect: number
  totalAnswered: number
  bestCombo: number
  streak: number
  bossesDefeated: number
  perfectRuns: number
  worldsMastered: number
  gems: number
  skillsUnlocked: number
  revisionsCleared: number
  aiChats: number
}

export type ChestRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface ChestReward {
  rarity: ChestRarity
  gems: number
  xp: number
  hints: number
  freezes: number
  cosmetic?: string
}

export interface AvatarConfig {
  base: string
  color: string
  aura: string
  title: string
}

export interface RunResult {
  world: WorldId
  skill: string | null
  answered: number
  correct: number
  bestCombo: number
  xp: number
  gems: number
  perfect: boolean
  durationMs: number
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}
