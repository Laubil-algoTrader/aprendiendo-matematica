import { DefaultScheduler, Rating } from 'ts-fsrs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Card, Deck, Note } from '../types/user-data'
import { newId, StudyDB } from './db'
import { DEFAULT_SETTINGS, getSettings, updateSettings } from './settings'

// Cada test usa una base nueva (con nombre distinto) para no mezclar datos.
let database: StudyDB

beforeEach(() => {
  database = new StudyDB(`test-${newId()}`)
})

afterEach(async () => {
  await database.delete()
})

describe('ajustes', () => {
  it('sin nada guardado devuelve los valores por defecto', async () => {
    expect(await getSettings(database)).toEqual(DEFAULT_SETTINGS)
  })

  it('guarda cambios parciales y conserva el resto', async () => {
    await updateSettings({ newCardsPerDay: 30 }, database)
    expect(await getSettings(database)).toEqual({ ...DEFAULT_SETTINGS, newCardsPerDay: 30 })
  })

  it('rechaza valores sin sentido', async () => {
    await expect(updateSettings({ newCardsPerDay: -1 }, database)).rejects.toThrow()
    await expect(updateSettings({ dayStartHour: 24 }, database)).rejects.toThrow()
    await expect(updateSettings({ newCardsPerDay: 2.5 }, database)).rejects.toThrow()
  })
})

describe('mazos, notas y tarjetas', () => {
  it('guarda una tarjeta con su estado FSRS y lo recupera con fechas reales', async () => {
    const now = new Date('2026-11-16T12:00:00Z')
    const scheduler = await DefaultScheduler()

    const deck: Deck = { id: newId(), name: 'Matemática', createdAt: now }
    const note: Note = {
      id: newId(),
      deckId: deck.id,
      type: 'basic',
      front: '¿Cuánto es $|-3|$?',
      back: '$3$',
      tags: ['valor-absoluto'],
      createdAt: now,
      updatedAt: now,
    }
    const card: Card = {
      id: newId(),
      noteId: note.id,
      deckId: deck.id,
      ordinal: 0,
      suspended: false,
      fsrs: scheduler.newCard({ now }),
    }

    await database.decks.add(deck)
    await database.notes.add(note)
    await database.cards.add(card)

    const stored = await database.cards.get(card.id)
    // IndexedDB conserva los objetos Date (no los convierte en texto),
    // así que ts-fsrs puede seguir calculando con lo que leemos de la base.
    expect(stored?.fsrs.dueAt).toBeInstanceOf(Date)
    const result = scheduler.review({ card: stored!.fsrs, grade: Rating.Good, now })
    expect(result.card.reps).toBe(1)
  })

  it('busca tarjetas vencidas por fecha usando el índice fsrs.dueAt', async () => {
    const scheduler = await DefaultScheduler()
    const base = { noteId: 'n', deckId: 'd', ordinal: 0, suspended: false }
    await database.cards.bulkAdd([
      { ...base, id: 'vieja', fsrs: scheduler.newCard({ now: new Date('2026-11-01T00:00:00Z') }) },
      { ...base, id: 'futura', fsrs: scheduler.newCard({ now: new Date('2026-12-01T00:00:00Z') }) },
    ])

    const due = await database.cards
      .where('fsrs.dueAt')
      .belowOrEqual(new Date('2026-11-16T00:00:00Z'))
      .toArray()

    expect(due.map((c) => c.id)).toEqual(['vieja'])
  })

  it('busca notas por etiqueta', async () => {
    const now = new Date()
    const common = { deckId: 'd', type: 'basic' as const, front: 'f', back: 'b', createdAt: now, updatedAt: now }
    await database.notes.bulkAdd([
      { ...common, id: 'a', tags: ['trigonometria', 'seno'] },
      { ...common, id: 'b', tags: ['cuadratica'] },
    ])
    const found = await database.notes.where('tags').equals('seno').toArray()
    expect(found.map((n) => n.id)).toEqual(['a'])
  })

  it('registra el progreso de una lección', async () => {
    await database.lessonProgress.put({ lessonId: 'mat-1', status: 'seen', updatedAt: new Date() })
    await database.lessonProgress.put({ lessonId: 'mat-1', status: 'completed', updatedAt: new Date() })
    expect(await database.lessonProgress.count()).toBe(1)
    expect((await database.lessonProgress.get('mat-1'))?.status).toBe('completed')
  })
})
