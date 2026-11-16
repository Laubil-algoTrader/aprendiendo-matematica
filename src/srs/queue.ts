// Cola diaria de repaso y registro de calificaciones.
//
// Qué entra en la cola de HOY (sin contar tarjetas suspendidas):
//   1. Tarjetas "en aprendizaje" (las que fallaste o recién empezaste) cuya
//      hora ya llegó. Ej.: tocaste "Otra vez" y FSRS la programó a 1 minuto.
//   2. Tarjetas "de repaso" que vencen en algún momento del día de estudio de hoy.
//   3. Tarjetas nuevas, hasta completar el límite diario (default 15) menos
//      las nuevas que ya empezaste hoy.
//
// Además, si una nota tiene varias tarjetas (ej. directa e invertida), solo se
// presenta UNA tarjeta nueva de esa nota por día, para que la otra no te
// "regale" la respuesta.

import { State } from 'ts-fsrs'
import { db, newId, type StudyDB } from '../db/db'
import { getSettings } from '../db/settings'
import { endOfStudyDay, startOfStudyDay } from '../lib/dates'
import type { Card, Grade, Note, ReviewLog, Settings } from '../types/user-data'
import { getScheduler } from './scheduler'

/** Si no queda nada más, mostramos antes de tiempo las de aprendizaje que vencen en este margen. */
export const LEARN_AHEAD_MINUTES = 20

const isLearning = (c: Card) => c.fsrs.state === State.Learning || c.fsrs.state === State.Relearning

export interface QueueOptions {
  /** Repasar solo un mazo (si se omite, todos). */
  deckId?: string
  now?: Date
  settings?: Settings
}

export interface DailyQueue {
  /** Tarjeta a mostrar ahora (o null si terminaste). */
  next: Card | null
  /** Contadores de lo que falta hoy, para mostrar arriba de la tarjeta. */
  counts: { learning: number; review: number; new: number }
  /** Tarjetas en aprendizaje que vuelven más tarde hoy (para el mensaje final). */
  laterToday: number
}

/** Cuántas tarjetas NUEVAS ya se empezaron en este día de estudio, y de qué notas. */
async function newStartedToday(database: StudyDB, dayStart: Date) {
  const logs = await database.reviewLogs.where('reviewedAt').aboveOrEqual(dayStart).toArray()
  const scheduled = logs.filter((l) => l.mode === 'scheduled')
  const newCardIds = new Set(scheduled.filter((l) => l.fsrs?.state === State.New).map((l) => l.cardId))
  const reviewedCardIds = new Set(scheduled.map((l) => l.cardId))
  return { newCount: newCardIds.size, reviewedCardIds }
}

export async function getDailyQueue(options: QueueOptions = {}, database: StudyDB = db): Promise<DailyQueue> {
  const now = options.now ?? new Date()
  const settings = options.settings ?? (await getSettings(database))
  const dayStart = startOfStudyDay(now, settings.dayStartHour)
  const dayEnd = endOfStudyDay(now, settings.dayStartHour)

  const all = options.deckId
    ? await database.cards.where('deckId').equals(options.deckId).toArray()
    : await database.cards.toArray()
  const active = all.filter((c) => !c.suspended)

  const byDue = (a: Card, b: Card) => a.fsrs.dueAt.getTime() - b.fsrs.dueAt.getTime()

  const learningAll = active.filter(isLearning).sort(byDue)
  const learningDue = learningAll.filter((c) => c.fsrs.dueAt <= now)
  const learningLater = learningAll.filter((c) => c.fsrs.dueAt > now && c.fsrs.dueAt < dayEnd)
  const reviewDue = active.filter((c) => c.fsrs.state === State.Review && c.fsrs.dueAt < dayEnd).sort(byDue)

  // Nuevas: respetamos el límite diario y no mostramos dos hermanas el mismo día.
  const { newCount, reviewedCardIds } = await newStartedToday(database, dayStart)
  const remainingNew = Math.max(0, settings.newCardsPerDay - newCount)
  const notesSeenToday = new Set(all.filter((c) => reviewedCardIds.has(c.id)).map((c) => c.noteId))
  const newCandidates = await sortNewCards(
    active.filter((c) => c.fsrs.state === State.New),
    database,
  )
  const newToday: Card[] = []
  for (const card of newCandidates) {
    if (newToday.length >= remainingNew) break
    if (notesSeenToday.has(card.noteId)) continue
    notesSeenToday.add(card.noteId)
    newToday.push(card)
  }

  // Orden de presentación: aprendizaje vencido → repasos → nuevas.
  // Si no queda nada, adelantamos una de aprendizaje si vence en pocos minutos.
  const aheadLimit = new Date(now.getTime() + LEARN_AHEAD_MINUTES * 60_000)
  const learnAhead = learningLater.find((c) => c.fsrs.dueAt <= aheadLimit) ?? null
  const next = learningDue[0] ?? reviewDue[0] ?? newToday[0] ?? learnAhead

  return {
    next,
    counts: {
      learning: learningDue.length + (next === learnAhead && learnAhead ? 1 : 0),
      review: reviewDue.length,
      new: newToday.length,
    },
    laterToday: learningLater.length - (next === learnAhead && learnAhead ? 1 : 0),
  }
}

