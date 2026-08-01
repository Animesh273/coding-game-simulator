/**
 * Headless smoke test for the game loop.
 *
 * Drives the real store through a full session — onboarding, practice runs,
 * a boss fight, quest claims, chest opens — and asserts the invariants that
 * matter. A green build says the types line up; this says the game plays.
 *
 * Run with:  npx tsx scripts/smoke.ts
 */

/* ---- minimal browser shims so the persist middleware can initialise ---- */

const store = new Map<string, string>()
;(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size
  },
}
;(globalThis as Record<string, unknown>).window = globalThis

let failures = 0
let checks = 0

function check(label: string, cond: boolean, detail?: unknown) {
  checks++
  if (cond) {
    console.log(`  \x1b[32m✓\x1b[0m ${label}`)
  } else {
    failures++
    console.log(`  \x1b[31m✗ ${label}\x1b[0m${detail !== undefined ? ` → ${JSON.stringify(detail)}` : ''}`)
  }
}

function section(name: string) {
  console.log(`\n\x1b[1m${name}\x1b[0m`)
}

async function main() {
  const { useGame, worldMasteryPercent, countUnlockedSkills, isSkillUnlocked } = await import('../src/state/store')
  const { levelFromXp, xpToNext, rankFromLevel, rollChest, rollChestRarity, loginReward, daysBetween, bumpStreak } =
    await import('../src/game/progression')
  const { selectQuestion, updateMastery, emptyMastery, masteryPercent, reviewCard, dueCards } = await import(
    '../src/game/adaptive'
  )
  const { ALL_QUESTIONS, QUESTION_COUNT, QUESTION_BY_ID, questionsForSkill } = await import(
    '../src/content/questions'
  )
  const { WORLDS, SKILL_BY_ID } = await import('../src/content/worlds')
  const { COMPANIES } = await import('../src/content/companies')
  const { ACHIEVEMENTS } = await import('../src/game/achievements')
  const { buildLeaderboard, playerPosition } = await import('../src/game/leaderboard')
  const { generateDailyQuests, advanceQuests, isComplete } = await import('../src/game/quests')

  /* ================================================== content integrity == */
  section('Content integrity')

  check(`${QUESTION_COUNT} questions loaded`, QUESTION_COUNT > 100, QUESTION_COUNT)

  const ids = new Set<string>()
  const dupes = ALL_QUESTIONS.filter((q) => (ids.has(q.id) ? true : (ids.add(q.id), false)))
  check('no duplicate question ids', dupes.length === 0, dupes.map((q) => q.id))

  const orphans = ALL_QUESTIONS.filter((q) => !SKILL_BY_ID[q.skill])
  check('every question maps to a real skill node', orphans.length === 0, orphans.map((q) => q.id))

  const badAnswers = ALL_QUESTIONS.filter(
    (q) => q.answer.length === 0 || q.answer.some((i) => i < 0 || i >= q.choices.length),
  )
  check('every answer index is in range', badAnswers.length === 0, badAnswers.map((q) => q.id))

  const noExplain = ALL_QUESTIONS.filter((q) => !q.explain || q.explain.length < 40)
  check('every question has a substantive explanation', noExplain.length === 0, noExplain.map((q) => q.id))

  const noHint = ALL_QUESTIONS.filter((q) => !q.hint)
  check('every question has a hint', noHint.length === 0, noHint.map((q) => q.id))

  const singleAnswerMulti = ALL_QUESTIONS.filter((q) => q.kind !== 'multi' && q.answer.length !== 1)
  check('single-answer kinds have exactly one answer', singleAnswerMulti.length === 0, singleAnswerMulti.map((q) => q.id))

  const emptySkills = Object.keys(SKILL_BY_ID).filter((id) => questionsForSkill(id).length === 0)
  check('every skill node has at least one question', emptySkills.length === 0, emptySkills)

  const { ALL_LESSONS, LESSON_BY_SKILL, LESSON_COUNT } = await import('../src/content/lessons')

  check(`${LESSON_COUNT} lessons written`, LESSON_COUNT >= 13, LESSON_COUNT)
  check(
    'every lesson maps to a real skill node',
    ALL_LESSONS.every((l) => !!SKILL_BY_ID[l.skillId]),
    ALL_LESSONS.filter((l) => !SKILL_BY_ID[l.skillId]).map((l) => l.skillId),
  )
  check(
    'no duplicate lessons for one skill',
    Object.keys(LESSON_BY_SKILL).length === ALL_LESSONS.length,
  )
  check(
    'every lesson has sections, key points and an interview angle',
    ALL_LESSONS.every((l) => l.sections.length >= 3 && l.keyPoints.length >= 3 && l.interviewAngle.length > 40),
    ALL_LESSONS.filter((l) => l.sections.length < 3 || l.keyPoints.length < 3).map((l) => l.skillId),
  )
  check(
    'every lesson section has a heading and a body',
    ALL_LESSONS.every((l) => l.sections.every((s) => s.heading.length > 0 && s.body.length > 40)),
  )
  /*
   * Inline-markup hazards. Identifiers like `unordered_map` are fine — they
   * render literally, which is what we want. The real failure is *accidental*
   * markup: two bare underscores on one line make RichText italicise everything
   * between them, and an odd number of asterisks leaves one printed raw.
   */
  {
    const stripCode = (t: string) => t.replace(/`[^`]*`/g, '')
    const offenders: string[] = []
    for (const l of ALL_LESSONS) {
      const texts = [l.intro, l.interviewAngle, ...l.sections.map((s) => s.body), ...l.keyPoints]
      for (const raw of texts) {
        for (const line of stripCode(raw).split('\n')) {
          if ((line.match(/_/g) ?? []).length >= 2) {
            offenders.push(`${l.skillId} accidental italics: ${line.slice(0, 50)}`)
          }
          if ((line.match(/\*/g) ?? []).length % 2 !== 0) {
            offenders.push(`${l.skillId} unbalanced *: ${line.slice(0, 50)}`)
          }
        }
      }
    }
    check('lesson prose has no accidental italics or unbalanced emphasis', offenders.length === 0, offenders.slice(0, 4))
  }
  check(
    'both language tracks are fully covered by lessons',
    ['python', 'cpp'].every((w) =>
      WORLDS.find((x) => x.id === w)!.skills.every((s) => !!LESSON_BY_SKILL[s.id]),
    ),
    ['python', 'cpp'].flatMap((w) =>
      WORLDS.find((x) => x.id === w)!.skills.filter((s) => !LESSON_BY_SKILL[s.id]).map((s) => s.id),
    ),
  )

  check(
    'worlds are ordered by unlock level (playable content leads the map)',
    WORLDS.every((w, i) => i === 0 || WORLDS[i - 1].unlockLevel <= w.unlockLevel),
    WORLDS.map((w) => `${w.name}:${w.unlockLevel}`),
  )

  const badPrereqs = WORLDS.flatMap((w) =>
    w.skills.flatMap((s) => s.requires.filter((r) => !SKILL_BY_ID[r])),
  )
  check('every skill prerequisite exists', badPrereqs.length === 0, badPrereqs)

  /* ======================================================== progression == */
  section('Progression maths')

  check('xpToNext strictly increases', [1, 5, 10, 20, 40].every((l) => xpToNext(l) < xpToNext(l + 1)))

  let cumulative = 0
  let levelOk = true
  for (let l = 1; l <= 60; l++) {
    const got = levelFromXp(cumulative).level
    if (got !== l) {
      levelOk = false
      console.log(`      level mismatch at ${l}: got ${got} for ${cumulative} xp`)
      break
    }
    cumulative += xpToNext(l)
  }
  check('levelFromXp inverts the xp curve for 60 levels', levelOk)

  check('level 1 is Bronze', rankFromLevel(1).tier === 'Bronze')
  check('level 12 is Gold', rankFromLevel(12).tier === 'Gold')
  check('level 45 is Master', rankFromLevel(45).tier === 'Master')

  check('daysBetween handles month boundaries', daysBetween('2026-01-31', '2026-02-01') === 1)
  check('daysBetween handles year boundaries', daysBetween('2025-12-31', '2026-01-01') === 1)

  const chest = rollChest('legendary', () => 0.5)
  check('legendary chest pays out', chest.gems > 100 && chest.xp > 200, chest)
  check('streak improves chest luck', rollChestRarity(80, () => 0.1) !== 'common')
  check('day 7 login grants a chest', loginReward(7).chest === 'epic')

  const s0 = { count: 0, best: 0, lastActiveDay: '', todayXp: 0 }
  const d1 = bumpStreak(s0, '2026-08-01')
  check('first activity starts the streak at 1', d1.count === 1)
  check('same-day activity does not double-count', bumpStreak(d1, '2026-08-01').count === 1)
  const d2 = bumpStreak(d1, '2026-08-02')
  check('consecutive days extend the streak', d2.count === 2)
  check('a skipped day resets the streak', bumpStreak(d2, '2026-08-04').count === 1)
  check('best streak is retained after a reset', bumpStreak(d2, '2026-08-04').best === 2)
  check('a new day clears the daily xp counter', bumpStreak({ ...d2, todayXp: 90 }, '2026-08-03').todayXp === 0)

  /* ============================================================ adaptive == */
  section('Adaptive engine')

  let m = emptyMastery()
  for (let i = 0; i < 12; i++) m = updateMastery(m, 3, true)
  const strong = m.theta
  let m2 = emptyMastery()
  for (let i = 0; i < 12; i++) m2 = updateMastery(m2, 3, false)
  check('correct answers raise ability, wrong answers lower it', strong > 2.5 && m2.theta < 1.5, {
    strong: strong.toFixed(2),
    weak: m2.theta.toFixed(2),
  })
  check('mastery percent grows with evidence', masteryPercent(m) > masteryPercent(emptyMastery()))
  check('mastery percent stays bounded', masteryPercent(m) <= 1 && masteryPercent(m2) >= 0)

  const card1 = reviewCard(undefined, 'py-1', true, 0)
  const card2 = reviewCard(card1, 'py-1', true, 0)
  check('correct reviews push the interval out', card2.intervalDays > card1.intervalDays, [card1.intervalDays, card2.intervalDays])
  const lapsed = reviewCard(card2, 'py-1', false, 0)
  check('a lapse pulls the card back to today', lapsed.intervalDays === 0 && lapsed.lapses === 1)
  check('due cards are found', dueCards({ 'py-1': lapsed }, 1e12).length === 1)

  // Selection should never repeat inside a run and should stay in-pool.
  const pool = ALL_QUESTIONS.filter((q) => q.world === 'dsa')
  const used = new Set<string>()
  let selectionOk = true
  for (let i = 0; i < pool.length; i++) {
    const q = selectQuestion({ pool, mastery: {}, srs: {}, usedIds: used, now: Date.now() })
    if (!q || used.has(q.id) || !pool.includes(q)) {
      selectionOk = false
      break
    }
    used.add(q.id)
  }
  check('selection never repeats and never leaves the pool', selectionOk)

  // The reported bug: consecutive sessions kept re-serving the same questions
  // while plenty of the pool had never been shown.
  {
    const t0 = Date.now()
    let srs: Record<string, import('../src/game/types').SrsCard> = {}
    const runOf = (n: number, at: number) => {
      const seen = new Set<string>()
      const served: string[] = []
      for (let i = 0; i < n; i++) {
        const q = selectQuestion({ pool, mastery: {}, srs, usedIds: seen, now: at })
        if (!q) break
        seen.add(q.id)
        served.push(q.id)
        srs = { ...srs, [q.id]: reviewCard(srs[q.id], q.id, true, at) }
      }
      return served
    }

    const first = runOf(8, t0)
    // Immediately afterwards — the worst case for repeats.
    const second = runOf(8, t0 + 60_000)
    const overlap = second.filter((id) => first.includes(id)).length
    check(
      'a second run back-to-back serves all-new questions',
      overlap === 0,
      { overlap, first: first.length, second: second.length },
    )

    // 16 of the 18-question DSA pool are now used, so run three *must* repeat.
    // What it must not do is skip the two remaining unseen ones.
    const seenSoFar = new Set([...first, ...second])
    const stillUnseen = pool.filter((q) => !seenSoFar.has(q.id)).map((q) => q.id)
    const third = runOf(8, t0 + 120_000)
    check(
      'the last unseen questions are served before any repeat',
      stillUnseen.every((id) => third.includes(id)),
      { stillUnseen, third },
    )

    // Everything is now seen, so repeats are unavoidable — but they must be the
    // least-recently-seen items, never the ones just answered.
    const fourth = runOf(4, t0 + 180_000)
    check('an exhausted pool still returns questions', fourth.length === 4, fourth.length)
    const lastFourOfThird = third.slice(-4)
    check(
      'exhausted-pool repeats avoid the most recently answered',
      fourth.every((id) => !lastFourOfThird.includes(id)),
      { fourth, mostRecent: lastFourOfThird },
    )
  }
  check(
    'selection returns null once exhausted',
    selectQuestion({ pool, mastery: {}, srs: {}, usedIds: used, now: Date.now() }) === null,
  )

  /* ================================================================ store == */
  section('Store — full session')

  const g = () => useGame.getState()

  g().completeOnboarding('Smoke Tester', 'ninja', 'ember')
  check('onboarding completes', g().onboarded && g().name === 'Smoke Tester')
  check('starter cosmetics granted', g().ownedCosmetics.includes('ninja'))

  // Playing must sustain the streak on its own — a student who answers ten
  // questions should never be told they have a 0-day streak because they
  // didn't visit the Quests tab.
  useGame.setState({ streak: { count: 0, best: 0, lastActiveDay: '', todayXp: 0, loginClaimedDay: '' } })
  g().startRun({ mode: 'practice', world: 'python' })
  g().submitAnswer(g().run!.current!.answer)
  check('answering a question starts the streak without claiming', g().streak.count === 1, g().streak)
  check('daily xp accrues from play', g().streak.todayXp > 0, g().streak.todayXp)
  // Clear the knowledge state the probe just wrote so the full-run assertions
  // below can assert exact counts.
  useGame.setState({ run: null, srs: {}, mastery: {}, recent: [] })
  g().events.forEach((e) => g().dismissEvent(e.id))

  g().claimLogin()
  check('claiming does not double-count an already-active day', g().streak.count === 1)
  const gemsAfterLogin = g().gems
  g().claimLogin()
  check('login cannot be double-claimed', g().gems === gemsAfterLogin)

  // --- play a full practice run, always answering correctly ---
  g().startRun({ mode: 'practice', world: 'python' })
  check('run starts with a question', g().run?.current != null)

  let guard = 0
  while (g().run && !g().run!.finished && guard++ < 60) {
    const cur = g().run!.current!
    g().submitAnswer(cur.answer)
    g().nextQuestion()
  }
  const finished = g().run!
  check('run terminates', finished.finished, { answered: finished.answered, guard })
  check('all answers were correct', finished.correct === finished.answered)
  check('combo reached the run length', finished.bestCombo === finished.answered, finished.bestCombo)
  check('xp was earned', finished.xpEarned > 0, finished.xpEarned)
  check('gems were earned', finished.gemsEarned > 0, finished.gemsEarned)
  check('perfect run recorded', g().stats.perfectRuns === 1)
  check('mastery recorded for python', worldMasteryPercent('python', g().mastery) > 0)
  check('srs cards created', Object.keys(g().srs).length === finished.answered)
  check('skills unlocked past the starting set', countUnlockedSkills(g().mastery) > 0)
  check('every served question maps to a real skill', Object.keys(g().srs).every((qid) => !!QUESTION_BY_ID[qid]))
  check('level rose above 1', levelFromXp(g().totalXp).level > 1, g().totalXp)
  check('a chest is waiting after level-up', g().pendingChests.length > 0)

  // --- events fired ---
  const evTypes = new Set(g().events.map((e) => e.type))
  check('level-up event queued', evTypes.has('levelup'), [...evTypes])
  check('achievement events queued', g().achievements.length > 0, g().achievements)

  // --- lessons pay out once ---
  {
    const xpBefore = g().totalXp
    const gemsBefore = g().gems
    g().completeLesson('py.basics')
    check('completing a lesson grants xp', g().totalXp > xpBefore)
    check('completing a lesson grants gems', g().gems > gemsBefore)
    check('lesson is recorded as read', g().lessonsRead.includes('py.basics'))

    const xpAfter = g().totalXp
    const gemsAfter = g().gems
    g().completeLesson('py.basics')
    check('re-reading a lesson pays nothing', g().totalXp === xpAfter && g().gems === gemsAfter)
    check('lesson is not recorded twice', g().lessonsRead.filter((s) => s === 'py.basics').length === 1)
  }

  // --- chest opening ---
  const beforeChest = { gems: g().gems, chests: g().pendingChests.length }
  g().openChest()
  check('opening a chest consumes it', g().pendingChests.length === beforeChest.chests - 1)
  check('opening a chest pays gems', g().gems > beforeChest.gems)

  // World-wide runs deliberately range beyond the unlocked skill nodes. Gating
  // them to unlocked-only was measured to starve the pool — by the third Python
  // run 9 of 10 questions repeated while unseen material sat behind locked
  // nodes. The guarantee is exact: every unseen question is served before any
  // repeat, so a run's new-question count is capped only by what is left.
  {
    const pythonPool = ALL_QUESTIONS.filter((q) => q.world === 'python')
    const unseenAtStart = pythonPool.filter((q) => !g().srs[q.id]).length
    const before = Object.keys(g().srs).length
    let served = 0
    for (let r = 0; r < 3; r++) {
      g().startRun({ mode: 'practice', world: 'python' })
      let guard = 0
      while (g().run && !g().run!.finished && guard++ < 40) {
        served++
        g().submitAnswer(g().run!.current!.answer)
        g().nextQuestion()
      }
      useGame.setState({ run: null })
    }
    const found = Object.keys(g().srs).length - before
    check(
      'world runs exhaust every unseen question before repeating any',
      found === Math.min(served, unseenAtStart),
      { found, served, unseenAtStart, poolSize: pythonPool.length },
    )
  }

  // --- a wrong-answer run schedules revision ---
  g().events.forEach((e) => g().dismissEvent(e.id))
  g().startRun({ mode: 'practice', world: 'dsa' })
  guard = 0
  while (g().run && !g().run!.finished && guard++ < 60) {
    const cur = g().run!.current!
    // Deliberately pick a wrong index.
    const wrong = cur.choices.map((_, i) => i).find((i) => !cur.answer.includes(i))!
    g().submitAnswer([wrong])
    g().nextQuestion()
  }
  check('failing run records zero correct', g().run!.correct === 0)
  check('failed cards are due immediately-ish', dueCards(g().srs, Date.now() + 5 * 3600_000).length > 0)
  check('recent-answer window tracks failures', g().recent.slice(-3).every((r) => r === false))

  // --- boss fight, won ---
  useGame.setState({ totalXp: 60000 })
  const boss = COMPANIES[0]
  g().startRun({ mode: 'boss', companyId: boss.id })
  check('boss run has HP', g().run?.bossMaxHp === boss.hp)
  guard = 0
  while (g().run && !g().run!.finished && guard++ < 60) {
    const cur = g().run!.current!
    g().submitAnswer(cur.answer)
    g().nextQuestion()
  }
  check('boss defeated', g().run!.bossHp === 0)
  check('boss recorded as defeated', g().defeatedCompanies.includes(boss.id))
  check('boss counted in stats', g().stats.bossesDefeated === 1)

  // --- boss fight, lost on strikes ---
  g().startRun({ mode: 'boss', companyId: boss.id })
  guard = 0
  while (g().run && !g().run!.finished && guard++ < 60) {
    const cur = g().run!.current!
    const wrong = cur.choices.map((_, i) => i).find((i) => !cur.answer.includes(i))!
    g().submitAnswer([wrong])
    g().nextQuestion()
  }
  check('three strikes ends the boss run', g().run!.strikes >= 3 && g().run!.finished, {
    strikes: g().run!.strikes,
  })
  check('losing does not credit a win', g().stats.bossesDefeated === 1)

  // --- hints ---
  const hintsBefore = g().hints
  const spent = g().spendHint()
  check('hint spends a token', spent && g().hints === hintsBefore - 1)
  useGame.setState({ hints: 0 })
  check('cannot spend a hint at zero', g().spendHint() === false)

  // --- cosmetics ---
  useGame.setState({ gems: 10_000 })
  check('cosmetic purchase succeeds with funds', g().buyCosmetic('dragon', 1500))
  check('cosmetic is owned after purchase', g().ownedCosmetics.includes('dragon'))
  useGame.setState({ gems: 0 })
  check('cosmetic purchase fails without funds', g().buyCosmetic('astronaut', 450) === false)

  /* =============================================================== quests == */
  section('Quests')

  const daily = generateDailyQuests('2026-07-31', ['python', 'dsa'])
  check('three daily quests generated', daily.length === 3, daily.length)
  check('quest generation is deterministic', JSON.stringify(generateDailyQuests('2026-07-31', ['python', 'dsa'])) === JSON.stringify(daily))
  check('different days give different boards', JSON.stringify(generateDailyQuests('2026-08-01', ['python', 'dsa'])) !== JSON.stringify(daily))

  const answerQuest = daily.find((q) => q.kind === 'answer') ?? daily[0]
  let advanced = [answerQuest]
  for (let i = 0; i < answerQuest.target + 5; i++) {
    advanced = advanceQuests(advanced, { kind: answerQuest.kind, amount: 1, world: answerQuest.world })
  }
  check('quest progress clamps at target', advanced[0].progress === answerQuest.target)
  check('quest reports complete', isComplete(advanced[0]))

  // Claim path through the store.
  useGame.setState({
    quests: { ...g().quests, daily: [{ ...answerQuest, progress: answerQuest.target }] },
    gems: 0,
  })
  g().claimQuest(answerQuest.id)
  check('claiming pays out gems', g().gems === answerQuest.rewardGems, g().gems)
  const gemsAfterClaim = g().gems
  g().claimQuest(answerQuest.id)
  check('a quest cannot be claimed twice', g().gems === gemsAfterClaim)

  /* ========================================================== leaderboard == */
  section('Leaderboard')

  const board = buildLeaderboard('Smoke Tester', '🥷', 50_000, Date.now() - 30 * 86_400_000)
  check('board includes the player', board.some((r) => r.isPlayer))
  check('board is sorted descending by xp', board.every((r, i) => i === 0 || board[i - 1].xp >= r.xp))
  check('player position is resolvable', playerPosition(board) >= 1)
  const early = buildLeaderboard('X', '🥷', 0, Date.now())
  const later = buildLeaderboard('X', '🥷', 0, Date.now() - 30 * 86_400_000)
  check('rivals accumulate xp over time', later[0].xp > early[0].xp)

  // Day-one shape. The board must motivate, and the old model ranked a fresh
  // account "#24 of 24" with the leader on 7x their XP — unclimbable-looking.
  const day1 = buildLeaderboard('Newbie', '🥷', 140, Date.now())
  const rank1 = playerPosition(day1)
  const rivals1 = day1.filter((r) => !r.isPlayer).map((r) => r.xp)
  check('a first-session player is not ranked last', rank1 < day1.length, `#${rank1} of ${day1.length}`)
  check('some rivals sit below a first-session player', rivals1.some((x) => x < 140))
  check(
    'the day-one leader is within reach (under 3x a single session)',
    Math.max(...rivals1) < 140 * 3,
    Math.max(...rivals1),
  )
  // Effort has to visibly pay: one strong session should vault you up the board.
  const keenRank = playerPosition(buildLeaderboard('Keen', '🥷', 350, Date.now()))
  check('a strong first session reaches the top quarter', keenRank <= 6, `#${keenRank}`)
  // …but the board must still stretch over the long run.
  const week = buildLeaderboard('Grinder', '🥷', 1500, Date.now() - 7 * 86_400_000)
  check('committed rivals stay ahead after a week', week[0].xp > 1500, week[0].xp)
  const month = buildLeaderboard('Grinder', '🥷', 6000, Date.now() - 30 * 86_400_000)
  check('the board still has climbing room after a month', playerPosition(month) > 1)

  /* ========================================================== achievements = */
  section('Achievements')

  check(`${ACHIEVEMENTS.length} achievements defined`, ACHIEVEMENTS.length >= 20)
  const achIds = new Set(ACHIEVEMENTS.map((a) => a.id))
  check('achievement ids are unique', achIds.size === ACHIEVEMENTS.length)
  const maxed = {
    level: 99, totalXp: 999999, totalCorrect: 5000, totalAnswered: 5000, bestCombo: 99,
    streak: 200, bossesDefeated: 10, perfectRuns: 50, worldsMastered: 8, gems: 99999,
    skillsUnlocked: 50, revisionsCleared: 999, aiChats: 99,
  }
  check('a maxed profile earns every achievement', ACHIEVEMENTS.every((a) => a.check(maxed)))
  const zero = {
    level: 1, totalXp: 0, totalCorrect: 0, totalAnswered: 0, bestCombo: 0, streak: 0,
    bossesDefeated: 0, perfectRuns: 0, worldsMastered: 0, gems: 0, skillsUnlocked: 0,
    revisionsCleared: 0, aiChats: 0,
  }
  check('a fresh profile earns none', ACHIEVEMENTS.every((a) => !a.check(zero)))

  /* =========================================================== save merge = */
  section('Account sync — merge must never lose progress')

  {
    const { mergeSaves } = await import('../src/backend/sync')
    const base = () => ({
      name: '', avatar: { base: 'rookie', color: 'azure', aura: 'none', title: 'Aspirant' },
      ownedCosmetics: [], unlockedTitles: [], createdAt: 2000, onboarded: true,
      totalXp: 0, gems: 0, hints: 0, freezes: 0, pendingChests: [],
      mastery: {}, srs: {}, recent: [], lessonsRead: [],
      streak: { count: 0, best: 0, lastActiveDay: '', todayXp: 0, loginClaimedDay: '' },
      quests: null, achievements: [], defeatedCompanies: [], stats: {},
    })

    const local = { ...base(), totalXp: 5000, gems: 300, achievements: ['a', 'b'], lessonsRead: ['py.basics'],
      createdAt: 1000,
      mastery: { 'py.basics': { theta: 3, seen: 20, correct: 15, hot: 2 } },
      srs: { q1: { qid: 'q1', ease: 2.5, intervalDays: 3, dueAt: 500, lapses: 0, lastSeenAt: 900 } },
      streak: { count: 9, best: 12, lastActiveDay: '2026-08-02', todayXp: 60, loginClaimedDay: '2026-08-02' },
      stats: { totalAnswered: 200, bestCombo: 14 }, ownedCosmetics: ['ninja'] }

    const remote = { ...base(), totalXp: 3000, gems: 800, achievements: ['b', 'c'], lessonsRead: ['cpp.basics'],
      name: 'Aarav',
      mastery: { 'py.basics': { theta: 2, seen: 5, correct: 3, hot: 0 } },
      srs: { q1: { qid: 'q1', ease: 2.5, intervalDays: 1, dueAt: 100, lapses: 3, lastSeenAt: 100 } },
      streak: { count: 4, best: 20, lastActiveDay: '2026-07-30', todayXp: 10, loginClaimedDay: '2026-07-30' },
      stats: { totalAnswered: 90, perfectRuns: 4 }, ownedCosmetics: ['wizard'] }

    const m = mergeSaves(local, remote)

    check('merge keeps the higher xp', m.totalXp === 5000, m.totalXp)
    check('merge keeps the higher gem balance', m.gems === 800, m.gems)
    check('merge unions achievements', m.achievements.sort().join() === 'a,b,c', m.achievements)
    check('merge unions lessons read', m.lessonsRead.length === 2, m.lessonsRead)
    check('merge unions owned cosmetics', m.ownedCosmetics.sort().join() === 'ninja,wizard', m.ownedCosmetics)
    check('merge keeps the better-evidenced mastery', m.mastery['py.basics'].seen === 20)
    check('merge keeps the more recent srs card', m.srs.q1.lastSeenAt === 900)
    check('merge keeps the longer current streak', m.streak.count === 9)
    check('merge keeps the best-ever streak from either side', m.streak.best === 20)
    check('merge takes the more recent active day', m.streak.lastActiveDay === '2026-08-02')
    check('merge takes per-stat maxima across both sides', m.stats.totalAnswered === 200 && m.stats.perfectRuns === 4)
    check('merge prefers the account display name', m.name === 'Aarav')
    check('merge keeps the earliest created date', m.createdAt === 1000)

    // Symmetry: the same two saves merged the other way must not lose anything.
    const rev = mergeSaves(remote, local)
    check('merge is symmetric for monotonic fields', rev.totalXp === 5000 && rev.gems === 800 && rev.streak.best === 20)
    check('merge is symmetric for unions', rev.achievements.sort().join() === 'a,b,c')

    // A brand-new account (empty remote) must not wipe a local grind.
    const fresh = mergeSaves(local, base())
    check('signing into an empty account preserves local progress', fresh.totalXp === 5000 && fresh.streak.count === 9)
  }

  /* ================================================================= reset = */
  section('Reset')

  g().resetProgress()
  check('reset clears xp', g().totalXp === 0)
  check('reset clears mastery', Object.keys(g().mastery).length === 0)
  check('reset returns to onboarding', g().onboarded === false)

  /* ================================================================== done = */
  console.log(
    `\n${failures === 0 ? '\x1b[42m\x1b[30m PASS \x1b[0m' : '\x1b[41m\x1b[37m FAIL \x1b[0m'} ${checks - failures}/${checks} checks passed\n`,
  )
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('\x1b[31mSmoke test crashed:\x1b[0m', err)
  process.exit(1)
})
