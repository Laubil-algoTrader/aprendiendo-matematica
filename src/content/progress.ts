// Guardar y leer el progreso de las lecciones (vista / completada).

import { useLiveQuery } from 'dexie-react-hooks'
import { db, type StudyDB } from '../db/db'
import type { LessonId } from '../types/content'
import type { LessonStatus } from '../types/user-data'
import type { ProgressMap } from './graph'

/** Marca la lección. Con `null` se borra la marca (vuelve a "sin empezar"). */
export async function setLessonStatus(
  lessonId: LessonId,
  status: LessonStatus | null,
  database: StudyDB = db,
  now = new Date(),
): Promise<void> {
  if (status === null) await database.lessonProgress.delete(lessonId)
  else await database.lessonProgress.put({ lessonId, status, updatedAt: now })
}

/** Al abrir una lección por primera vez la marcamos como "vista" (si ya estaba completada, no la tocamos). */
export async function markSeenIfNew(lessonId: LessonId, database: StudyDB = db): Promise<void> {
  await database.transaction('rw', database.lessonProgress, async () => {
    if (!(await database.lessonProgress.get(lessonId))) {
      await database.lessonProgress.put({ lessonId, status: 'seen', updatedAt: new Date() })
    }
  })
}

export async function getProgressMap(database: StudyDB = db): Promise<ProgressMap> {
  const rows = await database.lessonProgress.toArray()
  return new Map(rows.map((r) => [r.lessonId, r.status]))
}

/** Hook de React: el progreso actualizado en vivo (undefined mientras carga). */
export function useProgress(): ProgressMap | undefined {
  return useLiveQuery(() => getProgressMap(), [])
}
