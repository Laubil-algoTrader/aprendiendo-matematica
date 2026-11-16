// Carga TODO el contenido de /content al compilar la app.
//
// `import.meta.glob` es una función de Vite: busca los archivos que coinciden
// con el patrón y los incluye en la app como texto. Así no hace falta un
// servidor que los entregue: quedan "adentro" del sitio estático.

import type { Lesson, Route } from '../types/content'
import { parseContent, type ContentIndex } from './parse'

const rawFiles = import.meta.glob<string>(['/content/rutas/**/*.md', '/content/rutas/**/*.yaml'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

export const content: ContentIndex = parseContent(rawFiles)

if (content.errors.length > 0) {
  // En desarrollo esto se ve en la consola del navegador y en un aviso en pantalla.
  console.warn('Errores en /content:', content.errors)
}

export function getRoute(id: string): Route | undefined {
  return content.routes.find((r) => r.id === id)
}

export function getLesson(id: string): Lesson | undefined {
  return content.lessons.get(id)
}

/** Todas las lecciones de una ruta, en orden. */
export function routeLessons(route: Route): Lesson[] {
  return route.modules.flatMap((m) => m.lessons)
}
