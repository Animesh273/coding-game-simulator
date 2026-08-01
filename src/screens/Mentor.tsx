import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/store'
import { streamChat, confidenceFrom } from '../ai/mentor'
import {
  getGroqKey,
  setGroqKey,
  getAnthropicKey,
  setAnthropicKey,
  getPreferredProvider,
  setPreferredProvider,
  resolveProvider,
  probeServer,
  PROVIDER_LABEL,
  type Provider,
} from '../ai/client'
import { Modal, RichText, useStream } from '../components/common'
import { sfx } from '../lib/sfx'
import type { ChatTurn } from '../game/types'

const STARTERS = [
  'Explain time complexity like I have never seen it before',
  'What should I revise first for a product-company interview?',
  'Give me a 2-week placement prep plan',
  'How do I answer "tell me about yourself"?',
  'What is the difference between a process and a thread?',
]

export function Mentor() {
  const recent = useGame((s) => s.recent)
  const noteAiChat = useGame((s) => s.noteAiChat)
  const name = useGame((s) => s.name)

  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [draft, setDraft] = useState('')
  const [settings, setSettings] = useState(false)
  const [active, setActive] = useState<Provider>('offline')

  useEffect(() => {
    void resolveProvider().then(setActive)
  }, [settings])
  const stream = useStream()
  const logRef = useRef<HTMLDivElement>(null)

  // Keep the newest message in view as it streams in.
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns.length, stream.text])

  // When a reply finishes, commit it to history so it survives the next send.
  useEffect(() => {
    if (stream.busy || !stream.text) return
    setTurns((t) => {
      if (t.length > 0 && t[t.length - 1].role === 'assistant') return t
      return [...t, { role: 'assistant', content: stream.text }]
    })
  }, [stream.busy])

  function send(text: string) {
    const content = text.trim()
    if (!content || stream.busy) return
    sfx.click()
    noteAiChat()

    const history: ChatTurn[] = [...turns, { role: 'user', content }]
    setTurns(history)
    setDraft('')
    stream.start((signal) => streamChat(history, confidenceFrom(recent), signal))
  }

  const liveReply = stream.busy || (stream.text && turns[turns.length - 1]?.role !== 'assistant')

  return (
    <div className="screen chat">
      <div className="row between">
        <div>
          <h2 className="screen-title" style={{ marginBottom: 0 }}>
            ARIA
          </h2>
          <p className="screen-sub" style={{ marginBottom: 0 }}>
            {active === 'offline'
              ? 'Built-in coach — connect a provider for full conversations'
              : PROVIDER_LABEL[active]}
          </p>
        </div>
        <button className="btn ghost sm" onClick={() => setSettings(true)}>
          ⚙️ AI Settings
        </button>
      </div>

      <div className="chat-log" ref={logRef}>
        {turns.length === 0 && !liveReply && (
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,.13), rgba(34,211,238,.06))' }}>
            <div className="row mb" style={{ gap: 11 }}>
              <div className="mentor-avatar">✨</div>
              <div>
                <div className="bold">Hey{name ? `, ${name}` : ''}.</div>
                <div className="small dim">
                  I'm your mentor. Ask me anything — a concept you can't get to stick, what to revise next, how to
                  handle a question you froze on. No question is too basic.
                </div>
              </div>
            </div>
            <div className="grid" style={{ gap: 7 }}>
              {STARTERS.map((s) => (
                <button key={s} className="btn ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={`bubble ${t.role === 'user' ? 'me' : 'ai'}`}>
            <RichText text={t.content} />
          </div>
        ))}

        {liveReply && (
          <div className="bubble ai">
            <RichText text={stream.text} />
            {stream.busy && <span className="caret" />}
          </div>
        )}
      </div>

      <div className="chat-input">
        <textarea
          value={draft}
          rows={1}
          placeholder="Ask ARIA anything…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(draft)
            }
          }}
        />
        <button className="btn primary" disabled={!draft.trim() || stream.busy} onClick={() => send(draft)}>
          {stream.busy ? '…' : 'Send'}
        </button>
      </div>

      {settings && <AiSettings onClose={() => setSettings(false)} />}
    </div>
  )
}

/* ============================================================= settings === */

