// Tests del contenido: el formato de los archivos, el grafo y las tarjetas sugeridas.
//
// El primer test revisa el contenido REAL de /content: si alguien agrega una
// lección con un error de formato, este test falla y explica qué arreglar.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { newId, StudyDB } from '../db/db'
import type { Lesson } from '../types/content'
import { content } from './index'
import { isUnlocked, missingPrerequisites, nextLesson, routeProgress } from './graph'
import { findCycle, parseContent, splitFrontmatter } from './parse'
import { addedSuggestionIds, addSuggestedCards } from './suggested'

describe('contenido real de /content', () => {
  it('no tiene errores de formato', () => {
    const report = content.errors.map((e) => `${e.file}: ${e.message}`).join('\n')
    expect(report).toBe('')
  })

  it('tiene al menos una ruta con lecciones', () => {
    expect(content.routes.length).toBeGreaterThan(0)
    expect(content.lessons.size).toBeGreaterThan(0)
  })
})

// --- Archivos de ejemplo para probar el lector ---

const ROUTE = `
id: demo
titulo: Ruta demo
descripcion: Para tests
modulos:
  - id: mate
    titulo: Matemática
    lecciones: [uno, dos]
  - id: vacio
    titulo: Próximamente
`

function lessonFile(id: string, extra = '') {
  return `---
id: ${id}
titulo: Lección ${id}
${extra}
---
Notas de **${id}**.`
}

describe('parseContent', () => {
  it('lee una ruta válida con sus módulos y lecciones', () => {
    const result = parseContent({
      '/content/rutas/demo/ruta.yaml': ROUTE,
      '/content/rutas/demo/mate/uno.md': lessonFile('l-uno'),
      '/content/rutas/demo/mate/dos.md': lessonFile(
        'l-dos',
        `prerrequisitos: [l-uno]
recursos:
  - tipo: video
    titulo: Un video
    url: https://www.youtube.com/watch?v=abc
    fuente: Canal
    idioma: es
    duracion: 8
tarjetas:
  - id: t1
    frente: Pregunta
    dorso: Respuesta
  - id: t2
    tipo: cloze
    frente: "La raíz de 4 es {{c1::2}}"`,
      ),
    })
    expect(result.errors).toEqual([])
    const [route] = result.routes
    expect(route.modules.map((m) => m.lessons.length)).toEqual([2, 0])
    const dos = result.lessons.get('l-dos')!
    expect(dos.notes).toBe('Notas de **l-dos**.')
    expect(dos.resources[0]).toMatchObject({ type: 'video', durationMin: 8, source: 'Canal' })
    expect(dos.suggestedCards.map((c) => c.type)).toEqual(['basic', 'cloze'])
  })

  it('explica los errores con el archivo y el campo', () => {
    const result = parseContent({
      '/content/rutas/demo/ruta.yaml': ROUTE,
      '/content/rutas/demo/mate/uno.md': lessonFile('l-uno', 'objetivoss: [typo]'),
      '/content/rutas/demo/mate/dos.md': lessonFile(
        'l-dos',
        `prerrequisitos: [no-existe]
recursos:
  - tipo: video
    titulo: X
    url: www.sin-protocolo.com
    fuente: Y
    idioma: es`,
      ),
      '/content/rutas/demo/mate/huerfana.md': lessonFile('l-tres'),
    })
    const messages = result.errors.map((e) => `${e.file} | ${e.message}`)
    expect(messages.some((m) => m.includes('uno.md') && m.includes('objetivoss'))).toBe(true)
    expect(messages.some((m) => m.includes('recursos.0.url'))).toBe(true)
    expect(messages.some((m) => m.includes('huerfana.md') && m.includes('ruta.yaml'))).toBe(true)
  })

  it('detecta ids duplicados, lecciones faltantes y cloze sin huecos', () => {
    const result = parseContent({
      '/content/rutas/demo/ruta.yaml': ROUTE.replace('[uno, dos]', '[uno, dos, tres]'),
      '/content/rutas/demo/mate/uno.md': lessonFile('mismo'),
      '/content/rutas/demo/mate/dos.md': lessonFile(
        'mismo',
        `tarjetas:
  - id: t1
    tipo: cloze
    frente: sin huecos`,
      ),
    })
    const all = result.errors.map((e) => e.message).join('\n')
    expect(all).toMatch('ya se usa')
    expect(all).toMatch('falta el archivo')
  })

  it('separa el frontmatter aunque el archivo use saltos de línea de Windows', () => {
    expect(splitFrontmatter('---\r\nid: a\r\n---\r\nCuerpo')).toEqual({ data: 'id: a', body: 'Cuerpo' })
    expect(splitFrontmatter('sin frontmatter')).toBeNull()
  })
})

