// Ajustes del usuario: leer, guardar y escuchar cambios.

import { useLiveQuery } from 'dexie-react-hooks'
import type { Settings } from '../types/user-data'
import { db, type StudyDB } from './db'

export const DEFAULT_SETTINGS: Settings = {
  newCardsPerDay: 15,
  dayStartHour: 4,
  theme: 'system',
}

/** Completa lo guardado con los valores por defecto (por si falta algún campo). */
function withDefaults(row: Partial<Settings> | undefined): Settings {
  return {
    newCardsPerDay: row?.newCardsPerDay ?? DEFAULT_SETTINGS.newCardsPerDay,
    dayStartHour: row?.dayStartHour ?? DEFAULT_SETTINGS.dayStartHour,
    theme: row?.theme ?? DEFAULT_SETTINGS.theme,
  }
}

export async function getSettings(database: StudyDB = db): Promise<Settings> {
  return withDefaults(await database.settings.get('app'))
}

/** Guarda solo los campos indicados, validando que tengan sentido. */
export async function updateSettings(
  changes: Partial<Settings>,
  database: StudyDB = db,
): Promise<Settings> {
  const current = await getSettings(database)
  const next = withDefaults({ ...current, ...changes })

  if (!Number.isInteger(next.newCardsPerDay) || next.newCardsPerDay < 0 || next.newCardsPerDay > 9999) {
    throw new Error('El límite de tarjetas nuevas debe ser un número entero entre 0 y 9999.')
  }
  if (!Number.isInteger(next.dayStartHour) || next.dayStartHour < 0 || next.dayStartHour > 23) {
    throw new Error('La hora de inicio del día debe estar entre 0 y 23.')
  }

  await database.settings.put({ id: 'app', ...next })
  return next
}

/**
 * Hook de React: devuelve los ajustes y re-dibuja el componente cuando cambian.
 * Mientras carga devuelve los valores por defecto.
 */
export function useSettings(): Settings {
  const row = useLiveQuery(() => db.settings.get('app'), [])
  return withDefaults(row)
}