/** Las nuevas se presentan en el orden en que se crearon sus notas (y por número de tarjeta). */
async function sortNewCards(cards: Card[], database: StudyDB): Promise<Card[]> {
  const notes = await database.notes.bulkGet([...new Set(cards.map((c) => c.noteId))])
  const created = new Map(notes.filter((n): n is Note => !!n).map((n) => [n.id, n.createdAt.getTime()]))
  return [...cards].sort(
    (a, b) => (created.get(a.noteId) ?? 0) - (created.get(b.noteId) ?? 0) || a.ordinal - b.ordinal,
  )
}

// ---------------------------------------------------------------------------
// Calificar
// ---------------------------------------------------------------------------

/** Lo necesario para deshacer una calificación: cómo estaba la tarjeta antes. */
export interface UndoInfo {
  previousCard: Card
  logId: string
}

/**
 * Registra una calificación (1 Otra vez, 2 Difícil, 3 Bien, 4 Fácil):
 * FSRS calcula el nuevo estado de la tarjeta y se guarda el registro.
 */
export async function gradeCard(
  cardId: string,
  grade: Grade,
  database: StudyDB = db,
  now = new Date(),
): Promise<UndoInfo> {
  const scheduler = await getScheduler()
  return database.transaction('rw', [database.cards, database.reviewLogs], async () => {
    const card = await database.cards.get(cardId)
    if (!card) throw new Error('La tarjeta no existe.')
    const result = scheduler.review({ card: card.fsrs, grade, now })
    const log: ReviewLog = {
      id: newId(),
      cardId,
      grade,
      reviewedAt: now,
      mode: 'scheduled',
      fsrs: result.revlog,
    }
    await database.cards.update(cardId, { fsrs: result.card })
    await database.reviewLogs.add(log)
    return { previousCard: card, logId: log.id }
  })
}

/** Deshace la última calificación: restaura la tarjeta y borra el registro. */
export async function undoGrade(undo: UndoInfo, database: StudyDB = db): Promise<void> {
  await database.transaction('rw', [database.cards, database.reviewLogs], async () => {
    await database.cards.put(undo.previousCard)
    await database.reviewLogs.delete(undo.logId)
  })
}

/**
 * Para cada calificación, cuánto tiempo falta hasta que la tarjeta vuelva.
 * Se muestra debajo de los botones (ej. "Bien · 4 d").
 */
export async function previewIntervals(card: Card, now = new Date()): Promise<Record<Grade, string>> {
  const scheduler = await getScheduler()
  const out = {} as Record<Grade, string>
  for (const item of scheduler.preview({ card: card.fsrs, now })) {
    out[item.grade as Grade] = formatInterval(item.card.dueAt.getTime() - now.getTime())
  }
  return out
}

/** 90_000 ms → "2 min"; 3 días → "3 d"; etc. */
export function formatInterval(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.round(hours / 24)
  if (days < 31) return `${days} d`
  const months = days / 30.4
  if (months < 12) return `${Math.round(months * 10) / 10} m`.replace('.', ',')
  return `${Math.round((days / 365) * 10) / 10} a`.replace('.', ',')
}
