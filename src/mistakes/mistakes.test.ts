import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { newId, StudyDB } from '../db/db'
import { gradeCard } from '../srs/queue'
import type { Mistake } from '../types/user-data'
import {
  countByCause,
  countByTopic,
  createMistake,
  deleteMistake,
  MISTAKES_DECK,
  mistakeToCard,
  updateMistake,
  validateMistake,
  type MistakeInput,
} from './mistakes'

let database: StudyDB
beforeEach(() => {
  database = new StudyDB(`test-${newId()}`)
})
afterEach(async () => {
  await database.delete()
})

const input: MistakeInput = {
  lessonId: 'mat-valor-absoluto-inecuaciones',
  topic: 'Inecuaciones',
  statement: 'Resolver $-2x > 6$',
  whatIDid: 'Puse $x > -3$',
  cause: 'algebra',
  correction: 'Al dividir por $-2$ se invierte: $x < -3$',
}

describe('cuaderno de errores', () => {
  it('valida los campos obligatorios', () => {
    expect(validateMistake(input)).toBeNull()
    expect(validateMistake({ ...input, topic: ' ' })).toMatch('tema')
    expect(validateMistake({ ...input, correction: '' })).toMatch('corrección')
  })

  it('crea, edita y borra', async () => {
    const m = await createMistake({ ...input, topic: '  Inecuaciones  ' }, database)
    expect(m.topic).toBe('Inecuaciones')
    const { lessonId: _omit, ...withoutLesson } = input
    await updateMistake(m.id, { ...withoutLesson, cause: 'concepto' }, database)
    const stored = await database.mistakes.get(m.id)
    expect(stored?.cause).toBe('concepto')
    expect(stored?.lessonId).toBeUndefined()
    await deleteMistake(m.id, database)
    expect(await database.mistakes.count()).toBe(0)
  })

  it('convierte en tarjeta una sola vez, en el mazo del cuaderno', async () => {
    const m = await createMistake(input, database)
    const noteId = await mistakeToCard(m.id, database)
    expect(await mistakeToCard(m.id, database)).toBe(noteId)
    expect(await database.notes.count()).toBe(1)

    const note = await database.notes.get(noteId)
    expect(note?.front).toBe(input.statement)
    expect(note?.back).toContain(input.correction)
    expect(note?.back).toContain(input.whatIDid)
    expect(note?.tags).toEqual(['error', 'causa-algebra', 'mat-valor-absoluto-inecuaciones'])
    expect(note?.source).toEqual({ kind: 'mistake', mistakeId: m.id })
    expect((await database.decks.get(note!.deckId))?.name).toBe(MISTAKES_DECK)
    expect((await database.mistakes.get(m.id))?.noteId).toBe(noteId)
  })

  it('si se borró la tarjeta, se puede volver a crear', async () => {
    const m = await createMistake(input, database)
    const first = await mistakeToCard(m.id, database)
    await database.notes.delete(first)
    const second = await mistakeToCard(m.id, database)
    expect(second).not.toBe(first)
  })

  it('editar el error actualiza su tarjeta sin perder el progreso', async () => {
    const m = await createMistake(input, database)
    const noteId = await mistakeToCard(m.id, database)
    const card = (await database.cards.where('noteId').equals(noteId).first())!
    await gradeCard(card.id, 3, database)

    await updateMistake(m.id, { ...input, statement: 'Resolver $-3x > 9$' }, database)
    expect((await database.notes.get(noteId))?.front).toBe('Resolver $-3x > 9$')
    expect((await database.cards.get(card.id))?.fsrs.reps).toBe(1)
  })
})

describe('estadísticas', () => {
  const mk = (topic: string, cause: Mistake['cause']): Mistake => ({
    ...input,
    id: newId(),
    topic,
    cause,
    createdAt: new Date(),
  })
  const list = [mk('Trigonometría', 'unidades'), mk('Álgebra', 'algebra'), mk('Trigonometría', 'concepto')]

  it('cuenta por causa', () => {
    expect(countByCause(list)).toEqual({ concepto: 1, algebra: 1, distraccion: 0, unidades: 1 })
  })

  it('ordena los temas por cantidad de errores', () => {
    expect(countByTopic(list)).toEqual([
      { topic: 'Trigonometría', count: 2 },
      { topic: 'Álgebra', count: 1 },
    ])
  })
})
