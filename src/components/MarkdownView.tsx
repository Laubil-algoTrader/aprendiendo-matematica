// Muestra texto Markdown con fórmulas KaTeX.
//
// - $...$ para fórmulas en línea y $$...$$ para fórmulas en bloque.
// - remark-gfm agrega tablas, listas de tareas y texto ~~tachado~~.
// - react-markdown NO inserta HTML crudo, así que es seguro mostrar
//   contenido escrito por otras personas (por ejemplo, un CSV importado).

import { memo } from 'react'
import Markdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

const remarkPlugins = [remarkGfm, remarkMath]
// throwOnError: false => si una fórmula está mal escrita se muestra en rojo en vez de romper la página.
const rehypePlugins: Parameters<typeof Markdown>[0]['rehypePlugins'] = [
  [rehypeKatex, { throwOnError: false, strict: false }],
]

/**
 * Está envuelto en `memo`: si el texto no cambió, React reutiliza el resultado
 * anterior en vez de volver a procesar el Markdown y las fórmulas (que es lento).
 * Importa en páginas largas como las lecciones, que se re-dibujan cuando cambia
 * el progreso.
 *
 * @param shiftHeadings baja un nivel los títulos (## pasa a ser h3). Se usa cuando el
 *   Markdown va dentro de una sección que ya tiene su propio título h2, para que la
 *   jerarquía de títulos sea correcta (importa para lectores de pantalla).
 */
export const MarkdownView = memo(function MarkdownView({
  children,
  className,
  shiftHeadings = false,
}: {
  children: string
  className?: string
  shiftHeadings?: boolean
}) {
  return (
    <div className={['markdown', className].filter(Boolean).join(' ')}>
      <Markdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          ...(shiftHeadings && {
            h1: ({ children: c }) => <h2>{c}</h2>,
            h2: ({ children: c }) => <h3>{c}</h3>,
            h3: ({ children: c }) => <h4>{c}</h4>,
          }),
          // Los enlaces externos se abren en otra pestaña, sin pasar datos de esta página.
          a: ({ href, children: linkChildren }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {linkChildren}
            </a>
          ),
        }}
      >
        {children}
      </Markdown>
    </div>
  )
})
