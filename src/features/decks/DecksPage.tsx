// Lista de mazos con lo que hay para repasar hoy en cada uno.

import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { createDeck, deleteDeck, renameDeck } from '../../srs/notes'
import { getDailyQueue } from '../../srs/queue'
import type { Deck } from '../../types/user-data'

interface DeckRow {
  deck: Deck
  total: number
  due: number
  fresh: number
}

export function DecksPage() {
  const rows = useLiveQuery(async (): Promise<DeckRow[]> => {
    const decks = await db.decks.orderBy('name').toArray()
    return Promise.all(
      decks.map(async (deck) => {
        const [total, queue] = await Promise.all([
          db.cards.where('deckId').equals(deck.id).count(),
          getDailyQueue({ deckId: deck.id }),
        ])
        return {
          deck,
          total,
          due: queue.counts.learning + queue.counts.review,
          fresh: queue.counts.new,
        }
      }),
    )
  }, [])

  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    try {
      await createDeck(newName)
      setNewName('')
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleRename(deck: Deck) {
    const name = window.prompt('Nuevo nombre del mazo:', deck.name)
    if (name === null) return
    try {
      await renameDeck(deck.id, name)
    } catch (e) {
      window.alert((e as Error).message)
    }
  }

  async function handleDelete(row: DeckRow) {
    const ok = window.confirm(
      `¿Borrar el mazo "${row.deck.name}" con sus ${row.total} tarjetas y todo su historial? No se puede deshacer.`,
    )
    if (ok) await deleteDeck(row.deck.id)
  }

  const totalDue = rows?.reduce((s, r) => s + r.due + r.fresh, 0) ?? 0

  return (
    <section>
      <div className="page-header">
        <h1>Mazos</h1>
        <div className="actions">
          <Link to="/tarjetas" className="btn">
            Buscar tarjetas
          </Link>
          <Link to="/tarjetas/nueva" className="btn btn-primary">
            + Nueva tarjeta
          </Link>
        </div>
      </div>

      {rows && rows.length > 0 && (
        <p>
          <Link to="/repasar" className="btn btn-primary">
            Repasar todo ({totalDue})
          </Link>
        </p>
      )}

      {rows === undefined ? (
        <p className="muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="muted">Todavía no tenés mazos. Creá uno abajo o agregá una tarjeta.</p>
      ) : (
        <ul className="list">
          {rows.map((row) => (
            <li key={row.deck.id} className="card-box deck-row">
              <div className="deck-info">
                <h2>{row.deck.name}</h2>
                <p className="muted small">
                  {row.total} tarjetas ·{' '}
                  <span className="badge badge-due">{row.due} para repasar</span>{' '}
                  <span className="badge badge-new">{row.fresh} nuevas</span>
                </p>
              </div>
              <div className="actions">
                <Link to={`/repasar?mazo=${row.deck.id}`} className="btn btn-primary">
                  Repasar
                </Link>
                <Link to={`/tarjetas?mazo=${row.deck.id}`} className="btn">
                  Tarjetas
                </Link>
                <button type="button" className="btn" onClick={() => handleRename(row.deck)}>
                  Renombrar
                </button>
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(row)}>
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="card-box inline-form">
        <label className="field grow">
          <span>Nuevo mazo</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej.: Trigonometría" />
        </label>
        <button type="submit" className="btn">
          Crear mazo
        </button>
        {error && (
          <p role="alert" className="text-error full">
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
