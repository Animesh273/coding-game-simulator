import type { Question, ChatTurn } from '../game/types'
import { isAiConfigured, streamReply, AiError } from './client'
import {
  mentorSystemPrompt,
  explainPrompt,
  hintPrompt,
  debriefPrompt,
  interviewerSystemPrompt,
  interviewOpener,
  interviewVerdictPrompt,
} from './prompts'
import {
  offlineFeedback,
  offlineHint,
  offlineDebrief,
  offlineInterviewerTurn,
  offlineInterviewOpener,
  offlineVerdict,
  type Confidence,
} from './offline'

/**
 * The single façade the UI talks to.
 *
 * Every function is an async generator yielding text chunks, whether the text
 * came from Claude or from the offline coach — so the typing animation and the
 * loading states are identical either way, and the game never has two code
 * paths in the components.
 */

export type { Confidence }

/** Reads confidence from a recent-answers window. Drives the mentor's tone. */
export function confidenceFrom(recent: boolean[]): Confidence {
  if (recent.length < 3) return 'steady'
  const window = recent.slice(-6)
  const rate = window.filter(Boolean).length / window.length
  if (rate <= 0.4) return 'low'
  if (rate >= 0.85) return 'high'
  return 'steady'
}

/** Types out a pre-written string so offline replies feel alive too. */
async function* typeOut(text: string, msPerChunk = 12): AsyncGenerator<string> {
  // Chunk on word boundaries — character-by-character reads as a gimmick,
  // word-by-word reads as thinking.
  const parts = text.match(/\S+\s*/g) ?? [text]
  for (const part of parts) {
    yield part
    await new Promise((r) => setTimeout(r, msPerChunk))
  }
}

async function* withFallback(
  live: () => AsyncGenerator<string>,
  offline: () => string,
): AsyncGenerator<string> {
  if (!isAiConfigured()) {
    yield* typeOut(offline())
    return
  }
  let emitted = false
  try {
    for await (const chunk of live()) {
      emitted = true
      yield chunk
    }
  } catch (err) {
    if (emitted) {
      // Partial answer already on screen — append a short note rather than
      // contradicting what the student just read.
      yield '\n\n_(connection dropped mid-answer)_'
      return
    }
    const msg = err instanceof AiError ? err.message : 'Mentor unreachable.'
    yield* typeOut(`_${msg} Falling back to the built-in coach._\n\n${offline()}`)
  }
}

/* --------------------------------------------------------------- feedback */

export function streamFeedback(
  q: Question,
  chosen: string[],
  correct: boolean,
  confidence: Confidence,
  seed: number,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  return withFallback(
    () =>
      streamReply({
        system: mentorSystemPrompt(confidence),
        messages: [{ role: 'user', content: explainPrompt(q, chosen, correct) }],
        effort: 'low',
        maxTokens: 600,
        signal,
      }),
    () => offlineFeedback(q, correct, confidence, seed),
  )
}

export function streamHint(q: Question, signal?: AbortSignal): AsyncGenerator<string> {
  return withFallback(
    () =>
      streamReply({
        system: mentorSystemPrompt('low'),
        messages: [{ role: 'user', content: hintPrompt(q) }],
        effort: 'low',
        maxTokens: 250,
        signal,
      }),
    () => offlineHint(q),
  )
}

export interface DebriefSummary {
  world: string
  answered: number
  correct: number
  bestCombo: number
  weakSkills: string[]
  strongSkills: string[]
}

export function streamDebrief(summary: DebriefSummary, signal?: AbortSignal): AsyncGenerator<string> {
  return withFallback(
    () =>
      streamReply({
        system: mentorSystemPrompt(summary.correct / Math.max(1, summary.answered) >= 0.7 ? 'high' : 'low'),
        messages: [{ role: 'user', content: debriefPrompt(summary) }],
        effort: 'medium',
        maxTokens: 700,
        signal,
      }),
    () => offlineDebrief(summary),
  )
}

/* ------------------------------------------------------------- free chat */

export function streamChat(
  history: ChatTurn[],
  confidence: Confidence,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const lastUser = [...history].reverse().find((t) => t.role === 'user')?.content ?? ''
  return withFallback(
    () =>
      streamReply({
        system: mentorSystemPrompt(confidence),
        messages: history,
        effort: 'medium',
        maxTokens: 1200,
        signal,
      }),
    () =>
      `The AI mentor needs an Anthropic API key to answer open questions — add one under **AI Settings** and I can properly dig into "${lastUser.slice(
        0,
        60,
      )}${lastUser.length > 60 ? '…' : ''}".\n\nIn the meantime, every question in the game ships with a full written explanation, and the Revision Dungeon will keep resurfacing whatever you got wrong. That alone will carry you a long way.`,
  )
}

/* ------------------------------------------------------------ interviewer */

export function streamInterviewOpener(
  company: string,
  persona: string,
  focus: string[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  return withFallback(
    () =>
      streamReply({
        system: interviewerSystemPrompt(company, persona),
        messages: [{ role: 'user', content: interviewOpener(company, focus) }],
        effort: 'medium',
        maxTokens: 400,
        signal,
      }),
    () => offlineInterviewOpener(company, focus),
  )
}

export function streamInterviewTurn(
  company: string,
  persona: string,
  history: ChatTurn[],
  q: Question,
  correct: boolean,
  turn: number,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  return withFallback(
    () =>
      streamReply({
        system: interviewerSystemPrompt(company, persona),
        messages: [
          ...history,
          {
            role: 'user',
            content: `[System note: the candidate just ${
              correct ? 'answered correctly' : 'answered incorrectly'
            } on "${q.prompt}". Correct answer: ${q.answer
              .map((i) => q.choices[i])
              .join(', ')}.]\n\nRespond in character: react briefly, then ${
              correct ? 'push with a harder follow-up' : 'help them recover without giving the answer away'
            }.`,
          },
        ],
        effort: 'medium',
        maxTokens: 400,
        signal,
      }),
    () => offlineInterviewerTurn(q, correct, turn),
  )
}

export function streamVerdict(
  company: string,
  persona: string,
  score: number,
  total: number,
  transcript: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  return withFallback(
    () =>
      streamReply({
        system: interviewerSystemPrompt(company, persona),
        messages: [{ role: 'user', content: interviewVerdictPrompt(score, total, transcript) }],
        effort: 'medium',
        maxTokens: 700,
        signal,
      }),
    () => offlineVerdict(score, total, company),
  )
}
