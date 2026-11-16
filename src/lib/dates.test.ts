import { describe, expect, it } from 'vitest'
import { endOfStudyDay, startOfStudyDay, studyDayKey } from './dates'

// Las fechas se crean con new Date(año, mes-1, día, hora) => hora LOCAL,
// así los tests dan lo mismo en cualquier zona horaria.

describe('studyDayKey', () => {
  it('después de la hora de corte cuenta para el mismo día', () => {
    expect(studyDayKey(new Date(2026, 10, 17, 10, 0), 4)).toBe('2026-11-17')
  })

  it('antes de la hora de corte cuenta para el día anterior', () => {
    expect(studyDayKey(new Date(2026, 10, 17, 1, 30), 4)).toBe('2026-11-16')
  })

  it('con corte a medianoche se comporta como el calendario', () => {
    expect(studyDayKey(new Date(2026, 10, 17, 0, 5), 0)).toBe('2026-11-17')
  })

  it('cruza fin de año correctamente', () => {
    expect(studyDayKey(new Date(2027, 0, 1, 3, 0), 4)).toBe('2026-12-31')
  })
})

describe('inicio y fin del día de estudio', () => {
  it('a las 10 h el día empezó hoy a las 4 h y termina mañana a las 4 h', () => {
    const now = new Date(2026, 10, 17, 10, 0)
    expect(startOfStudyDay(now, 4)).toEqual(new Date(2026, 10, 17, 4, 0))
    expect(endOfStudyDay(now, 4)).toEqual(new Date(2026, 10, 18, 4, 0))
  })

  it('a las 2 h el día empezó ayer a las 4 h', () => {
    const now = new Date(2026, 10, 17, 2, 0)
    expect(startOfStudyDay(now, 4)).toEqual(new Date(2026, 10, 16, 4, 0))
  })
})
