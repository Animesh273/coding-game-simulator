import { useMemo, useState } from 'react'
import { useGame } from '../state/store'
import { COMPANIES, TIER_COLOR, TIER_LABEL } from '../content/companies'
import { WORLD_BY_ID } from '../content/worlds'
import { levelFromXp } from '../game/progression'
import { dueCards } from '../game/adaptive'
import { buildLeaderboard, playerPosition, nextTarget } from '../game/leaderboard'
import { AVATAR_BASES, partById } from '../game/avatar'
import { Modal, Empty, Bar } from '../components/common'
import { sfx } from '../lib/sfx'
import type { Company } from '../game/types'

type Panel = 'circuit' | 'board'

export function Arena() {
  const [panel, setPanel] = useState<Panel>('circuit')

  return (
    <div className="screen">
      <h2 className="screen-title">Interview Arena</h2>
      <p className="screen-sub">Where practice stops and pressure starts.</p>

      <div className="row mb" style={{ gap: 8 }}>
        <button
          className={`btn sm ${panel === 'circuit' ? 'primary' : 'ghost'}`}
          onClick={() => {
            sfx.click()
            setPanel('circuit')
          }}
        >
          👑 Interview Circuit
        </button>
        <button
          className={`btn sm ${panel === 'board' ? 'primary' : 'ghost'}`}
          onClick={() => {
            sfx.click()
            setPanel('board')
          }}
        >
          🏆 Leaderboard
        </button>
      </div>

      {panel === 'circuit' ? <Circuit /> : <Leaderboard />}
    </div>
  )
}

/* ============================================================== circuit === */

