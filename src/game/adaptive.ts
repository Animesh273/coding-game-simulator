import type { Question, Mastery, SrsCard, Difficulty } from './types'

/**
 * Adaptive difficulty + scheduling.
 *
 * Ability (`theta`) lives on the same 1–5 scale as question difficulty, so a
 * student sitting at theta 3.2 gets questions that hover just above their
 * current reach — the flow-channel target of ~75% success.
 */

/**
 * How far above the student's ability we aim, in difficulty units. Tuned so
 * `successProbability` lands near 0.75 — the flow-channel target where the
 * material is winnable but not free.
 */
const CHALLENGE_OFFSET = 0.45

/**
 * Anti-repeat tuning.
 *
 * `UNSEEN_BONUS` exceeds the maximum spread of every other term combined, so
 * while unseen questions remain in the pool one of them always wins — the
 * remaining terms then decide *which* unseen one. `RECENCY_WEIGHT` is the
 * mirror of that for just-answered items, so once the pool is exhausted the
 * repeats that do occur are the ones you saw longest ago.
 */
const UNSEEN_BONUS = 2.6
const RECENCY_WEIGHT = 2.2
const RECENCY_HOURS = 24
/**
 * Within one sitting every timestamp is minutes apart, so the absolute decay
 * above is effectively flat and cannot order them. This term ranks seen
 * candidates against each other — oldest gets 0, most-recent gets the full
 * weight — which makes an exhausted pool behave like LRU instead of
 * re-serving whatever happened to fit best.
 */
const RECENCY_RANK_WEIGHT = 0.9

export function successProbability(theta: number, difficulty: number): number {
  return 1 / (1 + Math.exp(-(theta - difficulty) * 1.15))
}

export function emptyMastery(): Mastery {
  // Everyone starts assumed to be around "easy-medium" so the first questions
  // are winnable — the opening minute has to feel good.
  return { theta: 1.6, seen: 0, correct: 0, hot: 0 }
}

/**
 * Elo-style update. The learning rate decays with exposure so early answers
 * move the estimate quickly and later ones refine it.
 */
export function updateMastery(m: Mastery, difficulty: number, correct: boolean): Mastery {
  const p = successProbability(m.theta, difficulty)
  const k = 0.55 / (1 + m.seen * 0.06)
  const theta = clamp(m.theta + k * ((correct ? 1 : 0) - p) * 4, 0.5, 5.5)
  return {
    theta,
    seen: m.seen + 1,
    correct: m.correct + (correct ? 1 : 0),
    hot: correct ? m.hot + 1 : 0,
  }
}

/** 0–1 mastery bar. Blends ability with evidence so 2/2 isn't "mastered". */
export function masteryPercent(m: Mastery): number {
  if (m.seen === 0) return 0
  const ability = clamp((m.theta - 1) / 4, 0, 1)
  const confidence = 1 - Math.exp(-m.seen / 7)
  return clamp(ability * confidence, 0, 1)
}

