import { useState } from 'react'
import { useGame, isSkillUnlocked, worldMasteryPercent } from '../state/store'
import { WORLD_BY_ID } from '../content/worlds'
import { masteryPercent, masteryBadge, emptyMastery, recommendedDifficulty } from '../game/adaptive'
import { questionsForSkill } from '../content/questions'
import { lessonFor } from '../content/lessons'
import { Bar, Modal, DifficultyDots } from '../components/common'
import { sfx } from '../lib/sfx'
import type { WorldId, SkillNode } from '../game/types'

const COL = 152
const ROW = 104

export function WorldDetail({
  world,
  onBack,
  onLearn,
}: {
  world: WorldId
  onBack: () => void
  onLearn: (skillId: string) => void
}) {
  const w = WORLD_BY_ID[world]
  const mastery = useGame((s) => s.mastery)
  const startRun = useGame((s) => s.startRun)
  const lessonsRead = useGame((s) => s.lessonsRead)
  const [selected, setSelected] = useState<SkillNode | null>(null)

  const wash = `linear-gradient(135deg, ${w.hue[0]}, ${w.hue[1]})`
  const overall = worldMasteryPercent(world, mastery)

  const maxX = Math.max(...w.skills.map((s) => s.x))
  const maxY = Math.max(...w.skills.map((s) => s.y))

  return (
    <div className="screen">
      <button className="btn ghost sm mb" onClick={onBack}>
        ← Worlds
      </button>

      {/* ------------------------------------------------------- header */}
      <div
        className="card mb"
        style={{ background: wash, border: 'none', boxShadow: `0 12px 44px ${w.hue[0]}44` }}
      >
        <div className="row" style={{ gap: 14 }}>
          <div style={{ fontSize: 44 }}>{w.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="bold" style={{ fontSize: 22, letterSpacing: -0.4 }}>
              {w.name}
            </div>
            <div className="small" style={{ opacity: 0.85 }}>
              {w.subtitle}
            </div>
          </div>
        </div>
        <div className="small mt" style={{ opacity: 0.9, fontStyle: 'italic' }}>
          {w.lore}
        </div>
        <div className="mt">
          <Bar value={overall} color="rgba(255,255,255,.9)" />
          <div className="tiny" style={{ marginTop: 6, opacity: 0.9 }}>
            {Math.round(overall * 100)}% world mastery
          </div>
        </div>
      </div>

      <button
        className="btn primary block mb"
        onClick={() => {
          sfx.click()
          startRun({ mode: 'practice', world })
        }}
      >
        ⚔️ Train across {w.name}
      </button>

      {/* --------------------------------------------------- skill tree */}
      <div className="card">
        <div className="card-title">Skill Tree</div>
        <div className="tree">
          <div className="tree-canvas" style={{ height: (maxY + 1) * ROW + 20, minWidth: (maxX + 1) * COL + 20 }}>
            {/* edges first so nodes paint on top */}
            {w.skills.flatMap((node) =>
              node.requires.map((reqId) => {
                const from = w.skills.find((s) => s.id === reqId)
                if (!from) return null
                const x1 = from.x * COL + 64
                const y1 = from.y * ROW + 46
                const x2 = node.x * COL + 64
                const y2 = node.y * ROW + 46
                const dx = x2 - x1
                const dy = y2 - y1
                const len = Math.sqrt(dx * dx + dy * dy)
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI
                const live = masteryPercent(mastery[reqId] ?? emptyMastery()) >= 0.35
                return (
                  <div
                    key={`${reqId}->${node.id}`}
                    className={`tree-edge${live ? ' live' : ''}`}
                    style={{ left: x1, top: y1, width: len, transform: `rotate(${angle}deg)` }}
                  />
                )
              }),
            )}

            {w.skills.map((node) => {
              const m = mastery[node.id] ?? emptyMastery()
              const pct = masteryPercent(m)
              const unlocked = isSkillUnlocked(node.id, mastery)
              const badge = masteryBadge(pct)
              return (
                <button
                  key={node.id}
                  className={`tree-node${unlocked ? '' : ' locked'}${pct >= 0.9 ? ' mastered' : ''}`}
                  style={{ left: node.x * COL, top: node.y * ROW }}
                  onClick={() => {
                    if (!unlocked) return
                    sfx.click()
                    setSelected(node)
                  }}
                  disabled={!unlocked}
                >
                  <div className="tree-icon" style={{ position: 'relative' }}>
                    {unlocked ? node.icon : '🔒'}
                    {/* Unread-lesson dot — the tree should advertise where
                        there is something to read, not just something to grind. */}
                    {unlocked && lessonFor(node.id) && !lessonsRead.includes(node.id) && (
                      <span
                        style={{
                          position: 'absolute',
                          top: -2,
                          right: 'calc(50% - 26px)',
                          fontSize: 11,
                          filter: 'drop-shadow(0 0 5px #c58cff)',
                        }}
                        title="Lesson available"
                      >
                        📖
                      </span>
                    )}
                  </div>
                  <div className="tree-name">{node.name}</div>
                  <Bar value={pct} thin color={wash} />
                  <div className="tiny" style={{ marginTop: 4, color: badge.color, fontWeight: 700 }}>
                    {unlocked ? badge.label : 'Locked'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <div className="tiny faint">
          Nodes unlock once their prerequisite reaches 35% mastery. Scroll sideways to see the full tree.
        </div>
      </div>

      {selected && <SkillModal node={selected} onClose={() => setSelected(null)} onLearn={onLearn} />}
    </div>
  )
}

function SkillModal({
  node,
  onClose,
  onLearn,
}: {
  node: SkillNode
  onClose: () => void
  onLearn: (skillId: string) => void
}) {
  const mastery = useGame((s) => s.mastery)
  const startRun = useGame((s) => s.startRun)
  const lessonRead = useGame((s) => s.lessonsRead.includes(node.id))
  const lesson = lessonFor(node.id)
  const m = mastery[node.id] ?? emptyMastery()
  const pct = masteryPercent(m)
  const badge = masteryBadge(pct)
  const pool = questionsForSkill(node.id)
  const nextDiff = recommendedDifficulty(m)

  return (
    <Modal onClose={onClose}>
      <div className="modal-emoji">{node.icon}</div>
      <div className="modal-title">{node.name}</div>
      <div className="modal-sub">{node.blurb}</div>

      <div className="card tight mb" style={{ textAlign: 'left' }}>
        <div className="row between mb">
          <span className="tiny faint">MASTERY</span>
          <span className="tiny bold" style={{ color: badge.color }}>
            {badge.label} · {Math.round(pct * 100)}%
          </span>
        </div>
        <Bar value={pct} color={badge.color} />
        <div className="row between mt">
          <span className="tiny faint">
            {m.correct}/{m.seen} correct
          </span>
          <span className="tiny faint row" style={{ gap: 6 }}>
            Next up <DifficultyDots level={nextDiff} color={badge.color} />
          </span>
        </div>
      </div>

      <div className="tiny faint mb">
        {pool.length} questions{lesson ? ` · ${lesson.minutes} min lesson` : ' · no lesson yet'}
      </div>

      {/* Learn first, then practise — the order the student should follow, and
          the order the buttons are in. */}
      {lesson && (
        <button
          className={`btn ${lessonRead ? 'ghost' : 'primary'} block mb`}
          onClick={() => {
            sfx.click()
            onLearn(node.id)
            onClose()
          }}
        >
          📖 {lessonRead ? 'Re-read the lesson' : `Learn ${node.name}`}
        </button>
      )}

      <button
        className={`btn ${lesson && !lessonRead ? 'ghost' : 'primary'} block`}
        disabled={pool.length === 0}
        onClick={() => {
          sfx.click()
          startRun({ mode: 'practice', world: node.world, skill: node.id })
          onClose()
        }}
      >
        {pool.length === 0 ? 'No questions yet' : `⚔️ Train ${node.name}`}
      </button>
    </Modal>
  )
}
