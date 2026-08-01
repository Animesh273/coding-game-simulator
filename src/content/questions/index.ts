import type { Question, WorldId } from '../../game/types'
import { PYTHON_QUESTIONS } from './python'
import { CPP_QUESTIONS } from './cpp'
import { DSA_QUESTIONS } from './dsa'
import { SQL_QUESTIONS } from './sql'
import { OS_QUESTIONS, NET_QUESTIONS, DBMS_QUESTIONS } from './systems'
import { APTITUDE_QUESTIONS } from './aptitude'
import { HR_QUESTIONS } from './hr'

export const ALL_QUESTIONS: Question[] = [
  ...PYTHON_QUESTIONS,
  ...CPP_QUESTIONS,
  ...DSA_QUESTIONS,
  ...SQL_QUESTIONS,
  ...OS_QUESTIONS,
  ...NET_QUESTIONS,
  ...DBMS_QUESTIONS,
  ...APTITUDE_QUESTIONS,
  ...HR_QUESTIONS,
]

export const QUESTION_BY_ID = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q]))

const byWorld = new Map<WorldId, Question[]>()
const bySkill = new Map<string, Question[]>()
for (const q of ALL_QUESTIONS) {
  if (!byWorld.has(q.world)) byWorld.set(q.world, [])
  byWorld.get(q.world)!.push(q)
  if (!bySkill.has(q.skill)) bySkill.set(q.skill, [])
  bySkill.get(q.skill)!.push(q)
}

export function questionsForWorld(world: WorldId): Question[] {
  return byWorld.get(world) ?? []
}

export function questionsForSkill(skill: string): Question[] {
  return bySkill.get(skill) ?? []
}

export function questionsForWorlds(worlds: WorldId[]): Question[] {
  return worlds.flatMap((w) => questionsForWorld(w))
}

/** Total question count, surfaced in the profile screen. */
export const QUESTION_COUNT = ALL_QUESTIONS.length
