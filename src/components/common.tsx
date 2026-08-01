import { useEffect, useRef, useState } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { AVATAR_BASES, COLOR_HEX, AURA_GLOW, partById } from '../game/avatar'
import type { AvatarConfig } from '../game/types'

/* --------------------------------------------------------------- avatar */

export function Avatar({ config, size = 38 }: { config: AvatarConfig; size?: number }) {
  const base = partById(AVATAR_BASES, config.base)
  const glow = AURA_GLOW[config.aura] ?? 'transparent'
  const color = COLOR_HEX[config.color] ?? '#3d7bf7'
  return (
    <div
      className="tb-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.52,
        borderRadius: size * 0.3,
        background: `linear-gradient(135deg, ${color}44, ${color}18)`,
        borderColor: `${color}77`,
        boxShadow: glow === 'transparent' ? undefined : `0 0 ${size * 0.5}px ${glow}`,
      }}
      title={config.title}
    >
      {base.emoji}
    </div>
  )
}

/* ----------------------------------------------------------------- bars */

export function Bar({
  value,
  color,
  thin,
  style,
}: {
  value: number
  color?: string
  thin?: boolean
  style?: CSSProperties
}) {
  return (
    <div className={`bar${thin ? ' thin' : ''}`} style={style}>
      <i style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }} />
    </div>
  )
}

/* --------------------------------------------------------------- number */

/**
 * Counts up to a target instead of snapping. Rewards should be *watched*
 * accruing — an instantly-correct number is information, an animated one is
 * a payout.
 */
export function CountUp({ to, duration = 700 }: { to: number; duration?: number }) {
  const [n, setN] = useState(to)
  const from = useRef(to)

  useEffect(() => {
    const start = performance.now()
    const origin = from.current
    const delta = to - origin
    if (delta === 0) return

    let frame = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      // easeOutCubic
      setN(Math.round(origin + delta * (1 - Math.pow(1 - p, 3))))
      if (p < 1) frame = requestAnimationFrame(step)
      else from.current = to
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [to, duration])

  return <>{n.toLocaleString()}</>
}

/* ------------------------------------------------------------ difficulty */

export function DifficultyDots({ level, color }: { level: number; color?: string }) {
  return (
    <span className="diff-dots" style={{ color: color ?? 'var(--gold)' }} title={`Difficulty ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= level ? 'on' : ''} />
      ))}
    </span>
  )
}

/* ------------------------------------------------------------- modal ---- */

export function Modal({
  children,
  onClose,
  wide,
  dismissible = true,
}: {
  children: ReactNode
  onClose?: () => void
  wide?: boolean
  dismissible?: boolean
}) {
  useEffect(() => {
    if (!dismissible || !onClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, dismissible])

  return (
    <div className="overlay" onClick={dismissible ? onClose : undefined}>
      <div className={`modal${wide ? ' wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------- confetti ---- */

const CONFETTI_COLORS = ['#ffcc4d', '#7c5cff', '#22d3ee', '#34d399', '#fb5c6c', '#ff9f5a']

export function Confetti({ count = 34 }: { count?: number }) {
  const pieces = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.6 + Math.random() * 1.1,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 6 + Math.random() * 6,
    })),
  ).current

  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti"
          style={{
            left: `${p.left}%`,
            top: 0,
            width: p.w,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </>
  )
}

/* ----------------------------------------------------------- empty ----- */

export function Empty({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
  return (
    <div className="empty">
      <span className="ee">{icon}</span>
      <div className="bold" style={{ color: 'var(--text-dim)', marginBottom: 6 }}>
        {title}
      </div>
      {sub && <div className="small">{sub}</div>}
    </div>
  )
}

/* ------------------------------------------------------- markdown-lite -- */

/**
 * Renders the small subset of markdown the mentor actually emits: **bold**,
 * `code`, _italics_. Deliberately not a full parser — pulling in a markdown
 * library for three inline forms would be the wrong trade.
 */
export function RichText({ text }: { text: string }) {
  const nodes: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('**')) nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>)
    else if (token.startsWith('`')) nodes.push(<code key={key++}>{token.slice(1, -1)}</code>)
    else nodes.push(<em key={key++} style={{ opacity: 0.8 }}>{token.slice(1, -1)}</em>)
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))

  return <>{nodes}</>
}

/* --------------------------------------------------------- mentor bubble */

export function MentorBubble({
  text,
  streaming,
  name = 'ARIA',
}: {
  text: string
  streaming?: boolean
  name?: string
}) {
  return (
    <div className="mentor">
      <div className="mentor-avatar">✨</div>
      <div style={{ minWidth: 0 }}>
        <div className="mentor-name">{name}</div>
        <div className="mentor-text">
          <RichText text={text} />
          {streaming && <span className="caret" />}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------- streaming hook - */

/**
 * Drives an async text generator into React state, with cancellation.
 * Every AI surface in the app uses this so behaviour is identical whether the
 * text came from Claude or the offline coach.
 */
export function useStream() {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const runId = useRef(0)

  const start = (make: (signal: AbortSignal) => AsyncGenerator<string>) => {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    const id = ++runId.current

    setText('')
    setBusy(true)

    void (async () => {
      try {
        for await (const chunk of make(controller.signal)) {
          if (runId.current !== id) return
          setText((prev) => prev + chunk)
        }
      } catch {
        /* mentor.ts already converts failures into readable text */
      } finally {
        if (runId.current === id) setBusy(false)
      }
    })()
  }

  const reset = () => {
    abort.current?.abort()
    runId.current++
    setText('')
    setBusy(false)
  }

  useEffect(() => () => abort.current?.abort(), [])

  return { text, busy, start, reset }
}
