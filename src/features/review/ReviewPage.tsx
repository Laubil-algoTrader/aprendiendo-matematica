// Sesión de repaso.
//
// Flujo: se muestra la pregunta → "Mostrar respuesta" → calificás con
// Otra vez / Difícil / Bien / Fácil → FSRS programa la tarjeta → siguiente.
//
// Atajos de teclado:
//   Espacio o Enter  mostrar respuesta
//   1, 2, 3, 4       calificar (solo con la respuesta visible)
//   Ctrl+Z           deshacer la última calificación

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { MarkdownView } from '../../components/MarkdownView'
import { db } from '../../db/db'
import { cardFaces } from '../../srs/notes'
import {
  getDailyQueue,
  gradeCard,
  previewIntervals,
  undoGrade,
  type DailyQueue,
  type UndoInfo,
} from '../../srs/queue'
import type { Grade, Note } from '../../types/user-data'

export const GRADE_BUTTONS: { grade: Grade; label: string; className: string }[] = [
  { grade: 1, label: 'Otra vez', className: 'grade-again' },
  { grade: 2, label: 'Difícil', className: 'grade-hard' },
  { grade: 3, label: 'Bien', className: 'grade-good' },
  { grade: 4, label: 'Fácil', className: 'grade-easy' },
]

/** No interceptar teclas mientras se escribe en un campo de texto. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export function ReviewPage() {
  const [params] = useSearchParams()
  const deckId = params.get('mazo') ?? undefined

  const [queue, setQueue] = useState<DailyQueue | null>(null)
  const [note, setNote] = useState<Note | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [intervals, setIntervals] = useState<Record<Grade, string> | null>(null)
  const [undo, setUndo] = useState<UndoInfo | null>(null)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [deckName, setDeckName] = useState<string | null>(null)
  const busy = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  /** Busca la próxima tarjeta y su nota. */
  const load = useCallback(async () => {
    const q = await getDailyQueue({ deckId })
    const n = q.next ? ((await db.notes.get(q.next.noteId)) ?? null) : null
    setQueue(q)
    setNote(n)
    setShowAnswer(false)
    setIntervals(q.next ? await previewIntervals(q.next) : null)
    cardRef.current?.focus()
  }, [deckId])

  useEffect(() => {
    void load()
    if (deckId) void db.decks.get(deckId).then((d) => setDeckName(d?.name ?? null))
  }, [load, deckId])

  const reveal = useCallback(() => setShowAnswer(true), [])

  const grade = useCallback(
    async (g: Grade) => {
      if (!queue?.next || busy.current) return
      busy.current = true // evita calificar dos veces con doble tecla
      try {
        setUndo(await gradeCard(queue.next.id, g))
        setReviewedCount((c) => c + 1)
        await load()
      } finally {
        busy.current = false
      }
    },
    [queue, load],
  )

  const handleUndo = useCallback(async () => {
    if (!undo || busy.current) return
    busy.current = true
    try {
      await undoGrade(undo)
      setUndo(null)
      setReviewedCount((c) => Math.max(0, c - 1))
      // Volvemos a mostrar la tarjeta que se deshizo, con la respuesta oculta.
      const card = undo.previousCard
      const q = await getDailyQueue({ deckId })
      setQueue({ ...q, next: card })
      setNote((await db.notes.get(card.noteId)) ?? null)
      setShowAnswer(false)
      setIntervals(await previewIntervals(card))
    } finally {
      busy.current = false
    }
  }, [undo, deckId])

  // Atajos de teclado.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target)) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        void handleUndo()
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (!queue?.next) return
      if (!showAnswer && (e.key === ' ' || e.key === 'Enter')) {
        // Si el foco está en un botón, Enter ya lo "clickea": no lo duplicamos.
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'BUTTON') return
        e.preventDefault() // que la barra espaciadora no haga scroll
        reveal()
      } else if (showAnswer && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        void grade(Number(e.key) as Grade)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [queue, showAnswer, reveal, grade, handleUndo])

  if (!queue) return <p className="muted">Cargando…</p>

  const title = deckName ? `Repasar: ${deckName}` : 'Repasar'
  const card = queue.next

  if (!card || !note) {
    return (
      <section>
        <h1>{title}</h1>
        <div className="card-box done-box" role="status">
          <p className="big">🎉 ¡Listo por hoy!</p>
          {reviewedCount > 0 && (
            <p>
              Repasaste {reviewedCount} {reviewedCount === 1 ? 'tarjeta' : 'tarjetas'} en esta sesión.
            </p>
          )}
          {queue.laterToday > 0 && (
            <p className="muted">
              {queue.laterToday === 1
                ? 'Queda 1 tarjeta en aprendizaje que vuelve más tarde hoy.'
                : `Quedan ${queue.laterToday} tarjetas en aprendizaje que vuelven más tarde hoy.`}{' '}
              <button type="button" className="btn-link" onClick={() => void load()}>
                Volver a revisar
              </button>
            </p>
          )}
          <div className="row-wrap">
            <Link to="/mazos" className="btn">
              Ir a mazos
            </Link>
            {undo && (
              <button type="button" className="btn" onClick={() => void handleUndo()}>
                Deshacer última (Ctrl+Z)
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  const faces = cardFaces(note, card.ordinal)
  const { counts } = queue

  return (
    <section className="review">
      <div className="page-header">
        <h1>{title}</h1>
        <p className="counts small" aria-label="Tarjetas que faltan hoy">
          <span className="badge badge-new" title="Nuevas">
            Nuevas {counts.new}
          </span>{' '}
          <span className="badge badge-learning" title="En aprendizaje">
            Aprendiendo {counts.learning}
          </span>{' '}
          <span className="badge badge-due" title="Repaso">
            Repaso {counts.review}
          </span>
        </p>
      </div>

      <div className="card-box review-card" ref={cardRef} tabIndex={-1} aria-label="Tarjeta actual">
        {/* En cloze la respuesta ya incluye el texto completo; en las demás mostramos pregunta + respuesta. */}
        {!(showAnswer && note.type === 'cloze') && <MarkdownView>{faces.question}</MarkdownView>}
        <div aria-live="polite">
          {showAnswer && (
            <>
              {note.type !== 'cloze' && <hr />}
              <MarkdownView>{faces.answer}</MarkdownView>
            </>
          )}
        </div>
      </div>

      <div className="review-controls">
        {!showAnswer ? (
          <button type="button" className="btn btn-primary btn-wide" onClick={reveal} aria-keyshortcuts="Space">
            Mostrar respuesta <kbd>Espacio</kbd>
          </button>
        ) : (
          <div className="grade-buttons" role="group" aria-label="Calificar">
            {GRADE_BUTTONS.map(({ grade: g, label, className }) => (
              <button
                key={g}
                type="button"
                className={`btn grade ${className}`}
                onClick={() => void grade(g)}
                aria-keyshortcuts={String(g)}
              >
                <span>{label}</span>
                <small>
                  {intervals?.[g]} · <kbd>{g}</kbd>
                </small>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="row-wrap small muted review-footer">
        <span>Repasadas: {reviewedCount}</span>
        <Link to={`/tarjetas/${note.id}`}>Editar esta tarjeta</Link>
        {undo && (
          <button type="button" className="btn-link" onClick={() => void handleUndo()}>
            Deshacer (Ctrl+Z)
          </button>
        )}
      </div>
    </section>
  )
}
