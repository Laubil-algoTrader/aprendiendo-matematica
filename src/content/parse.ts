// Lee y valida los archivos de /content y los convierte en los tipos de la app.
//
// Los archivos usan claves en ESPAÑOL (titulo, objetivos, recursos...) para que
// cualquiera pueda escribir lecciones sin saber programar. Acá se traducen a
// los tipos internos (en inglés) y se revisa que todo esté bien formado.
//
// Si algo está mal, NO rompemos la app: juntamos los errores con el archivo
// donde ocurrieron. Un test (content.test.ts) falla si hay alguno, así un
// pull request con contenido mal escrito no puede pasar desapercibido.

import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { validateNote } from '../srs/notes'
import type { Lesson, Module, Route } from '../types/content'
import type { CardType } from '../types/user-data'

// ---------------------------------------------------------------------------
// Esquemas: qué campos acepta cada archivo
// ---------------------------------------------------------------------------

/** Ids: minúsculas, números y guiones. Ej.: "mat-funcion-cuadratica". */
const idSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'usá solo minúsculas, números y guiones (ej. "mat-funcion-cuadratica")')

const text = z.string().trim().min(1, 'no puede estar vacío')

const routeFileSchema = z.strictObject({
  id: idSchema,
  titulo: text,
  descripcion: text,
  modulos: z.array(
    z.strictObject({
      id: idSchema,
      titulo: text,
      descripcion: text.optional(),
      lecciones: z.array(idSchema).default([]),
    }),
  ),
})

const CARD_TYPES: Record<string, CardType> = {
  basica: 'basic',
  invertida: 'basic-reversed',
  cloze: 'cloze',
}

const lessonFrontmatterSchema = z.strictObject({
  id: idSchema,
  titulo: text,
  objetivos: z.array(text).default([]),
  prerrequisitos: z.array(idSchema).default([]),
  recursos: z
    .array(
      z.strictObject({
        tipo: z.enum(['video', 'articulo', 'libro', 'ejercicios', 'simulacion', 'otro']),
        titulo: text,
        url: z.url({ protocol: /^https$/, error: 'debe ser una URL completa que empiece con https://' }),
        fuente: text,
        idioma: z.string().regex(/^[a-z]{2}$/, 'código de 2 letras, ej. "es" o "en"'),
        duracion: z.number().positive().optional(),
      }),
    )
    .default([]),
  ejercicios: z
    .array(
      z.strictObject({
        id: idSchema,
        enunciado: text,
        respuesta: text.optional(),
        solucion: text.optional(),
      }),
    )
    .default([]),
  tarjetas: z
    .array(
      z.strictObject({
        id: idSchema,
        tipo: z.enum(['basica', 'invertida', 'cloze']).default('basica'),
        frente: text,
        dorso: z.string().default(''),
        etiquetas: z.array(z.string()).default([]),
      }),
    )
    .default([]),
})

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

export interface ContentError {
  file: string
  message: string
}

export interface ContentIndex {
  routes: Route[]
  lessons: Map<string, Lesson>
  errors: ContentError[]
}

/** Separa el bloque YAML inicial (entre líneas ---) del cuerpo Markdown. */
export function splitFrontmatter(raw: string): { data: string; body: string } | null {
  const normalized = raw.replace(/\r\n/g, '\n')
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalized)
  return match ? { data: match[1], body: match[2].trim() } : null
}

/** Convierte los errores de zod en frases legibles: "recursos.0.url: debe ser...". */
function describeZodError(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const where = issue.path.join('.')
    return where ? `${where}: ${issue.message}` : issue.message
  })
}

function safeYaml(source: string): { ok: true; value: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, value: parseYaml(source) }
  } catch (e) {
    return { ok: false, message: `YAML inválido: ${(e as Error).message}` }
  }
}

// ---------------------------------------------------------------------------
// Lectura principal
// ---------------------------------------------------------------------------

/**
 * @param files mapa "ruta del archivo" → "texto del archivo", ej.
 *   "/content/rutas/mi-ruta/ruta.yaml" → "id: mi-ruta\n..."
 */
