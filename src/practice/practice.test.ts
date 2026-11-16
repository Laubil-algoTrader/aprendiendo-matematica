import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { newId, StudyDB } from '../db/db'
import { addSuggestedCards } from '../content/suggested'
import { createMistake, mistakeToCard } from '../mistakes/mistakes'
import { createDeck, createNote } from '../srs/notes'
import type { Lesson } from '../types/content'
import { buildPracticeSession, interleave, logPracticeAnswer, pickBalanced, practiceCandidates, shuffle } from './practice'

/** Generador "al azar" pero repetible, para que los tests den siempre lo mismo. */
function seeded(seed = 42) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32
    return s / 2 ** 32
  }
}

const items = (spec: Record<string, number>) =>
  Object.entries(spec).flatMap(([topic, n]) => Array.from({ length: n }, (_, i) => ({ topic, id: `${topic}${i}` })))

const hasAdjacentRepeat = (list: { topic: string }[]) => list.some((x, i) => i > 0 && list[i - 1].topic === x.topic)

describe('intercalar', () => {
  it('no deja dos seguidos del mismo tema cuando es posible', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const result = interleave(items({ a: 4, b: 3, c: 3 }), seeded(seed))
      expect(result).toHaveLength(10)
      expect(hasAdjacentRepeat(result)).toBe(false)
    }
  })

  it('maneja el caso justo: 3 de un tema y 2 de otro', () => {
    const result = interleave(items({ a: 3, b: 2 }), seeded())
    expect(result.map((x) => x.topic).join('')).toBe('ababa')
  })

  it('si es imposible separarlos, igual devuelve todos los ítems', () => {
    expect(interleave(items({ a: 5, b: 1 }), seeded())).toHaveLength(6)
  })

  it('pickBalanced reparte parejo entre temas', () => {
    const picked = pickBalanced(items({ a: 10, b: 10, c: 2 }), 9, seeded())
    const count = (t: string) => picked.filter((x) => x.topic === t).length
    expect(picked).toHaveLength(9)
    expect(count('c')).toBe(2)
    expect(Math.abs(count('a') - count('b'))).toBeLessThanOrEqual(1)
  })

  it('shuffle no pierde ni duplica elementos', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded()).sort()).toEqual([1, 2, 3, 4, 5])
  })
})

// --- Con base de datos ---

function lesson(id: string, exercises = 0): Lesson {
  return {
    id,
    routeId: 'r',
    moduleId: 'm',
    title: id,
    objectives: [],
    prerequisites: [],
    resources: [],
    notes: '',
    exercises: Array.from({ length: exercises }, (_, i) => ({ id: `e${i}`, statement: `${id} ejercicio ${i}` })),
    suggestedCards: [
      { id: 'c1', type: 'basic', front: `${id} P1`, back: 'R' },
      { id: 'c2', type: 'basic', front: `${id} P2`, back: 'R' },
    ],
  }
}

describe('sesión de práctica', () => {
  let database: StudyDB
  beforeEach(() => {
    database = new StudyDB(`test-${newId()}`)
  })
  afterEach(async () => {
    await database.delete()
  })

  it('reconoce el tema de tarjetas de lecciones, de errores y por etiqueta', async () => {
    const a = lesson('mat-a')
    const b = lesson('mat-b')
    await addSuggestedCards(a, 'Mate', undefined, database)
    const m = await createMistake(
      { lessonId: 'mat-b', topic: 'B', cause: 'algebra', statement: 's', whatIDid: 'w', correction: 'c' },
      database,
    )
    await mistakeToCard(m.id, database)
    const deck = await createDeck('Propio', database)
    await createNote({ deckId: deck.id, type: 'basic', front: 'propia', back: 'x', tags: ['mat-b'] }, database)
    await createNote({ deckId: deck.id, type: 'basic', front: 'sin tema', back: 'x', tags: [] }, database)

    const found = await practiceCandidates([a, b], database)
    const byTopic = (t: string) => found.filter((i) => i.topic === t).length
    expect(byTopic('mat-a')).toBe(2)
    expect(byTopic('mat-b')).toBe(2) // la del error + la etiquetada
    expect(found).toHaveLength(4) // la tarjeta "sin tema" queda afuera
  })

  it('mezcla tarjetas y ejercicios y respeta las opciones', async () => {
    const a = lesson('mat-a', 3)
    const b = lesson('mat-b', 3)
    await addSuggestedCards(a, 'Mate', undefined, database)
    await addSuggestedCards(b, 'Mate', undefined, database)

    const all = await buildPracticeSession(
      [a, b],
      { lessonIds: ['mat-a', 'mat-b'], includeCards: true, includeExercises: true, size: 50 },
      seeded(),
      database,
    )
    expect(all).toHaveLength(10)
    expect(hasAdjacentRepeat(all)).toBe(false)

    const onlyExercises = await buildPracticeSession(
      [a, b],
      { lessonIds: ['mat-a', 'mat-b'], includeCards: false, includeExercises: true, size: 4 },
      seeded(),
      database,
    )
    expect(onlyExercises).toHaveLength(4)
    expect(onlyExercises.every((i) => i.kind === 'exercise')).toBe(true)
  })

  it('las respuestas de práctica se registran pero no cambian la programación', async () => {
    const a = lesson('mat-a')
    await addSuggestedCards(a, 'Mate', undefined, database)
    const card = (await database.cards.toArray())[0]
    await logPracticeAnswer(card.id, 1, database)
    expect(await database.reviewLogs.where('mode').equals('practice').count()).toBe(1)
    expect(await database.cards.get(card.id)).toEqual(card)
  })
})
