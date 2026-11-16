// Agregar a tus mazos las tarjetas sugeridas por una lección.
//
// Las tarjetas van a un mazo con el nombre del módulo (ej. "Matemática") y
// llevan como etiqueta el id de la lección. Cada nota recuerda de qué
// sugerencia salió, así no se agrega dos veces la misma.

import { db, type StudyDB } from '../db/db'
import { createNotes, getOrCreateDeck } from '../srs/notes'
import type { Lesson, SuggestedCard } from '../types/content'

/** Identificador global de una sugerencia: "id-leccion#id-tarjeta". */
export function suggestionKey(lessonId: string, cardId: string): string {
  return `${lessonId}#${cardId}`
}

/** Ids de las tarjetas sugeridas de esta lección que ya están en tus mazos. */
export async function addedSuggestionIds(lessonId: string, database: StudyDB = db): Promise<Set<string>> {
  const notes = await database.notes.where('source.lessonId').equals(lessonId).toArray()
  const ids = new Set<string>()
  for (const n of notes) {
    if (n.source?.kind === 'lesson') ids.add(n.source.suggestionId.split('#')[1])
  }
  return ids
}

/**
 * Agrega las tarjetas indicadas (o todas) de la lección. Saltea las que ya estaban.
 * Devuelve cuántas se agregaron.
 */
export async function addSuggestedCards(
  lesson: Lesson,
  deckName: string,
  cards: SuggestedCard[] = lesson.suggestedCards,
  database: StudyDB = db,
): Promise<number> {
  const already = await addedSuggestionIds(lesson.id, database)
  const pending = cards.filter((c) => !already.has(c.id))
  if (pending.length === 0) return 0
  const deck = await getOrCreateDeck(deckName, database)
  await createNotes(
    pending.map((card) => ({
      deckId: deck.id,
      type: card.type,
      front: card.front,
      back: card.back ?? '',
      tags: [...new Set([lesson.id, ...(card.tags ?? [])])],
      source: { kind: 'lesson' as const, lessonId: lesson.id, suggestionId: suggestionKey(lesson.id, card.id) },
    })),
    database,
  )
  return pending.length
}
