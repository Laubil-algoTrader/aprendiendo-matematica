// Grafo de prerrequisitos y progreso de lecciones.
//
// Una lección está DESBLOQUEADA cuando todos sus prerrequisitos están
// completados. Igual se puede abrir una lección bloqueada: solo mostramos
// qué conviene ver antes.

import type { Lesson, LessonId, Module, Route } from '../types/content'
import type { LessonStatus } from '../types/user-data'

/** Estado de cada lección según lo que marcó el usuario. */
export type ProgressMap = ReadonlyMap<LessonId, LessonStatus>

export function isCompleted(progress: ProgressMap, id: LessonId): boolean {
  return progress.get(id) === 'completed'
}

export function isUnlocked(
  lesson: Pick<Lesson, 'prerequisites'>,
  progress: ProgressMap,
): boolean {
  return lesson.prerequisites.every((pre) => isCompleted(progress, pre))
}

/**
 * Todas las lecciones que faltan completar ANTES de `lessonId` (incluye
 * prerrequisitos de prerrequisitos), en un orden en el que se pueden estudiar:
 * primero las más básicas.
 */
export function missingPrerequisites(
  lessonId: LessonId,
  lessons: ReadonlyMap<LessonId, Pick<Lesson, 'id' | 'prerequisites'>>,
  progress: ProgressMap,
): LessonId[] {
  const result: LessonId[] = []
  const visited = new Set<LessonId>()

  // Recorrido en profundidad: agregamos una lección después de sus prerrequisitos.
  function visit(id: LessonId) {
    if (visited.has(id)) return
    visited.add(id)
    for (const pre of lessons.get(id)?.prerequisites ?? []) visit(pre)
    if (id !== lessonId && !isCompleted(progress, id)) result.push(id)
  }

  visit(lessonId)
  return result
}

export interface ProgressSummary {
  completed: number
  seen: number
  total: number
  /** Porcentaje completado, de 0 a 100. */
  percent: number
}

export function summarize(lessons: Lesson[], progress: ProgressMap): ProgressSummary {
  const total = lessons.length
  const completed = lessons.filter((l) => progress.get(l.id) === 'completed').length
  const seen = lessons.filter((l) => progress.get(l.id) === 'seen').length
  return { completed, seen, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) }
}

export function moduleProgress(module: Module, progress: ProgressMap): ProgressSummary {
  return summarize(module.lessons, progress)
}

export function routeProgress(route: Route, progress: ProgressMap): ProgressSummary {
  return summarize(
    route.modules.flatMap((m) => m.lessons),
    progress,
  )
}

/**
 * Próxima lección sugerida: la primera (en el orden de la ruta) que no está
 * completada y ya está desbloqueada. Si una lección ya está "vista" (empezada),
 * tiene prioridad: conviene terminar lo que se empezó.
 */
export function nextLesson(route: Route, progress: ProgressMap): Lesson | null {
  const ordered = route.modules.flatMap((m) => m.lessons)
  const pending = ordered.filter((l) => !isCompleted(progress, l.id) && isUnlocked(l, progress))
  return pending.find((l) => progress.get(l.id) === 'seen') ?? pending[0] ?? null
}
