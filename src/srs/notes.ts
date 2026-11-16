// Mazos, notas y tarjetas: crear, editar, borrar y suspender.
//
// Recordatorio del modelo: una NOTA es lo que escribís; de cada nota salen
// una o más TARJETAS (lo que se repasa). Este archivo mantiene las dos cosas
// sincronizadas: si editás una nota, se agregan o quitan tarjetas según haga
// falta, pero las que siguen existiendo CONSERVAN su historial de repaso.

import { db, newId, type StudyDB } from '../db/db'
import type { Card, CardType, Deck, Note, NoteSource } from '../types/user-data'
import { clozeOrdinals, renderCloze } from './cloze'
import { getScheduler } from './scheduler'

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  basic: 'Básica',
  'basic-reversed': 'Básica e invertida',
  cloze: 'Cloze (completar huecos)',
}

// ---------------------------------------------------------------------------
// Mazos
// ---------------------------------------------------------------------------

function cleanName(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (!clean) throw new Error('El mazo necesita un nombre.')
  return clean
}

async function assertUniqueDeckName(name: string, database: StudyDB, exceptId?: string) {
  const all = await database.decks.toArray()
  const clash = all.find((d) => d.id !== exceptId && d.name.toLowerCase() === name.toLowerCase())
  if (clash) throw new Error(`Ya existe un mazo llamado "${clash.name}".`)
}

export async function createDeck(name: string, database: StudyDB = db, now = new Date()): Promise<Deck> {
  const clean = cleanName(name)
  await assertUniqueDeckName(clean, database)
  const deck: Deck = { id: newId(), name: clean, createdAt: now }
  await database.decks.add(deck)
  return deck
}

/** Devuelve el mazo con ese nombre (sin distinguir mayúsculas) o lo crea. */
export async function getOrCreateDeck(name: string, database: StudyDB = db): Promise<Deck> {
  const clean = cleanName(name)
  const all = await database.decks.toArray()
  return all.find((d) => d.name.toLowerCase() === clean.toLowerCase()) ?? createDeck(clean, database)
}

export async function renameDeck(deckId: string, name: string, database: StudyDB = db): Promise<void> {
  const clean = cleanName(name)
  await assertUniqueDeckName(clean, database, deckId)
  await database.decks.update(deckId, { name: clean })
}

