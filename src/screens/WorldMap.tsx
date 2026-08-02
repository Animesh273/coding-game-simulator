import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGame, worldMasteryPercent, DAILY_GOAL_XP, dailyGoalProgress } from '../state/store'
import { WORLDS } from '../content/worlds'
import { levelFromXp } from '../game/progression'
import { dueCards } from '../game/adaptive'
import { sfx } from '../lib/sfx'
import type { WorldId } from '../game/types'

/**
 * The world map.
 *
 * This was a vertical stack of identical full-width cards — a settings list
 * with a connector line drawn down the side. It read as administration, not
 * adventure. Now the worlds sit as nodes along a winding trail: alternating
 * left and right, joined by a path that fills in behind you as worlds are
 * mastered, with the next playable world pulsing.
 *
 * Node positions are computed from a sine so the trail curves organically
 * rather than zig-zagging, and the connecting path is a real SVG measured
 * against the container so it stays correct at any width.
 */

const SPACING = 148
const TOP_PAD = 40

export function WorldMap({ onEnterWorld }: { onEnterWorld: (id: WorldId) => void }) {
  const state = useGame()
  const { level } = levelFromXp(state.totalXp)
  const startRun = useGame((s) => s.startRun)
  const due = dueCards(state.srs, Date.now()).length
  const goal = dailyGoalProgress(state)

  const trailRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  // The SVG trail needs real pixel coordinates, so measure rather than guess.
  useLayoutEffect(() => {
    const el = trailRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const nodes = useMemo(() => {
    // Amplitude shrinks on narrow screens so nodes never leave the viewport.
    const amp = Math.min(Math.max(width * 0.19, 26), 132)
    return WORLDS.map((w, i) => ({
      world: w,
      // A quarter-turn per step gives a clean centre → right → centre → left
      // serpentine. A smaller frequency drifted the trail to one side for
      // four nodes at a time, which read as a lean rather than a path.
      x: width / 2 + Math.sin(i * (Math.PI / 2)) * amp,
      y: TOP_PAD + i * SPACING,
      locked: level < w.unlockLevel,
      pct: worldMasteryPercent(w.id, state.mastery),
    }))
  }, [width, level, state.mastery])

  // The first unlocked world you haven't finished — the one to nudge toward.
  const focusIndex = nodes.findIndex((n) => !n.locked && n.pct < 0.85)
  const height = TOP_PAD * 2 + (WORLDS.length - 1) * SPACING + 90

  // Smooth curve through the node centres.
  const path = useMemo(() => {
    if (nodes.length === 0 || width === 0) return ''
    return nodes.reduce((d, n, i) => {
      if (i === 0) return `M ${n.x} ${n.y}`
      const prev = nodes[i - 1]
      const midY = (prev.y + n.y) / 2
      return `${d} C ${prev.x} ${midY}, ${n.x} ${midY}, ${n.x} ${n.y}`
    }, '')
  }, [nodes, width])

  // How far along the trail the player has actually travelled.
  const travelled = focusIndex === -1 ? 1 : focusIndex / Math.max(1, WORLDS.length - 1)

  return (
    <div className="screen map-screen">
      {/* --------------------------------------------------- daily goal */}
      <div className="hud-panel mb">
        <div className="row between">
          <div>
            <div className="hud-label">{goal >= 1 ? 'Daily goal complete' : "Today's goal"}</div>
            <div className="hud-value">
              {Math.min(state.streak.todayXp, DAILY_GOAL_XP)}
              <span className="hud-value-sub">/ {DAILY_GOAL_XP} XP</span>
            </div>
          </div>
          <div className={`goal-orb${goal >= 1 ? ' complete' : ''}`}>
            <svg viewBox="0 0 48 48" width="52" height="52">
              <circle cx="24" cy="24" r="20" className="goal-track" />
              <circle
                cx="24"
                cy="24"
                r="20"
                className="goal-fill"
                strokeDasharray={`${goal * 125.6} 125.6`}
              />
            </svg>
            <span className="goal-emoji">{goal >= 1 ? '🔥' : '🎯'}</span>
          </div>
        </div>
        {state.streak.count > 0 && (
          <div className="tiny faint mt">🔥 {state.streak.count}-day streak alive</div>
        )}
      </div>

      {/* ------------------------------------------------ quick actions */}
      <div className="grid two mb">
        <button
          className={`action-tile${due > 0 ? ' urgent' : ''}`}
          onClick={() => {
            if (due === 0) return
            sfx.click()
            startRun({ mode: 'revision' })
          }}
          disabled={due === 0}
        >
          <span className="action-icon">🗝️</span>
          <span>
            <span className="action-title">Revision Dungeon</span>
            <span className="action-sub">{due > 0 ? `${due} card${due === 1 ? '' : 's'} due` : 'Nothing due'}</span>
          </span>
          {due > 0 && <span className="action-badge">{due}</span>}
        </button>

        <button
          className="action-tile"
          onClick={() => {
            sfx.click()
            startRun({ mode: 'timed' })
          }}
        >
          <span className="action-icon">⏱️</span>
          <span>
            <span className="action-title">Timed Gauntlet</span>
            <span className="action-sub">25s per question</span>
          </span>
        </button>
      </div>

      <h2 className="screen-title display">Learning Worlds</h2>
      <p className="screen-sub">{WORLDS.length} realms between you and an offer letter.</p>

      {/* ------------------------------------------------------- trail */}
      <div className="trail" ref={trailRef} style={{ height }}>
        <svg className="trail-svg" width={width} height={height} aria-hidden>
          <defs>
            <linearGradient id="trailFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-2)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
          </defs>
          {/* Unwalked trail sits behind, dashed and dim. */}
          <path d={path} className="trail-path" />
          {/* Walked portion, revealed by dash offset. */}
          <path
            d={path}
            className="trail-path walked"
            style={{ strokeDasharray: 3000, strokeDashoffset: 3000 - travelled * 3000 }}
          />
        </svg>

        {nodes.map((n, i) => {
          const w = n.world
          const wash = `linear-gradient(140deg, ${w.hue[0]}, ${w.hue[1]})`
          const isFocus = i === focusIndex
          // Nodes on the right half hang their label to the left, so a plate
          // never runs off the edge. Decided here rather than in CSS — the
          // previous attribute-substring selector was matching pixel strings
          // and flipped sides essentially at random.
          const side = n.x > width / 2 ? 'plate-left' : 'plate-right'
          return (
            <button
              key={w.id}
              className={`node ${side}${n.locked ? ' locked' : ''}${isFocus ? ' focus' : ''}`}
              style={{ left: n.x, top: n.y }}
              onClick={() => {
                if (n.locked) return
                sfx.click()
                onEnterWorld(w.id)
              }}
              disabled={n.locked}
              title={n.locked ? `Unlocks at level ${w.unlockLevel}` : w.name}
            >
              <span className="node-orb" style={{ background: n.locked ? undefined : wash }}>
                {/* Mastery ring around the orb. */}
                <svg className="node-ring" viewBox="0 0 84 84" aria-hidden>
                  <circle cx="42" cy="42" r="38" className="ring-track" />
                  <circle
                    cx="42"
                    cy="42"
                    r="38"
                    className="ring-fill"
                    strokeDasharray={`${n.pct * 238.8} 238.8`}
                  />
                </svg>
                <span className="node-icon">{n.locked ? '🔒' : w.icon}</span>
                {isFocus && <span className="node-pulse" />}
              </span>

              <span className="node-plate">
                <span className="node-name">{w.name}</span>
                <span className="node-sub">
                  {n.locked ? `Level ${w.unlockLevel}` : `${Math.round(n.pct * 100)}% · ${w.skills.length} skills`}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
