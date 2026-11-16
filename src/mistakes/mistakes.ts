// Cuaderno de errores: registrar, editar, borrar, convertir en tarjeta y estadísticas.

import { db, newId, type StudyDB } from '../db/db'
import { createNote, getOrCreateDeck, updateNote } from '../srs/notes'
import type { Mistake, MistakeCause } from '../types/user-data'

export const CAUSE_LABELS: Record<MistakeCause, string> = {
  concepto: 'Concepto',
  algebra: 'Álgebra / cuentas',
  distraccion: 'Distracción',
  unidades: 'Unidades',
}

export const CAUSE_HINTS: Record<MistakeCause, string> = {
  concepto: 'No entendía la idea o apliqué la regla equivocada.',
  algebra: 'Error al despejar, de signos o de cuentas.',
  distraccion: 'Leí mal el enunciado o copié mal un dato.',
  unidades: 'Mezclé unidades o me olvidé de convertir.',
}

/** Mazo donde van las tarjetas creadas a partir de errores. */
export const MISTAKES_DECK = 'Cuaderno de errores'

export type MistakeInput = Omit<Mistake, 'id' | 'createdAt' | 'noteId'>

/** Devuelve un mensaje de error si falta algo, o null si está todo bien. */
export function validateMistake(input: MistakeInput): string | null {
  if (!input.topic.trim()) return 'Indicá el tema (o elegí una lección).'
  if (!input.statement.trim()) return 'Escribí el enunciado del ejercicio.'
  if (!input.whatIDid.trim()) return 'Contá qué hiciste mal.'
  if (!input.correction.trim()) return 'Escribí la corrección.'
  if (!(input.cause in CAUSE_LABELS)) return 'Elegí una causa.'
  return null
}

function clean(input: MistakeInput): MistakeInput {
  return {
    ...(input.lessonId ? { lessonId: input.lessonId } : {}),
    topic: input.topic.trim(),
    statement: input.statement.trim(),
    whatIDid: input.whatIDid.trim(),
    cause: input.cause,
    correction: input.correction.trim(),
  }
}

export async function createMistake(input: MistakeInput, database: StudyDB = db, now = new Date()): Promise<Mistake> {
  const error = validateMistake(input)
  if (error) throw new Error(error)
  const mistake: Mistake = { id: newId(), ...clean(input), createdAt: now }
  await database.mistakes.add(mistake)
  return mistake
}

/**
 * Edita un error. Si ya tenía tarjeta, la tarjeta se actualiza con el texto nuevo
 * (conservando su progreso de repaso).
 */
export async function updateMistake(id: string, input: MistakeInput, database: StudyDB = db): Promise<Mistake> {
  const error = validateMistake(input)
  if (error) throw new Error(error)
  const current = await database.mistakes.get(id)
  if (!current) throw new Error('El error no existe.')
  // put reemplaza el registro completo: así se borra lessonId si se quitó la lección.
  const updated: Mistake = { id, createdAt: current.createdAt, ...clean(input), ...(current.noteId ? { noteId: current.noteId } : {}) }
  await database.mistakes.put(updated)
  if (updated.noteId && (await database.notes.get(updated.noteId))) {
    const faces = mistakeCardText(updated)
    await updateNote(updated.noteId, { front: faces.front, back: faces.back }, database)
  }
  return updated
}

/** Borra el registro del error. La tarjeta, si se creó, queda en tus mazos. */
export async function deleteMistake(id: string, database: StudyDB = db): Promise<void> {
  await database.mistakes.delete(id)
}

/**
 * Texto de la tarjeta de repaso de un error:
 * frente = el enunciado; dorso = la corrección y la "trampa" en la que caíste.
 */
export function mistakeCardText(m: Pick<Mistake, 'statement' | 'whatIDid' | 'correction' | 'cause'>) {
  return {
    front: m.statement,
    back: `${m.correction}\n\n---\n\n**Ojo (${CAUSE_LABELS[m.cause].toLowerCase()}):** ${m.whatIDid}`,
  }
}

/**
 * Crea una tarjeta básica en el mazo "Cuaderno de errores". Si el error ya tenía
 * una tarjeta que sigue existiendo, no crea otra y devuelve la misma.
 */
export async function mistakeToCard(id: string, database: StudyDB = db): Promise<string> {
  const mistake = await database.mistakes.get(id)
  if (!mistake) throw new Error('El error no existe.')
  if (mistake.noteId && (await database.notes.get(mistake.noteId))) return mistake.noteId

  const deck = await getOrCreateDeck(MISTAKES_DECK, database)
  const text = mistakeCardText(mistake)
  const tags = ['error', `causa-${mistake.cause}`, ...(mistake.lessonId ? [mistake.lessonId] : [])]
  const note = await createNote(
    { deckId: deck.id, type: 'basic', ...text, tags, source: { kind: 'mistake', mistakeId: id } },
    database,
  )
  await database.mistakes.update(id, { noteId: note.id })
  return note.id
}

// ---------------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------------

export function countByCause(mistakes: Mistake[]): Record<MistakeCause, number> {
  const counts: Record<MistakeCause, number> = { concepto: 0, algebra: 0, distraccion: 0, unidades: 0 }
  for (const m of mistakes) counts[m.cause]++
  return counts
}

/** Temas ordenados de más a menos errores (y alfabéticamente si empatan). */
export function countByTopic(mistakes: Mistake[]): { topic: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const m of mistakes) counts.set(m.topic, (counts.get(m.topic) ?? 0) + 1)
  return [...counts]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, 'es'))
}
