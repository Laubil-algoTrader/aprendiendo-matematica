// Importar tarjetas desde un archivo CSV (una planilla guardada como texto).
//
// Formato: tres columnas, en este orden:
//   frente, dorso, etiquetas
// - La primera fila puede ser un encabezado ("frente,dorso,etiquetas"): se saltea.
// - Las etiquetas van separadas por espacios (ej. "algebra inecuaciones").
// - El separador puede ser coma o punto y coma (Excel en español suele usar ";").
// - Si el frente tiene huecos {{c1::...}}, la tarjeta se importa como cloze.
// - Textos con comas, comillas o saltos de línea van entre comillas dobles,
//   como hace cualquier planilla al exportar.

import Papa from 'papaparse'
import { db, type StudyDB } from '../db/db'
import { clozeOrdinals } from '../srs/cloze'
import { createNotes, parseTags, validateNote } from '../srs/notes'
import type { CardType } from '../types/user-data'

export interface CsvRow {
  /** Número de fila en el archivo (empezando en 1), para los mensajes. */
  line: number
  type: CardType
  front: string
  back: string
  tags: string[]
}

export interface CsvProblem {
  line: number
  message: string
}

export interface CsvParseResult {
  rows: CsvRow[]
  problems: CsvProblem[]
}

const HEADER_WORDS = new Set(['frente', 'front', 'pregunta'])

export function parseCsvNotes(text: string): CsvParseResult {
  // Algunos programas agregan un carácter invisible (BOM) al principio: lo quitamos.
  const clean = text.replace(/^﻿/, '')
  const parsed = Papa.parse<string[]>(clean, { skipEmptyLines: 'greedy', delimitersToGuess: [',', ';', '\t'] })

  const rows: CsvRow[] = []
  const problems: CsvProblem[] = parsed.errors.map((e) => ({
    line: (e.row ?? 0) + 1,
    message: `formato CSV: ${e.message}`,
  }))

  parsed.data.forEach((cells, index) => {
    const line = index + 1
    const [rawFront = '', rawBack = '', rawTags = '', ...extra] = cells.map((c) => c.trim())
    if (index === 0 && HEADER_WORDS.has(rawFront.toLowerCase())) return // encabezado
    if (extra.some((c) => c !== '')) {
      problems.push({ line, message: 'tiene más de 3 columnas (¿falta poner comillas a un texto con comas?)' })
      return
    }
    const type: CardType = clozeOrdinals(rawFront).length > 0 ? 'cloze' : 'basic'
    const error = validateNote({ type, front: rawFront, back: rawBack })
    if (error) {
      problems.push({ line, message: error })
      return
    }
    rows.push({ line, type, front: rawFront, back: rawBack, tags: parseTags(rawTags) })
  })

  return { rows, problems }
}

/**
 * Agrega las filas como notas del mazo indicado, en una sola operación.
 * Con `skipDuplicates`, saltea las filas cuyo frente ya existe en ese mazo
 * (útil si importás dos veces el mismo archivo).
 */
export async function importCsvRows(
  rows: CsvRow[],
  deckId: string,
  skipDuplicates: boolean,
  database: StudyDB = db,
): Promise<{ added: number; skipped: number }> {
  const existing = skipDuplicates
    ? new Set((await database.notes.where('deckId').equals(deckId).toArray()).map((n) => n.front.trim()))
    : new Set<string>()
  const toAdd: CsvRow[] = []
  for (const row of rows) {
    if (existing.has(row.front)) continue
    if (skipDuplicates) existing.add(row.front) // también evita repetidas dentro del mismo archivo
    toAdd.push(row)
  }
  await createNotes(
    toAdd.map((r) => ({ deckId, type: r.type, front: r.front, back: r.back, tags: r.tags, source: { kind: 'csv' as const } })),
    database,
  )
  return { added: toAdd.length, skipped: rows.length - toAdd.length }
}
