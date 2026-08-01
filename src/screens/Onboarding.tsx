import { useState } from 'react'
import { useGame } from '../state/store'
import { AVATAR_BASES, AVATAR_COLORS, COLOR_HEX } from '../game/avatar'
import { WORLDS } from '../content/worlds'
import { QUESTION_COUNT } from '../content/questions'
import { COMPANIES } from '../content/companies'
import { Confetti } from '../components/common'
import { sfx } from '../lib/sfx'

const STARTER_BASES = AVATAR_BASES.slice(0, 4)

export function Onboarding() {
  const complete = useGame((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [base, setBase] = useState('rookie')
  const [color, setColor] = useState('azure')

  return (
    <div className="overlay" style={{ alignItems: 'center' }}>
      <div className="modal" style={{ textAlign: 'center' }}>
        {step === 0 && (
          <>
            <Confetti count={20} />
            <div className="modal-emoji">⚔️</div>
            <div className="modal-title" style={{ fontSize: 32 }}>
              ASCEND
            </div>
            <div className="modal-sub">Level up to placement-ready.</div>

            <div className="card tight mb" style={{ textAlign: 'left' }}>
              <div className="small" style={{ lineHeight: 1.7 }}>
                This is not a question bank with a progress bar taped to it. It's a game where the levelling
                <em> is </em>the studying:
              </div>
              <ul className="small dim" style={{ paddingLeft: 20, marginBottom: 0, lineHeight: 1.75 }}>
                <li>
                  <strong>{WORLDS.length} worlds</strong>, each a skill tree that opens as you prove yourself
                </li>
                <li>
                  <strong>{QUESTION_COUNT} questions</strong> that adapt to sit just above your current reach
                </li>
                <li>
                  <strong>{COMPANIES.length} boss interviews</strong> — beat levels to unlock the names you want
                </li>
                <li>Every mistake becomes a card that comes back until it sticks</li>
              </ul>
            </div>

            <button
              className="btn primary block"
              onClick={() => {
                sfx.click()
                setStep(1)
              }}
            >
              Begin
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="modal-emoji">🧭</div>
            <div className="modal-title">What should we call you?</div>
            <div className="modal-sub">This shows on your profile and the leaderboard.</div>

            <input
              className="field mb"
              value={name}
              placeholder="Your name"
              maxLength={20}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) setStep(2)
              }}
            />

            <button
              className="btn primary block"
              disabled={!name.trim()}
              onClick={() => {
                sfx.click()
                setStep(2)
              }}
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div
              style={{
                fontSize: 62,
                lineHeight: 1,
                filter: `drop-shadow(0 0 22px ${COLOR_HEX[color]}88)`,
                animation: 'float 2.6s ease-in-out infinite',
              }}
            >
              {STARTER_BASES.find((b) => b.id === base)?.emoji}
            </div>
            <div className="modal-title">Pick your look</div>
            <div className="modal-sub">You'll unlock more from chests and the gem shop.</div>

            <div className="pickgrid mb">
              {STARTER_BASES.map((b) => (
                <button
                  key={b.id}
                  className={`pick${base === b.id ? ' on' : ''}`}
                  onClick={() => {
                    sfx.click()
                    setBase(b.id)
                  }}
                >
                  <div className="pe">{b.emoji}</div>
                  <div className="pl">{b.label}</div>
                </button>
              ))}
            </div>

            <div className="row mb" style={{ justifyContent: 'center', gap: 9 }}>
              {AVATAR_COLORS.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    sfx.click()
                    setColor(c.id)
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: COLOR_HEX[c.id],
                    border: color === c.id ? '2.5px solid #fff' : '2.5px solid transparent',
                    boxShadow: color === c.id ? `0 0 18px ${COLOR_HEX[c.id]}` : undefined,
                  }}
                  title={c.label}
                />
              ))}
            </div>

            <button
              className="btn gold block"
              onClick={() => {
                sfx.levelUp()
                complete(name, base, color)
              }}
            >
              Enter ASCEND →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
