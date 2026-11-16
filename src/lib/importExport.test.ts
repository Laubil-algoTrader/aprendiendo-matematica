import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { newId, StudyDB } from '../db/db'
import { updateSettings } from '../db/settings'
import { createMistake } from '../mistakes/mistakes'
import { createDeck, createNote } from '../srs/notes'
import { gradeCard } from '../srs/queue'
import { exportBackup, parseBackup, restoreBackup, serializeBackup } from './backup'
import { importCsvRows, parseCsvNotes } from './csv'

describe('CSV', () => {
  it('lee frente, dorso y etiquetas, salteando el encabezado', () => {
    const { rows, problems } = parseCsvNotes('frente,dorso,etiquetas\n¿2+2?,4,aritmetica basica\n"Con, coma","Dorso ""citado""",\n')
    expect(problems).toEqual([])
    expect(rows).toEqual([
      { line: 2, type: 'basic', front: '¿2+2?', back: '4', tags: ['aritmetica', 'basica'] },
      { line: 3, type: 'basic', front: 'Con, coma', back: 'Dorso "citado"', tags: [] },
    ])
  })

  it('acepta punto y coma como separador y detecta cloze', () => {
    const { rows } = parseCsvNotes('La capital es {{c1::Mendoza}};;geo\nP;R;')
    expect(rows.map((r) => r.type)).toEqual(['cloze', 'basic'])
    expect(rows[0].tags).toEqual(['geo'])
  })

  it('acepta textos de varias líneas y fórmulas', () => {
    const { rows } = parseCsvNotes('"Línea 1\nLínea 2","$\\frac{a}{b}$",')
    expect(rows[0].front).toBe('Línea 1\nLínea 2')
    expect(rows[0].back).toBe('$\\frac{a}{b}$')
  })

  it('informa filas con problemas sin frenar el resto', () => {
    const { rows, problems } = parseCsvNotes('ok,bien,\n,sin frente,\nsolo frente\na,b,c,d\n')
    expect(rows).toHaveLength(1)
    expect(problems.map((p) => p.line)).toEqual([2, 3, 4])
    expect(problems[0].message).toMatch('frente')
    expect(problems[1].message).toMatch('dorso')
    expect(problems[2].message).toMatch('columnas')
  })

  it('ignora el BOM y las líneas vacías', () => {
    expect(parseCsvNotes('﻿a,b,\n\n\nc,d,\n').rows).toHaveLength(2)
  })
})

describe('importar filas de CSV', () => {
  let database: StudyDB
  beforeEach(() => {
    database = new StudyDB(`test-${newId()}`)
  })
  afterEach(async () => {
    await database.delete()
  })

  it('agrega las notas y saltea duplicadas si se pide', async () => {
    const deck = await createDeck('Importado', database)
    const { rows } = parseCsvNotes('P1,R1,\nP2,R2,\nP1,otra,\nCon {{c1::hueco}} y {{c2::otro}},,')
    expect(await importCsvRows(rows, deck.id, true, database)).toEqual({ added: 3, skipped: 1 })
    expect(await importCsvRows(rows, deck.id, true, database)).toEqual({ added: 0, skipped: 4 })
    expect(await database.cards.count()).toBe(4) // la cloze genera 2
    const note = await database.notes.where('deckId').equals(deck.id).first()
    expect(note?.source).toEqual({ kind: 'csv' })
    expect(await importCsvRows(rows, deck.id, false, database)).toEqual({ added: 4, skipped: 0 })
  })
})

describe('backup JSON', () => {
  let source: StudyDB
  let target: StudyDB
  beforeEach(() => {
    source = new StudyDB(`test-${newId()}`)
    target = new StudyDB(`test-${newId()}`)
  })
  afterEach(async () => {
    await source.delete()
    await target.delete()
  })

  async function fillSource() {
    const deck = await createDeck('Mate', source)
    const note = await createNote({ deckId: deck.id, type: 'basic-reversed', front: 'A', back: 'B', tags: ['t'] }, source)
    const card = (await source.cards.where('noteId').equals(note.id).first())!
    await gradeCard(card.id, 3, source, new Date('2026-11-16T12:00:00Z'))
    await source.lessonProgress.put({ lessonId: 'mat-x', status: 'completed', updatedAt: new Date() })
    await createMistake({ topic: 'T', cause: 'unidades', statement: 's', whatIDid: 'w', correction: 'c' }, source)
    await updateSettings({ newCardsPerDay: 30 }, source)
  }

  it('exportar → importar deja exactamente los mismos datos, con fechas reales', async () => {
    await fillSource()
    const text = serializeBackup(await exportBackup(source))

    await createDeck('Algo viejo que se reemplaza', target)
    await restoreBackup(parseBackup(text), target)

    for (const name of ['decks', 'notes', 'cards', 'reviewLogs', 'lessonProgress', 'mistakes', 'settings']) {
      expect(await target.table(name).toArray()).toEqual(await source.table(name).toArray())
    }
    const card = (await target.cards.toArray()).find((c) => c.fsrs.reps === 1)!
    expect(card.fsrs.dueAt).toBeInstanceOf(Date)
    // Se puede seguir repasando con los datos importados.
    await gradeCard(card.id, 3, target, new Date('2026-12-01T12:00:00Z'))
  })

  it('rechaza archivos que no son backups', () => {
    expect(() => parseBackup('no es json')).toThrow('JSON')
    expect(() => parseBackup('{"app":"otra"}')).toThrow('no es un backup')
    expect(() => parseBackup('{"app":"app-estudiar","version":99,"tables":{}}')).toThrow('más nueva')
    expect(() => parseBackup('{"app":"app-estudiar","version":1,"tables":{"cards":"x"}}')).toThrow('dañada')
  })

  it('si la importación falla a la mitad, no se pierde nada', async () => {
    await createDeck('Mío', target)
    // Dos mazos con el mismo id: bulkAdd falla y la operación completa se deshace.
    const broken = parseBackup(
      serializeBackup({
        app: 'app-estudiar',
        version: 1,
        exportedAt: new Date(),
        tables: {
          decks: [
            { id: 'x', name: 'A', createdAt: new Date() },
            { id: 'x', name: 'B', createdAt: new Date() },
          ],
          notes: [],
          cards: [],
          reviewLogs: [],
          lessonProgress: [],
          mistakes: [],
          settings: [],
        },
      }),
    )
    await expect(restoreBackup(broken, target)).rejects.toThrow()
    expect((await target.decks.toArray()).map((d) => d.name)).toEqual(['Mío'])
  })
})
