// Tests de mazos, notas, cola diaria y calificación.

import { State } from 'ts-fsrs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { newId, StudyDB } from '../db/db'
import { DEFAULT_SETTINGS } from '../db/settings'
import type { Settings } from '../types/user-data'
import {
  cardFaces,
  createDeck,
  createNote,
  deleteDeck,
  deleteNote,
  getOrCreateDeck,
  parseTags,
  renameDeck,
  setNoteSuspended,
  updateNote,
  validateNote,
} from './notes'
import { formatInterval, getDailyQueue, gradeCard, undoGrade } from './queue'

let database: StudyDB
let deckId: string

// Un lunes a las 10 de la mañana (hora local).
const MONDAY_10 = new Date(2026, 10, 16, 10, 0)
const minutesLater = (base: Date, min: number) => new Date(base.getTime() + min * 60_000)

beforeEach(async () => {
  database = new StudyDB(`test-${newId()}`)
  deckId = (await createDeck('Matemática', database, MONDAY_10)).id
})

afterEach(async () => {
  await database.delete()
})

function basic(front: string, back = 'respuesta') {
  return { deckId, type: 'basic' as const, front, back, tags: [] }
}

describe('mazos', () => {
  it('no permite dos mazos con el mismo nombre', async () => {
    await expect(createDeck('  matemática ', database)).rejects.toThrow('Ya existe')
  })

  it('getOrCreateDeck reutiliza el existente', async () => {
    expect((await getOrCreateDeck('MATEMÁTICA', database)).id).toBe(deckId)
    expect(await database.decks.count()).toBe(1)
  })

  it('renombra y borra en cascada', async () => {
    await renameDeck(deckId, 'Álgebra', database)
    expect((await database.decks.get(deckId))?.name).toBe('Álgebra')
    const note = await createNote(basic('¿2+2?', '4'), database)
    await gradeCard((await database.cards.where('noteId').equals(note.id).first())!.id, 3, database)
    await deleteDeck(deckId, database)
    expect(await database.notes.count()).toBe(0)
    expect(await database.cards.count()).toBe(0)
    expect(await database.reviewLogs.count()).toBe(0)
  })
})

describe('notas y tarjetas', () => {
  it('básica crea 1 tarjeta, invertida 2, cloze una por hueco', async () => {
    const a = await createNote(basic('f'), database)
    const b = await createNote({ ...basic('f'), type: 'basic-reversed' }, database)
    const c = await createNote(
      { ...basic('{{c1::a}} {{c2::b}} {{c1::c}}', ''), type: 'cloze' },
      database,
    )
    const ords = async (id: string) =>
      (await database.cards.where('noteId').equals(id).toArray()).map((x) => x.ordinal).sort()
    expect(await ords(a.id)).toEqual([0])
    expect(await ords(b.id)).toEqual([0, 1])
    expect(await ords(c.id)).toEqual([1, 2])
  })

  it('valida campos obligatorios', () => {
    expect(validateNote({ type: 'basic', front: ' ', back: 'x' })).toMatch('frente')
    expect(validateNote({ type: 'basic', front: 'x', back: '' })).toMatch('dorso')
    expect(validateNote({ type: 'cloze', front: 'sin huecos', back: '' })).toMatch('hueco')
    expect(validateNote({ type: 'cloze', front: '{{c1::ok}}', back: '' })).toBeNull()
  })

  it('al editar una cloze conserva el progreso de los huecos que siguen', async () => {
    const note = await createNote({ ...basic('{{c1::a}} {{c2::b}}', ''), type: 'cloze' }, database)
    const c1 = (await database.cards.where({ noteId: note.id }).toArray()).find((c) => c.ordinal === 1)!
    await gradeCard(c1.id, 3, database, MONDAY_10)

    await updateNote(note.id, { front: '{{c1::a}} {{c3::nuevo}}' }, database)

    const cards = await database.cards.where('noteId').equals(note.id).toArray()
    expect(cards.map((c) => c.ordinal).sort()).toEqual([1, 3])
    const kept = cards.find((c) => c.ordinal === 1)!
    expect(kept.id).toBe(c1.id)
    expect(kept.fsrs.reps).toBe(1)
  })

  it('mover la nota a otro mazo mueve sus tarjetas', async () => {
    const other = await createDeck('Física', database)
    const note = await createNote({ ...basic('f'), type: 'basic-reversed' }, database)
    await updateNote(note.id, { deckId: other.id }, database)
    const cards = await database.cards.where('noteId').equals(note.id).toArray()
    expect(cards.every((c) => c.deckId === other.id)).toBe(true)
  })

  it('borrar una nota borra sus tarjetas', async () => {
    const note = await createNote({ ...basic('f'), type: 'basic-reversed' }, database)
    await deleteNote(note.id, database)
    expect(await database.cards.count()).toBe(0)
  })

  it('caras de una invertida y una cloze', () => {
    expect(cardFaces({ type: 'basic-reversed', front: 'A', back: 'B' }, 1)).toEqual({
      question: 'B',
      answer: 'A',
    })
    const faces = cardFaces({ type: 'cloze', front: 'x {{c1::y}}', back: 'extra' }, 1)
    expect(faces.question).toBe('x **[…]**')
    expect(faces.answer).toBe('x **y**\n\n---\n\nextra')
  })

  it('parseTags separa por espacios, comas o punto y coma, sin repetir', () => {
    expect(parseTags('algebra, seno;  seno  trigo')).toEqual(['algebra', 'seno', 'trigo'])
  })
})

