/**
 * Synthesised sound effects.
 *
 * Everything is generated with the Web Audio API — no audio files, so the app
 * stays a single self-contained bundle. Sound is a huge part of why a correct
 * answer *feels* correct, and a rising pitch per combo step is the cheapest
 * dopamine loop in game design.
 */

let ctx: AudioContext | null = null
let enabled = true

const STORAGE = 'ascend.sfx'

try {
  enabled = localStorage.getItem(STORAGE) !== 'off'
} catch {
  /* storage unavailable — default to on */
}

export function isSfxEnabled(): boolean {
  return enabled
}

export function setSfxEnabled(on: boolean): void {
  enabled = on
  try {
    localStorage.setItem(STORAGE, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
}

function audio(): AudioContext | null {
  if (!enabled) return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  // Browsers suspend the context until a user gesture; resume opportunistically.
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

interface ToneOptions {
  freq: number
  duration: number
  type?: OscillatorType
  gain?: number
  delay?: number
  /** Glide to this frequency over the note's duration. */
  slideTo?: number
}

function tone({ freq, duration, type = 'sine', gain = 0.16, delay = 0, slideTo }: ToneOptions): void {
  const ac = audio()
  if (!ac) return

  const start = ac.currentTime + delay
  const osc = ac.createOscillator()
  const amp = ac.createGain()

  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), start + duration)

  // Quick attack, exponential decay — reads as a "blip" rather than a beep.
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  osc.connect(amp).connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

function noise(duration: number, gain = 0.08): void {
  const ac = audio()
  if (!ac) return
  const frames = Math.floor(ac.sampleRate * duration)
  const buffer = ac.createBuffer(1, frames, ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) {
    // Fade the noise out so it lands as a "shhk" not a burst of static.
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
  }
  const src = ac.createBufferSource()
  const amp = ac.createGain()
  amp.gain.value = gain
  src.buffer = buffer
  src.connect(amp).connect(ac.destination)
  src.start()
}

/** Major-scale semitone offsets, used to walk the combo pitch upward. */
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19]

export const sfx = {
  /** Rises with the combo — this is the core reward sound. */
  correct(combo: number) {
    const step = SCALE[Math.min(combo, SCALE.length - 1)]
    const base = 523.25 * Math.pow(2, step / 12)
    tone({ freq: base, duration: 0.12, type: 'triangle', gain: 0.15 })
    tone({ freq: base * 1.5, duration: 0.16, type: 'sine', gain: 0.1, delay: 0.05 })
  },

  wrong() {
    tone({ freq: 220, duration: 0.2, type: 'sawtooth', gain: 0.1, slideTo: 130 })
    noise(0.12, 0.05)
  },

  click() {
    tone({ freq: 660, duration: 0.04, type: 'square', gain: 0.05 })
  },

  levelUp() {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, duration: 0.28, type: 'triangle', gain: 0.15, delay: i * 0.09 }),
    )
  },

  chest() {
    noise(0.2, 0.06)
    ;[392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, duration: 0.35, type: 'sine', gain: 0.13, delay: 0.1 + i * 0.07 }),
    )
  },

  achievement() {
    ;[659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, duration: 0.3, type: 'triangle', gain: 0.14, delay: i * 0.11 }),
    )
  },

  bossHit() {
    tone({ freq: 160, duration: 0.16, type: 'sawtooth', gain: 0.14, slideTo: 70 })
    noise(0.1, 0.07)
  },

  victory() {
    ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone({ freq: f, duration: 0.42, type: 'triangle', gain: 0.15, delay: i * 0.11 }),
    )
  },

  defeat() {
    ;[392, 349.23, 293.66, 220].forEach((f, i) =>
      tone({ freq: f, duration: 0.4, type: 'sine', gain: 0.13, delay: i * 0.15 }),
    )
  },

  tick() {
    tone({ freq: 880, duration: 0.03, type: 'square', gain: 0.04 })
  },

  unlock() {
    tone({ freq: 440, duration: 0.2, type: 'sine', gain: 0.12, slideTo: 880 })
  },
}
