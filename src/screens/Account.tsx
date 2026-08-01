import { useEffect, useState } from 'react'
import { signUp, signIn, signOut, type AuthError } from '../backend/auth'
import { backendStatus, isBackendConfigured } from '../backend/supabase'
import { getSyncState, onSyncChange, syncNow, type SyncState } from '../state/sync'
import { useGame } from '../state/store'
import { Modal } from '../components/common'
import { sfx } from '../lib/sfx'

const STATUS_LABEL: Record<SyncState, { icon: string; text: string; color: string }> = {
  off: { icon: '💾', text: 'This browser only', color: 'var(--text-faint)' },
  'signed-out': { icon: '💾', text: 'Not signed in', color: 'var(--text-faint)' },
  syncing: { icon: '🔄', text: 'Syncing…', color: 'var(--accent-2)' },
  synced: { icon: '☁️', text: 'Synced', color: 'var(--good)' },
  error: { icon: '⚠️', text: 'Sync problem', color: 'var(--bad)' },
}

/** Compact status pill for the profile header. */
export function SyncBadge({ onOpen }: { onOpen: () => void }) {
  const [{ state, email }, setSync] = useState(getSyncState())

  useEffect(() => onSyncChange(() => setSync(getSyncState())), [])

  const s = STATUS_LABEL[state]
  return (
    <button className="tag" style={{ color: s.color, cursor: 'pointer' }} onClick={onOpen} title={email ?? undefined}>
      {s.icon} {state === 'synced' && email ? email.split('@')[0] : s.text}
    </button>
  )
}

type Mode = 'in' | 'up'

export function AccountModal({ onClose }: { onClose: () => void }) {
  const [{ state, detail, email }, setSync] = useState(getSyncState())
  const [mode, setMode] = useState<Mode>('in')
  const [emailInput, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const playerName = useGame((s) => s.name)

  useEffect(() => onSyncChange(() => setSync(getSyncState())), [])

  const configured = isBackendConfigured()
  const signedIn = state === 'synced' || state === 'syncing' || Boolean(email)

  async function submit() {
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      if (mode === 'up') {
        const { needsConfirmation } = await signUp(emailInput, password, playerName || 'Challenger')
        if (needsConfirmation) {
          setNotice('Account created. Check your inbox and confirm your email, then sign in.')
          setMode('in')
        } else {
          sfx.levelUp()
        }
      } else {
        await signIn(emailInput, password)
        sfx.levelUp()
      }
      setPassword('')
    } catch (err) {
      setError((err as AuthError).message)
      sfx.wrong()
    } finally {
      setBusy(false)
    }
  }

  /* ------------------------------------------------------- not configured */
  if (!configured) {
    return (
      <Modal onClose={onClose}>
        <div className="modal-emoji">💾</div>
        <div className="modal-title">Local save</div>
        <div className="modal-sub">Your progress lives in this browser.</div>
        <div className="warn mb" style={{ textAlign: 'left' }}>
          {backendStatus().message}
        </div>
        <p className="tiny faint">
          Everything works without an account — this only adds syncing across devices. Setup instructions are in the
          project README.
        </p>
        <button className="btn primary block mt" onClick={onClose}>
          Got it
        </button>
      </Modal>
    )
  }

  /* ------------------------------------------------------------ signed in */
  if (signedIn) {
    return (
      <Modal onClose={onClose}>
        <div className="modal-emoji">{state === 'error' ? '⚠️' : '☁️'}</div>
        <div className="modal-title">{state === 'error' ? 'Sync problem' : 'Synced'}</div>
        <div className="modal-sub">{email}</div>

        {state === 'error' && detail && (
          <div className="warn mb" style={{ textAlign: 'left' }}>
            {detail}
          </div>
        )}

        <p className="small dim">
          Your level, streak, mastery, revision schedule, lessons and badges follow you to any browser you sign in on.
        </p>

        <div className="row mt" style={{ gap: 10 }}>
          <button
            className="btn ghost"
            style={{ flex: 1 }}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await syncNow()
              setBusy(false)
            }}
          >
            {busy ? '…' : 'Sync now'}
          </button>
          <button
            className="btn danger"
            style={{ flex: 1 }}
            onClick={async () => {
              await signOut()
              sfx.click()
            }}
          >
            Sign out
          </button>
        </div>
        <p className="tiny faint mt">Signing out leaves this device's progress in place.</p>
      </Modal>
    )
  }

  /* ----------------------------------------------------------- signed out */
  return (
    <Modal onClose={onClose}>
      <div className="modal-emoji">☁️</div>
      <div className="modal-title">{mode === 'in' ? 'Sign in' : 'Create an account'}</div>
      <div className="modal-sub">Keep your progress across devices.</div>

      {notice && (
        <div className="warn mb" style={{ textAlign: 'left' }}>
          {notice}
        </div>
      )}

      <label className="label" style={{ textAlign: 'left' }}>
        Email
      </label>
      <input
        className="field mb"
        type="email"
        value={emailInput}
        autoComplete="email"
        placeholder="you@example.com"
        onChange={(e) => setEmail(e.target.value)}
      />

      <label className="label" style={{ textAlign: 'left' }}>
        Password
      </label>
      <input
        className="field"
        type="password"
        value={password}
        autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        placeholder="At least 6 characters"
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && emailInput && password) void submit()
        }}
      />

      {error && (
        <div className="tiny bad-text mt" style={{ textAlign: 'left' }}>
          {error}
        </div>
      )}

      <button
        className="btn primary block mt"
        disabled={busy || !emailInput.trim() || password.length < 6}
        onClick={() => void submit()}
      >
        {busy ? '…' : mode === 'in' ? 'Sign in' : 'Create account'}
      </button>

      <button
        className="btn ghost block mt"
        onClick={() => {
          setMode(mode === 'in' ? 'up' : 'in')
          setError(null)
          setNotice(null)
        }}
      >
        {mode === 'in' ? 'No account? Create one' : 'Already have an account? Sign in'}
      </button>

      <p className="tiny faint mt">
        Existing progress on this device is <strong>merged</strong> with your account, never overwritten.
      </p>
    </Modal>
  )
}
