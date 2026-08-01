import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame, type RunState } from '../state/store'
import { WORLD_BY_ID, SKILL_BY_ID } from '../content/worlds'
import { COMPANY_BY_ID } from '../content/companies'
import { comboLabel, comboMultiplier } from '../game/progression'
import { masteryPercent, emptyMastery } from '../game/adaptive'
import { streamFeedback, streamHint, streamDebrief, confidenceFrom } from '../ai/mentor'
import { Modal, MentorBubble, DifficultyDots, Confetti, RichText, useStream, Bar } from '../components/common'
import { sfx } from '../lib/sfx'

interface Burst {
  id: number
  label: string
  color: string
  x: number
  y: number
}

export function Battle({ onExit }: { onExit: () => void }) {
  const run = useGame((s) => s.run)
  const submitAnswer = useGame((s) => s.submitAnswer)
  const nextQuestion = useGame((s) => s.nextQuestion)
  const endRun = useGame((s) => s.endRun)
  const spendHint = useGame((s) => s.spendHint)
  const hints = useGame((s) => s.hints)
  const mastery = useGame((s) => s.mastery)
  const recent = useGame((s) => s.recent)

  const [picked, setPicked] = useState<number[]>([])
  const [bursts, setBursts] = useState<Burst[]>([])
  const [shake, setShake] = useState(false)
  const [bossHit, setBossHit] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showMentor, setShowMentor] = useState(false)
  const [remaining, setRemaining] = useState(0)

  const feedback = useStream()
  const hint = useStream()
  const debrief = useStream()
  const burstSeq = useRef(0)
  const stageRef = useRef<HTMLDivElement>(null)
  const debriefStarted = useRef(false)
  /** Previous run totals, so a burst can report the delta this answer earned. */
  const prevEarned = useRef({ xp: 0, gems: 0 })

  const q = run?.current ?? null
  const answered = run?.lastAnswer ?? null
  const isMulti = q?.kind === 'multi'
  const confidence = useMemo(() => confidenceFrom(recent), [recent])

  /* ------------------------------------------------------------ timer -- */

  useEffect(() => {
    if (!run || !q || answered || run.timeLimit <= 0) return
    setRemaining(run.timeLimit)

    const started = run.questionStartedAt
    const tick = setInterval(() => {
      const left = run.timeLimit - (Date.now() - started) / 1000
      if (left <= 0) {
        clearInterval(tick)
        setRemaining(0)
        // Timeout counts as a wrong answer — the clock is a real opponent.
        submitAnswer([])
      } else {
        if (left <= 5 && Math.ceil(left) !== Math.ceil(remaining)) sfx.tick()
        setRemaining(left)
      }
    }, 100)
    return () => clearInterval(tick)
    // Keyed on the question so each new question restarts the clock cleanly.
  }, [q?.id, run?.questionStartedAt, answered])

  /* --------------------------------------------------- reset per question */

  useEffect(() => {
    setPicked([])
    setShowHint(false)
    setShowMentor(false)
    hint.reset()
    feedback.reset()
  }, [q?.id])

  /* ---------------------------------------------------- answer reactions */

  useEffect(() => {
    if (!answered || !run) return

    if (answered.correct) {
      sfx.correct(run.combo)
      const gainedXp = run.xpEarned - prevEarned.current.xp
      const gainedGems = run.gemsEarned - prevEarned.current.gems
      const mult = comboMultiplier(run.combo)
      if (gainedXp > 0) spawnBurst(`+${gainedXp} XP`, 'var(--xp)')
      if (gainedGems > 0) spawnBurst(`+${gainedGems} 💎`, 'var(--gem)')
      if (mult > 1) spawnBurst(`${mult}x COMBO`, 'var(--flame)')
      if (run.mode === 'boss') {
        sfx.bossHit()
        setBossHit(true)
        setTimeout(() => setBossHit(false), 420)
      }
    } else {
      sfx.wrong()
      setShake(true)
      setTimeout(() => setShake(false), 440)
    }

    prevEarned.current = { xp: run.xpEarned, gems: run.gemsEarned }
  }, [answered?.question.id, answered?.correct])

  // A fresh run resets the delta baseline.
  useEffect(() => {
    prevEarned.current = { xp: 0, gems: 0 }
  }, [run?.startedAt])

  function spawnBurst(label: string, color: string) {
    const id = ++burstSeq.current
    const rect = stageRef.current?.getBoundingClientRect()
    setBursts((b) => [
      ...b,
      {
        id,
        label,
        color,
        x: (rect?.width ?? 300) * (0.35 + Math.random() * 0.3),
        y: 60 + Math.random() * 40,
      },
    ])
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1200)
  }

  /* ---------------------------------------------------------- keyboard -- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return
      if (answered) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          nextQuestion()
        }
        return
      }
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= q.choices.length) {
        e.preventDefault()
        choose(n - 1)
      } else if (e.key === 'Enter' && isMulti && picked.length > 0) {
        e.preventDefault()
        submitAnswer(picked)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q?.id, answered, picked, isMulti])

  /* ------------------------------------------------------------- debrief */

  useEffect(() => {
    if (!run?.finished || debriefStarted.current) return
    debriefStarted.current = true

    const weak: string[] = []
    const strong: string[] = []
    for (const skillId of run.touched) {
      const pct = masteryPercent(mastery[skillId] ?? emptyMastery())
      const name = SKILL_BY_ID[skillId]?.name ?? skillId
      if (pct < 0.45) weak.push(name)
      else if (pct >= 0.7) strong.push(name)
    }

    const bossWon = run.mode === 'boss' && run.bossHp <= 0
    if (run.mode === 'boss') (bossWon ? sfx.victory : sfx.defeat)()

    debrief.start((signal) =>
      streamDebrief(
        {
          world: run.companyId
            ? `${COMPANY_BY_ID[run.companyId].name} interview`
            : run.world
              ? WORLD_BY_ID[run.world].name
              : 'mixed practice',
          answered: run.answered,
          correct: run.correct,
          bestCombo: run.bestCombo,
          weakSkills: weak,
          strongSkills: strong,
        },
        signal,
      ),
    )
  }, [run?.finished])

  useEffect(() => {
    debriefStarted.current = false
  }, [run?.startedAt])

  /* ---------------------------------------------------------- handlers -- */

  function choose(i: number) {
    if (!q || answered) return
    sfx.click()
    if (isMulti) {
      setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))
    } else {
      submitAnswer([i])
    }
  }

  function useHint() {
    if (!q || showHint) return
    if (!spendHint()) return
    sfx.unlock()
    setShowHint(true)
    hint.start((signal) => streamHint(q, signal))
  }

  function askMentor() {
    if (!answered) return
    setShowMentor(true)
    feedback.start((signal) =>
      streamFeedback(
        answered.question,
        answered.chosen.map((i) => answered.question.choices[i]),
        answered.correct,
        confidence,
        answered.question.id.length + answered.chosen.length,
        signal,
      ),
    )
  }

  /* -------------------------------------------------------------- guards */

  if (!run) {
    return (
      <div className="screen">
        <div className="empty">Nothing in progress.</div>
      </div>
    )
  }

  if (run.finished) return <Results run={run} debrief={debrief} onExit={onExit} />

  if (!q) {
    return (
      <div className="screen">
        <div className="empty">Out of questions here — try another skill.</div>
        <button className="btn primary block mt" onClick={onExit}>
          Back
        </button>
      </div>
    )
  }

  const world = run.world ? WORLD_BY_ID[run.world] : q ? WORLD_BY_ID[q.world] : null
  const company = run.companyId ? COMPANY_BY_ID[run.companyId] : null
  const label = comboLabel(run.combo)
  const timePct = run.timeLimit > 0 ? (remaining / run.timeLimit) * 100 : 100
  const urgent = run.timeLimit > 0 && remaining <= 5

  return (
    <div className={`screen battle${shake ? ' shake-screen' : ''}`} ref={stageRef} style={{ position: 'relative' }}>
      {bursts.map((b) => (
        <span key={b.id} className="burst" style={{ left: b.x, top: b.y, color: b.color }}>
          {b.label}
        </span>
      ))}

      {/* ------------------------------------------------------------ hud */}
      <div className="battle-hud">
        <button className="btn ghost sm" onClick={onExit}>
          ← Leave
        </button>

        <div style={{ flex: 1, minWidth: 60 }}>
          <div className="tiny faint" style={{ marginBottom: 4 }}>
            {company ? company.name : (world?.name ?? 'Practice')} · {run.answered}/{run.target}
          </div>
          <Bar value={run.answered / run.target} thin color={world ? `linear-gradient(90deg, ${world.hue[0]}, ${world.hue[1]})` : undefined} />
        </div>

        {label && (
          <div className={`combo${run.combo >= 8 ? ' big' : ''}`}>
            🔥 {run.combo}x <span className="tiny">{label}</span>
          </div>
        )}

        {run.timeLimit > 0 && (
          <div
            className={`timer-ring${urgent ? ' urgent' : ''}`}
            style={{ ['--pct' as string]: timePct, ['--tc' as string]: urgent ? 'var(--bad)' : 'var(--accent-2)' }}
          >
            <span>{Math.ceil(remaining)}</span>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------- boss stage */}
      {company && (
        <div className="boss-stage">
          <div className={`boss-face${bossHit ? ' hit' : ''}`}>{company.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span className="bold">{company.name}</span>
              <span className="tiny faint">
                {run.bossHp}/{run.bossMaxHp} HP
              </span>
            </div>
            <div className="hpbar">
              <i style={{ width: `${(run.bossHp / Math.max(1, run.bossMaxHp)) * 100}%` }} />
            </div>
            <div className="row" style={{ marginTop: 8, gap: 8 }}>
              <span className="tiny faint">Strikes</span>
              <span className="strikes">
                {Array.from({ length: run.maxStrikes }).map((_, i) => (
                  <i key={i} className={i < run.strikes ? 'lost' : ''}>
                    ❌
                  </i>
                ))}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- question */}
      <div className="qcard" key={q.id}>
        <div className="row between mb" style={{ gap: 8 }}>
          <span className="tag">
            {WORLD_BY_ID[q.world]?.icon} {SKILL_BY_ID[q.skill]?.name ?? q.skill}
          </span>
          <DifficultyDots level={q.difficulty} />
        </div>

        {/* Prompts use `backticks` for identifiers, same as explanations. */}
        <div className="qprompt">
          <RichText text={q.prompt} />
        </div>
        {q.code && <pre className="qcode">{q.code}</pre>}
        {isMulti && <div className="tiny faint mt">Select all that apply, then submit.</div>}

        <div className="choices">
          {q.choices.map((c, i) => {
            const isAnswer = q.answer.includes(i)
            const isPicked = answered ? answered.chosen.includes(i) : picked.includes(i)
            let cls = 'choice'
            if (answered) {
              if (isAnswer) cls += ' correct'
              else if (isPicked) cls += ' wrong'
              else cls += ' dim'
            } else if (isPicked) {
              cls += ' picked'
            }
            return (
              <button key={i} className={cls} onClick={() => choose(i)} disabled={!!answered}>
                <span className="key">{answered && isAnswer ? '✓' : i + 1}</span>
                <span style={{ flex: 1 }}>
                  <RichText text={c} />
                </span>
              </button>
            )
          })}
        </div>

        {isMulti && !answered && (
          <button className="btn primary block mt" disabled={picked.length === 0} onClick={() => submitAnswer(picked)}>
            Submit {picked.length > 0 && `(${picked.length} selected)`}
          </button>
        )}

        {/* ---------------------------------------------------------- hint */}
        {!answered && !showHint && (
          <button className="btn ghost sm mt" disabled={hints <= 0} onClick={useHint}>
            💡 Use a hint {hints > 0 ? `(${hints} left)` : '— none left'}
          </button>
        )}
        {showHint && <MentorBubble text={hint.text} streaming={hint.busy} />}

        {/* ------------------------------------------------------ feedback */}
        {answered && (
          <>
            <div className={`explain${answered.correct ? '' : ' bad'}`}>
              <div className="bold mb" style={{ color: answered.correct ? 'var(--good)' : 'var(--bad)' }}>
                {answered.correct ? '✓ Correct' : answered.chosen.length === 0 ? "⏱ Time's up" : '✗ Not quite'}
              </div>
              <RichText text={answered.question.explain} />
            </div>

            {showMentor ? (
              <MentorBubble text={feedback.text} streaming={feedback.busy} />
            ) : (
              <button className="btn ghost sm mt" onClick={askMentor}>
                ✨ Ask ARIA to go deeper
              </button>
            )}

            <button className="btn primary block mt" onClick={() => nextQuestion()} autoFocus>
              {run.answered >= run.target || (run.mode === 'boss' && (run.bossHp <= 0 || run.strikes >= run.maxStrikes))
                ? 'Finish'
                : 'Next question →'}{' '}
              <span className="tiny" style={{ opacity: 0.65 }}>
                ⏎
              </span>
            </button>
          </>
        )}
      </div>

      <div className="tiny faint center" style={{ paddingBottom: 8 }}>
        Press <span className="mono">1</span>–<span className="mono">{q.choices.length}</span> to answer
        {answered ? ', ⏎ to continue' : ''}
      </div>

      {/* Abandoning a run mid-way still banks the XP already earned — quitting
          should never feel like a punishment. */}
      <button className="hidden" onClick={endRun} />
    </div>
  )
}

/* ============================================================== results === */

function Results({
  run,
  debrief,
  onExit,
}: {
  run: RunState
  debrief: ReturnType<typeof useStream>
  onExit: () => void
}) {
  const startRun = useGame((s) => s.startRun)
  const accuracy = run.answered > 0 ? Math.round((run.correct / run.answered) * 100) : 0
  const bossWon = run.mode === 'boss' && run.bossHp <= 0
  const bossLost = run.mode === 'boss' && !bossWon
  const perfect = run.answered >= 4 && run.correct === run.answered
  const company = run.companyId ? COMPANY_BY_ID[run.companyId] : null

  const headline = bossWon
    ? 'Offer secured'
    : bossLost
      ? 'Not this time'
      : perfect
        ? 'Flawless'
        : accuracy >= 70
          ? 'Solid run'
          : 'Run complete'

  const emoji = bossWon ? '🏆' : bossLost ? '💀' : perfect ? '💎' : accuracy >= 70 ? '⚔️' : '📘'

  return (
    <Modal dismissible={false} wide>
      {(bossWon || perfect) && (
        <>
          <div className="rays" />
          <Confetti count={46} />
        </>
      )}

      <div className="center">
        <div className="modal-emoji">{emoji}</div>
        <div className="modal-title">{headline}</div>
        <div className="modal-sub">
          {company ? company.name : 'Practice run'} · {run.correct}/{run.answered} correct
        </div>
      </div>

      <div className="grid three mb">
        <div className="card tight center">
          <div className="tiny faint">ACCURACY</div>
          <div className="bold" style={{ fontSize: 22, color: accuracy >= 70 ? 'var(--good)' : 'var(--bad)' }}>
            {accuracy}%
          </div>
        </div>
        <div className="card tight center">
          <div className="tiny faint">BEST COMBO</div>
          <div className="bold" style={{ fontSize: 22, color: 'var(--flame)' }}>
            {run.bestCombo}x
          </div>
        </div>
        <div className="card tight center">
          <div className="tiny faint">XP EARNED</div>
          <div className="bold xp-text" style={{ fontSize: 22 }}>
            +{run.xpEarned}
          </div>
        </div>
        <div className="card tight center">
          <div className="tiny faint">GEMS</div>
          <div className="bold gem-text" style={{ fontSize: 22 }}>
            +{run.gemsEarned}
          </div>
        </div>
      </div>

      <MentorBubble text={debrief.text || 'Reading your run…'} streaming={debrief.busy} />

      <div className="row mt-lg" style={{ gap: 10 }}>
        <button
          className="btn ghost"
          style={{ flex: 1 }}
          onClick={onExit}
        >
          Back to map
        </button>
        <button
          className="btn primary"
          style={{ flex: 1 }}
          onClick={() =>
            startRun({
              mode: run.mode,
              world: run.world ?? undefined,
              skill: run.skill ?? undefined,
              companyId: run.companyId ?? undefined,
            })
          }
        >
          {bossLost ? 'Try again' : 'Run it again'}
        </button>
      </div>
    </Modal>
  )
}
