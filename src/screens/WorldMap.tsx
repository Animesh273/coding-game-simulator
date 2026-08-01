import { useGame, worldMasteryPercent, DAILY_GOAL_XP, dailyGoalProgress } from '../state/store'
import { WORLDS } from '../content/worlds'
import { levelFromXp } from '../game/progression'
import { dueCards } from '../game/adaptive'
import { Bar } from '../components/common'
import { sfx } from '../lib/sfx'
import type { WorldId } from '../game/types'

export function WorldMap({ onEnterWorld }: { onEnterWorld: (id: WorldId) => void }) {
  const state = useGame()
  const { level } = levelFromXp(state.totalXp)
  const startRun = useGame((s) => s.startRun)
  const due = dueCards(state.srs, Date.now()).length
  const goal = dailyGoalProgress(state)

  return (
    <div className="screen">
      {/* --------------------------------------------------- daily goal */}
      <div className="card mb" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,.15), rgba(34,211,238,.07))' }}>
        <div className="row between mb">
          <div>
            <div className="bold" style={{ fontSize: 16 }}>
              {goal >= 1 ? '🎉 Daily goal complete' : "Today's goal"}
            </div>
            <div className="small dim">
              {Math.min(state.streak.todayXp, DAILY_GOAL_XP)} / {DAILY_GOAL_XP} XP
              {state.streak.count > 0 && ` · ${state.streak.count}-day streak alive`}
            </div>
          </div>
          <div style={{ fontSize: 30 }}>{goal >= 1 ? '🔥' : '🎯'}</div>
        </div>
        <Bar value={goal} color="linear-gradient(90deg, var(--flame), var(--gold))" />
      </div>

      {/* -------------------------------------------------- quick actions */}
      <div className="grid two mb">
        <button
          className="card tight row"
          style={{ textAlign: 'left', borderColor: due > 0 ? 'rgba(255,204,77,.45)' : undefined }}
          onClick={() => {
            if (due === 0) return
            sfx.click()
            startRun({ mode: 'revision' })
          }}
          disabled={due === 0}
        >
          <span style={{ fontSize: 26 }}>🗝️</span>
          <div style={{ flex: 1 }}>
            <div className="bold">Revision Dungeon</div>
            <div className="tiny faint">
              {due > 0 ? `${due} card${due === 1 ? '' : 's'} due — clear them before they decay` : 'Nothing due right now'}
            </div>
          </div>
        </button>

        <button
          className="card tight row"
          style={{ textAlign: 'left' }}
          onClick={() => {
            sfx.click()
            startRun({ mode: 'timed' })
          }}
        >
          <span style={{ fontSize: 26 }}>⏱️</span>
          <div style={{ flex: 1 }}>
            <div className="bold">Timed Gauntlet</div>
            <div className="tiny faint">25s per question, mixed topics</div>
          </div>
        </button>
      </div>

      <h2 className="screen-title">Learning Worlds</h2>
      <p className="screen-sub">Eight realms between you and an offer letter.</p>

      <div className="map">
        {WORLDS.map((w, idx) => {
          const locked = level < w.unlockLevel
          const pct = worldMasteryPercent(w.id, state.mastery)
          const wash = `linear-gradient(135deg, ${w.hue[0]}, ${w.hue[1]})`
          return (
            <div key={w.id}>
              {idx > 0 && <div className="map-link" />}
              <button
                className={`map-node${locked ? ' locked' : ''}`}
                style={{ ['--wash' as string]: wash, ['--glow' as string]: `${w.hue[0]}55` }}
                onClick={() => {
                  if (locked) return
                  sfx.click()
                  onEnterWorld(w.id)
                }}
                disabled={locked}
              >
                <div className={`map-orb${locked ? ' locked' : ''}`} style={{ ['--wash' as string]: wash }}>
                  {locked ? '🔒' : w.icon}
                </div>
                <div className="map-body">
                  <div className="map-name">{w.name}</div>
                  <div className="map-sub">{locked ? `Unlocks at level ${w.unlockLevel}` : w.subtitle}</div>
                  {!locked && (
                    <>
                      <Bar value={pct} thin color={wash} />
                      <div className="tiny faint" style={{ marginTop: 5 }}>
                        {Math.round(pct * 100)}% mastered · {w.skills.length} skills
                      </div>
                    </>
                  )}
                </div>
                {!locked && <span style={{ fontSize: 20, opacity: 0.45, position: 'relative', zIndex: 1 }}>›</span>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
