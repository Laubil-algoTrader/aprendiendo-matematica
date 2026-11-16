// Práctica intercalada: elegir temas → sesión mezclada → resumen.
//
// Durante la sesión el tema de cada ítem se muestra recién al ver la
// respuesta: parte del ejercicio es darse cuenta solo de qué tema se trata.
//
// Atajos: Espacio = ver respuesta; tarjetas 1–4 = calificar;
// ejercicios 1 = me equivoqué, 2 = me salió bien.

import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { MarkdownView } from '../../components/MarkdownView'
import { content, getLesson } from '../../content'
import { useProgress } from '../../content/progress'
import { buildPracticeSession, logPracticeAnswer, practiceCandidates, type PracticeItem } from '../../practice/practice'
import { cardFaces } from '../../srs/notes'
import type { Grade } from '../../types/user-data'
import { GRADE_BUTTONS } from '../review/ReviewPage'

interface Answer {
  item: PracticeItem
  correct: boolean
}

type Phase = { name: 'setup' } | { name: 'session'; items: PracticeItem[]; index: number } | { name: 'summary' }

const SIZES = [10, 20, 30]

export function PracticePage() {
  const [phase, setPhase] = useState<Phase>({ name: 'setup' })
  const [answers, setAnswers] = useState<Answer[]>([])

  if (phase.name === 'setup') {
    return (
      <PracticeSetup
        onStart={(items) => {
          setAnswers([])
          setPhase({ name: 'session', items, index: 0 })
        }}
      />
    )
  }
  if (phase.name === 'session') {
    return (
      <PracticeSession
        key={phase.index}
        item={phase.items[phase.index]}
        position={phase.index + 1}
        total={phase.items.length}
        onAnswer={(correct) => {
          const next = [...answers, { item: phase.items[phase.index], correct }]
          setAnswers(next)
          if (phase.index + 1 < phase.items.length) setPhase({ ...phase, index: phase.index + 1 })
          else setPhase({ name: 'summary' })
        }}
        onQuit={() => setPhase({ name: 'summary' })}
      />
    )
  }
  return <PracticeSummary answers={answers} onRestart={() => setPhase({ name: 'setup' })} />
}

// ---------------------------------------------------------------------------
// Paso 1: elegir temas
// ---------------------------------------------------------------------------

