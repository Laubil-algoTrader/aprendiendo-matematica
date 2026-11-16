// Tipos del CONTENIDO de las rutas de aprendizaje.
//
// Este contenido vive en la carpeta /content del repositorio (Markdown + YAML),
// se carga al compilar la app y es de solo lectura: el usuario no lo modifica.
// Lo que el usuario hace con él (progreso, tarjetas propias) está en user-data.ts.

import type { CardType } from './user-data'

/** Identificador de una lección. Debe ser único en todo el repo, ej. "mat-funcion-cuadratica". */
export type LessonId = string

/** Una ruta de aprendizaje completa, ej. "Ingreso Ingeniería Mecatrónica UNCuyo". */
export interface Route {
  id: string
  title: string
  description: string
  /** Módulos en el orden en que se recomienda recorrerlos. */
  modules: Module[]
}

/** Un bloque temático dentro de una ruta, ej. "Matemática". */
export interface Module {
  id: string
  title: string
  description?: string
  /** Lecciones en orden. Puede estar vacío si el módulo todavía no tiene contenido. */
  lessons: Lesson[]
}

export interface Lesson {
  id: LessonId
  routeId: string
  moduleId: string
  title: string
  /** Qué vas a poder hacer al terminar la lección. */
  objectives: string[]
  /** Lecciones que conviene completar antes. Forman un grafo de dependencias. */
  prerequisites: LessonId[]
  /** Videos, libros y ejercicios de otros sitios, siempre con su fuente. */
  resources: Resource[]
  /** Apuntes propios en Markdown (con fórmulas KaTeX). Es el cuerpo del archivo .md. */
  notes: string
  exercises: Exercise[]
  /** Tarjetas que el usuario puede agregar a sus mazos con un clic. */
  suggestedCards: SuggestedCard[]
}

export type ResourceType = 'video' | 'articulo' | 'libro' | 'ejercicios' | 'simulacion' | 'otro'

/** Un recurso externo. Nunca se copia su contenido: se enlaza o se embebe citando la fuente. */
export interface Resource {
  type: ResourceType
  title: string
  url: string
  /** Quién lo publica, ej. "Khan Academy", "OpenStax". */
  source: string
  /** Código de idioma, ej. "es", "en". */
  language: string
  /** Duración estimada en minutos (opcional). */
  durationMin?: number
}

/** Ejercicio autoevaluado: la app muestra la respuesta, no corrige. */
export interface Exercise {
  id: string
  statement: string
  answer?: string
  solution?: string
}

/** Tarjeta propuesta por una lección. Su id es único dentro de la lección. */
export interface SuggestedCard {
  id: string
  type: CardType
  front: string
  back?: string
  tags?: string[]
}
