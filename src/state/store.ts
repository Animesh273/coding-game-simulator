import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Question,
  WorldId,
  Mastery,
  SrsCard,
  Quest,
  AvatarConfig,
  ChestReward,
  ChestRarity,
  AchievementSnapshot,
} from '../game/types'
import {
  levelFromXp,
  answerXp,
  answerGems,
  dayKey,
  daysBetween,
  DAILY_GOAL_XP,
  loginReward,
  rollChest,
  rollChestRarity,
  bumpStreak,
} from '../game/progression'
import {
  emptyMastery,
  updateMastery,
  masteryPercent,
  selectQuestion,
  reviewCard,
  dueCards,
  speedBonus,
} from '../game/adaptive'
import { generateDailyQuests, generateWeeklyQuests, weekKey, advanceQuests, isComplete } from '../game/quests'
import { newlyEarned, ACHIEVEMENT_BY_ID, TIER_XP, TIER_GEMS } from '../game/achievements'
import { WORLDS, SKILL_BY_ID, UNLOCK_THRESHOLD } from '../content/worlds'
import { COMPANY_BY_ID } from '../content/companies'
import { ALL_QUESTIONS, QUESTION_BY_ID, questionsForWorld, questionsForSkill, questionsForWorlds } from '../content/questions'

/* ------------------------------------------------------------------ types */

export type RunMode = 'practice' | 'revision' | 'timed' | 'boss'

export interface RunState {
  mode: RunMode
  world: WorldId | null
  skill: string | null
  companyId: string | null
  current: Question | null
  used: string[]
  answered: number
  correct: number
  combo: number
  bestCombo: number
  xpEarned: number
  gemsEarned: number
  startedAt: number
  questionStartedAt: number
  target: number
  /** Boss mode only. */
  bossHp: number
  bossMaxHp: number
  strikes: number
  maxStrikes: number
  /** Seconds allowed per question; 0 = untimed. */
  timeLimit: number
  lastAnswer: { question: Question; chosen: number[]; correct: boolean } | null
  finished: boolean
  /** Skill ids touched, used for the debrief. */
  touched: string[]
}

export type GameEvent =
  | { id: string; type: 'levelup'; level: number }
  | { id: string; type: 'achievement'; achievementId: string }
  | { id: string; type: 'chest'; reward: ChestReward }
  | { id: string; type: 'quest'; label: string; xp: number; gems: number }
  | { id: string; type: 'unlock'; label: string; icon: string }
  | { id: string; type: 'toast'; label: string; icon: string }

interface Stats {
  totalAnswered: number
  totalCorrect: number
  bestCombo: number
  bossesDefeated: number
  perfectRuns: number
  revisionsCleared: number
  aiChats: number
  timePlayedMs: number
}

interface StreakState {
  count: number
  best: number
  lastActiveDay: string
  todayXp: number
  loginClaimedDay: string
}

export interface GameState {
  /* ---- identity ---- */
  name: string
  avatar: AvatarConfig
  ownedCosmetics: string[]
  unlockedTitles: string[]
  createdAt: number
  onboarded: boolean

  /* ---- economy ---- */
  totalXp: number
  gems: number
  hints: number
  freezes: number
  pendingChests: ChestRarity[]

  /* ---- knowledge ---- */
  mastery: Record<string, Mastery>
  srs: Record<string, SrsCard>
  recent: boolean[]

  /* ---- meta ---- */
  streak: StreakState
  quests: { dayKey: string; daily: Quest[]; weekKey: string; weekly: Quest[] }
  achievements: string[]
  defeatedCompanies: string[]
  stats: Stats

  /* ---- transient ---- */
  run: RunState | null
  events: GameEvent[]

