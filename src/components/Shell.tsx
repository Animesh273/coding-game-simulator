import { useEffect, useRef, useState } from 'react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import { CompassIcon, ScrollIcon, SwordsIcon, SparkleIcon, AvatarIcon } from './icons/NavIcons'
import type { AnimatedIconHandle, AnimatedIconProps } from './icons/types'
import { useGame, DAILY_GOAL_XP, type GameEvent } from '../state/store'
import { levelFromXp, rankFromLevel, CHEST_LABEL, CHEST_COLOR } from '../game/progression'
import { claimableCount } from '../game/quests'
import { ACHIEVEMENT_BY_ID } from '../game/achievements'
import { Avatar, Modal, Confetti, CountUp } from './common'
import { sfx } from '../lib/sfx'
import { dueCards } from '../game/adaptive'

export type Tab = 'map' | 'quests' | 'arena' | 'mentor' | 'profile'

/* ============================================================== topbar === */

export function TopBar({ onOpenChests }: { onOpenChests: () => void }) {
  const { totalXp, gems, hints, streak, avatar, pendingChests } = useGame()
  const { level, into, need } = levelFromXp(totalXp)
  const rank = rankFromLevel(level)

  // Flash the gem chip whenever the balance moves, so income is felt.
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 460)
    return () => clearTimeout(t)
  }, [gems])

  return (
    <header className="topbar">
      <Avatar config={avatar} size={38} />

      <div className="tb-level">
        <div className="tb-level-row">
          <span className="tb-level-num">Lv {level}</span>
          <span className="tb-rank" style={{ color: rank.color, fontWeight: 700 }}>
            {rank.tier} {rank.division}
          </span>
          <span className="spacer" />
          <span className="tiny faint">
            {into}/{need}
          </span>
        </div>
        <div className="xpbar">
          <i style={{ width: `${(into / need) * 100}%` }} />
        </div>
      </div>

      <div className="tb-stats">
        {pendingChests.length > 0 && (
          <button
            className="tb-chip"
            style={{ color: 'var(--gold)', borderColor: 'rgba(255,204,77,.5)' }}
            onClick={onOpenChests}
            title="Unopened chests"
          >
            🎁 {pendingChests.length}
          </button>
        )}
        <span className="tb-chip hint" title="Hint tokens">
          💡 {hints}
        </span>
        <span className={`tb-chip gem${flash ? ' pulse' : ''}`} title="Gems">
          💎 <CountUp to={gems} />
        </span>
        <span
          className="tb-chip streak"
          title={`${streak.count}-day streak · ${streak.todayXp}/${DAILY_GOAL_XP} XP today`}
        >
          🔥 {streak.count}
        </span>
      </div>
    </header>
  )
}

/* ================================================================= nav === */

const TABS: { id: Tab; Icon: AnimatedIcon; label: string }[] = [
  { id: 'map', Icon: CompassIcon, label: 'Worlds' },
  { id: 'quests', Icon: ScrollIcon, label: 'Quests' },
  { id: 'arena', Icon: SwordsIcon, label: 'Arena' },
  { id: 'mentor', Icon: SparkleIcon, label: 'Mentor' },
  { id: 'profile', Icon: AvatarIcon, label: 'Profile' },
]

type AnimatedIcon = ForwardRefExoticComponent<AnimatedIconProps & RefAttributes<AnimatedIconHandle>>

/**
 * One nav button. Owns a ref to its icon so the animation can be fired from
 * two different events — pointer hover, and the tab *becoming* active — which
 * a CSS `:hover` rule could not cover on its own. Keyboard and programmatic
 * navigation therefore animate exactly like a mouse does.
 */
function NavButton({
  tab,
  active,
  badge,
  onSelect,
}: {
  tab: (typeof TABS)[number]
  active: boolean
  badge: number
  onSelect: () => void
}) {
  const icon = useRef<AnimatedIconHandle>(null)
  const wasActive = useRef(active)

  useEffect(() => {
    if (active && !wasActive.current) icon.current?.startAnimation()
    wasActive.current = active
  }, [active])

  const { Icon } = tab
  return (
    <button
      className={active ? 'on' : ''}
      onClick={onSelect}
      onPointerEnter={() => icon.current?.startAnimation()}
      onFocus={() => icon.current?.startAnimation()}
      aria-current={active ? 'page' : undefined}
    >
      <span className="i">
        <Icon ref={icon} size={22} />
      </span>
      {tab.label}
      {badge > 0 && <span className="badge">{badge > 99 ? '99+' : badge}</span>}
    </button>
  )
}