describe('cola diaria', () => {
  const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...over })

  async function addNotes(n: number) {
    for (let i = 0; i < n; i++) {
      await createNote(basic(`p${i}`), database, minutesLater(MONDAY_10, -100 + i))
    }
  }

  it('limita las nuevas por día', async () => {
    await addNotes(20)
    const q = await getDailyQueue({ now: MONDAY_10, settings: settings({ newCardsPerDay: 15 }) }, database)
    expect(q.counts.new).toBe(15)
  })

  it('las nuevas ya empezadas hoy descuentan del límite', async () => {
    await addNotes(5)
    const s = settings({ newCardsPerDay: 3 })
    let q = await getDailyQueue({ now: MONDAY_10, settings: s }, database)
    await gradeCard(q.next!.id, 4, database, MONDAY_10) // Fácil: pasa a repaso en días
    q = await getDailyQueue({ now: minutesLater(MONDAY_10, 1), settings: s }, database)
    expect(q.counts.new).toBe(2)
  })

  it('presenta las nuevas en el orden de creación', async () => {
    await addNotes(3)
    const q = await getDailyQueue({ now: MONDAY_10, settings: settings() }, database)
    const note = await database.notes.get(q.next!.noteId)
    expect(note?.front).toBe('p0')
  })

  it('no incluye tarjetas suspendidas', async () => {
    const note = await createNote(basic('x'), database)
    await setNoteSuspended(note.id, true, database)
    const q = await getDailyQueue({ now: MONDAY_10, settings: settings() }, database)
    expect(q.next).toBeNull()
  })

  it('no muestra dos tarjetas nuevas de la misma nota el mismo día', async () => {
    await createNote({ ...basic('A', 'B'), type: 'basic-reversed' }, database)
    let q = await getDailyQueue({ now: MONDAY_10, settings: settings() }, database)
    expect(q.counts.new).toBe(1)
    await gradeCard(q.next!.id, 4, database, MONDAY_10)
    q = await getDailyQueue({ now: minutesLater(MONDAY_10, 1), settings: settings() }, database)
    expect(q.next).toBeNull()
    // Al día siguiente sí aparece la hermana.
    q = await getDailyQueue({ now: new Date(2026, 10, 17, 10, 0), settings: settings() }, database)
    expect(q.counts.new).toBe(1)
  })

  it('"Otra vez" la vuelve a mostrar a los pocos minutos', async () => {
    await addNotes(1)
    const s = settings()
    let q = await getDailyQueue({ now: MONDAY_10, settings: s }, database)
    const id = q.next!.id
    await gradeCard(id, 1, database, MONDAY_10)
    const card = await database.cards.get(id)
    expect(card?.fsrs.state).toBe(State.Learning)
    // Recién calificada: no queda otra cosa, así que se adelanta (margen de 20 min).
    q = await getDailyQueue({ now: MONDAY_10, settings: s }, database)
    expect(q.next?.id).toBe(id)
  })

  it('una tarjeta de repaso vence el día que corresponde', async () => {
    await addNotes(1)
    const s = settings()
    const first = (await getDailyQueue({ now: MONDAY_10, settings: s }, database)).next!
    await gradeCard(first.id, 3, database, MONDAY_10)
    const due = (await database.cards.get(first.id))!.fsrs.dueAt

    const dayBefore = new Date(due.getTime() - 24 * 3600_000)
    expect((await getDailyQueue({ now: dayBefore, settings: s }, database)).counts.review).toBe(0)
    expect((await getDailyQueue({ now: due, settings: s }, database)).counts.review).toBe(1)
  })

  it('filtra por mazo', async () => {
    await addNotes(2)
    const other = await createDeck('Física', database)
    await createNote({ ...basic('f'), deckId: other.id }, database)
    const q = await getDailyQueue({ now: MONDAY_10, settings: settings(), deckId: other.id }, database)
    expect(q.counts.new).toBe(1)
  })
})

describe('calificar y deshacer', () => {
  it('registra el repaso y deshacer lo revierte', async () => {
    const note = await createNote(basic('x'), database)
    const card = (await database.cards.where('noteId').equals(note.id).first())!
    const undo = await gradeCard(card.id, 3, database, MONDAY_10)
    expect(await database.reviewLogs.count()).toBe(1)
    expect((await database.cards.get(card.id))?.fsrs.reps).toBe(1)

    await undoGrade(undo, database)
    expect(await database.reviewLogs.count()).toBe(0)
    expect((await database.cards.get(card.id))?.fsrs.reps).toBe(0)
  })
})

describe('formatInterval', () => {
  it('elige la unidad adecuada', () => {
    expect(formatInterval(30_000)).toBe('1 min')
    expect(formatInterval(10 * 60_000)).toBe('10 min')
    expect(formatInterval(5 * 3600_000)).toBe('5 h')
    expect(formatInterval(4 * 86400_000)).toBe('4 d')
    expect(formatInterval(90 * 86400_000)).toBe('3 m')
    expect(formatInterval(400 * 86400_000)).toBe('1,1 a')
  })
})
