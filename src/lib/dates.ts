// Utilidades de fechas relacionadas con el "día de estudio".
//
// Un día de estudio no empieza a medianoche sino a la hora configurada
// (por defecto 4 a.m.). Todo se calcula en la hora local del dispositivo.

/** Devuelve "AAAA-MM-DD" del día de estudio al que pertenece `date`. */
export function studyDayKey(date: Date, dayStartHour: number): string {
  // Restamos las horas de corte: las 2 a.m. del martes pasan a ser las 22 h del lunes.
  const shifted = new Date(date.getTime())
  shifted.setHours(shifted.getHours() - dayStartHour)
  const y = shifted.getFullYear()
  const m = String(shifted.getMonth() + 1).padStart(2, '0')
  const d = String(shifted.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Momento en que empieza el día de estudio que contiene `date`. */
export function startOfStudyDay(date: Date, dayStartHour: number): Date {
  const start = new Date(date.getTime())
  start.setHours(dayStartHour, 0, 0, 0)
  // Si todavía no llegó la hora de corte, el día de estudio empezó ayer.
  if (date < start) start.setDate(start.getDate() - 1)
  return start
}

/** Momento en que termina (exclusivo) el día de estudio que contiene `date`. */
export function endOfStudyDay(date: Date, dayStartHour: number): Date {
  const end = startOfStudyDay(date, dayStartHour)
  end.setDate(end.getDate() + 1)
  return end
}
