// Backup completo de tus datos en un archivo JSON.
//
// Exportar: guarda TODAS las tablas (mazos, notas, tarjetas, historial,
// progreso, errores y ajustes) en un archivo que podés descargar.
// Importar: REEMPLAZA todo lo que hay en este navegador por el contenido del
// archivo. Sirve para pasar tus datos a otra computadora o al celular, o para
// recuperarlos si borrás los datos del navegador.
//
// Las fechas se guardan como {"$date": "2026-11-16T10:00:00.000Z"} para poder
// convertirlas de vuelta en fechas reales al importar (JSON no tiene fechas).

import { db, type StudyDB } from '../db/db'

export const BACKUP_APP = 'app-estudiar'
export const BACKUP_VERSION = 1

/** Tablas que se incluyen en el backup, en el orden en que se restauran. */
const TABLES = ['decks', 'notes', 'cards', 'reviewLogs', 'lessonProgress', 'mistakes', 'settings'] as const
type TableName = (typeof TABLES)[number]

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: Date
  tables: Record<TableName, unknown[]>
}

export async function exportBackup(database: StudyDB = db, now = new Date()): Promise<BackupFile> {
  const tables = {} as BackupFile['tables']
  await database.transaction('r', TABLES.map((t) => database.table(t)), async () => {
    for (const name of TABLES) tables[name] = await database.table(name).toArray()
  })
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now, tables }
}

/** Convierte el backup en texto JSON (con las fechas marcadas). */
export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(
    backup,
    function (this: Record<string, unknown>, key, value) {
      // `this[key]` es el valor original (antes de que Date se convierta en texto).
      const original = this[key]
      return original instanceof Date ? { $date: original.toISOString() } : value
    },
    2,
  )
}

/** Lee el texto de un archivo de backup y verifica que tenga el formato correcto. */
export function parseBackup(text: string): BackupFile {
  let data: unknown
  try {
    data = JSON.parse(text, (_key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && typeof value.$date === 'string') {
        const date = new Date(value.$date)
        if (Number.isNaN(date.getTime())) throw new Error(`fecha inválida: ${value.$date}`)
        return date
      }
      return value
    })
  } catch (e) {
    throw new Error(`El archivo no es un JSON válido (${(e as Error).message}).`)
  }

  const file = data as Partial<BackupFile> | null
  if (!file || file.app !== BACKUP_APP) {
    throw new Error('Este archivo no es un backup de esta app.')
  }
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) {
    throw new Error('El backup es de una versión más nueva de la app. Actualizá la app antes de importarlo.')
  }
  if (!file.tables || typeof file.tables !== 'object') throw new Error('Al backup le faltan los datos.')
  for (const name of TABLES) {
    const rows = (file.tables as Record<string, unknown>)[name]
    if (rows === undefined) continue // tabla vacía o de una versión anterior
    if (!Array.isArray(rows) || rows.some((r) => !r || typeof r !== 'object')) {
      throw new Error(`La tabla "${name}" del backup está dañada.`)
    }
  }
  return file as BackupFile
}

/** Cuántos registros trae cada tabla (para mostrar antes de confirmar). */
export function backupSummary(backup: BackupFile): Record<TableName, number> {
  const out = {} as Record<TableName, number>
  for (const name of TABLES) out[name] = backup.tables[name]?.length ?? 0
  return out
}

/**
 * Reemplaza TODOS los datos por los del backup. Se hace en una sola operación:
 * si algo falla a la mitad, no se borra nada.
 */
export async function restoreBackup(backup: BackupFile, database: StudyDB = db): Promise<void> {
  await database.transaction('rw', TABLES.map((t) => database.table(t)), async () => {
    for (const name of TABLES) {
      await database.table(name).clear()
      const rows = backup.tables[name] ?? []
      if (rows.length > 0) await database.table(name).bulkAdd(rows)
    }
  })
}

/** Hace que el navegador descargue un archivo de texto. */
export function downloadText(filename: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