// --- Grafo ---

function mkLesson(id: string, prerequisites: string[] = [], moduleId = 'm'): Lesson {
  return {
    id,
    routeId: 'r',
    moduleId,
    title: id,
    objectives: [],
    prerequisites,
    resources: [],
    notes: '',
    exercises: [],
    suggestedCards: [],
  }
}

describe('grafo de prerrequisitos', () => {
  // a ← b ← c   y   a ← d
  const a = mkLesson('a')
  const b = mkLesson('b', ['a'])
  const c = mkLesson('c', ['b'])
  const d = mkLesson('d', ['a'])
  const lessons = new Map([a, b, c, d].map((l) => [l.id, l]))
  const route = { id: 'r', title: 'R', description: '', modules: [{ id: 'm', title: 'M', lessons: [a, b, c, d] }] }

  it('sin progreso solo está desbloqueada la lección sin prerrequisitos', () => {
    const none = new Map()
    expect([a, b, c, d].filter((l) => isUnlocked(l, none)).map((l) => l.id)).toEqual(['a'])
  })

  it('lista los prerrequisitos faltantes en orden de estudio', () => {
    expect(missingPrerequisites('c', lessons, new Map())).toEqual(['a', 'b'])
    expect(missingPrerequisites('c', lessons, new Map([['a', 'completed']]))).toEqual(['b'])
    // "vista" no alcanza: hay que completarla
    expect(missingPrerequisites('b', lessons, new Map([['a', 'seen']]))).toEqual(['a'])
  })

  it('sugiere la próxima lección y prioriza la que está empezada', () => {
    expect(nextLesson(route, new Map())?.id).toBe('a')
    expect(nextLesson(route, new Map([['a', 'completed']]))?.id).toBe('b')
    expect(nextLesson(route, new Map([['a', 'completed'], ['d', 'seen']]))?.id).toBe('d')
    const all = new Map([a, b, c, d].map((l) => [l.id, 'completed' as const]))
    expect(nextLesson(route, all)).toBeNull()
  })

  it('calcula el porcentaje completado', () => {
    expect(routeProgress(route, new Map([['a', 'completed'], ['b', 'seen']]))).toEqual({
      completed: 1,
      seen: 1,
      total: 4,
      percent: 25,
    })
  })

  it('detecta ciclos', () => {
    const cyc = new Map([
      ['x', mkLesson('x', ['y'])],
      ['y', mkLesson('y', ['z'])],
      ['z', mkLesson('z', ['x'])],
    ])
    expect(findCycle(cyc)).toEqual(['x', 'y', 'z', 'x'])
    expect(findCycle(lessons)).toBeNull()
  })
})

// --- Tarjetas sugeridas ---

describe('tarjetas sugeridas', () => {
  let database: StudyDB
  beforeEach(() => {
    database = new StudyDB(`test-${newId()}`)
  })
  afterEach(async () => {
    await database.delete()
  })

  const lesson: Lesson = {
    ...mkLesson('mat-x'),
    suggestedCards: [
      { id: 'c1', type: 'basic', front: 'P1', back: 'R1', tags: ['algebra'] },
      { id: 'c2', type: 'basic-reversed', front: 'P2', back: 'R2' },
    ],
  }

  it('agrega al mazo del módulo, etiqueta con la lección y no duplica', async () => {
    expect(await addSuggestedCards(lesson, 'Matemática', undefined, database)).toBe(2)
    expect(await addSuggestedCards(lesson, 'Matemática', undefined, database)).toBe(0)
    expect(await database.notes.count()).toBe(2)
    expect(await database.cards.count()).toBe(3) // la invertida genera 2
    const decks = await database.decks.toArray()
    expect(decks.map((d) => d.name)).toEqual(['Matemática'])
    const note = await database.notes.where('source.lessonId').equals('mat-x').first()
    expect(note?.tags).toContain('mat-x')
    expect(await addedSuggestionIds('mat-x', database)).toEqual(new Set(['c1', 'c2']))
  })

  it('puede agregar una sola tarjeta', async () => {
    await addSuggestedCards(lesson, 'Matemática', [lesson.suggestedCards[1]], database)
    expect(await addedSuggestionIds('mat-x', database)).toEqual(new Set(['c2']))
  })
})
