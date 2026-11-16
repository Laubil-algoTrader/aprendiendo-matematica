// Tarjetas "cloze" (completar huecos), con la misma sintaxis que Anki:
//
//   La derivada de {{c1::x^2}} es {{c2::2x::pista opcional}}.
//
// Cada número de hueco (c1, c2, ...) produce UNA tarjeta. En la tarjeta del
// hueco 1, ese hueco se oculta y los demás se muestran normalmente.
// Varios huecos con el mismo número se ocultan juntos en la misma tarjeta.

interface ClozeMatch {
  /** Posición donde empieza "{{c" y donde termina el "}}" final (exclusivo). */
  start: number
  end: number
  ordinal: number
  answer: string
  hint?: string
}

/**
 * Encuentra todos los huecos {{cN::respuesta}} o {{cN::respuesta::pista}}.
 *
 * No usamos una expresión regular simple porque las fórmulas LaTeX tienen
 * llaves: en {{c1::\frac{a}{b}}} el primer "}}" NO cierra el hueco. Por eso
 * recorremos el texto contando llaves abiertas: el hueco se cierra con "}}"
 * solo cuando todas las llaves internas ya se cerraron.
 */
function findClozes(text: string): ClozeMatch[] {
  const result: ClozeMatch[] = []
  const OPEN_RE = /\{\{c(\d+)::/g
  let open: RegExpExecArray | null
  while ((open = OPEN_RE.exec(text))) {
    const contentStart = open.index + open[0].length
    let depth = 0
    let close = -1
    for (let i = contentStart; i < text.length; i++) {
      const ch = text[i]
      if (ch === '{') depth++
      else if (ch === '}') {
        if (depth === 0 && text[i + 1] === '}') {
          close = i
          break
        }
        depth = Math.max(0, depth - 1)
      }
    }
    if (close === -1) break // hueco sin cerrar: lo dejamos como texto normal
    const inner = text.slice(contentStart, close)
    // La pista va después del último "::" que no esté dentro de llaves.
    let hintAt = -1
    let d = 0
    for (let i = 0; i < inner.length - 1; i++) {
      if (inner[i] === '{') d++
      else if (inner[i] === '}') d--
      else if (d === 0 && inner[i] === ':' && inner[i + 1] === ':') hintAt = i
    }
    result.push({
      start: open.index,
      end: close + 2,
      ordinal: Number(open[1]),
      answer: hintAt === -1 ? inner : inner.slice(0, hintAt),
      hint: hintAt === -1 ? undefined : inner.slice(hintAt + 2),
    })
    OPEN_RE.lastIndex = close + 2
  }
  return result
}

/** Números de hueco presentes en el texto, ordenados y sin repetir. Ej.: [1, 2]. */
export function clozeOrdinals(text: string): number[] {
  const found = new Set(findClozes(text).map((c) => c.ordinal).filter((n) => n > 0))
  return [...found].sort((a, b) => a - b)
}

/**
 * Divide el texto en tramos "normales" y tramos "de fórmula" ($...$ o $$...$$).
 * Hace falta porque dentro de una fórmula no se puede usar **negrita** de Markdown:
 * ahí marcamos el hueco con comandos de LaTeX.
 */
function splitMath(text: string): { text: string; math: boolean }[] {
  const parts: { text: string; math: boolean }[] = []
  // $$...$$ primero, después $...$ (sin saltar un \$ escapado).
  const MATH_RE = /\$\$[\s\S]*?\$\$|(?<!\\)\$(?!\$)[\s\S]*?(?<!\\)\$/g
  let last = 0
  for (const m of text.matchAll(MATH_RE)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), math: false })
    parts.push({ text: m[0], math: true })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), math: false })
  return parts
}

/**
 * Convierte el texto cloze en Markdown listo para mostrar.
 * @param ordinal número de hueco de esta tarjeta.
 * @param reveal false = frente (hueco oculto), true = dorso (hueco resaltado).
 */
export function renderCloze(text: string, ordinal: number, reveal: boolean): string {
  // Primero reemplazamos cada hueco por su versión final, y recién después
  // vemos si quedó dentro de una fórmula (para usar LaTeX o Markdown).
  const mathRanges = splitMath(text)
    .reduce<{ from: number; to: number; math: boolean }[]>((acc, part) => {
      const from = acc.length ? acc[acc.length - 1].to : 0
      acc.push({ from, to: from + part.text.length, math: part.math })
      return acc
    }, [])
    .filter((r) => r.math)
  const insideMath = (pos: number) => mathRanges.some((r) => pos >= r.from && pos < r.to)

  let out = ''
  let last = 0
  for (const c of findClozes(text)) {
    out += text.slice(last, c.start)
    out += replacement(c, ordinal, reveal, insideMath(c.start))
    last = c.end
  }
  return out + text.slice(last)
}

function replacement(c: ClozeMatch, ordinal: number, reveal: boolean, math: boolean): string {
  if (c.ordinal !== ordinal) return c.answer // los otros huecos se ven completos
  if (math) {
    // Dentro de una fórmula: un recuadro con "?" (o la pista) o con la respuesta.
    if (reveal) return `\\boxed{${c.answer}}`
    return c.hint ? `\\boxed{\\text{${c.hint}}}` : '\\boxed{\\,?\\,}'
  }
  if (reveal) return `**${c.answer}**`
  return c.hint ? `**[${c.hint}]**` : '**[…]**'
}
