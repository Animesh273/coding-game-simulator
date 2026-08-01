import { useState } from 'react'
import { useGame, countUnlockedSkills, worldMasteryPercent } from '../state/store'
import { levelFromXp, rankFromLevel, rankProgress } from '../game/progression'
import { ACHIEVEMENTS, TIER_COLOR } from '../game/achievements'
import { AVATAR_BASES, AVATAR_COLORS, AVATAR_AURAS, TITLES } from '../game/avatar'
import { WORLDS } from '../content/worlds'
import { QUESTION_COUNT } from '../content/questions'
import { isSfxEnabled, setSfxEnabled, sfx } from '../lib/sfx'
import { TopicsPanel } from './Topics'
import { Avatar, Bar, Modal, CountUp } from '../components/common'
import type { AvatarPart } from '../game/avatar'

type Panel = 'stats' | 'topics' | 'badges' | 'locker'

export function Profile() {
  const [panel, setPanel] = useState<Panel>('stats')

  return (
    <div className="screen">
      <Hero />

      <div className="row wrap mb" style={{ gap: 8 }}>
        {(
          [
            ['stats', '📊 Stats'],
            ['topics', '🗂️ Topics'],
            ['badges', '🏅 Badges'],
            ['locker', '🎨 Locker'],
          ] as [Panel, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            className={`btn sm ${panel === id ? 'primary' : 'ghost'}`}
            onClick={() => {
              sfx.click()
              setPanel(id)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {panel === 'stats' && <Stats />}
      {panel === 'topics' && <TopicsPanel />}
      {panel === 'badges' && <Badges />}
      {panel === 'locker' && <Locker />}
    </div>
  )
}

/* ================================================================= hero === */

function Hero() {
  const { name, avatar, totalXp, streak } = useGame()
  const { level, into, need } = levelFromXp(totalXp)
  const rank = rankFromLevel(level)

  return (
    <div
      className="card mb"
      style={{
        background: `linear-gradient(140deg, ${rank.color}22, rgba(255,255,255,.03))`,
        borderColor: `${rank.color}44`,
      }}
    >
      <div className="row" style={{ gap: 16 }}>
        <Avatar config={avatar} size={72} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bold" style={{ fontSize: 21, letterSpacing: -0.4 }}>
            {name || 'Challenger'}
          </div>
          <div className="small" style={{ color: rank.color, fontWeight: 700 }}>
            {avatar.title} · {rank.tier} {rank.division}
          </div>
          <div className="tiny faint" style={{ marginTop: 3 }}>
            Level {level} · {totalXp.toLocaleString()} total XP · 🔥 {streak.count}-day streak
          </div>
        </div>
      </div>

      <div className="mt">
        <div className="row between" style={{ marginBottom: 5 }}>
          <span className="tiny faint">LEVEL {level}</span>
          <span className="tiny faint">
            {into}/{need} XP
          </span>
        </div>
        <Bar value={into / need} color="linear-gradient(90deg, var(--xp), #4ade80)" />
      </div>

      <div className="mt">
        <div className="row between" style={{ marginBottom: 5 }}>
          <span className="tiny faint">
            {rank.tier} {rank.division} → next rank
          </span>
          <span className="tiny faint">{Math.round(rankProgress(level) * 100)}%</span>
        </div>
        <Bar value={rankProgress(level)} color={rank.color} thin />
      </div>
    </div>
  )
}

/* ================================================================ stats === */

function Stats() {
  const s = useGame()
  const accuracy = s.stats.totalAnswered > 0 ? Math.round((s.stats.totalCorrect / s.stats.totalAnswered) * 100) : 0
  const hours = (s.stats.timePlayedMs / 3_600_000).toFixed(1)
  const [sfxOn, setSfxOn] = useState(isSfxEnabled())
  const [confirmReset, setConfirmReset] = useState(false)
  const reset = useGame((st) => st.resetProgress)

  const tiles: [string, string, string][] = [
    ['📝', 'Questions answered', s.stats.totalAnswered.toLocaleString()],
    ['🎯', 'Accuracy', `${accuracy}%`],
    ['🔥', 'Best combo', `${s.stats.bestCombo}x`],
    ['👑', 'Bosses defeated', String(s.stats.bossesDefeated)],
    ['💎', 'Flawless runs', String(s.stats.perfectRuns)],
    ['🗝️', 'Revisions cleared', String(s.stats.revisionsCleared)],
    ['🌿', 'Skills unlocked', `${countUnlockedSkills(s.mastery)}`],
    ['⏱️', 'Time trained', `${hours}h`],
  ]

  return (
    <>
      <div className="grid three mb">
        {tiles.map(([icon, label, value]) => (
          <div key={label} className="card tight center">
            <div style={{ fontSize: 22 }}>{icon}</div>
            <div className="bold" style={{ fontSize: 19, marginTop: 2 }}>
              {value}
            </div>
            <div className="tiny faint">{label}</div>
          </div>
        ))}
      </div>

      <div className="card mb">
        <div className="card-title">World Mastery</div>
        {WORLDS.map((w) => {
          const pct = worldMasteryPercent(w.id, s.mastery)
          return (
            <div key={w.id} style={{ marginBottom: 12 }}>
              <div className="row between" style={{ marginBottom: 5 }}>
                <span className="small">
                  {w.icon} {w.name}
                </span>
                <span className="tiny faint">{Math.round(pct * 100)}%</span>
              </div>
              <Bar value={pct} thin color={`linear-gradient(90deg, ${w.hue[0]}, ${w.hue[1]})`} />
            </div>
          )
        })}
        <div className="tiny faint">
          Question bank: {QUESTION_COUNT} across {WORLDS.length} worlds.
        </div>
      </div>

      <div className="card">
        <div className="card-title">Settings</div>
        <div className="row between mb">
          <div>
            <div className="small bold">Sound effects</div>
            <div className="tiny faint">Combo tones, level-ups, chest openings</div>
          </div>
          <button
            className={`btn sm ${sfxOn ? 'primary' : 'ghost'}`}
            onClick={() => {
              const next = !sfxOn
              setSfxEnabled(next)
              setSfxOn(next)
              if (next) sfx.correct(3)
            }}
          >
            {sfxOn ? 'On' : 'Off'}
          </button>
        </div>
        <div className="row between">
          <div>
            <div className="small bold">Reset progress</div>
            <div className="tiny faint">Wipes your save from this browser. Cannot be undone.</div>
          </div>
          <button className="btn danger sm" onClick={() => setConfirmReset(true)}>
            Reset
          </button>
        </div>
      </div>

      {confirmReset && (
        <Modal onClose={() => setConfirmReset(false)}>
          <div className="modal-emoji">⚠️</div>
          <div className="modal-title">Erase everything?</div>
          <div className="modal-sub">
            Your level, streak, mastery, badges and cosmetics will be permanently deleted from this browser. There is
            no backup.
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => setConfirmReset(false)}>
              Keep my progress
            </button>
            <button
              className="btn danger"
              style={{ flex: 1 }}
              onClick={() => {
                reset()
                setConfirmReset(false)
              }}
            >
              Erase it all
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

/* =============================================================== badges === */

function Badges() {
  const earned = useGame((s) => s.achievements)
  const set = new Set(earned)

  return (
    <>
      <div className="card mb">
        <div className="row between">
          <div>
            <div className="bold" style={{ fontSize: 18 }}>
              <CountUp to={earned.length} /> / {ACHIEVEMENTS.length}
            </div>
            <div className="tiny faint">badges earned</div>
          </div>
          <div style={{ fontSize: 30 }}>🏅</div>
        </div>
        <Bar value={earned.length / ACHIEVEMENTS.length} color="var(--gold)" style={{ marginTop: 10 }} />
      </div>

      <div className="grid two">
        {ACHIEVEMENTS.map((a) => {
          const has = set.has(a.id)
          return (
            <div
              key={a.id}
              className="card tight row"
              style={{
                gap: 12,
                opacity: has ? 1 : 0.44,
                filter: has ? undefined : 'grayscale(1)',
                borderColor: has ? `${TIER_COLOR[a.tier]}55` : undefined,
                background: has ? `${TIER_COLOR[a.tier]}12` : undefined,
              }}
            >
              <div style={{ fontSize: 26, flexShrink: 0 }}>{has ? a.icon : '🔒'}</div>
              <div style={{ minWidth: 0 }}>
                <div className="small bold" style={{ color: has ? TIER_COLOR[a.tier] : undefined }}>
                  {a.name}
                </div>
                <div className="tiny faint">{a.desc}</div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* =============================================================== locker === */

function Locker() {
  const { avatar, gems, ownedCosmetics, unlockedTitles, achievements } = useGame()
  const buy = useGame((s) => s.buyCosmetic)
  const setAvatar = useGame((s) => s.setAvatar)

  function section(title: string, parts: AvatarPart[], field: 'base' | 'color' | 'aura') {
    return (
      <div className="card mb">
        <div className="card-title">{title}</div>
        <div className="pickgrid">
          {parts.map((p) => {
            const owned = ownedCosmetics.includes(p.id)
            const on = avatar[field] === p.id
            return (
              <button
                key={p.id}
                className={`pick${on ? ' on' : ''}${owned ? '' : ' locked'}`}
                onClick={() => {
                  if (owned) {
                    sfx.click()
                    setAvatar({ [field]: p.id })
                  } else if (buy(p.id, p.cost)) {
                    sfx.chest()
                    setAvatar({ [field]: p.id })
                  } else {
                    sfx.wrong()
                  }
                }}
              >
                <div className="pe">{p.emoji}</div>
                <div className="pl">{p.label}</div>
                {!owned && (
                  <div className="tiny gem-text" style={{ marginTop: 3, fontWeight: 800 }}>
                    💎 {p.cost}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card mb center">
        <Avatar config={avatar} size={82} />
        <div className="bold mt" style={{ fontSize: 16 }}>
          {avatar.title}
        </div>
        <div className="tiny faint">💎 {gems.toLocaleString()} available</div>
      </div>

      {section('Character', AVATAR_BASES, 'base')}
      {section('Colour', AVATAR_COLORS, 'color')}
      {section('Aura', AVATAR_AURAS, 'aura')}

      <div className="card">
        <div className="card-title">Titles</div>
        <div className="row wrap" style={{ gap: 8 }}>
          {TITLES.map((t) => {
            const unlocked =
              unlockedTitles.includes(t.id) || !t.requires || achievements.includes(t.requires)
            return (
              <button
                key={t.id}
                className={`tag${avatar.title === t.id ? ' picked' : ''}`}
                style={{
                  opacity: unlocked ? 1 : 0.4,
                  borderColor: avatar.title === t.id ? 'var(--accent)' : undefined,
                  color: avatar.title === t.id ? 'var(--text)' : undefined,
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  padding: '6px 12px',
                }}
                disabled={!unlocked}
                onClick={() => {
                  sfx.click()
                  setAvatar({ title: t.id })
                }}
              >
                {unlocked ? '' : '🔒 '}
                {t.label}
              </button>
            )
          })}
        </div>
        <div className="tiny faint mt">Titles are earned from achievements and chests, never bought.</div>
      </div>
    </>
  )
}