const PROVIDERS: { id: Provider | 'auto'; label: string; hint: string }[] = [
  { id: 'auto', label: 'Automatic', hint: 'Use this site’s AI if available, then your own key' },
  { id: 'server', label: 'This site', hint: 'No key needed — shared, so it can be busy' },
  { id: 'groq', label: 'Groq', hint: 'Your own key — free tier, very fast' },
  { id: 'anthropic', label: 'Anthropic', hint: 'Your own key — highest quality, paid' },
  { id: 'offline', label: 'Built-in coach', hint: 'No AI at all — authored explanations only' },
]

function AiSettings({ onClose }: { onClose: () => void }) {
  const [groq, setGroq] = useState(getGroqKey())
  const [anthropic, setAnthropic] = useState(getAnthropicKey())
  const [choice, setChoice] = useState<Provider | 'auto'>(getPreferredProvider())
  const [reveal, setReveal] = useState(false)
  const [server, setServer] = useState<{ available: boolean; provider: string | null } | null>(null)
  const [active, setActive] = useState<Provider>('offline')

  useEffect(() => {
    void probeServer().then(setServer)
  }, [])

  useEffect(() => {
    void resolveProvider().then(setActive)
  }, [choice, groq, anthropic])

  function save() {
    setGroqKey(groq)
    setAnthropicKey(anthropic)
    setPreferredProvider(choice)
    sfx.unlock()
    onClose()
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="modal-title" style={{ fontSize: 22 }}>
        AI Settings
      </div>
      <p className="small dim">
        ASCEND is fully playable without any of this. Every question ships with a written explanation and the
        built-in coach handles feedback and debriefs. A provider upgrades ARIA into a real conversational mentor.
      </p>

      {/* ------------------------------------------------------- provider */}
      <label className="label">Provider</label>
      <div className="grid" style={{ gap: 7, marginBottom: 14 }}>
        {PROVIDERS.map((p) => {
          const unavailable =
            (p.id === 'server' && server !== null && !server.available) ||
            (p.id === 'groq' && !groq.trim()) ||
            (p.id === 'anthropic' && !anthropic.trim())
          return (
            <button
              key={p.id}
              className="row"
              style={{
                gap: 11,
                padding: '11px 13px',
                borderRadius: 'var(--r-sm)',
                textAlign: 'left',
                border: `1.5px solid ${choice === p.id ? 'var(--accent)' : 'var(--line)'}`,
                background: choice === p.id ? 'rgba(124,92,255,.14)' : 'var(--surface)',
                opacity: unavailable && choice !== p.id ? 0.5 : 1,
              }}
              onClick={() => {
                sfx.click()
                setChoice(p.id)
              }}
            >
              <span style={{ fontSize: 15 }}>{choice === p.id ? '◉' : '○'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="small bold">{p.label}</span>
                <span className="tiny faint" style={{ display: 'block' }}>
                  {p.hint}
                  {unavailable ? ' — not set up yet' : ''}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="card tight mb" style={{ textAlign: 'left' }}>
        <div className="tiny faint mb">CURRENTLY ANSWERING</div>
        <div className="small bold">{PROVIDER_LABEL[active]}</div>
        {server?.available && (
          <div className="tiny faint mt">
            This deployment has a server-side key ({server.provider}), so visitors need none of their own. It is
            shared, so it can hit a rate limit — the built-in coach takes over when it does.
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ keys */}
      <label className="label">Groq API key (optional)</label>
      <div className="row mb" style={{ gap: 8 }}>
        <input
          className="field"
          type={reveal ? 'text' : 'password'}
          value={groq}
          placeholder="gsk_..."
          onChange={(e) => setGroq(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn ghost sm" onClick={() => setReveal((r) => !r)}>
          {reveal ? '🙈' : '👁️'}
        </button>
      </div>
      <p className="tiny faint" style={{ marginTop: -8, marginBottom: 12 }}>
        Free at console.groq.com — no card required. Fast, and good enough for coaching.
      </p>

      <label className="label">Anthropic API key (optional)</label>
      <input
        className="field mb"
        type={reveal ? 'text' : 'password'}
        value={anthropic}
        placeholder="sk-ant-..."
        onChange={(e) => setAnthropic(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />

      <div className="warn mb">
        <strong>Keys you paste here stay in this browser.</strong> They are never sent anywhere except directly to
        that provider, and never to this site’s server. But they are readable by anyone with devtools access on
        this machine, so use a key you would be comfortable rotating.
      </div>

      <div className="row" style={{ gap: 10 }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" style={{ flex: 1 }} onClick={save}>
          Save
        </button>
      </div>
    </Modal>
  )
}
