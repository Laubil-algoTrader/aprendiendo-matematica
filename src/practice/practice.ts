// Práctica intercalada.
//
// En vez de practicar un tema por vez ("bloques"), se mezclan tarjetas y
// ejercicios de varias lecciones ya vistas, sin que haya dos seguidos del
// mismo tema. Obliga a reconocer QUÉ herramienta usar en cada problema, que es
// justo lo que hace falta en un examen.
//
// Importante: practicar NO cambia la programación de FSRS. Cada respuesta se
// registra con mode: 'practice' (cuenta para la racha), pero la tarjeta sigue
// venciendo el mismo día que antes.

import { db, newId, type StudyDB } from '../db/db'
import type { Exercise, Lesson, LessonId } from '../types/content'
import type { Card, Grade, Note } from '../types/user-data'

export type PracticeItem =
  | { kind: 'card'; topic: LessonId; card: Card; note: Note }
  | { kind: 'exercise'; topic: LessonId; exercise: Exercise }

export interface PracticeOptions {
  /** Lecciones (temas) a mezclar. */
  lessonIds: LessonId[]
  includeCards: boolean
  includeExercises: boolean
  /** Cantidad máxima de ítems de la sesión. */
  size: number
}

/** Generador de números al azar entre 0 y 1 (se puede reemplazar en los tests). */
export type Rng = () => number

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Agrupa por tema. */
function groupByTopic<T extends { topic: string }>(items: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) groups.set(item.topic, [...(groups.get(item.topic) ?? []), item])
  return groups
}

/**
 * Elige hasta `size` ítems repartidos parejo entre los temas: va tomando uno
 * de cada tema por turno (en orden al azar) hasta completar.
 */
export function pickBalanced<T extends { topic: string }>(items: readonly T[], size: number, rng: Rng = Math.random): T[] {
  const queues = [...groupByTopic(items).values()].map((g) => shuffle(g, rng))
  const picked: T[] = []
  while (picked.length < size && queues.some((q) => q.length > 0)) {
    for (const q of shuffle(queues, rng)) {
      if (picked.length >= size) break
      const item = q.shift()
      if (item) picked.push(item)
    }
  }
  return picked
}

/**
 * Ordena los ítems para que no haya dos seguidos del mismo tema (si es posible).
 * Estrategia: en cada paso elegir, entre los temas distintos al anterior, el que
 * tiene más ítems pendientes. Si un tema tiene demasiados ítems para separarlos
 * todos, al final quedan juntos los que sobran.
 */
export function interleave<T extends { topic: string }>(items: readonly T[], rng: Rng = Math.random): T[] {
  const groups = [...groupByTopic(items).entries()].map(([topic, g]) => ({ topic, items: shuffle(g, rng) }))
  const result: T[] = []
  let previous: string | null = null
  while (result.length < items.length) {
    const available = groups.filter((g) => g.items.length > 0)
    const candidates = available.filter((g) => g.topic !== previous)
    const pool = candidates.length > 0 ? candidates : available
    const max = Math.max(...pool.map((g) => g.items.length))
    const best = pool.filter((g) => g.items.length === max)
    const chosen = best[Math.floor(rng() * best.length)]
    result.push(chosen.items.shift()!)
    previous = chosen.topic
  }
  return result
}

/** Tema (lección) al que pertenece una nota, si se puede saber. */
export function noteTopic(note: Note, lessonIds: ReadonlySet<string>, mistakeLessons: ReadonlyMap<string, string>): string | null {
  if (note.source?.kind === 'lesson') return note.source.lessonId
  if (note.source?.kind === 'mistake') return mistakeLessons.get(note.source.mistakeId) ?? null
  // Tarjetas propias: si alguna etiqueta coincide con el id de una lección.
  return note.tags.find((t) => lessonIds.has(t)) ?? null
}

/** Todo lo que se puede practicar de cada lección elegida. */
export async function practiceCandidates(
  lessons: Lesson[],
  database: StudyDB = db,
): Promise<PracticeItem[]> {
  const lessonIds = new Set(lessons.map((l) => l.id))
  const [notes, cards, mistakes] = await Promise.all([
    database.notes.toArray(),
    database.cards.toArray(),
    database.mistakes.toArray(),
  ])
  const mistakeLessons = new Map(mistakes.flatMap((m) => (m.lessonId ? [[m.id, m.lessonId] as const] : [])))
  const noteById = new Map(notes.map((n) => [n.id, n]))

  const items: PracticeItem[] = []
  for (const card of cards) {
    if (card.suspended) continue
    const note = noteById.get(card.noteId)
    if (!note) continue
    const topic = noteTopic(note, lessonIds, mistakeLessons)
    if (topic && lessonIds.has(topic)) items.push({ kind: 'card', topic, card, note })
  }
  for (const lesson of lessons) {
    for (const exercise of lesson.exercises) items.push({ kind: 'exercise', topic: lesson.id, exercise })
  }
  return items
}

/** Arma una sesión de práctica intercalada. */
export async function buildPracticeSession(
  lessons: Lesson[],
  options: PracticeOptions,
  rng: Rng = Math.random,
  database: StudyDB = db,
): Promise<PracticeItem[]> {
  const chosen = lessons.filter((l) => options.lessonIds.includes(l.id))
  const all = (await practiceCandidates(chosen, database)).filter(
    (i) => (i.kind === 'card' && options.includeCards) || (i.kind === 'exercise' && options.includeExercises),
  )
  return interleave(pickBalanced(all, options.size, rng), rng)
}

/** Registra la respuesta a una tarjeta en práctica (no toca FSRS). */
export async function logPracticeAnswer(
  cardId: string,
  grade: Grade,
  database: StudyDB = db,
  now = new Date(),
): Promise<void> {
  await database.reviewLogs.add({ id: newId(), cardId, grade, reviewedAt: now, mode: 'practice' })
}
