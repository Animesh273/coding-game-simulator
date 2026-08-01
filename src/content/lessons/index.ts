import type { Lesson } from '../../game/types'
import { PYTHON_LESSONS } from './python'
import { CPP_LESSONS } from './cpp'

/**
 * Lesson registry.
 *
 * Not every skill node has a lesson yet — the two language tracks are written,
 * the supporting worlds are not. The UI keys off `hasLesson` so a node without
 * one simply offers practice, rather than advertising a page that doesn't
 * exist. Adding a lesson is appending one object to a file in this folder.
 */
export const ALL_LESSONS: Lesson[] = [...PYTHON_LESSONS, ...CPP_LESSONS]

export const LESSON_BY_SKILL = Object.fromEntries(ALL_LESSONS.map((l) => [l.skillId, l])) as Record<
  string,
  Lesson | undefined
>

export function lessonFor(skillId: string): Lesson | undefined {
  return LESSON_BY_SKILL[skillId]
}

export function hasLesson(skillId: string): boolean {
  return LESSON_BY_SKILL[skillId] !== undefined
}

export const LESSON_COUNT = ALL_LESSONS.length

/** XP granted the first time a lesson is completed. */
export const LESSON_XP = 40
export const LESSON_GEMS = 15
