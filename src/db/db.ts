// Base de datos local con Dexie (una capa simple sobre IndexedDB).
//
// Cada "tabla" guarda un tipo de dato. En `stores` se declara qué campos
// están INDEXADOS, es decir, por cuáles se puede buscar rápido. El resto de
// los campos se guarda igual, solo que no se puede buscar por ellos directamente.
//
// IMPORTANTE: si en el futuro cambia el esquema, NO se edita la versión 1:
// se agrega `this.version(2).stores({...})` con una migración. Así los datos
// de quienes ya usan la app no se pierden.

import { Dexie, type EntityTable } from 'dexie'
import type {
  Card,
  Deck,
  LessonProgress,
  Mistake,
  Note,
  ReviewLog,
  Settings,
} from '../types/user-data'

/** Fila única donde se guardan los ajustes. */
export interface SettingsRow extends Partial<Settings> {
  id: 'app'
}

export class StudyDB extends Dexie {
  decks!: EntityTable<Deck, 'id'>
  notes!: EntityTable<Note, 'id'>
  cards!: EntityTable<Card, 'id'>
  reviewLogs!: EntityTable<ReviewLog, 'id'>
  lessonProgress!: EntityTable<LessonProgress, 'lessonId'>
  mistakes!: EntityTable<Mistake, 'id'>
  settings!: EntityTable<SettingsRow, 'id'>

  constructor(name = 'app-estudiar') {
    super(name)
    // Sintaxis de Dexie: el primer campo es la clave primaria;
    // "*tags" indexa cada etiqueta por separado; "a.b" indexa un campo anidado.
    this.version(1).stores({
      decks: 'id, name',
      notes: 'id, deckId, type, *tags, source.lessonId, source.suggestionId, updatedAt',
      cards: 'id, noteId, deckId, fsrs.dueAt, fsrs.state',
      reviewLogs: 'id, cardId, reviewedAt, mode',
      lessonProgress: 'lessonId, status',
      mistakes: 'id, lessonId, topic, cause, createdAt',
      settings: 'id',
    })
  }
}

/** La instancia que usa toda la app. */
export const db = new StudyDB()

/** Genera un identificador único (lo trae el navegador, no hace falta librería). */
export function newId(): string {
  return crypto.randomUUID()
}

/**
 * Pide al navegador que no borre nuestros datos cuando le falta espacio.
 * Sin esto, algunos navegadores pueden limpiar IndexedDB de sitios poco usados.
 * Si el navegador no lo permite, no pasa nada: seguimos funcionando igual.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    // Ignoramos: es solo una mejora.
  }
  return false
}