  /* ---- actions ---- */
  completeOnboarding: (name: string, base: string, color: string) => void
  tickDay: () => void
  claimLogin: () => void
  startRun: (opts: { mode: RunMode; world?: WorldId; skill?: string; companyId?: string }) => void
  submitAnswer: (chosen: number[]) => void
  nextQuestion: () => void
  endRun: () => void
  spendHint: () => boolean
  claimQuest: (id: string) => void
  openChest: () => void
  buyCosmetic: (id: string, cost: number) => boolean
  setAvatar: (patch: Partial<AvatarConfig>) => void
  noteAiChat: () => void
  dismissEvent: (id: string) => void
  resetProgress: () => void
}

/* -------------------------------------------------------------- utilities */

let eventSeq = 0
const evId = () => `ev-${++eventSeq}-${Date.now()}`

function unlockedWorldIds(level: number): WorldId[] {
  return WORLDS.filter((w) => level >= w.unlockLevel).map((w) => w.id)
}

/** A skill node is available once all its prerequisites clear the threshold. */
export function isSkillUnlocked(skillId: string, mastery: Record<string, Mastery>): boolean {
  const node = SKILL_BY_ID[skillId]
  if (!node) return false
  return node.requires.every((r) => masteryPercent(mastery[r] ?? emptyMastery()) >= UNLOCK_THRESHOLD)
}

/**
 * Restricts a pool to skills the tree has actually opened.
 *
 * Falls back to the unfiltered pool if that would leave nothing — better to
 * serve something slightly ahead of the student than to dead-end them.
 */
function unlockedOnly(pool: Question[], mastery: Record<string, Mastery>): Question[] {
  const filtered = pool.filter((q) => isSkillUnlocked(q.skill, mastery))
  return filtered.length > 0 ? filtered : pool
}

export function countUnlockedSkills(mastery: Record<string, Mastery>): number {
  return Object.keys(SKILL_BY_ID).filter((id) => isSkillUnlocked(id, mastery)).length
}

export function worldMasteryPercent(world: WorldId, mastery: Record<string, Mastery>): number {
  const skills = WORLDS.find((w) => w.id === world)?.skills ?? []
  if (skills.length === 0) return 0
  const sum = skills.reduce((acc, s) => acc + masteryPercent(mastery[s.id] ?? emptyMastery()), 0)
  return sum / skills.length
}

function countWorldsMastered(mastery: Record<string, Mastery>): number {
  return WORLDS.filter((w) => worldMasteryPercent(w.id, mastery) >= 0.85).length
}

function snapshot(s: GameState): AchievementSnapshot {
  return {
    level: levelFromXp(s.totalXp).level,
    totalXp: s.totalXp,
    totalCorrect: s.stats.totalCorrect,
    totalAnswered: s.stats.totalAnswered,
    bestCombo: s.stats.bestCombo,
    streak: s.streak.count,
    bossesDefeated: s.stats.bossesDefeated,
    perfectRuns: s.stats.perfectRuns,
    worldsMastered: countWorldsMastered(s.mastery),
    gems: s.gems,
    skillsUnlocked: countUnlockedSkills(s.mastery),
    revisionsCleared: s.stats.revisionsCleared,
    aiChats: s.stats.aiChats,
  }
}

const DEFAULT_AVATAR: AvatarConfig = { base: 'rookie', color: 'azure', aura: 'none', title: 'Aspirant' }

function freshState() {
  const today = dayKey()
  return {
    name: '',
    avatar: DEFAULT_AVATAR,
    ownedCosmetics: ['rookie', 'scholar', 'azure', 'none'],
    unlockedTitles: ['Aspirant'],
    createdAt: Date.now(),
    onboarded: false,
    totalXp: 0,
    gems: 50,
    hints: 3,
    freezes: 0,
    pendingChests: [] as ChestRarity[],
    mastery: {} as Record<string, Mastery>,
    srs: {} as Record<string, SrsCard>,
    recent: [] as boolean[],
    streak: { count: 0, best: 0, lastActiveDay: '', todayXp: 0, loginClaimedDay: '' },
    quests: {
      dayKey: today,
      daily: generateDailyQuests(today, ['python', 'aptitude']),
      weekKey: weekKey(),
      weekly: generateWeeklyQuests(weekKey(), ['python', 'aptitude']),
    },
    achievements: [] as string[],
    defeatedCompanies: [] as string[],
    stats: {
      totalAnswered: 0,
      totalCorrect: 0,
      bestCombo: 0,
      bossesDefeated: 0,
      perfectRuns: 0,
      revisionsCleared: 0,
      aiChats: 0,
      timePlayedMs: 0,
    },
    run: null as RunState | null,
    events: [] as GameEvent[],
  }
}

