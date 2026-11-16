// Racha de días de estudio.
//
// Un día "cuenta" como estudiado si ese día de estudio (que empieza a la hora
// configurada, por defecto 4 a.m.) hiciste al menos una de estas cosas:
//   - repasaste una tarjeta (repaso normal o práctica intercalada), o
//   - completaste una lección.
//
// La racha no se guarda: se calcula cada vez a partir del historial, así
// nunca queda desincronizada.

import { db, type StudyDB } from '../db/db'
import { studyDayKey } from '../lib/dates'

/** Claves "AAAA-MM-DD" de todos los días con actividad. */
export async function studyDays(dayStartHour: number, database: StudyDB = db): Promise<Set<string>> {
  const days = new Set<string>()
  // Recorremos solo el campo de fecha (índice), sin cargar los registros completos.
  await database.reviewLogs.orderBy('reviewedAt').eachKey((key) => {
    days.add(studyDayKey(key as Date, dayStartHour))
  })
  const completed = await database.lessonProgress.where('status').equals('completed').toArray()
  for (const p of completed) days.add(studyDayKey(p.updatedAt, dayStartHour))
  return days
}

/** Día anterior a una clave "AAAA-MM-DD" (al mediodía, para esquivar cambios de horario). */
export function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d - 1, 12)
  return studyDayKey(date, 0)
}

export interface StreakInfo {
  /** Días seguidos hasta hoy (o hasta ayer, si hoy todavía no estudiaste). */
  current: number
  /** La racha más larga de la historia. */
  best: number
  studiedToday: boolean
  /** Los últimos 7 días, del más viejo a hoy, con si hubo actividad. */
  lastWeek: { key: string; studied: boolean }[]
}

export function computeStreak(days: ReadonlySet<string>, now: Date, dayStartHour: number): StreakInfo {
  const today = studyDayKey(now, dayStartHour)
  const studiedToday = days.has(today)

  // Racha actual: si hoy no estudiaste todavía, la racha sigue viva hasta que termine el día.
  let current = 0
  let key = studiedToday ? today : previousDayKey(today)
  while (days.has(key)) {
    current++
    key = previousDayKey(key)
  }

  // Mejor racha: buscamos cadenas de días consecutivos.
  let best = 0
  for (const d of days) {
    if (days.has(previousDayKey(d))) continue // no es el comienzo de una cadena
    let length = 0
    let k = d
    while (days.has(k)) {
      length++
      // siguiente día
      const [y, m, dd] = k.split('-').map(Number)
      k = studyDayKey(new Date(y, m - 1, dd + 1, 12), 0)
    }
    best = Math.max(best, length)
  }

  const lastWeek: StreakInfo['lastWeek'] = []
  let w = today
  for (let i = 0; i < 7; i++) {
    lastWeek.unshift({ key: w, studied: days.has(w) })
    w = previousDayKey(w)
  }

  return { current, best, studiedToday, lastWeek }
}

/** Cuántas tarjetas repasaste en el día de estudio actual. */
export async function reviewsToday(dayStart: Date, database: StudyDB = db): Promise<number> {
  return database.reviewLogs.where('reviewedAt').aboveOrEqual(dayStart).count()
}
