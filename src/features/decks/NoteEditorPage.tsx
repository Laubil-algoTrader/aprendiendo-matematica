// Crear o editar una nota, con vista previa de cada tarjeta que genera.
//
// /tarjetas/nueva      → crear (opcional ?mazo=ID para preseleccionar el mazo)
// /tarjetas/:noteId    → editar

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { MarkdownView } from '../../components/MarkdownView'
import { db } from '../../db/db'
import { clozeOrdinals } from '../../srs/cloze'
import {
  CARD_TYPE_LABELS,
  cardFaces,
  createNote,
  deleteNote,
  getOrCreateDeck,
  ordinalsFor,
  parseTags,
  updateNote,
  validateNote,
} from '../../srs/notes'
import type { CardType } from '../../types/user-data'

const DEFAULT_DECK_NAME = 'General'

export function NoteEditorPage() {
  const { noteId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const isNew = !noteId

  const decks = useLiveQuery(() => db.decks.orderBy('name').toArray(), [])
  const existing = useLiveQuery(() => (noteId ? db.notes.get(noteId) : undefined), [noteId])

  const [deckId, setDeckId] = useState(params.get('mazo') ?? '')
  const [type, setType] = useState<CardType>('basic')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [tags, setTags] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const loadedRef = useRef(false)
  const frontRef = useRef<HTMLTextAreaElement>(null)

  // Al editar, cargamos la nota una sola vez en el formulario.
  useEffect(() => {
    if (existing && !loadedRef.current) {
      loadedRef.current = true
      setDeckId(existing.deckId)
      setType(existing.type)
      setFront(existing.front)
      setBack(existing.back)
      setTags(existing.tags.join(' '))
    }
  }, [existing])

  // Si no hay mazo elegido, preseleccionamos el primero.
  useEffect(() => {
    if (!deckId && decks && decks.length > 0) setDeckId(decks[0].id)
  }, [decks, deckId])

  if (noteId && existing === undefined && !loadedRef.current) {
    return <p className="muted">Cargando…</p>
  }

  const draft = { type, front, back }
  const validation = front.trim() ? validateNote(draft) : null
  const previews = validation ? [] : ordinalsFor(draft).map((ord) => ({ ord, faces: cardFaces(draft, ord) }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      // Si todavía no hay mazos, creamos uno "General" automáticamente.
      const targetDeck = deckId || (await getOrCreateDeck(DEFAULT_DECK_NAME)).id
      const input = { deckId: targetDeck, type, front, back, tags: parseTags(tags) }
      if (isNew) {
        await createNote(input)
        // Dejamos mazo, tipo y etiquetas para cargar varias seguidas más rápido.
        setFront('')
        setBack('')
        setDeckId(targetDeck)
        setMessage({ kind: 'ok', text: 'Tarjeta agregada. Podés cargar otra.' })
        frontRef.current?.focus()
      } else {
        await updateNote(noteId, input)
        navigate(-1)
      }
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message })
    }
  }

  async function handleDelete() {
    if (noteId && window.confirm('¿Borrar esta nota con sus tarjetas e historial? No se puede deshacer.')) {
      await deleteNote(noteId)
      navigate('/tarjetas', { replace: true })
    }
  }

  /** Envuelve el texto seleccionado en el frente con el próximo hueco {{cN::...}}. */
  function insertCloze() {
    const el = frontRef.current
    if (!el) return
    const next = Math.max(0, ...clozeOrdinals(front)) + 1
    const { selectionStart: s, selectionEnd: e } = el
    const selected = front.slice(s, e) || 'respuesta'
    const updated = `${front.slice(0, s)}{{c${next}::${selected}}}${front.slice(e)}`
    setFront(updated)
    requestAnimationFrame(() => {
      el.focus()
      const start = s + `{{c${next}::`.length
      el.setSelectionRange(start, start + selected.length)
    })
  }

  return (
    <section>
      <p>
        <Link to="/tarjetas">← Tarjetas</Link>
      </p>
      <h1>{isNew ? 'Nueva tarjeta' : 'Editar tarjeta'}</h1>

      <form onSubmit={handleSubmit} className="stack card-box">
        <div className="row-wrap">
          <label className="field">
            <span>Mazo</span>
            <select value={deckId} onChange={(e) => setDeckId(e.target.value)}>
              {decks?.length === 0 && <option value="">{DEFAULT_DECK_NAME} (se crea al guardar)</option>}
              {decks?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo</span>
            <select value={type} onChange={(e) => setType(e.target.value as CardType)}>
              {Object.entries(CARD_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>{type === 'cloze' ? 'Texto con huecos' : 'Frente'}</span>
          <textarea ref={frontRef} rows={4} value={front} onChange={(e) => setFront(e.target.value)} />
        </label>
        {type === 'cloze' && (
          <div className="row-wrap">
            <button type="button" className="btn" onClick={insertCloze}>
              Convertir selección en hueco
            </button>
            <small className="muted">
              Sintaxis: <code>{'{{c1::respuesta}}'}</code> o <code>{'{{c1::respuesta::pista}}'}</code>. Cada
              número genera una tarjeta.
            </small>
          </div>
        )}

        <label className="field">
          <span>{type === 'cloze' ? 'Extra (opcional, se ve al mostrar la respuesta)' : 'Dorso'}</span>
          <textarea rows={3} value={back} onChange={(e) => setBack(e.target.value)} />
        </label>

        <label className="field">
          <span>Etiquetas (separadas por espacios)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="algebra inecuaciones" />
        </label>

        <small className="muted">
          Podés usar Markdown (**negrita**, listas) y fórmulas: <code>$x^2$</code> en línea o{' '}
          <code>$$\frac{'{a}{b}'}$$</code> en bloque.
        </small>

        <div className="row-wrap">
          <button type="submit" className="btn btn-primary">
            {isNew ? 'Agregar' : 'Guardar cambios'}
          </button>
          {!isNew && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              Borrar nota
            </button>
          )}
        </div>
        {(message || validation) && (
          <p role="status" className={message?.kind === 'ok' && !validation ? 'text-ok' : 'text-error'}>
            {validation ?? message?.text}
          </p>
        )}
      </form>

      {previews.length > 0 && (
        <section aria-label="Vista previa">
          <h2>
            Vista previa ({previews.length} {previews.length === 1 ? 'tarjeta' : 'tarjetas'})
          </h2>
          {previews.map(({ ord, faces }) => (
            <div key={ord} className="card-box preview">
              <MarkdownView>{faces.question}</MarkdownView>
              <hr />
              <MarkdownView>{faces.answer}</MarkdownView>
            </div>
          ))}
        </section>
      )}
    </section>
  )
}
