import { useMemo, useState } from 'react'
import { useGame, isSkillUnlocked } from '../state/store'
import { WORLDS } from '../content/worlds'
import { questionsForSkill, QUESTION_COUNT } from '../content/questions'
import { masteryPercent, masteryBadge, emptyMastery } from '../game/adaptive'
import { Bar } from '../components/common'
import { sfx } from '../lib/sfx'
import type { WorldFocus } from '../game/types'

/**
 * Topics-covered tracker.
 *
 * The mastery bars elsewhere answer "how good am I?"; this answers the
 * different and more anxious question a student actually has the week before a
 * placement drive: **what have I not touched yet?** So coverage — questions
 * seen out of questions available — is the headline metric here, not skill.
 */

const FOCUS_LABEL: Record<WorldFocus, string> = {
  development: 'Development',
  competitive: 'Competitive',
  fundamentals: 'Fundamentals',
  interview: 'Interview',
}

const FOCUS_COLOR: Record<WorldFocus, string> = {
  development: '#4fd1c5',
  competitive: '#f59e0b',
  fundamentals: '#7db8ff',
  interview: '#c58cff',
}

type Filter = 'all' | WorldFocus

/** Rendered as a panel inside Profile, so it brings no screen chrome of its own. */
export function TopicsPanel() {
  const mastery = useGame((s) => s.mastery)
  const srs = useGame((s) => s.srs)
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<string | null>(null)
  const startRun = useGame((s) => s.startRun)

  const report = useMemo(() => {
    const worlds = WORLDS.map((w) => {
      const skills = w.skills.map((s) => {
        const pool = questionsForSkill(s.id)
        const seen = pool.filter((q) => srs[q.id]).length
        const m = mastery[s.id] ?? emptyMastery()
        return {
          node: s,
          total: pool.length,
          seen,
          coverage: pool.length > 0 ? seen / pool.length : 0,
          mastery: masteryPercent(m),
          attempts: m.seen,
          correct: m.correct,
          unlocked: isSkillUnlocked(s.id, mastery),
        }
      })
      const total = skills.reduce((n, s) => n + s.total, 0)
      const seen = skills.reduce((n, s) => n + s.seen, 0)
      return {
        world: w,
        skills,
        total,
        seen,
        coverage: total > 0 ? seen / total : 0,
        touched: skills.filter((s) => s.seen > 0).length,
      }
    })

    const totalQ = worlds.reduce((n, w) => n + w.total, 0)
    const seenQ = worlds.reduce((n, w) => n + w.seen, 0)
    const totalTopics = worlds.reduce((n, w) => n + w.skills.length, 0)
    const touchedTopics = worlds.reduce((n, w) => n + w.touched, 0)
    return { worlds, totalQ, seenQ, totalTopics, touchedTopics }
  }, [mastery, srs])

  const shown = report.worlds.filter((w) => filter === 'all' || w.world.focus === filter)

  // The single most useful line on the screen: what to open next.
  const nextUp = useMemo(() => {
    const candidates = report.worlds
      .flatMap((w) => w.skills.map((s) => ({ ...s, world: w.world })))
      .filter((s) => s.unlocked && s.total > 0 && s.coverage < 1)
      .sort((a, b) => a.coverage - b.coverage || a.mastery - b.mastery)
    return candidates[0] ?? null
  }, [report])

  return (
    <>
      {/* ------------------------------------------------------- headline */}
      <div className="card mb" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,.15), rgba(34,211,238,.07))' }}>
        <div className="row between mb">
          <div>
            <div className="bold" style={{ fontSize: 26, letterSpacing: -0.5 }}>
              {report.touchedTopics}
              <span className="dim" style={{ fontSize: 16, fontWeight: 500 }}> / {report.totalTopics} topics</span>
            </div>
            <div className="tiny faint">started at least once</div>
          </div>
          <div className="center">
            <div className="bold" style={{ fontSize: 26, letterSpacing: -0.5 }}>
              {Math.round((report.seenQ / Math.max(1, report.totalQ)) * 100)}%
            </div>
            <div className="tiny faint">
              {report.seenQ} / {report.totalQ} questions
            </div>
          </div>
        </div>
        <Bar value={report.seenQ / Math.max(1, report.totalQ)} color="linear-gradient(90deg, var(--accent-2), var(--accent))" />

        {nextUp && (
          <div className="row between mt" style={{ gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div className="tiny faint">LEAST COVERED UNLOCKED TOPIC</div>
              <div className="small bold">
                {nextUp.world.icon} {nextUp.node.name}
                <span className="faint" style={{ fontWeight: 500 }}>
                  {' '}· {nextUp.seen}/{nextUp.total} seen
                </span>
              </div>
            </div>
            <button
              className="btn primary sm"
              onClick={() => {
                sfx.click()
                startRun({ mode: 'practice', world: nextUp.world.id, skill: nextUp.node.id })
              }}
            >
              Train it
            </button>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------- filter */}
      <div className="row wrap mb" style={{ gap: 7 }}>
        {(['all', 'development', 'competitive', 'fundamentals', 'interview'] as Filter[]).map((f) => (
          <button
            key={f}
            className={`btn sm ${filter === f ? 'primary' : 'ghost'}`}
            onClick={() => {
              sfx.click()
              setFilter(f)
            }}
          >
            {f === 'all' ? 'All' : FOCUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------------- table */}
      {shown.map((w) => {
        const expanded = open === w.world.id
        const wash = `linear-gradient(135deg, ${w.world.hue[0]}, ${w.world.hue[1]})`
        return (
          <div key={w.world.id} className="card mb" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              className="row between"
              style={{ width: '100%', padding: 14, textAlign: 'left', gap: 12 }}
              onClick={() => {
                sfx.click()
                setOpen(expanded ? null : w.world.id)
              }}
            >
              <div className="row" style={{ gap: 12, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 24 }}>{w.world.icon}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row" style={{ gap: 7 }}>
                    <span className="bold">{w.world.name}</span>
                    <span
                      className="tag"
                      style={{ color: FOCUS_COLOR[w.world.focus], borderColor: `${FOCUS_COLOR[w.world.focus]}55` }}
                    >
                      {FOCUS_LABEL[w.world.focus]}
                    </span>
                  </div>
                  <div className="tiny faint" style={{ margin: '5px 0 6px' }}>
                    {w.touched}/{w.skills.length} topics started · {w.seen}/{w.total} questions seen
                  </div>
                  <Bar value={w.coverage} thin color={wash} />
                </div>
              </div>
              <span className="bold small" style={{ minWidth: 40, textAlign: 'right' }}>
                {Math.round(w.coverage * 100)}%
              </span>
              <span style={{ fontSize: 15, opacity: 0.4 }}>{expanded ? '▾' : '›'}</span>
            </button>

            {expanded && (
              <div style={{ borderTop: '1px solid var(--line)' }}>
                {w.skills.map((s) => {
                  const badge = masteryBadge(s.mastery)
                  return (
                    <div
                      key={s.node.id}
                      className="row between"
                      style={{ padding: '11px 14px', gap: 12, borderBottom: '1px solid rgba(255,255,255,.04)' }}
                    >
                      <div className="row" style={{ gap: 10, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 17, opacity: s.unlocked ? 1 : 0.35 }}>
                          {s.unlocked ? s.node.icon : '🔒'}
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="small bold" style={{ opacity: s.unlocked ? 1 : 0.5 }}>
                            {s.node.name}
                          </div>
                          <div className="tiny faint" style={{ marginBottom: 5 }}>
                            {s.seen === 0
                              ? `Not started · ${s.total} question${s.total === 1 ? '' : 's'} available`
                              : `${s.seen}/${s.total} seen · ${s.correct}/${s.attempts} correct`}
                          </div>
                          <Bar value={s.coverage} thin color={s.seen === 0 ? 'rgba(255,255,255,.12)' : wash} />
                        </div>
                      </div>
                      <div className="center" style={{ minWidth: 62 }}>
                        <div className="tiny bold" style={{ color: s.seen === 0 ? 'var(--text-faint)' : badge.color }}>
                          {s.seen === 0 ? 'New' : badge.label}
                        </div>
                        <div className="tiny faint">{Math.round(s.coverage * 100)}%</div>
                      </div>
                      <button
                        className="btn ghost sm"
                        disabled={!s.unlocked || s.total === 0}
                        onClick={() => {
                          sfx.click()
                          startRun({ mode: 'practice', world: w.world.id, skill: s.node.id })
                        }}
                      >
                        ▶
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <div className="tiny faint center mt">
        {QUESTION_COUNT} questions across {WORLDS.length} worlds. A topic counts as "seen" once a question from it has
        been served to you at least once.
      </div>
    </>
  )
}
