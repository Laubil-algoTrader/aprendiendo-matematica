// Registrar o editar un error.
//
// /errores/nuevo                  → registrar (opcional ?leccion=ID para preseleccionar)
// /errores/:mistakeId             → editar

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { content, getLesson } from '../../content'
import { db } from '../../db/db'
import {
  CAUSE_HINTS,
  CAUSE_LABELS,
  createMistake,
  mistakeToCard,
  updateMistake,
  validateMistake,
  type MistakeInput,
} from '../../mistakes/mistakes'
import type { MistakeCause } from '../../types/user-data'

const CAUSES = Object.keys(CAUSE_LABELS) as MistakeCause[]

export function MistakeEditorPage() {
  const { mistakeId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isNew = !mistakeId

  const existing = useLiveQuery(() => (mistakeId ? db.mistakes.get(mistakeId) : undefined), [mistakeId])
  // Temas ya usados, para sugerirlos mientras escribís.
  const knownTopics = useLiveQuery(async () => [...new Set(await db.mistakes.orderBy('topic').keys())] as string[], [])

  const initialLesson = params.get('leccion') ?? ''
  const [lessonId, setLessonId] = useState(initialLesson)
  const [topic, setTopic] = useState(getLesson(initialLesson)?.title ?? '')
  const [statement, setStatement] = useState('')
  const [whatIDid, setWhatIDid] = useState('')
  const [cause, setCause] = useState<MistakeCause | ''>('')
  const [correction, setCorrection] = useState('')
  const [makeCard, setMakeCard] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (existing && !loaded.current) {
      loaded.current = true
      setLessonId(existing.lessonId ?? '')
      setTopic(existing.topic)
      setStatement(existing.statement)
      setWhatIDid(existing.whatIDid)
      setCause(existing.cause)
      setCorrection(existing.correction)
    }
  }, [existing])

  if (mistakeId && existing === undefined && !loaded.current) return <p className="muted">Cargando…</p>

  /** Al elegir una lección, si el tema estaba vacío (o era el de la lección anterior), lo completamos. */
  function chooseLesson(id: string) {
    const previousTitle = getLesson(lessonId)?.title
    setLessonId(id)
    if (!topic.trim() || topic === previousTitle) setTopic(getLesson(id)?.title ?? '')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const input: MistakeInput = {
      ...(lessonId ? { lessonId } : {}),
      topic,
      statement,
      whatIDid,
      cause: cause as MistakeCause,
      correction,
    }
    const problem = cause ? validateMistake(input) : 'Elegí una causa.'
    if (problem) {
      setError(problem)
      return
    }
    try {
      if (isNew) {
        const m = await createMistake(input)
        if (makeCard) await mistakeToCard(m.id)
      } else {
        await updateMistake(mistakeId, input)
      }
      navigate('/errores')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section>
      <p>
        <Link to="/errores">← Cuaderno de errores</Link>
      </p>
      <h1>{isNew ? 'Registrar error' : 'Editar error'}</h1>

      <form onSubmit={handleSubmit} className="stack card-box" noValidate>
        <div className="row-wrap">
          <label className="field grow">
            <span>Lección (opcional)</span>
            <select value={lessonId} onChange={(e) => chooseLesson(e.target.value)}>
              <option value="">— Ninguna —</option>
              {content.routes.map((route) =>
                route.modules
                  .filter((m) => m.lessons.length > 0)
                  .map((m) => (
                    <optgroup key={`${route.id}/${m.id}`} label={`${route.title} › ${m.title}`}>
                      {m.lessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.title}
                        </option>
                      ))}
                    </optgroup>
                  )),
              )}
            </select>
          </label>
          <label className="field grow">
            <span>Tema</span>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} list="temas" required />
            <datalist id="temas">
              {knownTopics?.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
        </div>

        <label className="field">
          <span>Enunciado del ejercicio</span>
          <textarea rows={3} value={statement} onChange={(e) => setStatement(e.target.value)} required />
        </label>

        <label className="field">
          <span>Qué hice mal</span>
          <textarea rows={2} value={whatIDid} onChange={(e) => setWhatIDid(e.target.value)} required />
        </label>

        <fieldset className="field">
          <legend>Causa</legend>
          <div className="cause-options">
            {CAUSES.map((c) => (
              <label key={c} className={`cause-option ${cause === c ? 'selected' : ''}`}>
                <input type="radio" name="causa" value={c} checked={cause === c} onChange={() => setCause(c)} />
                <span>
                  <strong>{CAUSE_LABELS[c]}</strong>
                  <small className="muted">{CAUSE_HINTS[c]}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>Corrección (cómo se hace bien)</span>
          <textarea rows={3} value={correction} onChange={(e) => setCorrection(e.target.value)} required />
        </label>

        <small className="muted">Podés usar Markdown y fórmulas, por ejemplo $x^2$.</small>

        {isNew && (
          <label className="radio">
            <input type="checkbox" checked={makeCard} onChange={(e) => setMakeCard(e.target.checked)} />
            Crear también una tarjeta de repaso (mazo "Cuaderno de errores")
          </label>
        )}

        <div>
          <button type="submit" className="btn btn-primary">
            {isNew ? 'Guardar error' : 'Guardar cambios'}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