/** Borra el mazo con TODAS sus notas, tarjetas e historial. No se puede deshacer. */
export async function deleteDeck(deckId: string, database: StudyDB = db): Promise<void> {
  await database.transaction('rw', [database.decks, database.notes, database.cards, database.reviewLogs], async () => {
    const cardIds = await database.cards.where('deckId').equals(deckId).primaryKeys()
    await database.reviewLogs.where('cardId').anyOf(cardIds).delete()
    await database.cards.where('deckId').equals(deckId).delete()
    await database.notes.where('deckId').equals(deckId).delete()
    await database.decks.delete(deckId)
  })
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

export interface NoteInput {
  deckId: string
  type: CardType
  front: string
  back: string
  tags: string[]
  source?: NoteSource
}

/** Convierte "algebra, trigonometria  seno" en ["algebra", "trigonometria", "seno"]. */
export function parseTags(text: string): string[] {
  const tags = text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  return [...new Set(tags)]
}

/** Qué tarjetas (ordinales) debe tener una nota según su tipo y su texto. */
export function ordinalsFor(note: Pick<Note, 'type' | 'front'>): number[] {
  switch (note.type) {
    case 'basic':
      return [0]
    case 'basic-reversed':
      return [0, 1]
    case 'cloze':
      return clozeOrdinals(note.front)
  }
}

/** Revisa que la nota esté completa. Devuelve un mensaje de error o null si está bien. */
export function validateNote(input: Pick<NoteInput, 'type' | 'front' | 'back'>): string | null {
  if (!input.front.trim()) return 'El frente no puede estar vacío.'
  if (input.type === 'cloze') {
    if (clozeOrdinals(input.front).length === 0) {
      return 'Una tarjeta cloze necesita al menos un hueco, por ejemplo {{c1::respuesta}}.'
    }
  } else if (!input.back.trim()) {
    return 'El dorso no puede estar vacío.'
  }
  return null
}

export async function createNote(input: NoteInput, database: StudyDB = db, now = new Date()): Promise<Note> {
  const error = validateNote(input)
  if (error) throw new Error(error)
  const scheduler = await getScheduler()

  const note: Note = {
    id: newId(),
    deckId: input.deckId,
    type: input.type,
    front: input.front,
    back: input.back,
    tags: input.tags,
    ...(input.source ? { source: input.source } : {}),
    createdAt: now,
    updatedAt: now,
  }
  const cards: Card[] = ordinalsFor(note).map((ordinal) => ({
    id: newId(),
    noteId: note.id,
    deckId: note.deckId,
    ordinal,
    suspended: false,
    fsrs: scheduler.newCard({ now }),
  }))

  await database.transaction('rw', [database.notes, database.cards], async () => {
    await database.notes.add(note)
    await database.cards.bulkAdd(cards)
  })
  return note
}

/**
 * Edita una nota. Las tarjetas que siguen existiendo conservan su progreso;
 * se crean las nuevas (ej. agregaste {{c3::...}}) y se borran las que sobran.
 */
export async function updateNote(
  noteId: string,
  changes: Partial<Omit<NoteInput, 'source'>>,
  database: StudyDB = db,
  now = new Date(),
): Promise<Note> {
  const current = await database.notes.get(noteId)
  if (!current) throw new Error('La nota no existe.')
  const updated: Note = { ...current, ...changes, updatedAt: now }
  const error = validateNote(updated)
  if (error) throw new Error(error)
  const scheduler = await getScheduler()

  await database.transaction('rw', [database.notes, database.cards, database.reviewLogs], async () => {
    const existing = await database.cards.where('noteId').equals(noteId).toArray()
    const wanted = ordinalsFor(updated)

    const toDelete = existing.filter((c) => !wanted.includes(c.ordinal)).map((c) => c.id)
    const toAdd: Card[] = wanted
      .filter((ord) => !existing.some((c) => c.ordinal === ord))
      .map((ordinal) => ({
        id: newId(),
        noteId,
        deckId: updated.deckId,
        ordinal,
        suspended: false,
        fsrs: scheduler.newCard({ now }),
      }))

    await database.notes.put(updated)
    await database.reviewLogs.where('cardId').anyOf(toDelete).delete()
    await database.cards.bulkDelete(toDelete)
    await database.cards.bulkAdd(toAdd)
    // Si la nota cambió de mazo, sus tarjetas también.
    await database.cards.where('noteId').equals(noteId).modify({ deckId: updated.deckId })
  })
  return updated
}

/** Borra la nota con sus tarjetas e historial. */
export async function deleteNote(noteId: string, database: StudyDB = db): Promise<void> {
  await database.transaction('rw', [database.notes, database.cards, database.reviewLogs], async () => {
    const cardIds = await database.cards.where('noteId').equals(noteId).primaryKeys()
    await database.reviewLogs.where('cardId').anyOf(cardIds).delete()
    await database.cards.bulkDelete(cardIds)
    await database.notes.delete(noteId)
  })
}

/** Suspende (o reactiva) todas las tarjetas de una nota. */
export async function setNoteSuspended(noteId: string, suspended: boolean, database: StudyDB = db) {
  await database.cards.where('noteId').equals(noteId).modify({ suspended })
}

export async function setCardSuspended(cardId: string, suspended: boolean, database: StudyDB = db) {
  await database.cards.update(cardId, { suspended })
}

// ---------------------------------------------------------------------------
// Qué se muestra en cada lado de una tarjeta
// ---------------------------------------------------------------------------

export interface CardFaces {
  /** Markdown de la pregunta. */
  question: string
  /** Markdown de la respuesta (se muestra debajo de la pregunta). */
  answer: string
}

export function cardFaces(note: Pick<Note, 'type' | 'front' | 'back'>, ordinal: number): CardFaces {
  switch (note.type) {
    case 'basic':
      return { question: note.front, answer: note.back }
    case 'basic-reversed':
      return ordinal === 1
        ? { question: note.back, answer: note.front }
        : { question: note.front, answer: note.back }
    case 'cloze': {
      // En cloze el dorso muestra el texto completo con el hueco resaltado,
      // más el comentario extra si lo hay.
      const revealed = renderCloze(note.front, ordinal, true)
      return {
        question: renderCloze(note.front, ordinal, false),
        answer: note.back.trim() ? `${revealed}\n\n---\n\n${note.back}` : revealed,
      }
    }
  }
}