export function parseContent(files: Record<string, string>): ContentIndex {
  const errors: ContentError[] = []
  const routes: Route[] = []
  const lessons = new Map<string, Lesson>()
  const lessonFiles = new Map<string, string>() // id → archivo, para avisar de duplicados
  const usedLessonPaths = new Set<string>()

  const routePaths = Object.keys(files)
    .filter((p) => /\/rutas\/[^/]+\/ruta\.yaml$/.test(p))
    .sort()

  for (const routePath of routePaths) {
    const routeDir = routePath.replace(/ruta\.yaml$/, '')
    const yaml = safeYaml(files[routePath])
    if (!yaml.ok) {
      errors.push({ file: routePath, message: yaml.message })
      continue
    }
    const parsedRoute = routeFileSchema.safeParse(yaml.value)
    if (!parsedRoute.success) {
      for (const message of describeZodError(parsedRoute.error)) errors.push({ file: routePath, message })
      continue
    }
    const r = parsedRoute.data
    const modules: Module[] = []

    for (const m of r.modulos) {
      const moduleLessons: Lesson[] = []
      for (const slug of m.lecciones) {
        const lessonPath = `${routeDir}${m.id}/${slug}.md`
        usedLessonPaths.add(lessonPath)
        if (!(lessonPath in files)) {
          errors.push({ file: routePath, message: `la lección "${slug}" no existe: falta el archivo ${lessonPath}` })
          continue
        }
        const lesson = parseLesson(lessonPath, files[lessonPath], r.id, m.id, errors)
        if (!lesson) continue
        if (lessonFiles.has(lesson.id)) {
          errors.push({
            file: lessonPath,
            message: `el id "${lesson.id}" ya se usa en ${lessonFiles.get(lesson.id)}; los ids deben ser únicos`,
          })
          continue
        }
        lessonFiles.set(lesson.id, lessonPath)
        lessons.set(lesson.id, lesson)
        moduleLessons.push(lesson)
      }
      modules.push({ id: m.id, title: m.titulo, description: m.descripcion, lessons: moduleLessons })
    }
    routes.push({ id: r.id, title: r.titulo, description: r.descripcion, modules })
  }

  // Archivos de lección que nadie usa (probablemente falta agregarlos en ruta.yaml).
  for (const path of Object.keys(files)) {
    if (path.endsWith('.md') && /\/rutas\/[^/]+\/[^/]+\/[^/]+\.md$/.test(path) && !usedLessonPaths.has(path)) {
      errors.push({ file: path, message: 'esta lección no aparece en la lista "lecciones" de ningún módulo en ruta.yaml' })
    }
  }

  // Prerrequisitos que apuntan a lecciones inexistentes.
  for (const lesson of lessons.values()) {
    for (const pre of lesson.prerequisites) {
      if (!lessons.has(pre)) {
        errors.push({ file: lessonFiles.get(lesson.id)!, message: `prerrequisito desconocido: "${pre}"` })
      }
      if (pre === lesson.id) {
        errors.push({ file: lessonFiles.get(lesson.id)!, message: 'una lección no puede ser prerrequisito de sí misma' })
      }
    }
  }

  // Ciclos: A necesita B y B necesita A (directa o indirectamente).
  const cycle = findCycle(lessons)
  if (cycle) {
    errors.push({
      file: lessonFiles.get(cycle[0])!,
      message: `hay un ciclo de prerrequisitos: ${cycle.join(' → ')}`,
    })
  }

  return { routes, lessons, errors }
}

function parseLesson(
  path: string,
  raw: string,
  routeId: string,
  moduleId: string,
  errors: ContentError[],
): Lesson | null {
  const parts = splitFrontmatter(raw)
  if (!parts) {
    errors.push({ file: path, message: 'el archivo debe empezar con un bloque YAML entre dos líneas "---"' })
    return null
  }
  const yaml = safeYaml(parts.data)
  if (!yaml.ok) {
    errors.push({ file: path, message: yaml.message })
    return null
  }
  const parsed = lessonFrontmatterSchema.safeParse(yaml.value)
  if (!parsed.success) {
    for (const message of describeZodError(parsed.error)) errors.push({ file: path, message })
    return null
  }
  const d = parsed.data

  // Ids repetidos dentro de la lección.
  for (const [label, items] of [
    ['tarjetas', d.tarjetas],
    ['ejercicios', d.ejercicios],
  ] as const) {
    const seen = new Set<string>()
    for (const item of items) {
      if (seen.has(item.id)) errors.push({ file: path, message: `${label}: el id "${item.id}" está repetido` })
      seen.add(item.id)
    }
  }

  const suggestedCards = d.tarjetas.map((t) => ({
    id: t.id,
    type: CARD_TYPES[t.tipo],
    front: t.frente,
    back: t.dorso,
    tags: t.etiquetas,
  }))
  // Las tarjetas deben poder crearse (ej. una cloze necesita al menos un hueco).
  for (const card of suggestedCards) {
    const problem = validateNote({ type: card.type, front: card.front, back: card.back })
    if (problem) errors.push({ file: path, message: `tarjeta "${card.id}": ${problem}` })
  }

  return {
    id: d.id,
    routeId,
    moduleId,
    title: d.titulo,
    objectives: d.objetivos,
    prerequisites: d.prerrequisitos,
    resources: d.recursos.map((r) => ({
      type: r.tipo,
      title: r.titulo,
      url: r.url,
      source: r.fuente,
      language: r.idioma,
      ...(r.duracion ? { durationMin: r.duracion } : {}),
    })),
    notes: parts.body,
    exercises: d.ejercicios.map((e) => ({
      id: e.id,
      statement: e.enunciado,
      ...(e.respuesta ? { answer: e.respuesta } : {}),
      ...(e.solucion ? { solution: e.solucion } : {}),
    })),
    suggestedCards,
  }
}

/** Busca un ciclo en el grafo de prerrequisitos. Devuelve el camino o null. */
export function findCycle(lessons: Map<string, Pick<Lesson, 'id' | 'prerequisites'>>): string[] | null {
  const state = new Map<string, 'visiting' | 'done'>()
  const stack: string[] = []

  function visit(id: string): string[] | null {
    if (state.get(id) === 'done') return null
    if (state.get(id) === 'visiting') return [...stack.slice(stack.indexOf(id)), id]
    state.set(id, 'visiting')
    stack.push(id)
    for (const pre of lessons.get(id)?.prerequisites ?? []) {
      if (!lessons.has(pre)) continue
      const found = visit(pre)
      if (found) return found
    }
    stack.pop()
    state.set(id, 'done')
    return null
  }

  for (const id of lessons.keys()) {
    const found = visit(id)
    if (found) return found
  }
  return null
}