/* ----------------------------------------------------------------- store */

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...freshState(),

      completeOnboarding: (name, base, color) =>
        set((s) => ({
          name: name.trim() || 'Challenger',
          onboarded: true,
          avatar: { ...s.avatar, base, color },
          ownedCosmetics: Array.from(new Set([...s.ownedCosmetics, base, color])),
          events: [
            ...s.events,
            { id: evId(), type: 'toast', label: 'Welcome to ASCEND. Your journey starts now.', icon: '🚀' },
          ],
        })),

      /** Rolls streak, quests and daily counters forward. Safe to call often. */
      tickDay: () => {
        const s = get()
        const today = dayKey()
        const patch: Partial<GameState> = {}

        // --- streak ---
        if (s.streak.lastActiveDay && s.streak.lastActiveDay !== today) {
          const gap = daysBetween(s.streak.lastActiveDay, today)
          if (gap === 1) {
            patch.streak = { ...s.streak, todayXp: 0 }
          } else if (gap > 1) {
            // A freeze absorbs exactly one missed day.
            if (s.freezes > 0 && gap === 2) {
              patch.freezes = s.freezes - 1
              patch.streak = { ...s.streak, todayXp: 0 }
              patch.events = [
                ...s.events,
                { id: evId(), type: 'toast', label: 'A Streak Freeze saved your streak.', icon: '🧊' },
              ]
            } else {
              patch.streak = { ...s.streak, count: 0, todayXp: 0 }
            }
          }
        }

        // --- quests ---
        const level = levelFromXp(s.totalXp).level
        const worlds = unlockedWorldIds(level)
        const wk = weekKey()
        if (s.quests.dayKey !== today || s.quests.weekKey !== wk) {
          patch.quests = {
            dayKey: today,
            daily: s.quests.dayKey !== today ? generateDailyQuests(today, worlds) : s.quests.daily,
            weekKey: wk,
            weekly: s.quests.weekKey !== wk ? generateWeeklyQuests(wk, worlds) : s.quests.weekly,
          }
        }

        if (Object.keys(patch).length > 0) set(patch as GameState)
      },

      claimLogin: () => {
        const s = get()
        const today = dayKey()
        if (s.streak.loginClaimedDay === today) return

        // Same helper the answer path uses, so the count can never disagree.
        const bumped = bumpStreak(s.streak, today)
        const reward = loginReward(bumped.count)

        set({
          gems: s.gems + reward.gems,
          pendingChests: reward.chest ? [...s.pendingChests, reward.chest] : s.pendingChests,
          streak: { ...bumped, loginClaimedDay: today },
          events: [
            ...s.events,
            {
              id: evId(),
              type: 'toast',
              label: `Day ${bumped.count} streak — +${reward.gems} gems${reward.chest ? ' and a chest!' : ''}`,
              icon: '🔥',
            },
          ],
        })
      },

      /* ------------------------------------------------------------- runs */

      startRun: ({ mode, world, skill, companyId }) => {
        const s = get()
        const now = Date.now()

        let pool: Question[]
        let target = 10
        let timeLimit = 0
        let bossHp = 0
        let maxStrikes = 99

        if (mode === 'boss' && companyId) {
          const company = COMPANY_BY_ID[companyId]
          pool = questionsForWorlds(company.focus)
          bossHp = company.hp
          target = company.hp + 4
          timeLimit = company.timer
          maxStrikes = 3
        } else if (mode === 'revision') {
          const due = dueCards(s.srs, now)
          pool = due.map((c) => QUESTION_BY_ID[c.qid]).filter(Boolean)
          target = Math.min(12, Math.max(1, pool.length))
        } else if (mode === 'timed') {
          pool = unlockedOnly(world ? questionsForWorld(world) : ALL_QUESTIONS, s.mastery)
          target = 12
          timeLimit = 25
        } else {
          // An explicitly chosen skill is already gated by the tree UI; a
          // world-wide run must respect the tree itself, or the locks are
          // decorative and the tracker shows progress on locked topics.
          pool = skill
            ? questionsForSkill(skill)
            : unlockedOnly(world ? questionsForWorld(world) : ALL_QUESTIONS, s.mastery)
          target = Math.min(10, Math.max(4, pool.length))
        }

        if (pool.length === 0) {
          set({
            events: [
              ...s.events,
              { id: evId(), type: 'toast', label: 'Nothing to practise here yet — try another skill.', icon: '🗺️' },
            ],
          })
          return
        }

        const first = selectQuestion({
          pool,
          mastery: s.mastery,
          srs: s.srs,
          usedIds: new Set(),
          now,
          difficultyBias: mode === 'boss' ? 0.6 : 0,
        })

        set({
          run: {
            mode,
            world: world ?? null,
            skill: skill ?? null,
            companyId: companyId ?? null,
            current: first,
            used: first ? [first.id] : [],
            answered: 0,
            correct: 0,
            combo: 0,
            bestCombo: 0,
            xpEarned: 0,
            gemsEarned: 0,
            startedAt: now,
            questionStartedAt: now,
            target,
            bossHp,
            bossMaxHp: bossHp,
            strikes: 0,
            maxStrikes,
            timeLimit,
            lastAnswer: null,
            finished: false,
            touched: first ? [first.skill] : [],
          },
        })
      },

      submitAnswer: (chosen) => {
        const s = get()
        const run = s.run
        if (!run || !run.current || run.lastAnswer) return

        const q = run.current
        const now = Date.now()
        const elapsed = now - run.questionStartedAt

        const expected = [...q.answer].sort().join(',')
        const got = [...chosen].sort().join(',')
        const correct = expected === got

        // ---- scoring ----
        const combo = correct ? run.combo + 1 : 0
        const bonus = correct && run.timeLimit > 0 ? speedBonus(elapsed, run.timeLimit * 1000) : 0
        const xp = correct ? answerXp(q.difficulty, combo, bonus) : 0
        const gems = correct ? answerGems(q.difficulty, combo) : 0

        // ---- knowledge model ----
        const prevMastery = s.mastery[q.skill] ?? emptyMastery()
        const mastery = { ...s.mastery, [q.skill]: updateMastery(prevMastery, q.difficulty, correct) }
        const srs = { ...s.srs, [q.id]: reviewCard(s.srs[q.id], q.id, correct, now) }

        // ---- skill unlock detection ----
        const events: GameEvent[] = [...s.events]
        const beforeUnlocked = countUnlockedSkills(s.mastery)
        const afterUnlocked = countUnlockedSkills(mastery)
        if (afterUnlocked > beforeUnlocked) {
          const opened = Object.keys(SKILL_BY_ID).find(
            (id) => !isSkillUnlocked(id, s.mastery) && isSkillUnlocked(id, mastery),
          )
          const node = opened ? SKILL_BY_ID[opened] : null
          if (node) {
            events.push({ id: evId(), type: 'unlock', label: `Skill unlocked: ${node.name}`, icon: node.icon })
          }
        }

        // ---- level up ----
        const beforeLevel = levelFromXp(s.totalXp).level
        const totalXp = s.totalXp + xp
        const afterLevel = levelFromXp(totalXp).level
        if (afterLevel > beforeLevel) {
          events.push({ id: evId(), type: 'levelup', level: afterLevel })
          // Every level-up drops a chest — the reward loop must close visibly.
          const rarity = rollChestRarity(s.streak.count)
          set({ pendingChests: [...s.pendingChests, rarity] })
        }

        // ---- quests ----
        let daily = advanceQuests(s.quests.daily, { kind: 'answer', amount: 1, world: q.world })
        let weekly = advanceQuests(s.quests.weekly, { kind: 'answer', amount: 1, world: q.world })
        daily = advanceQuests(daily, { kind: 'world', amount: 1, world: q.world })
        weekly = advanceQuests(weekly, { kind: 'world', amount: 1, world: q.world })
        if (correct) {
          daily = advanceQuests(daily, { kind: 'correct', amount: 1, world: q.world })
          weekly = advanceQuests(weekly, { kind: 'correct', amount: 1, world: q.world })
          daily = advanceQuests(daily, { kind: 'combo', amount: combo, world: q.world })
          weekly = advanceQuests(weekly, { kind: 'combo', amount: combo, world: q.world })
          if (run.mode === 'revision') {
            daily = advanceQuests(daily, { kind: 'revise', amount: 1, world: q.world })
            weekly = advanceQuests(weekly, { kind: 'revise', amount: 1, world: q.world })
          }
        }
        if (xp > 0) {
          daily = advanceQuests(daily, { kind: 'xp', amount: xp, world: q.world })
          weekly = advanceQuests(weekly, { kind: 'xp', amount: xp, world: q.world })
        }

        // ---- boss damage ----
        const bossHp = run.mode === 'boss' && correct ? Math.max(0, run.bossHp - 1) : run.bossHp
        const strikes = run.mode === 'boss' && !correct ? run.strikes + 1 : run.strikes

        const stats: Stats = {
          ...s.stats,
          totalAnswered: s.stats.totalAnswered + 1,
          totalCorrect: s.stats.totalCorrect + (correct ? 1 : 0),
          bestCombo: Math.max(s.stats.bestCombo, combo),
          revisionsCleared: s.stats.revisionsCleared + (run.mode === 'revision' && correct ? 1 : 0),
        }

        const recent = [...s.recent, correct].slice(-20)
        const today = dayKey()
        // Playing is what sustains the streak — not remembering to press Claim.
        const bumped = bumpStreak(s.streak, today)
        const streak: StreakState = { ...bumped, todayXp: bumped.todayXp + xp }

        set({
          totalXp,
          gems: s.gems + gems,
          mastery,
          srs,
          recent,
          stats,
          streak,
          quests: { ...s.quests, daily, weekly },
          events,
          run: {
            ...run,
            answered: run.answered + 1,
            correct: run.correct + (correct ? 1 : 0),
            combo,
            bestCombo: Math.max(run.bestCombo, combo),
            xpEarned: run.xpEarned + xp,
            gemsEarned: run.gemsEarned + gems,
            bossHp,
            strikes,
            lastAnswer: { question: q, chosen, correct },
          },
        })

        // Achievements are checked against the freshly-committed state.
        const after = get()
        const earned = newlyEarned(snapshot(after), after.achievements)
        if (earned.length > 0) {
          let bonusXp = 0
          let bonusGems = 0
          const evs = [...after.events]
          for (const a of earned) {
            bonusXp += TIER_XP[a.tier]
            bonusGems += TIER_GEMS[a.tier]
            evs.push({ id: evId(), type: 'achievement', achievementId: a.id })
          }
          set({
            achievements: [...after.achievements, ...earned.map((a) => a.id)],
            totalXp: after.totalXp + bonusXp,
            gems: after.gems + bonusGems,
            events: evs,
          })
        }
      },

      nextQuestion: () => {
        const s = get()
        const run = s.run
        if (!run) return

        const bossDown = run.mode === 'boss' && run.bossHp <= 0
        const struckOut = run.mode === 'boss' && run.strikes >= run.maxStrikes
        if (bossDown || struckOut || run.answered >= run.target) {
          get().endRun()
          return
        }

        let pool: Question[]
        if (run.mode === 'boss' && run.companyId) pool = questionsForWorlds(COMPANY_BY_ID[run.companyId].focus)
        else if (run.mode === 'revision') pool = dueCards(s.srs, Date.now()).map((c) => QUESTION_BY_ID[c.qid]).filter(Boolean)
        else if (run.skill) pool = questionsForSkill(run.skill)
        else if (run.world) pool = unlockedOnly(questionsForWorld(run.world), s.mastery)
        else pool = unlockedOnly(ALL_QUESTIONS, s.mastery)

        const next = selectQuestion({
          pool,
          mastery: s.mastery,
          srs: s.srs,
          usedIds: new Set(run.used),
          now: Date.now(),
          difficultyBias: run.mode === 'boss' ? 0.6 : 0,
        })

        if (!next) {
          get().endRun()
          return
        }

        set({
          run: {
            ...run,
            current: next,
            used: [...run.used, next.id],
            questionStartedAt: Date.now(),
            lastAnswer: null,
            touched: run.touched.includes(next.skill) ? run.touched : [...run.touched, next.skill],
          },
        })
      },

      endRun: () => {
        const s = get()
        const run = s.run
        if (!run || run.finished) return

        const events: GameEvent[] = [...s.events]
        const perfect = run.answered >= 4 && run.correct === run.answered
        let gems = s.gems
        let totalXp = s.totalXp
        const pendingChests = [...s.pendingChests]

        let daily = s.quests.daily
        let weekly = s.quests.weekly

        if (perfect) {
          daily = advanceQuests(daily, { kind: 'perfect', amount: 1, world: run.world ?? undefined })
          weekly = advanceQuests(weekly, { kind: 'perfect', amount: 1, world: run.world ?? undefined })
        }

        // Boss resolution.
        const bossWon = run.mode === 'boss' && run.bossHp <= 0
        let defeated = s.defeatedCompanies
        if (bossWon && run.companyId) {
          const company = COMPANY_BY_ID[run.companyId]
          gems += company.rewardGems
          totalXp += company.rewardXp
          pendingChests.push(run.companyId === 'seedling' ? 'rare' : 'epic')
          if (!defeated.includes(run.companyId)) defeated = [...defeated, run.companyId]
          daily = advanceQuests(daily, { kind: 'boss', amount: 1 })
          weekly = advanceQuests(weekly, { kind: 'boss', amount: 1 })
          events.push({
            id: evId(),
            type: 'unlock',
            label: `${company.name} cleared! +${company.rewardXp} XP, +${company.rewardGems} gems`,
            icon: company.icon,
          })
        }

        set({
          gems,
          totalXp,
          pendingChests,
          defeatedCompanies: defeated,
          quests: { ...s.quests, daily, weekly },
          stats: {
            ...s.stats,
            perfectRuns: s.stats.perfectRuns + (perfect ? 1 : 0),
            bossesDefeated: s.stats.bossesDefeated + (bossWon ? 1 : 0),
            timePlayedMs: s.stats.timePlayedMs + (Date.now() - run.startedAt),
          },
          events,
          run: { ...run, finished: true },
        })

        const after = get()
        const earned = newlyEarned(snapshot(after), after.achievements)
        if (earned.length > 0) {
          set({
            achievements: [...after.achievements, ...earned.map((a) => a.id)],
            totalXp: after.totalXp + earned.reduce((n, a) => n + TIER_XP[a.tier], 0),
            gems: after.gems + earned.reduce((n, a) => n + TIER_GEMS[a.tier], 0),
            events: [...after.events, ...earned.map((a) => ({ id: evId(), type: 'achievement' as const, achievementId: a.id }))],
          })
        }
      },

      /* --------------------------------------------------------- economy */

      spendHint: () => {
        const s = get()
        if (s.hints <= 0) return false
        set({ hints: s.hints - 1 })
        return true
      },

      claimQuest: (id) => {
        const s = get()
        const all = [...s.quests.daily, ...s.quests.weekly]
        const q = all.find((x) => x.id === id)
        if (!q || q.claimed || !isComplete(q)) return

        const mark = (list: Quest[]) => list.map((x) => (x.id === id ? { ...x, claimed: true } : x))
        set({
          totalXp: s.totalXp + q.rewardXp,
          gems: s.gems + q.rewardGems,
          quests: { ...s.quests, daily: mark(s.quests.daily), weekly: mark(s.quests.weekly) },
          events: [
            ...s.events,
            { id: evId(), type: 'quest', label: q.label, xp: q.rewardXp, gems: q.rewardGems },
          ],
        })

        // Claiming can level you up.
        const after = get()
        const before = levelFromXp(s.totalXp).level
        const now = levelFromXp(after.totalXp).level
        if (now > before) {
          set({
            events: [...after.events, { id: evId(), type: 'levelup', level: now }],
            pendingChests: [...after.pendingChests, rollChestRarity(after.streak.count)],
          })
        }
      },

      openChest: () => {
        const s = get()
        if (s.pendingChests.length === 0) return
        const [rarity, ...rest] = s.pendingChests
        const reward = rollChest(rarity)

        const owned = [...s.ownedCosmetics]
        const titles = [...s.unlockedTitles]
        if (reward.cosmetic) {
          const [kind, value] = reward.cosmetic.split(':')
          if (kind === 'title' && !titles.includes(value)) titles.push(value)
          else if (kind === 'aura' && !owned.includes(value)) owned.push(value)
        }

        set({
          pendingChests: rest,
          gems: s.gems + reward.gems,
          totalXp: s.totalXp + reward.xp,
          hints: s.hints + reward.hints,
          freezes: s.freezes + reward.freezes,
          ownedCosmetics: owned,
          unlockedTitles: titles,
          events: [...s.events, { id: evId(), type: 'chest', reward }],
        })
      },

      buyCosmetic: (id, cost) => {
        const s = get()
        if (s.ownedCosmetics.includes(id)) return true
        if (s.gems < cost) return false
        set({
          gems: s.gems - cost,
          ownedCosmetics: [...s.ownedCosmetics, id],
          events: [...s.events, { id: evId(), type: 'toast', label: 'Unlocked!', icon: '🎁' }],
        })
        return true
      },

      setAvatar: (patch) => set((s) => ({ avatar: { ...s.avatar, ...patch } })),

      noteAiChat: () => set((s) => ({ stats: { ...s.stats, aiChats: s.stats.aiChats + 1 } })),

      dismissEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      resetProgress: () => set({ ...freshState(), onboarded: false }),
    }),
    {
      name: 'ascend.save.v1',
      version: 1,
      // Runs and transient events must never be restored — a refresh mid-run
      // should drop you back to the map, not into a half-finished question.
      partialize: (s) => {
        const { run: _run, events: _events, ...rest } = s
        void _run
        void _events
        return rest as GameState
      },
    },
  ),
)

/* ----------------------------------------------------------- selectors */

export function useLevel() {
  return useGame((s) => levelFromXp(s.totalXp))
}

export function dailyGoalProgress(s: GameState): number {
  return Math.min(1, s.streak.todayXp / DAILY_GOAL_XP)
}

export function useDueCount(): number {
  return useGame((s) => dueCards(s.srs, Date.now()).length)
}

export { ACHIEVEMENT_BY_ID, DAILY_GOAL_XP }
