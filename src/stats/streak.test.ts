import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { newId, StudyDB } from '../db/db'
import { computeStreak, previousDayKey, studyDays } from './streak'

const set = (...keys: string[]) => new Set(keys)
// "Hoy" = martes 17/11/2026 a las 10 h (hora local).
const NOW = new Date(2026, 10, 17, 10, 0)

describe('computeStreak', () => {
  it('cuenta días seguidos hasta hoy', () => {
    const s = computeStreak(set('2026-11-15', '2026-11-16', '2026-11-17'), NOW, 4)
    expect(s).toMatchObject({ current: 3, best: 3, studiedToday: true })
  })

  it('si hoy todavía no estudiaste, la racha de ayer sigue viva', () => {
    const s = computeStreak(set('2026-11-15', '2026-11-16'), NOW, 4)
    expect(s).toMatchObject({ current: 2, studiedToday: false })
  })

  it('un día sin estudiar corta la racha', () => {
    const s = computeStreak(set('2026-11-10', '2026-11-11', '2026-11-12', '2026-11-15'), NOW, 4)
    expect(s.current).toBe(0)
    expect(s.best).toBe(3)
  })

  it('a la 1 a.m. todavía cuenta como el día anterior', () => {
    const lateNight = new Date(2026, 10, 18, 1, 0)
    expect(computeStreak(set('2026-11-17'), lateNight, 4)).toMatchObject({ current: 1, studiedToday: true })
  })

  it('la última semana tiene 7 días terminando hoy', () => {
    const s = computeStreak(set('2026-11-17', '2026-11-12'), NOW, 4)
    expect(s.lastWeek.map((d) => d.key)).toEqual([
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
    ])
    expect(s.lastWeek.filter((d) => d.studied).map((d) => d.key)).toEqual(['2026-11-12', '2026-11-17'])
  })

  it('cruza cambios de mes y de año', () => {
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28')
    expect(previousDayKey('2027-01-01')).toBe('2026-12-31')
    const s = computeStreak(set('2026-12-31', '2027-01-01'), new Date(2027, 0, 1, 12), 4)
    expect(s.current).toBe(2)
  })

  it('sin actividad todo es cero', () => {
    expect(computeStreak(set(), NOW, 4)).toMatchObject({ current: 0, best: 0, studiedToday: false })
  })
})

describe('studyDays', () => {
  let database: StudyDB
  beforeEach(() => {
    database = new StudyDB(`test-${newId()}`)
  })
  afterEach(async () => {
    await database.delete()
  })

  it('junta los días con repasos y con lecciones completadas (no las solo vistas)', async () => {
    await database.reviewLogs.bulkAdd([
      { id: 'a', cardId: 'c', grade: 3, reviewedAt: new Date(2026, 10, 16, 20), mode: 'scheduled' },
      { id: 'b', cardId: 'c', grade: 3, reviewedAt: new Date(2026, 10, 17, 2), mode: 'practice' }, // madrugada → día 16
    ])
    await database.lessonProgress.bulkAdd([
      { lessonId: 'x', status: 'completed', updatedAt: new Date(2026, 10, 14, 10) },
      { lessonId: 'y', status: 'seen', updatedAt: new Date(2026, 10, 13, 10) },
    ])
    expect([...(await studyDays(4, database))].sort()).toEqual(['2026-11-14', '2026-11-16'])
  })
})
