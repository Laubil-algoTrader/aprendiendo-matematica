// Buscador de tarjetas: filtrar por texto, mazo y estado; editar, suspender o borrar.

import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { State } from 'ts-fsrs'
import { db } from '../../db/db'
import { CARD_TYPE_LABELS, deleteNote, setNoteSuspended } from '../../srs/notes'
import { formatInterval } from '../../srs/queue'
import type { Card, Note } from '../../types/user-data'

/** Quita tildes y mayúsculas para que "funcion" encuentre "Función". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** Resumen corto del estado de las tarjetas de una nota. */
function statusOf(cards: Card[], now: Date): { label: string; kind: string } {
  if (cards.length > 0 && cards.every((c) => c.suspended)) return { label: 'Suspendida', kind: 'muted' }
  const active = cards.filter((c) => !c.suspended)
  if (active.every((c) => c.fsrs.state === State.New)) return { label: 'Nueva', kind: 'new' }
  const nextDue = Math.min(...active.filter((c) => c.fsrs.state !== State.New).map((c) => c.fsrs.dueAt.getTime()))
  if (nextDue <= now.getTime()) return { label: 'Para repasar', kind: 'due' }
  return { label: `Vuelve en ${formatInterval(nextDue - now.getTime())}`, kind: 'muted' }
}

type StatusFilter = 'all' | 'active' | 'suspended'

export function CardsPage() {
  const [params, setParams] = useSearchParams()
  const deckFilter = params.get('mazo') ?? ''
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const decks = useLiveQuery(() => db.decks.orderBy('name').toArray(), [])
  const data = useLiveQuery(async () => {
    const notes = deckFilter
      ? await db.notes.where('deckId').equals(deckFilter).toArray()
      : await db.notes.toArray()
    const cards = await db.cards.where('noteId').anyOf(notes.map((n) => n.id)).toArray()
    return { notes, cards }
  }, [deckFilter])

  const deckName = useMemo(() => new Map(decks?.map((d) => [d.id, d.name])), [decks])

  const rows = useMemo(() => {
    if (!data) return []
    const now = new Date()
    const q = normalize(query.trim())
    const cardsByNote = new Map<string, Card[]>()
    for (const c of data.cards) cardsByNote.set(c.noteId, [...(cardsByNote.get(c.noteId) ?? []), c])
    return data.notes
      .filter((n) => !q || normalize(`${n.front} ${n.back} ${n.tags.join(' ')}`).includes(q))
      .map((note) => {
        const cards = cardsByNote.get(note.id) ?? []
        return { note, cards, suspended: cards.length > 0 && cards.every((c) => c.suspended), status: statusOf(cards, now) }
      })
      .filter((r) => status === 'all' || (status === 'suspended') === r.suspended)
      .sort((a, b) => b.note.updatedAt.getTime() - a.note.updatedAt.getTime())
  }, [data, query, status])

  async function handleDelete(note: Note) {
    if (window.confirm('¿Borrar esta nota con sus tarjetas e historial? No se puede deshacer.')) {
      await deleteNote(note.id)
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Tarjetas</h1>
        <Link to={`/tarjetas/nueva${deckFilter ? `?mazo=${deckFilter}` : ''}`} className="btn btn-primary">
          + Nueva tarjeta
        </Link>
      </div>

      <div className="card-box filters">
        <label className="field grow">
          <span>Buscar</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Texto o etiqueta…"
          />
        </label>
        <label className="field">
          <span>Mazo</span>
          <select
            value={deckFilter}
            onChange={(e) => setParams(e.target.value ? { mazo: e.target.value } : {})}
          >
            <option value="">Todos</option>
            {decks?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">Todas</option>
            <option value="active">Activas</option>
            <option value="suspended">Suspendidas</option>
          </select>
        </label>
      </div>

      <p className="muted small" role="status">
        {rows.length} {rows.length === 1 ? 'nota' : 'notas'}
      </p>

      <ul className="list">
        {rows.map(({ note, cards, suspended, status: st }) => (
          <li key={note.id} className="card-box note-row">
            <div className="note-text">
              <Link to={`/tarjetas/${note.id}`} className="note-front">
                {note.front.length > 140 ? `${note.front.slice(0, 140)}…` : note.front}
              </Link>
              <p className="muted small">
                {CARD_TYPE_LABELS[note.type]} · {deckName.get(note.deckId) ?? '—'} · {cards.length}{' '}
                {cards.length === 1 ? 'tarjeta' : 'tarjetas'} ·{' '}
                <span className={`badge badge-${st.kind}`}>{st.label}</span>
                {note.tags.length > 0 && <> · {note.tags.map((t) => `#${t}`).join(' ')}</>}
              </p>
            </div>
            <div className="actions">
              <Link to={`/tarjetas/${note.id}`} className="btn">
                Editar
              </Link>
              <button type="button" className="btn" onClick={() => setNoteSuspended(note.id, !suspended)}>
                {suspended ? 'Reactivar' : 'Suspender'}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => handleDelete(note)}>
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
