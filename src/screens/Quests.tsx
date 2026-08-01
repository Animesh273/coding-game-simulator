import { useGame } from '../state/store'
import { isComplete } from '../game/quests'
import { loginReward, dayKey, CHEST_COLOR, CHEST_LABEL } from '../game/progression'
import { Bar, Empty } from '../components/common'
import { sfx } from '../lib/sfx'
import type { Quest } from '../game/types'

export function Quests() {
  const quests = useGame((s) => s.quests)
  const claimQuest = useGame((s) => s.claimQuest)
  const claimLogin = useGame((s) => s.claimLogin)
  const streak = useGame((s) => s.streak)
  const freezes = useGame((s) => s.freezes)

  const canClaimLogin = streak.loginClaimedDay !== dayKey()
  const nextReward = loginReward(streak.count + (canClaimLogin ? 1 : 0))

  return (
    <div className="screen">
      <h2 className="screen-title">Quests</h2>
      <p className="screen-sub">Daily missions reset at midnight. Weekly challenges reset Monday.</p>

      {/* -------------------------------------------------- login reward */}
      <div
        className="card mb"
        style={{
          background: canClaimLogin
            ? 'linear-gradient(135deg, rgba(255,122,61,.2), rgba(255,204,77,.1))'
            : undefined,
          borderColor: canClaimLogin ? 'rgba(255,122,61,.45)' : undefined,
        }}
      >
        <div className="row between">
          <div className="row" style={{ gap: 14 }}>
            <div style={{ fontSize: 36 }}>🔥</div>
            <div>
              <div className="bold" style={{ fontSize: 17 }}>
                {streak.count}-day streak
              </div>
              <div className="small dim">
                Best: {streak.best} days
                {freezes > 0 && ` · 🧊 ${freezes} freeze${freezes === 1 ? '' : 's'} in reserve`}
              </div>
            </div>
          </div>
          {canClaimLogin ? (
            <button
              className="btn gold"
              onClick={() => {
                sfx.chest()
                claimLogin()
              }}
            >
              Claim +{nextReward.gems} 💎
            </button>
          ) : (
            <span className="tag">✓ Claimed today</span>
          )}
        </div>

        {/* 30-day ladder. Almost every day carries some chest, so a uniform 🎁
            told you nothing — the day number stays readable and the bar
            underneath colours by rarity, which is what makes day 7 and day 30
            visible as the milestones they're meant to be. */}
        <div className="row wrap mt" style={{ gap: 4 }}>
          {Array.from({ length: 30 }).map((_, i) => {
            const day = i + 1
            const done = streak.count > 0 && ((streak.count - 1) % 30) + 1 >= day
            const today = streak.count > 0 && ((streak.count - 1) % 30) + 1 === day
            const r = loginReward(day)
            const milestone = day % 7 === 0
            return (
              <div
                key={i}
                title={`Day ${day} · +${r.gems} gems${r.chest ? ` · ${CHEST_LABEL[r.chest]}` : ''}`}
                style={{
                  width: milestone ? 30 : 25,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: done ? 'linear-gradient(135deg, var(--flame), var(--gold))' : 'rgba(255,255,255,.055)',
                  border: today
                    ? '1.5px solid #fff'
                    : milestone
                      ? `1.5px solid ${r.chest ? CHEST_COLOR[r.chest] : 'var(--gold)'}`
                      : '1.5px solid transparent',
                  boxShadow: today ? '0 0 12px rgba(255,255,255,.5)' : undefined,
                }}
              >
                <div
                  style={{
                    height: 20,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: milestone ? 11 : 10,
                    fontWeight: 800,
                    color: done ? '#2a1500' : 'var(--text-faint)',
                  }}
                >
                  {day}
                </div>
                <div
                  style={{
                    height: 3,
                    background: r.chest ? CHEST_COLOR[r.chest] : 'transparent',
                    opacity: done ? 1 : 0.55,
                  }}
                />
              </div>
            )
          })}
        </div>
        <div className="row wrap mt" style={{ gap: 12 }}>
          {(['common', 'rare', 'epic', 'legendary'] as const).map((r) => (
            <span key={r} className="tiny faint row" style={{ gap: 5 }}>
              <i style={{ width: 12, height: 3, borderRadius: 9, background: CHEST_COLOR[r] }} />
              {CHEST_LABEL[r]}
            </span>
          ))}
        </div>
      </div>

      <div className="card-title">Daily Missions</div>
      <div className="grid mb">
        {quests.daily.map((q) => (
          <QuestRow key={q.id} q={q} onClaim={claimQuest} />
        ))}
      </div>

      <div className="card-title">Weekly Challenges</div>
      <div className="grid mb">
        {quests.weekly.length === 0 ? (
          <Empty icon="📜" title="No weekly challenges" />
        ) : (
          quests.weekly.map((q) => <QuestRow key={q.id} q={q} onClaim={claimQuest} weekly />)
        )}
      </div>
    </div>
  )
}

function QuestRow({ q, onClaim, weekly }: { q: Quest; onClaim: (id: string) => void; weekly?: boolean }) {
  const done = isComplete(q)
  return (
    <div className={`quest${done && !q.claimed ? ' done' : ''}`} style={{ opacity: q.claimed ? 0.5 : 1 }}>
      <div className="qi">{q.icon}</div>
      <div className="quest-mid">
        <div className="quest-label">{q.label}</div>
        <Bar
          value={q.progress / q.target}
          thin
          color={done ? 'linear-gradient(90deg, var(--good), #4ade80)' : undefined}
        />
        <div className="quest-meta">
          <span>
            {q.progress}/{q.target}
          </span>
          <span className="xp-text">+{q.rewardXp} XP</span>
          <span className="gem-text">+{q.rewardGems} 💎</span>
          {weekly && <span className="faint">weekly</span>}
        </div>
      </div>
      {q.claimed ? (
        <span className="tag">✓</span>
      ) : (
        <button
          className={`btn sm ${done ? 'gold' : 'ghost'}`}
          disabled={!done}
          onClick={() => {
            sfx.chest()
            onClaim(q.id)
          }}
        >
          {done ? 'Claim' : 'Locked'}
        </button>
      )}
    </div>
  )
}
