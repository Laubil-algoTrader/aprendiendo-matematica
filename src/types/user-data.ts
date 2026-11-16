// Tipos de los DATOS DEL USUARIO.
//
// Todo esto se guarda en IndexedDB, la base de datos que trae el navegador.
// No hay servidor: los datos nunca salen de tu computadora o tu celular,
// salvo que exportes un backup.

import type { DefaultSchedulerCard, DefaultSchedulerRevlog } from 'ts-fsrs'
import type { LessonId } from './content'

/**
 * Tipos de tarjeta:
 * - basic: frente → dorso.
 * - basic-reversed: genera dos tarjetas, frente → dorso y dorso → frente.
 * - cloze: texto con huecos {{c1::...}}; genera una tarjeta por cada número de hueco.
 */
export type CardType = 'basic' | 'basic-reversed' | 'cloze'

/** Estado de memoria de una tarjeta, calculado por la librería ts-fsrs (FSRS-7). */
export type FsrsCard = DefaultSchedulerCard
/** Registro que ts-fsrs devuelve en cada repaso (estado anterior + calificación). */
export type FsrsRevlog = DefaultSchedulerRevlog

export interface Deck {
  id: string
  name: string
  description?: string
  createdAt: Date
}

/** De dónde salió una nota. Sirve para no duplicar y para mostrar el origen. */
export type NoteSource =
  | { kind: 'lesson'; lessonId: LessonId; suggestionId: string }
  | { kind: 'mistake'; mistakeId: string }
  | { kind: 'csv' }

/**
 * Una NOTA es el contenido que escribís (frente, dorso, etiquetas).
 * De cada nota salen una o más TARJETAS, que son lo que se repasa.
 * Ej.: una nota "básica invertida" produce 2 tarjetas.
 */
export interface Note {
  id: string
  deckId: string
  type: CardType
  /** Markdown + KaTeX. En las cloze, el texto con los huecos. */
  front: string
  /** Markdown + KaTeX. En las cloze, un comentario extra opcional. */
  back: string
  tags: string[]
  source?: NoteSource
  createdAt: Date
  updatedAt: Date
}

/** Lo que efectivamente se repasa y se programa con FSRS. */
export interface Card {
  id: string
  noteId: string
  /** Copia del mazo de la nota, para filtrar rápido sin buscar la nota. */
  deckId: string
  /**
   * Qué variante de la nota es esta tarjeta:
   * en basic-reversed, 0 = directa y 1 = invertida;
   * en cloze, el número de hueco (1 para {{c1::}}, 2 para {{c2::}}...).
   */
  ordinal: number
  /** Una tarjeta suspendida no aparece en los repasos hasta que la reactives. */
  suspended: boolean
  fsrs: FsrsCard
}

/** Las 4 calificaciones: 1 Otra vez, 2 Difícil, 3 Bien, 4 Fácil. */
export type Grade = 1 | 2 | 3 | 4

export interface ReviewLog {
  id: string
  cardId: string
  grade: Grade
  reviewedAt: Date
  /**
   * scheduled = repaso normal (cambia la próxima fecha de la tarjeta).
   * practice = práctica intercalada (se registra, pero no toca la programación).
   */
  mode: 'scheduled' | 'practice'
  /** Solo en repasos 'scheduled': guardamos el registro de FSRS para poder re-optimizar a futuro. */
  fsrs?: FsrsRevlog
}

export type LessonStatus = 'seen' | 'completed'

export interface LessonProgress {
  lessonId: LessonId
  status: LessonStatus
  updatedAt: Date
}

export type MistakeCause = 'concepto' | 'algebra' | 'distraccion' | 'unidades'

/** Una entrada del cuaderno de errores. */
export interface Mistake {
  id: string
  /** Lección relacionada, si la hay. */
  lessonId?: LessonId
  /** Tema libre, ej. "Trigonometría". */
  topic: string
  statement: string
  whatIDid: string
  cause: MistakeCause
  correction: string
  /** Si convertiste el error en tarjeta, el id de esa nota. */
  noteId?: string
  createdAt: Date
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  /** Cuántas tarjetas nuevas como máximo por día. */
  newCardsPerDay: number
  /**
   * Hora (0–23) a la que empieza un "día de estudio".
   * Con 4, estudiar a la 1 a.m. cuenta para el día anterior y no corta la racha.
   */
  dayStartHour: number
  theme: ThemePreference
}