function PracticeSetup({ onStart }: { onStart: (items: PracticeItem[]) => void }) {
  const progress = useProgress()
  // Lecciones vistas o completadas, en el orden de las rutas.
  const seenLessons = useMemo(
    () =>
      progress
        ? content.routes.flatMap((r) => r.modules.flatMap((m) => m.lessons)).filter((l) => progress.has(l.id))
        : [],
    [progress],
  )
  const candidates = useLiveQuery(() => practiceCandidates(seenLessons), [seenLessons])

  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [includeCards, setIncludeCards] = useState(true)
  const [includeExercises, setIncludeExercises] = useState(true)
  const [size, setSize] = useState(20)

  if (!progress || !candidates) return <p className="muted">Cargando…</p>

  const countFor = (lessonId: string, kind: PracticeItem['kind']) =>
    candidates.filter((c) => c.topic === lessonId && c.kind === kind).length
  const selected = seenLessons.filter((l) => !excluded.has(l.id))
  const usable = selected.filter(
    (l) => (includeCards && countFor(l.id, 'card') > 0) || (includeExercises && countFor(l.id, 'exercise') > 0),
  )
  const canStart = usable.length >= 2

  function toggle(id: string) {
    const next = new Set(excluded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExcluded(next)
  }

  async function start() {
    const items = await buildPracticeSession(seenLessons, {
      lessonIds: usable.map((l) => l.id),
      includeCards,
      includeExercises,
      size,
    })
    onStart(items)
  }

  return (
    <section>
      <h1>Práctica intercalada</h1>
      <p className="muted">
        Mezcla tarjetas y ejercicios de varias lecciones, sin dos seguidos del mismo tema. Así practicás
        reconocer qué herramienta usar en cada problema. <strong>No cambia</strong> cuándo vence cada tarjeta en
        tus repasos.
      </p>

      {seenLessons.length < 2 ? (
        <div className="card-box">
          <p>
            Necesitás haber abierto al menos <strong>2 lecciones</strong> para mezclar temas. Empezá por las{' '}
            <Link to="/rutas">rutas de aprendizaje</Link>.
          </p>
        </div>
      ) : (
        <div className="card-box stack">
          <fieldset className="field">
            <legend>
              <h2>Temas</h2>
            </legend>
            <ul className="list topic-checks">
              {seenLessons.map((l) => (
                <li key={l.id}>
                  <label className="radio">
                    <input type="checkbox" checked={!excluded.has(l.id)} onChange={() => toggle(l.id)} />
                    <span>
                      {l.title}{' '}
                      <small className="muted">
                        ({countFor(l.id, 'card')} tarjetas, {countFor(l.id, 'exercise')} ejercicios)
                      </small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="row-wrap">
            <label className="radio">
              <input type="checkbox" checked={includeCards} onChange={(e) => setIncludeCards(e.target.checked)} />
              Tarjetas
            </label>
            <label className="radio">
              <input
                type="checkbox"
                checked={includeExercises}
                onChange={(e) => setIncludeExercises(e.target.checked)}
              />
              Ejercicios
            </label>
            <label className="field">
              <span className="sr-only">Cantidad</span>
              <select value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Cantidad de ítems">
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    Hasta {s} ítems
                  </option>
                ))}
              </select>
            </label>
          </div>

          <small className="muted">
            Entran las tarjetas agregadas desde una lección, las de errores con lección, y las tuyas que tengan como
            etiqueta el id de una lección.
          </small>

          <div>
            <button type="button" className="btn btn-primary" onClick={start} disabled={!canStart}>
              Empezar práctica
            </button>
          </div>
          {!canStart && (
            <p className="text-error small" role="status">
              Elegí al menos 2 temas que tengan tarjetas o ejercicios.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Paso 2: la sesión
// ---------------------------------------------------------------------------

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

function PracticeSession({
  item,
  position,
  total,
  onAnswer,
  onQuit,
}: {
  item: PracticeItem
  position: number
  total: number
  onAnswer: (correct: boolean) => void
  onQuit: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [busy, setBusy] = useState(false)
  const lesson = getLesson(item.topic)

  const answerCard = useCallback(
    async (grade: Grade) => {
      if (item.kind !== 'card' || busy) return
      setBusy(true)
      await logPracticeAnswer(item.card.id, grade)
      onAnswer(grade >= 2) // "Difícil" también es recordar, con esfuerzo
    },
    [item, busy, onAnswer],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'BUTTON') return
        e.preventDefault()
        setRevealed(true)
      } else if (revealed && item.kind === 'card' && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        void answerCard(Number(e.key) as Grade)
      } else if (revealed && item.kind === 'exercise' && (e.key === '1' || e.key === '2')) {
        e.preventDefault()
        onAnswer(e.key === '2')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, item, answerCard, onAnswer])

  const faces = item.kind === 'card' ? cardFaces(item.note, item.card.ordinal) : null

  return (
    <section className="review">
      <div className="page-header">
        <h1>Práctica intercalada</h1>
        <p className="small muted">
          {position} de {total}
        </p>
      </div>
      <progress className="sr-only" value={position - 1} max={total} />

      <div className="card-box review-card">
        <p className="small muted">{item.kind === 'card' ? 'Tarjeta' : 'Ejercicio'}</p>
        {item.kind === 'card' && faces && !(revealed && item.note.type === 'cloze') && (
          <MarkdownView>{faces.question}</MarkdownView>
        )}
        {item.kind === 'exercise' && <MarkdownView>{item.exercise.statement}</MarkdownView>}

        <div aria-live="polite">
          {revealed && (
            <>
              {!(item.kind === 'card' && item.note.type === 'cloze') && <hr />}
              {item.kind === 'card' && faces && <MarkdownView>{faces.answer}</MarkdownView>}
              {item.kind === 'exercise' && (
                <>
                  {item.exercise.answer && <MarkdownView>{item.exercise.answer}</MarkdownView>}
                  {item.exercise.solution && (
                    <details>
                      <summary>Ver resolución</summary>
                      <MarkdownView>{item.exercise.solution}</MarkdownView>
                    </details>
                  )}
                  {!item.exercise.answer && !item.exercise.solution && (
                    <p className="muted">Este ejercicio no tiene respuesta cargada.</p>
                  )}
                </>
              )}
              <p className="small muted topic-reveal">Tema: {lesson?.title ?? item.topic}</p>
            </>
          )}
        </div>
      </div>

      <div className="review-controls">
        {!revealed ? (
          <button type="button" className="btn btn-primary btn-wide" onClick={() => setRevealed(true)}>
            Ver respuesta <kbd>Espacio</kbd>
          </button>
        ) : item.kind === 'card' ? (
          <div className="grade-buttons" role="group" aria-label="Calificar">
            {GRADE_BUTTONS.map(({ grade, label, className }) => (
              <button
                key={grade}
                type="button"
                className={`btn grade ${className}`}
                onClick={() => void answerCard(grade)}
                disabled={busy}
              >
                <span>{label}</span>
                <small>
                  <kbd>{grade}</kbd>
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="grade-buttons two" role="group" aria-label="¿Cómo te fue?">
            <button type="button" className="btn grade grade-again" onClick={() => onAnswer(false)}>
              <span>Me equivoqué</span>
              <small>
                <kbd>1</kbd>
              </small>
            </button>
            <button type="button" className="btn grade grade-good" onClick={() => onAnswer(true)}>
              <span>Me salió bien</span>
              <small>
                <kbd>2</kbd>
              </small>
            </button>
          </div>
        )}
      </div>

      <div className="row-wrap small muted review-footer">
        <button type="button" className="btn-link" onClick={onQuit}>
          Terminar ahora
        </button>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Paso 3: resumen
// ---------------------------------------------------------------------------

function PracticeSummary({ answers, onRestart }: { answers: Answer[]; onRestart: () => void }) {
  const correct = answers.filter((a) => a.correct).length
  const byTopic = new Map<string, { ok: number; total: number }>()
  for (const a of answers) {
    const t = byTopic.get(a.item.topic) ?? { ok: 0, total: 0 }
    t.total++
    if (a.correct) t.ok++
    byTopic.set(a.item.topic, t)
  }
  const failedExercises = answers.filter((a) => !a.correct && a.item.kind === 'exercise')

  return (
    <section>
      <h1>Resumen de la práctica</h1>
      {answers.length === 0 ? (
        <p className="muted">No respondiste ningún ítem.</p>
      ) : (
        <>
          <div className="card-box">
            <p className="big-number">
              {correct}/{answers.length} <span className="small muted">bien</span>
            </p>
          </div>
          <div className="card-box">
            <h2>Por tema</h2>
            <table className="summary-table">
              <thead>
                <tr>
                  <th scope="col">Tema</th>
                  <th scope="col">Bien</th>
                </tr>
              </thead>
              <tbody>
                {[...byTopic].map(([topic, t]) => (
                  <tr key={topic}>
                    <td>
                      <Link to={`/lecciones/${topic}`}>{getLesson(topic)?.title ?? topic}</Link>
                    </td>
                    <td>
                      {t.ok}/{t.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {failedExercises.length > 0 && (
            <div className="card-box">
              <h2>Ejercicios para anotar en el cuaderno de errores</h2>
              <ul>
                {failedExercises.map((a, i) => (
                  <li key={i}>
                    <Link to={`/errores/nuevo?leccion=${a.item.topic}`}>
                      {getLesson(a.item.topic)?.title ?? a.item.topic}
                    </Link>
                    : {a.item.kind === 'exercise' && <MarkdownView className="inline">{a.item.exercise.statement}</MarkdownView>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <div className="row-wrap">
        <button type="button" className="btn btn-primary" onClick={onRestart}>
          Otra práctica
        </button>
        <Link to="/" className="btn">
          Ir al inicio
        </Link>
      </div>
    </section>
  )
}