export function masteryBadge(pct: number): { label: string; color: string } {
  if (pct >= 0.9) return { label: 'Mastered', color: '#ffcc4d' }
  if (pct >= 0.7) return { label: 'Strong', color: '#5fe3d0' }
  if (pct >= 0.45) return { label: 'Steady', color: '#7db8ff' }
  if (pct >= 0.2) return { label: 'Shaky', color: '#ff9f5a' }
  return { label: 'New', color: '#8b93a7' }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

/* ------------------------------------------------------- question selection */

export interface SelectContext {
  pool: Question[]
  mastery: Record<string, Mastery>
  srs: Record<string, SrsCard>
  /** Questions already served this run — never repeat inside one run. */
  usedIds: Set<string>
  now: number
  /** Nudges the target difficulty up (boss fights) or down (warm-ups). */
  difficultyBias?: number
}

/**
 * Scores every candidate and returns the best fit.
 *
 * The score balances four pulls:
 *  - proximity to the student's challenge point (flow),
 *  - spaced-repetition due-ness (retention),
 *  - coverage of weak skills (targeted remediation),
 *  - a little noise so consecutive sessions don't feel scripted.
 */
export function selectQuestion(ctx: SelectContext): Question | null {
  const { pool, mastery, srs, usedIds, now } = ctx
  const bias = ctx.difficultyBias ?? 0
  const candidates = pool.filter((q) => !usedIds.has(q.id))
  if (candidates.length === 0) return null

  // Range of last-seen times across the candidates, for the relative term.
  let oldestSeen = Infinity
  let newestSeen = -Infinity
  for (const q of candidates) {
    const seenAt = srs[q.id]?.lastSeenAt
    if (seenAt === undefined) continue
    if (seenAt < oldestSeen) oldestSeen = seenAt
    if (seenAt > newestSeen) newestSeen = seenAt
  }
  const seenSpan = newestSeen - oldestSeen

  let best: Question | null = null
  let bestScore = -Infinity

  for (const q of candidates) {
    const m = mastery[q.skill] ?? emptyMastery()
    const target = m.theta + CHALLENGE_OFFSET + bias
    const fit = 1 - Math.min(1, Math.abs(q.difficulty - target) / 2.5)

    const card = srs[q.id]
    let due = 0
    let freshness = 0

    if (card) {
      const overdueDays = (now - card.dueAt) / 86_400_000
      due = overdueDays >= 0 ? Math.min(1, 0.35 + overdueDays * 0.25) : -0.55
      // Repeatedly-failed cards get pulled forward hard.
      due += Math.min(0.4, card.lapses * 0.12)

      // Recency veto. Without this, a *seen* question with a perfect
      // difficulty fit (fit ≈ 1.0) outscores an *unseen* one with a mediocre
      // fit, so consecutive sessions kept serving the same items. The penalty
      // decays over a day and is large enough that nothing answered in the
      // last few hours can win while genuinely new material is available.
      const lastSeen = card.lastSeenAt ?? 0
      const hoursSince = (now - lastSeen) / 3_600_000
      if (hoursSince < RECENCY_HOURS) {
        freshness = -RECENCY_WEIGHT * (1 - hoursSince / RECENCY_HOURS)
      }
      // Relative rank among seen candidates: 0 for the least-recently-seen,
      // full weight for the most recent.
      if (seenSpan > 0) {
        freshness -= RECENCY_RANK_WEIGHT * ((lastSeen - oldestSeen) / seenSpan)
      }
    } else {
      // Unseen material wins outright while any remains — a student who has
      // answered 40 of 104 questions should be shown the other 64 first.
      freshness = UNSEEN_BONUS
    }

    const weakness = 1 - masteryPercent(m)
    const noise = Math.random() * 0.22

    const score = fit * 1.0 + due * 0.85 + freshness + weakness * 0.5 + noise
    if (score > bestScore) {
      bestScore = score
      best = q
    }
  }
  return best
}

/** Difficulty the engine believes the student is ready for right now. */
export function recommendedDifficulty(m: Mastery): Difficulty {
  const raw = Math.round(m.theta + CHALLENGE_OFFSET)
  return clamp(raw, 1, 5) as Difficulty
}

/* ---------------------------------------------------- spaced repetition (SM-2 lite) */

export function reviewCard(card: SrsCard | undefined, qid: string, correct: boolean, now: number): SrsCard {
  const c: SrsCard = card ?? { qid, ease: 2.5, intervalDays: 0, dueAt: now, lapses: 0, lastSeenAt: now }
  if (!correct) {
    return {
      qid,
      ease: Math.max(1.3, c.ease - 0.22),
      intervalDays: 0,
      // Failed material comes back inside the same day — that's the whole point
      // of the Revision Dungeon.
      dueAt: now + 4 * 60 * 60 * 1000,
      lapses: c.lapses + 1,
      lastSeenAt: now,
    }
  }
  const ease = Math.min(3.0, c.ease + 0.06)
  const next = c.intervalDays === 0 ? 1 : c.intervalDays === 1 ? 3 : Math.round(c.intervalDays * ease)
  return {
    qid,
    ease,
    intervalDays: next,
    dueAt: now + next * 86_400_000,
    lapses: c.lapses,
    lastSeenAt: now,
  }
}

/** How much of a pool the student has never been served. */
export function unseenCount(pool: { id: string }[], srs: Record<string, SrsCard>): number {
  return pool.filter((q) => !srs[q.id]).length
}

export function dueCards(srs: Record<string, SrsCard>, now: number): SrsCard[] {
  return Object.values(srs)
    .filter((c) => c.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
}

/** Speed bonus XP — rewards fluency without punishing careful thinkers. */
export function speedBonus(elapsedMs: number, limitMs: number): number {
  if (limitMs <= 0) return 0
  const ratio = 1 - elapsedMs / limitMs
  if (ratio <= 0.25) return 0
  return Math.round(ratio * 8)
}
