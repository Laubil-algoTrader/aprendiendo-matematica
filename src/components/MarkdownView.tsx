// Muestra texto Markdown con fórmulas KaTeX.
//
// - $...$ para fórmulas en línea y $$...$$ para fórmulas en bloque.
// - remark-gfm agrega tablas, listas de tareas y texto ~~tachado~~.
// - react-markdown NO inserta HTML crudo, así que es seguro mostrar
//   contenido escrito por otras personas (por ejemplo, un CSV importado).

import Markdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

const remarkPlugins = [remarkGfm, remarkMath]
// throwOnError: false => si una fórmula está mal escrita se muestra en rojo en vez de romper la página.
const rehypePlugins: Parameters<typeof Markdown>[0]['rehypePlugins'] = [
  [rehypeKatex, { throwOnError: false, strict: false }],
]

export function MarkdownView({ children, className }: { children: string; className?: string }) {
  return (
    <div className={['markdown', className].filter(Boolean).join(' ')}>
      <Markdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
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
}
