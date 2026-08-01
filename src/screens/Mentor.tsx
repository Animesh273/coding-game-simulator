import { useEffect, useRef, useState } from 'react'
import { useGame } from '../state/store'
import { streamChat, confidenceFrom } from '../ai/mentor'
import { getApiKey, setApiKey, getProxyUrl, setProxyUrl, isAiConfigured, MODEL } from '../ai/client'
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
  const [configured, setConfigured] = useState(isAiConfigured())
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
            {configured ? `Powered by ${MODEL}` : 'Offline coach — add a key for full conversations'}
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

      {settings && (
        <AiSettings
          onClose={() => {
            setConfigured(isAiConfigured())
            setSettings(false)
          }}
        />
      )}
    </div>
  )
}

/* ============================================================= settings === */

function AiSettings({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState(getApiKey())
  const [proxy, setProxy] = useState(getProxyUrl())
  const [reveal, setReveal] = useState(false)

  function save() {
    setApiKey(key)
    setProxyUrl(proxy)
    sfx.unlock()
    onClose()
  }

  return (
    <Modal onClose={onClose} wide>
      <div className="modal-title" style={{ fontSize: 22 }}>
        AI Settings
      </div>
      <p className="small dim">
        ASCEND is fully playable without this. Every question ships with a written explanation and the built-in coach
        handles feedback and debriefs. A key upgrades ARIA into a real conversational mentor and interviewer.
      </p>

      <div className="warn mb">
        <strong>Read before pasting a key.</strong> This app calls the Anthropic API directly from your browser, so
        the key is stored in this browser's localStorage and is visible to anyone with access to this device or its
        devtools. That's fine for running ASCEND locally with your own key. Do <em>not</em> ship a build with a key
        embedded, and do not use an organisation key you wouldn't want exposed. For a shared deployment, use the proxy
        field below instead.
      </div>

      <label className="label">Anthropic API key</label>
      <div className="row mb" style={{ gap: 8 }}>
        <input
          className="field"
          type={reveal ? 'text' : 'password'}
          value={key}
          placeholder="sk-ant-…"
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="btn ghost sm" onClick={() => setReveal((r) => !r)}>
          {reveal ? '🙈' : '👁️'}
        </button>
      </div>

      <label className="label">Proxy base URL (optional, recommended for deployment)</label>
      <input
        className="field mb"
        value={proxy}
        placeholder="https://your-backend.example.com/anthropic"
        onChange={(e) => setProxy(e.target.value)}
        spellCheck={false}
      />
      <p className="tiny faint">
        Point this at a small backend that holds the key server-side and forwards to <code>api.anthropic.com</code>.
        When set, the key field can be left empty.
      </p>

      <div className="card tight mt mb" style={{ textAlign: 'left' }}>
        <div className="tiny faint mb">MODEL</div>
        <div className="small mono">{MODEL}</div>
        <div className="tiny faint mt">
          Adaptive thinking at low effort for quick coaching, medium for interviews and debriefs.
        </div>
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