function Circuit() {
  const totalXp = useGame((s) => s.totalXp)
  const defeated = useGame((s) => s.defeatedCompanies)
  const srs = useGame((s) => s.srs)
  const startRun = useGame((s) => s.startRun)
  const [preview, setPreview] = useState<Company | null>(null)

  const { level } = levelFromXp(totalXp)
  const due = dueCards(srs, Date.now()).length

  return (
    <>
      <div className="grid two mb">
        <button
          className="card tight row"
          style={{ textAlign: 'left', borderColor: due > 0 ? 'rgba(255,204,77,.45)' : undefined }}
          disabled={due === 0}
          onClick={() => {
            sfx.click()
            startRun({ mode: 'revision' })
          }}
        >
          <span style={{ fontSize: 26 }}>🗝️</span>
          <div>
            <div className="bold">Revision Dungeon</div>
            <div className="tiny faint">{due > 0 ? `${due} cards due` : 'Nothing due'}</div>
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
          <span style={{ fontSize: 26 }}>⚡</span>
          <div>
            <div className="bold">Coding Battle</div>
            <div className="tiny faint">12 questions · 25s each</div>
          </div>
        </button>
      </div>

      <div className="card-title">Boss Interviews</div>
      <div className="grid">
        {COMPANIES.map((c) => {
          const locked = level < c.unlockLevel
          const won = defeated.includes(c.id)
          return (
            <button
              key={c.id}
              className="card row"
              style={{
                textAlign: 'left',
                gap: 14,
                opacity: locked ? 0.5 : 1,
                filter: locked ? 'grayscale(.8)' : undefined,
                borderColor: won ? 'rgba(52,211,153,.45)' : locked ? undefined : `${TIER_COLOR[c.tier]}55`,
                cursor: locked ? 'not-allowed' : 'pointer',
              }}
              disabled={locked}
              onClick={() => {
                sfx.click()
                setPreview(c)
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 26,
                  flexShrink: 0,
                  background: locked ? 'rgba(255,255,255,.06)' : `${TIER_COLOR[c.tier]}22`,
                  border: `1px solid ${locked ? 'var(--line)' : TIER_COLOR[c.tier] + '66'}`,
                }}
              >
                {locked ? '🔒' : c.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span className="bold" style={{ fontSize: 16 }}>
                    {c.name}
                  </span>
                  <span className="tag" style={{ color: TIER_COLOR[c.tier], borderColor: `${TIER_COLOR[c.tier]}55` }}>
                    {TIER_LABEL[c.tier]}
                  </span>
                  {won && <span className="tag" style={{ color: 'var(--good)' }}>✓ Cleared</span>}
                </div>
                <div className="tiny faint" style={{ marginTop: 4 }}>
                  {locked
                    ? `Unlocks at level ${c.unlockLevel}`
                    : `${c.focus.map((f) => WORLD_BY_ID[f].icon).join(' ')} · ${c.hp} HP · ${c.timer}s per question`}
                </div>
                {locked && (
                  <div style={{ marginTop: 7 }}>
                    <Bar value={Math.min(1, level / c.unlockLevel)} thin />
                    <div className="tiny faint" style={{ marginTop: 4 }}>
                      Level {level} / {c.unlockLevel}
                    </div>
                  </div>
                )}
              </div>
              {!locked && <span style={{ fontSize: 20, opacity: 0.4 }}>›</span>}
            </button>
          )
        })}
      </div>

      {preview && <BossPreview company={preview} onClose={() => setPreview(null)} />}
    </>
  )
}

function BossPreview({ company, onClose }: { company: Company; onClose: () => void }) {
  const startRun = useGame((s) => s.startRun)
  const defeated = useGame((s) => s.defeatedCompanies).includes(company.id)

  return (
    <Modal onClose={onClose}>
      <div className="modal-emoji">{company.icon}</div>
      <div className="modal-title">{company.name}</div>
      <div
        className="tag"
        style={{ color: TIER_COLOR[company.tier], borderColor: `${TIER_COLOR[company.tier]}55`, marginBottom: 14 }}
      >
        {TIER_LABEL[company.tier]}
      </div>

      <div className="card tight mb" style={{ textAlign: 'left' }}>
        <div className="tiny faint mb">YOUR INTERVIEWER</div>
        <div className="small" style={{ lineHeight: 1.6 }}>
          {company.persona}
        </div>
      </div>

      <div className="grid three mb">
        <div className="card tight center">
          <div className="tiny faint">HP</div>
          <div className="bold" style={{ fontSize: 20 }}>
            {company.hp}
          </div>
          <div className="tiny faint">correct answers</div>
        </div>
        <div className="card tight center">
          <div className="tiny faint">TIMER</div>
          <div className="bold" style={{ fontSize: 20 }}>
            {company.timer}s
          </div>
          <div className="tiny faint">per question</div>
        </div>
        <div className="card tight center">
          <div className="tiny faint">STRIKES</div>
          <div className="bold" style={{ fontSize: 20 }}>
            3
          </div>
          <div className="tiny faint">then it's over</div>
        </div>
      </div>

      <div className="warn mb" style={{ textAlign: 'left' }}>
        Covers {company.focus.map((f) => WORLD_BY_ID[f].name).join(', ')}. Win and you take{' '}
        <strong>+{company.rewardXp} XP</strong>, <strong>+{company.rewardGems} gems</strong> and a chest.
        {defeated && ' You have already cleared this one — a rematch still pays out.'}
      </div>

      <button
        className="btn gold block"
        onClick={() => {
          sfx.click()
          startRun({ mode: 'boss', companyId: company.id })
          onClose()
        }}
      >
        Enter the interview
      </button>
    </Modal>
  )
}

/* =========================================================== leaderboard === */

function Leaderboard() {
  const { name, avatar, totalXp, createdAt } = useGame()
  const base = partById(AVATAR_BASES, avatar.base)

  const rows = useMemo(
    () => buildLeaderboard(name, base.emoji, totalXp, createdAt),
    [name, base.emoji, totalXp, createdAt],
  )
  const pos = playerPosition(rows)
  const target = nextTarget(rows)

  return (
    <>
      <div className="card mb" style={{ background: 'linear-gradient(135deg, rgba(255,204,77,.14), rgba(124,92,255,.08))' }}>
        <div className="row between">
          <div>
            <div className="tiny faint">YOUR POSITION</div>
            <div className="bold" style={{ fontSize: 28 }}>
              #{pos}
              <span className="small dim" style={{ fontWeight: 500 }}> of {rows.length}</span>
            </div>
          </div>
          <div style={{ fontSize: 34 }}>{pos === 1 ? '👑' : pos <= 3 ? '🥇' : pos <= 10 ? '📈' : '🎯'}</div>
        </div>
        {target && (
          <div className="small dim mt">
            <strong>{(target.xp - totalXp).toLocaleString()} XP</strong> behind {target.name} — roughly{' '}
            {Math.max(1, Math.ceil((target.xp - totalXp) / 120))} focused session
            {Math.ceil((target.xp - totalXp) / 120) === 1 ? '' : 's'} away.
          </div>
        )}
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <Empty icon="🏆" title="No rankings yet" />
        ) : (
          rows.map((r, i) => (
            <div key={r.id} className={`lb-row${r.isPlayer ? ' me' : ''}`}>
              <span className={`lb-pos${i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : ''}`}>
                {i + 1}
              </span>
              <span className="lb-av">{r.avatar}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="bold small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name} {r.isPlayer && <span className="tiny faint">(you)</span>}
                </div>
                <div className="tiny" style={{ color: r.rankColor }}>
                  Lv {r.level} · {r.rankTier}
                </div>
              </div>
              <span className="bold small xp-text">{r.xp.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>

      <div className="tiny faint mt center">
        ASCEND runs entirely on your device. These rivals are simulated pace-setters, not real accounts — they exist
        to give you something to chase.
      </div>
    </>
  )
}
