// Cuaderno de errores: resumen por causa y por tema, filtros y lista.
//
// Los filtros se guardan en la dirección (?causa=algebra&tema=...), así se
// puede volver atrás o compartir el enlace sin perderlos.

import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { MarkdownView } from '../../components/MarkdownView'
import { getLesson } from '../../content'
import { db } from '../../db/db'
import { CAUSE_LABELS, countByCause, countByTopic, deleteMistake, mistakeToCard } from '../../mistakes/mistakes'
import type { Mistake, MistakeCause } from '../../types/user-data'

const CAUSES = Object.keys(CAUSE_LABELS) as MistakeCause[]

export function MistakesPage() {
  const [params, setParams] = useSearchParams()
  const cause = (params.get('causa') ?? '') as MistakeCause | ''
  const topic = params.get('tema') ?? ''

  const all = useLiveQuery(() => db.mistakes.orderBy('createdAt').reverse().toArray(), [])
  // Ids de notas que siguen existiendo (por si borraste la tarjeta de un error).
  const existingNotes = useLiveQuery(async () => {
    const ids = (all ?? []).flatMap((m) => (m.noteId ? [m.noteId] : []))
    return new Set((await db.notes.bulkGet(ids)).filter(Boolean).map((n) => n!.id))
  }, [all])

  const byCause = useMemo(() => countByCause(all ?? []), [all])
  const byTopic = useMemo(() => countByTopic(all ?? []), [all])
  const filtered = (all ?? []).filter((m) => (!cause || m.cause === cause) && (!topic || m.topic === topic))
  const max = Math.max(1, ...Object.values(byCause), ...byTopic.map((t) => t.count))

  /** Cambia un filtro; tocar el que ya está activo lo quita. */
  function toggle(key: 'causa' | 'tema', value: string) {
    const next = new URLSearchParams(params)
    if (!value || next.get(key) === value) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  if (!all) return <p className="muted">Cargando…</p>

  return (
    <section>
      <div className="page-header">
        <h1>Cuaderno de errores</h1>
        <Link to="/errores/nuevo" className="btn btn-primary">
          + Registrar error
        </Link>
      </div>

      {all.length === 0 ? (
        <div className="card-box">
          <p>
            Anotá acá cada error que cometas en un ejercicio: qué hiciste mal, por qué y cómo se corrige. Con el
            tiempo vas a ver en qué temas y por qué causas te equivocás más, y podés convertir cada error en una
            tarjeta para repasarlo.
          </p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <section className="card-box" aria-labelledby="por-causa">
              <h2 id="por-causa">Por causa</h2>
              <ul className="bar-list">
                {CAUSES.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      className={`bar-row ${cause === c ? 'selected' : ''}`}
                      aria-pressed={cause === c}
                      onClick={() => toggle('causa', c)}
                    >
                      <span className="bar-label">{CAUSE_LABELS[c]}</span>
                      <span className="bar" style={{ width: `${(byCause[c] / max) * 100}%` }} aria-hidden="true" />
                      <span className="bar-count">{byCause[c]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card-box" aria-labelledby="por-tema">
              <h2 id="por-tema">Por tema</h2>
              <ul className="bar-list">
                {byTopic.map(({ topic: t, count }) => (
                  <li key={t}>
                    <button
                      type="button"
                      className={`bar-row ${topic === t ? 'selected' : ''}`}
                      aria-pressed={topic === t}
                      onClick={() => toggle('tema', t)}
                    >
                      <span className="bar-label">{t}</span>
                      <span className="bar" style={{ width: `${(count / max) * 100}%` }} aria-hidden="true" />
                      <span className="bar-count">{count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="row-wrap small" role="status">
            <span>
              Mostrando {filtered.length} de {all.length}
              {cause && ` · causa: ${CAUSE_LABELS[cause]}`}
              {topic && ` · tema: ${topic}`}
            </span>
            {(cause || topic) && (
              <button type="button" className="btn-link" onClick={() => setParams({})}>
                Quitar filtros
              </button>
            )}
          </div>

          <ul className="list">
            {filtered.map((m) => (
              <MistakeItem key={m.id} mistake={m} hasCard={!!m.noteId && !!existingNotes?.has(m.noteId)} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function MistakeItem({ mistake: m, hasCard }: { mistake: Mistake; hasCard: boolean }) {
  const [busy, setBusy] = useState(false)
  const lesson = m.lessonId ? getLesson(m.lessonId) : undefined

  async function toCard() {
    setBusy(true)
    try {
      await mistakeToCard(m.id)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    const extra = hasCard ? ' La tarjeta de repaso que creaste a partir de él se mantiene.' : ''
    if (window.confirm(`¿Borrar este error del cuaderno?${extra}`)) await deleteMistake(m.id)
  }

  return (
    <li className="card-box mistake">
      <p className="small muted">
        <strong>{m.topic}</strong>
        {lesson && (
          <>
            {' · '}
            <Link to={`/lecciones/${lesson.id}`}>{lesson.title}</Link>
          </>
        )}
        {' · '}
        <span className={`badge cause-${m.cause}`}>{CAUSE_LABELS[m.cause]}</span>
        {' · '}
        {m.createdAt.toLocaleDateString('es-AR')}
      </p>
      <MarkdownView>{m.statement}</MarkdownView>
      <details>
        <summary>Qué hice mal y la corrección</summary>
        <div className="mistake-detail">
          <h3>Qué hice mal</h3>
          <MarkdownView>{m.whatIDid}</MarkdownView>
          <h3>Corrección</h3>
          <MarkdownView>{m.correction}</MarkdownView>
        </div>
      </details>
      <div className="actions">
        <Link to={`/errores/${m.id}`} className="btn">
          Editar
        </Link>
        {hasCard ? (
          <Link to={`/tarjetas/${m.noteId}`} className="btn">
            ✓ Ver tarjeta
          </Link>
        ) : (
          <button type="button" className="btn" onClick={toCard} disabled={busy}>
            Convertir en tarjeta
          </button>
        )}
        <button type="button" className="btn btn-danger" onClick={remove}>
          Borrar
        </button>
      </div>
    </li>
  )
}
