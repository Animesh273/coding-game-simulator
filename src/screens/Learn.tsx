import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../state/store'
import { lessonFor, LESSON_XP, LESSON_GEMS } from '../content/lessons'
import { WORLD_BY_ID, SKILL_BY_ID } from '../content/worlds'
import { questionsForSkill } from '../content/questions'
import { RichText, Bar } from '../components/common'
import { sfx } from '../lib/sfx'
import type { LessonSection } from '../game/types'

const CALLOUT: Record<NonNullable<LessonSection['callout']>['kind'], { icon: string; label: string; color: string }> = {
  tip: { icon: '💡', label: 'Tip', color: '#5fe3d0' },
  trap: { icon: '⚠️', label: 'Common trap', color: '#ff9f5a' },
  interview: { icon: '🎙️', label: 'In an interview', color: '#c58cff' },
}

/**
 * Paged lesson reader.
 *
 * One section per page rather than a single scrolling wall: it keeps each step
 * small, gives the progress bar something honest to measure, and makes
 * finishing feel like an achievement rather than reaching the bottom of a
 * document. The last page hands straight off to practice on the same node,
 * which is the whole point — read it, then immediately use it.
 */
export function Learn({ skillId, onExit }: { skillId: string; onExit: () => void }) {
  const lesson = lessonFor(skillId)
  const node = SKILL_BY_ID[skillId]
  const completeLesson = useGame((s) => s.completeLesson)
  const startRun = useGame((s) => s.startRun)
  const alreadyRead = useGame((s) => s.lessonsRead.includes(skillId))

  // page 0 = intro, 1..n = sections, n+1 = summary
  const [page, setPage] = useState(0)
  const total = (lesson?.sections.length ?? 0) + 2
  const onSummary = page === total - 1

  const world = node ? WORLD_BY_ID[node.world] : null
  const wash = world ? `linear-gradient(135deg, ${world.hue[0]}, ${world.hue[1]})` : undefined
  const questionCount = useMemo(() => questionsForSkill(skillId).length, [skillId])

  // Award on first reaching the summary page.
  useEffect(() => {
    if (onSummary && !alreadyRead) {
      sfx.unlock()
      completeLesson(skillId)
    }
  }, [onSummary, alreadyRead, skillId, completeLesson])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        setPage((p) => Math.min(total - 1, p + 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPage((p) => Math.max(0, p - 1))
      } else if (e.key === 'Escape') {
        onExit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total, onExit])

  // Scroll back to the top whenever the page changes.
  useEffect(() => {
    document.querySelector('.screen')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  if (!lesson || !node) {
    return (
      <div className="screen">
        <button className="btn ghost sm mb" onClick={onExit}>
          ← Back
        </button>
        <div className="empty">No lesson written for this topic yet.</div>
      </div>
    )
  }

  const section = page > 0 && page < total - 1 ? lesson.sections[page - 1] : null

  return (
    <div className="screen">
      {/* ---------------------------------------------------------- header */}
      <div className="row between mb" style={{ gap: 10 }}>
        <button className="btn ghost sm" onClick={onExit}>
          ← Exit
        </button>
        <div className="tiny faint">
          {page === 0 ? 'Intro' : onSummary ? 'Summary' : `${page} / ${lesson.sections.length}`}
        </div>
      </div>

      <Bar value={(page + 1) / total} color={wash} thin style={{ marginBottom: 16 }} />

      {/* ------------------------------------------------------------ intro */}
      {page === 0 && (
        <div className="qcard" key="intro">
          <div className="row mb" style={{ gap: 12 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                display: 'grid',
                placeItems: 'center',
                fontSize: 26,
                background: wash,
                flexShrink: 0,
              }}
            >
              {node.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="tiny faint">
                {world?.icon} {world?.name}
              </div>
              <div className="bold" style={{ fontSize: 22, letterSpacing: -0.4 }}>
                {lesson.title}
              </div>
              <div className="tiny faint">
                📖 {lesson.minutes} min read · {lesson.sections.length} sections
                {alreadyRead && ' · ✓ completed'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 15.5, lineHeight: 1.72 }}>
            <RichText text={lesson.intro} />
          </div>

          {!alreadyRead && (
            <div className="warn mt">
              Finish this lesson to earn <strong>+{LESSON_XP} XP</strong> and <strong>+{LESSON_GEMS} gems</strong>.
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- section */}
      {section && (
        <div className="qcard" key={`s${page}`}>
          <div className="bold mb" style={{ fontSize: 19, letterSpacing: -0.3 }}>
            {section.heading}
          </div>

          {section.body.split('\n\n').map((para, i) => (
            <p key={i} style={{ fontSize: 15, lineHeight: 1.75, margin: '0 0 12px' }}>
              <RichText text={para} />
            </p>
          ))}

          {section.code && <pre className="qcode">{section.code}</pre>}

          {section.callout && (
            <div
              className="mt"
              style={{
                padding: '13px 15px',
                borderRadius: 'var(--r-sm)',
                borderLeft: `3px solid ${CALLOUT[section.callout.kind].color}`,
                background: `${CALLOUT[section.callout.kind].color}14`,
                fontSize: 13.5,
                lineHeight: 1.65,
              }}
            >
              <div
                className="tiny bold"
                style={{ color: CALLOUT[section.callout.kind].color, marginBottom: 4, letterSpacing: 0.6 }}
              >
                {CALLOUT[section.callout.kind].icon} {CALLOUT[section.callout.kind].label.toUpperCase()}
              </div>
              <RichText text={section.callout.text} />
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- summary */}
      {onSummary && (
        <div className="qcard" key="summary">
          <div className="center mb">
            <div style={{ fontSize: 46 }}>✅</div>
            <div className="bold" style={{ fontSize: 21 }}>
              {lesson.title} — done
            </div>
            <div className="tiny faint">Here is what to hold on to.</div>
          </div>

          <div className="card tight mb" style={{ background: 'rgba(255,255,255,.03)' }}>
            <div className="card-title">Key points</div>
            {lesson.keyPoints.map((p, i) => (
              <div key={i} className="row" style={{ gap: 9, alignItems: 'flex-start', marginBottom: 9 }}>
                <span style={{ color: 'var(--good)', flexShrink: 0 }}>✓</span>
                <span className="small" style={{ lineHeight: 1.6 }}>
                  <RichText text={p} />
                </span>
              </div>
            ))}
          </div>

          <div
            className="mb"
            style={{
              padding: '13px 15px',
              borderRadius: 'var(--r-sm)',
              borderLeft: '3px solid #c58cff',
              background: 'rgba(197,140,255,.09)',
              fontSize: 13.5,
              lineHeight: 1.65,
            }}
          >
            <div className="tiny bold" style={{ color: '#c58cff', marginBottom: 4, letterSpacing: 0.6 }}>
              🎙️ IN AN INTERVIEW
            </div>
            <RichText text={lesson.interviewAngle} />
          </div>

          <button
            className="btn gold block"
            disabled={questionCount === 0}
            onClick={() => {
              sfx.click()
              startRun({ mode: 'practice', world: node.world, skill: skillId })
            }}
          >
            ⚔️ Practise this now ({questionCount} questions)
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- nav */}
      <div className="row mt" style={{ gap: 10 }}>
        <button
          className="btn ghost"
          style={{ flex: 1 }}
          disabled={page === 0}
          onClick={() => {
            sfx.click()
            setPage((p) => Math.max(0, p - 1))
          }}
        >
          ← Back
        </button>
        {onSummary ? (
          <button className="btn primary" style={{ flex: 1 }} onClick={onExit}>
            Done
          </button>
        ) : (
          <button
            className="btn primary"
            style={{ flex: 1 }}
            onClick={() => {
              sfx.click()
              setPage((p) => Math.min(total - 1, p + 1))
            }}
          >
            {page === total - 2 ? 'Finish' : 'Next'} →
          </button>
        )}
      </div>

      <div className="tiny faint center mt">Use ← and → to move between pages</div>
    </div>
  )
}