export function Nav({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const quests = useGame((s) => s.quests)
  const srs = useGame((s) => s.srs)
  const claimable = claimableCount([...quests.daily, ...quests.weekly])
  const due = dueCards(srs, Date.now()).length

  return (
    <nav className="nav">
      {TABS.map((t) => (
        <NavButton
          key={t.id}
          tab={t}
          active={tab === t.id}
          badge={t.id === 'quests' ? claimable : t.id === 'arena' ? due : 0}
          onSelect={() => {
            sfx.click()
            onTab(t.id)
          }}
        />
      ))}
    </nav>
  )
}

/* ============================================================== events === */

/** Every event type that can appear as a toast, flattened for rendering. */
function toastContent(e: GameEvent): { icon: string; label: string; sub?: string } {
  switch (e.type) {
    case 'quest':
      return { icon: '✅', label: e.label, sub: `+${e.xp} XP · +${e.gems} gems` }
    case 'achievement': {
      const a = ACHIEVEMENT_BY_ID[e.achievementId]
      return { icon: a?.icon ?? '🏅', label: a?.name ?? 'Achievement unlocked', sub: a?.desc }
    }
    case 'levelup':
      return { icon: '⬆️', label: `Level ${e.level}` }
    case 'chest':
      return { icon: '🎁', label: `+${e.reward.gems} gems · +${e.reward.xp} XP` }
    default:
      return { icon: e.icon, label: e.label }
  }
}

/**
 * Drains the store's event queue into celebration UI.
 *
 * Modals (level-up, chest, achievement) are shown one at a time and block; the
 * lightweight ones become toasts that stack and auto-expire. Getting this
 * ordering right is what stops six simultaneous rewards from turning into
 * visual noise.
 */
export function EventLayer() {
  const events = useGame((s) => s.events)
  const dismissEvent = useGame((s) => s.dismissEvent)
  const openChest = useGame((s) => s.openChest)
  const pendingChests = useGame((s) => s.pendingChests)
  /**
   * Achievements are always toasts; only level-ups and chests block.
   *
   * They fire in clusters — two landed on the very first question in testing —
   * so a modal each meant two full-screen dismissals before the student could
   * answer question two. An earlier attempt demoted them *only while a run was
   * active*, which was worse: the classification flipped when the run ended, so
   * queued toasts were re-promoted into modals stacked on top of the results
   * screen. Deciding purely by event type keeps it stable regardless of game
   * state. The Badges panel is where you savour them.
   */
  const isBlocking = (e: GameEvent) => e.type === 'levelup' || e.type === 'chest'

  const blocking = events.find(isBlocking)
  const toasts = events.filter((e) => !isBlocking(e))

  // Sound the moment a blocking celebration appears.
  useEffect(() => {
    if (!blocking) return
    if (blocking.type === 'levelup') sfx.levelUp()
    else if (blocking.type === 'chest') sfx.chest()
    else sfx.achievement()
  }, [blocking?.id, blocking?.type])

  // A demoted (mid-run) achievement still earns its fanfare.
  const achievementToast = toasts.find((e) => e.type === 'achievement')
  useEffect(() => {
    if (achievementToast) sfx.achievement()
  }, [achievementToast?.id])

  // Toasts expire on their own.
  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) => setTimeout(() => dismissEvent(t.id), 4200))
    return () => timers.forEach(clearTimeout)
  }, [toasts.map((t) => t.id).join(','), dismissEvent])

  return (
    <>
      {toasts.length > 0 && (
        <div className="toasts">
          {toasts.slice(0, 4).map((e) => {
            const t = toastContent(e)
            return (
              <div key={e.id} className="toast">
                <span className="ti">{t.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div>{t.label}</div>
                  {t.sub && <div className="tiny faint">{t.sub}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {blocking?.type === 'levelup' && (
        <Modal onClose={() => dismissEvent(blocking.id)}>
          <div className="rays" />
          <Confetti />
          <div className="modal-emoji">⬆️</div>
          <div className="modal-title">Level {blocking.level}</div>
          <div className="modal-sub">
            {rankFromLevel(blocking.level).tier} {rankFromLevel(blocking.level).division} · a chest was added to your stash
          </div>
          <button className="btn primary block" onClick={() => dismissEvent(blocking.id)}>
            Keep going
          </button>
        </Modal>
      )}

      {blocking?.type === 'chest' && (
        <Modal onClose={() => dismissEvent(blocking.id)}>
          <div className="rays" />
          <Confetti count={40} />
          <div className="modal-emoji">🎁</div>
          <div
            className="tiny bold"
            style={{ letterSpacing: 2, color: CHEST_COLOR[blocking.reward.rarity], textTransform: 'uppercase' }}
          >
            {blocking.reward.rarity}
          </div>
          <div className="modal-title">{CHEST_LABEL[blocking.reward.rarity]}</div>

          <div className="grid three mb" style={{ marginTop: 18 }}>
            <div className="card tight center">
              <div style={{ fontSize: 24 }}>💎</div>
              <div className="bold gem-text">+{blocking.reward.gems}</div>
            </div>
            <div className="card tight center">
              <div style={{ fontSize: 24 }}>⚡</div>
              <div className="bold xp-text">+{blocking.reward.xp}</div>
            </div>
            {blocking.reward.hints > 0 && (
              <div className="card tight center">
                <div style={{ fontSize: 24 }}>💡</div>
                <div className="bold gold-text">+{blocking.reward.hints}</div>
              </div>
            )}
            {blocking.reward.freezes > 0 && (
              <div className="card tight center">
                <div style={{ fontSize: 24 }}>🧊</div>
                <div className="bold">+{blocking.reward.freezes}</div>
              </div>
            )}
          </div>

          {blocking.reward.cosmetic && (
            <div className="warn mb">
              ✨ Cosmetic unlocked — <strong>{blocking.reward.cosmetic.split(':')[1]}</strong>
            </div>
          )}

          {pendingChests.length > 0 ? (
            <button
              className="btn gold block"
              onClick={() => {
                dismissEvent(blocking.id)
                openChest()
              }}
            >
              Open next ({pendingChests.length} left)
            </button>
          ) : (
            <button className="btn primary block" onClick={() => dismissEvent(blocking.id)}>
              Collect
            </button>
          )}
        </Modal>
      )}
    </>
  )
}
