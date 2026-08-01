import type { Question } from '../game/types'

/**
 * The offline mentor.
 *
 * ASCEND must be fully playable with no API key — a student without one still
 * gets coaching, just authored rather than generated. This composes responses
 * from the question's own teaching metadata plus the student's current state,
 * with rotating phrasing so it never reads like a single canned string.
 */

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(Math.floor(seed)) % arr.length]
}

const PRAISE_LOW = [
  "Good — you're rebuilding momentum.",
  "That's the one. Keep that thread going.",
  'Nice recovery.',
]
const PRAISE_MID = ['Correct.', 'Right on.', "That's it."]
const PRAISE_HIGH = [
  "Clean. You're clearly comfortable here.",
  "Barely broke stride on that one.",
  'Sharp. Let me make the next one harder.',
]

const CONSOLE_LOW = [
  "Not quite — and honestly this one catches a lot of people.",
  "Missed it, but the reasoning behind it is worth more than the point.",
  "Wrong answer, useful mistake. Here's what's going on.",
]
const CONSOLE_MID = [
  'Close, but no.',
  "Not this time — here's the gap.",
  "That's the intuitive answer, and it's wrong. Which is why it gets asked.",
]

export type Confidence = 'low' | 'steady' | 'high'

export function offlineFeedback(
  q: Question,
  correct: boolean,
  confidence: Confidence,
  seed: number,
): string {
  if (correct) {
    const opener =
      confidence === 'high' ? pick(PRAISE_HIGH, seed) : confidence === 'low' ? pick(PRAISE_LOW, seed) : pick(PRAISE_MID, seed)
    const extra = q.followUp
      ? ` An interviewer's natural next move here would be: "${q.followUp}" — worth having an answer ready.`
      : ' Worth being able to explain *why*, not just pick it.'
    return `${opener}${extra}`
  }

  const opener = confidence === 'low' ? pick(CONSOLE_LOW, seed) : pick(CONSOLE_MID, seed)
  const answer = q.answer.map((i) => q.choices[i]).join(', ')
  return `${opener}\n\nThe answer is **${answer}**.\n\n${q.explain}${
    confidence === 'low' ? "\n\nThis one goes into your revision queue — you'll see it again in a few hours, and it'll land better the second time." : ''
  }`
}

export function offlineHint(q: Question): string {
  return `${q.hint}\n\nI won't narrow it further than that — working it out yourself is the part that sticks.`
}

export function offlineDebrief(summary: {
  world: string
  answered: number
  correct: number
  bestCombo: number
  weakSkills: string[]
  strongSkills: string[]
}): string {
  const pct = summary.answered > 0 ? Math.round((summary.correct / summary.answered) * 100) : 0
  const lines: string[] = []

  if (pct >= 85) lines.push(`${summary.correct}/${summary.answered} — that's a strong run through ${summary.world}.`)
  else if (pct >= 60) lines.push(`${summary.correct}/${summary.answered} in ${summary.world}. Solid, with clear room to push.`)
  else lines.push(`${summary.correct}/${summary.answered} in ${summary.world}. Rough run — which means you just found exactly what to work on.`)

  if (summary.bestCombo >= 8) lines.push(`A ${summary.bestCombo}x combo says you had a real stretch of fluency in there.`)

  if (summary.strongSkills.length) {
    lines.push(`Holding up well: ${summary.strongSkills.slice(0, 2).join(' and ')}.`)
  }
  if (summary.weakSkills.length) {
    lines.push(
      `The highest-value thing to fix next is **${summary.weakSkills[0]}** — not because it's the worst score, but because everything downstream of it depends on it. Run that skill on its own before moving on.`,
    )
  } else if (pct >= 85) {
    lines.push('Nothing is obviously weak right now. Take on a boss interview or raise the difficulty.')
  }

  return lines.join('\n\n')
}

/* --------------------------------------------------------- interviewer bot */

const PROBES = [
  "Alright. Walk me through your reasoning on that one — I care more about how you got there than the answer itself.",
  "Good. Now what's the time complexity of what you just described?",
  "And what happens at the edges — empty input, a single element, duplicates?",
  "Suppose the input no longer fits in memory. Does your approach survive?",
  "That works. Can you do better, or is that the floor?",
  "Say the requirement changed tomorrow and this had to handle concurrent writers. What breaks first?",
]

const RECOVERIES = [
  "Take a breath. Let's shrink it — forget the general case and solve it for exactly three elements first.",
  "You're circling something real. What's the very first thing you'd need to know to make progress?",
  "Fine, let's back up a step. Describe the problem to me in your own words before you solve it.",
]

export function offlineInterviewerTurn(q: Question, correct: boolean, turn: number): string {
  if (!correct) {
    return `${pick(RECOVERIES, turn)}\n\n_(For reference: ${q.explain.split('.')[0]}.)_`
  }
  if (q.followUp) return q.followUp
  return pick(PROBES, turn)
}

export function offlineInterviewOpener(company: string, focus: string[]): string {
  return `Thanks for making time — I'm on the engineering side here at ${company}, and we'll spend this round on ${focus.join(
    ', ',
  )}. I'd rather hear you think out loud than get a perfect answer in silence. Let's start.`
}

export function offlineVerdict(score: number, total: number, company: string): string {
  const pct = total > 0 ? score / total : 0
  if (pct >= 0.85) {
    return `That's a clear pass. You were quick on fundamentals and you didn't bluff on the parts you were less sure about — interviewers notice that more than candidates think. If I were writing this up for ${company}, it'd be a move-forward. Next thing to sharpen: get more precise on complexity claims, out loud, before you're asked.`
  }
  if (pct >= 0.6) {
    return `Borderline, leaning positive. The fundamentals are there and your reasoning was mostly sound, but a few answers needed a second nudge from me to arrive — in a real ${company} loop, that gap is where the decision gets made. Drill the topics you hesitated on until the first answer is the right one.`
  }
  return `Not a pass today, and that's genuinely fine — this is the round where finding the gaps is the point. The pattern I saw was recognising the topic but not being able to reason through it under time pressure, which is a practice problem rather than an understanding problem. Go back to the specific skills that broke, run them until they're automatic, and come back.`
}
