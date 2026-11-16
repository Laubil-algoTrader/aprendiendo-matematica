// Página de una lección: objetivos, prerrequisitos, recursos, notas,
// ejercicios y tarjetas sugeridas.

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { MarkdownView } from '../../components/MarkdownView'
import { ResourceList } from '../../components/Resources'
import { content, getLesson, getRoute, routeLessons } from '../../content'
import { missingPrerequisites } from '../../content/graph'
import { markSeenIfNew, setLessonStatus, useProgress } from '../../content/progress'
import { addedSuggestionIds, addSuggestedCards } from '../../content/suggested'
import { cardFaces, CARD_TYPE_LABELS } from '../../srs/notes'
import type { Lesson, SuggestedCard } from '../../types/content'

export function LessonPage() {
  const { lessonId } = useParams()
  const lesson = lessonId ? getLesson(lessonId) : undefined
  const progress = useProgress()

  // Abrir la lección la marca como "empezada" (si no tenía estado).
  useEffect(() => {
    if (lesson) void markSeenIfNew(lesson.id)
  }, [lesson])

  if (!lesson) {
    return (
      <section>
        <h1>Lección no encontrada</h1>
        <Link to="/rutas">Ver rutas</Link>
      </section>
    )
  }

  const route = getRoute(lesson.routeId)!
  const module = route.modules.find((m) => m.id === lesson.moduleId)!
  const ordered = routeLessons(route)
  const index = ordered.findIndex((l) => l.id === lesson.id)
  const prev = ordered[index - 1]
  const next = ordered[index + 1]
  const status = progress?.get(lesson.id)
  const missing = progress ? missingPrerequisites(lesson.id, content.lessons, progress) : []

  return (
    <article className="lesson">
      <nav aria-label="Ubicación" className="small breadcrumb">
        <Link to="/rutas">Rutas</Link> › <Link to={`/rutas/${route.id}`}>{route.title}</Link> › {module.title}
      </nav>
      <h1>{lesson.title}</h1>

      <div className="row-wrap">
        {status === 'completed' ? (
          <>
            <span className="badge badge-due">✓ Completada</span>
            <button type="button" className="btn-link small" onClick={() => setLessonStatus(lesson.id, 'seen')}>
              Marcar como no completada
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setLessonStatus(lesson.id, 'completed')}>
            Marcar como completada
          </button>
        )}
      </div>

      {missing.length > 0 && (
        <aside className="card-box notice" aria-label="Prerrequisitos pendientes">
          <p>
            <strong>Antes de esta lección conviene completar:</strong>
          </p>
          <ol>
            {missing.map((id) => (
              <li key={id}>
                <Link to={`/lecciones/${id}`}>{getLesson(id)?.title ?? id}</Link>
              </li>
            ))}
          </ol>
        </aside>
      )}

      {lesson.objectives.length > 0 && (
        <section aria-labelledby="objetivos">
          <h2 id="objetivos">Objetivos</h2>
          <ul>
            {lesson.objectives.map((o) => (
              <li key={o}>
                <MarkdownView className="inline">{o}</MarkdownView>
              </li>
            ))}
          </ul>
        </section>
      )}

      {lesson.resources.length > 0 && (
        <section aria-labelledby="recursos">
          <h2 id="recursos">Recursos</h2>
          <ResourceList resources={lesson.resources} />
        </section>
      )}

      {lesson.notes && (
        <section aria-labelledby="notas" className="card-box">
          <h2 id="notas">Notas</h2>
          <MarkdownView shiftHeadings>{lesson.notes}</MarkdownView>
        </section>
      )}

      {lesson.exercises.length > 0 && (
        <section aria-labelledby="ejercicios">
          <h2 id="ejercicios">Ejercicios</h2>
          <ol className="exercise-list">
            {lesson.exercises.map((ex) => (
              <li key={ex.id} className="card-box">
                <MarkdownView>{ex.statement}</MarkdownView>
                {ex.answer && (
                  <details>
                    <summary>Ver respuesta</summary>
                    <MarkdownView>{ex.answer}</MarkdownView>
                  </details>
                )}
                {ex.solution && (
                  <details>
                    <summary>Ver resolución</summary>
                    <MarkdownView>{ex.solution}</MarkdownView>
                  </details>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {lesson.suggestedCards.length > 0 && <SuggestedCards lesson={lesson} deckName={module.title} />}

      <nav aria-label="Lecciones" className="row-wrap lesson-nav">
        {prev && <Link to={`/lecciones/${prev.id}`}>← {prev.title}</Link>}
        <span className="grow" />
        {next && <Link to={`/lecciones/${next.id}`}>{next.title} →</Link>}
      </nav>
    </article>
  )
}

function SuggestedCards({ lesson, deckName }: { lesson: Lesson; deckName: string }) {
  const added = useLiveQuery(() => addedSuggestionIds(lesson.id), [lesson.id])
  const [message, setMessage] = useState<string | null>(null)
  // Mientras se agregan, los botones se desactivan para no duplicar con un doble clic.
  const [busy, setBusy] = useState(false)
  const pending = lesson.suggestedCards.filter((c) => !added?.has(c.id))

  async function add(cards?: SuggestedCard[]) {
    if (busy) return
    setBusy(true)
    try {
      const n = await addSuggestedCards(lesson, deckName, cards)
      setMessage(n === 1 ? `Se agregó 1 tarjeta al mazo "${deckName}".` : `Se agregaron ${n} tarjetas al mazo "${deckName}".`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="tarjetas">
      <div className="page-header">
        <h2 id="tarjetas">Tarjetas sugeridas ({lesson.suggestedCards.length})</h2>
        {added && pending.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={() => add()} disabled={busy}>
            {busy
              ? 'Agregando…'
              : pending.length === lesson.suggestedCards.length
                ? 'Agregar todas a mis mazos'
                : `Agregar las ${pending.length} restantes a mis mazos`}
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="text-ok">
          {message} <Link to="/repasar">Ir a repasar</Link>
        </p>
      )}
      <ul className="list">
        {lesson.suggestedCards.map((card) => {
          const faces = cardFaces({ type: card.type, front: card.front, back: card.back ?? '' }, card.type === 'cloze' ? 1 : 0)
          const isAdded = added?.has(card.id)
          return (
            <li key={card.id} className="card-box suggested">
              <details>
                <summary>
                  <MarkdownView className="inline">{faces.question}</MarkdownView>
                </summary>
                <MarkdownView>{faces.answer}</MarkdownView>
              </details>
              <div className="row-wrap small">
                <span className="muted">{CARD_TYPE_LABELS[card.type]}</span>
                {isAdded ? (
                  <span className="badge badge-due">✓ En tus mazos</span>
                ) : (
                  added && (
                    <button type="button" className="btn-link" onClick={() => add([card])} disabled={busy}>
                      Agregar esta
                    </button>
                  )
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
