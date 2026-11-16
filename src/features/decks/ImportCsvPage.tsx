// Importar tarjetas desde un archivo CSV: elegir archivo → revisar → importar.

import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { importCsvRows, parseCsvNotes, type CsvParseResult } from '../../lib/csv'
import { getOrCreateDeck } from '../../srs/notes'

const NEW_DECK = '__nuevo__'
const PREVIEW_ROWS = 5

export function ImportCsvPage() {
  const decks = useLiveQuery(() => db.decks.orderBy('name').toArray(), [])
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<CsvParseResult | null>(null)
  const [deckChoice, setDeckChoice] = useState(NEW_DECK)
  const [newDeckName, setNewDeckName] = useState('')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ kind: 'ok' | 'error'; text: string; deckId?: string } | null>(null)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setResult(null)
    if (!file) return
    setFileName(file.name)
    setParsed(parseCsvNotes(await file.text()))
    // Proponemos como nombre de mazo el nombre del archivo, sin extensión.
    if (!newDeckName) setNewDeckName(file.name.replace(/\.[^.]+$/, ''))
  }

  async function handleImport() {
    if (!parsed) return
    setBusy(true)
    try {
      const deckId = deckChoice === NEW_DECK ? (await getOrCreateDeck(newDeckName)).id : deckChoice
      const { added, skipped } = await importCsvRows(parsed.rows, deckId, skipDuplicates)
      setResult({
        kind: 'ok',
        deckId,
        text: `Se importaron ${added} ${added === 1 ? 'nota' : 'notas'}${skipped ? ` (${skipped} repetidas se saltearon)` : ''}.`,
      })
      setParsed(null)
      setFileName(null)
    } catch (e) {
      setResult({ kind: 'error', text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <p>
        <Link to="/mazos">← Mazos</Link>
      </p>
      <h1>Importar tarjetas desde CSV</h1>

      <div className="card-box stack">
        <p>
          El archivo debe tener <strong>tres columnas</strong>: <code>frente</code>, <code>dorso</code> y{' '}
          <code>etiquetas</code> (separadas por espacios). Podés armarlo en cualquier planilla (Excel, LibreOffice,
          Google Sheets) y guardarlo como CSV. La primera fila puede ser el encabezado.
        </p>
        <pre className="code-sample">
          {`frente,dorso,etiquetas
¿Cuánto es $|-3|$?,$3$,valor-absoluto
"La resolvente es $x = {{c1::\\frac{-b \\pm \\sqrt{\\Delta}}{2a}}}$",,cuadratica`}
        </pre>
        <small className="muted">
          Si el frente tiene huecos <code>{'{{c1::...}}'}</code>, se importa como cloze. Comas o saltos de línea
          dentro de un texto: poné ese texto entre comillas dobles (las planillas lo hacen solas).
        </small>
        <label className="field">
          <span>Archivo CSV</span>
          <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={handleFile} />
        </label>
      </div>

      {result && (
        <p role="status" className={result.kind === 'ok' ? 'text-ok' : 'text-error'}>
          {result.text}{' '}
          {result.deckId && <Link to={`/tarjetas?mazo=${result.deckId}`}>Ver las tarjetas</Link>}
        </p>
      )}

      {parsed && (
        <div className="card-box stack" aria-label="Revisión del archivo">
          <h2>Revisión de {fileName}</h2>
          <p>
            <strong>{parsed.rows.length}</strong> {parsed.rows.length === 1 ? 'fila lista' : 'filas listas'} para
            importar
            {parsed.problems.length > 0 && (
              <>
                {' · '}
                <span className="text-error">{parsed.problems.length} con problemas (no se importan)</span>
              </>
            )}
          </p>

          {parsed.rows.length > 0 && (
            <div className="table-scroll">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th scope="col">Fila</th>
                    <th scope="col">Frente</th>
                    <th scope="col">Dorso</th>
                    <th scope="col">Etiquetas</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, PREVIEW_ROWS).map((r) => (
                    <tr key={r.line}>
                      <td>{r.line}</td>
                      <td>{r.front}</td>
                      <td>{r.back}</td>
                      <td>{r.tags.join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > PREVIEW_ROWS && (
                <p className="small muted">… y {parsed.rows.length - PREVIEW_ROWS} más.</p>
              )}
            </div>
          )}

          {parsed.problems.length > 0 && (
            <details>
              <summary>Ver problemas</summary>
              <ul className="small">
                {parsed.problems.map((p, i) => (
                  <li key={i}>
                    Fila {p.line}: {p.message}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {parsed.rows.length > 0 && (
            <>
              <div className="row-wrap">
                <label className="field">
                  <span>Mazo</span>
                  <select value={deckChoice} onChange={(e) => setDeckChoice(e.target.value)}>
                    <option value={NEW_DECK}>Mazo nuevo…</option>
                    {decks?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                {deckChoice === NEW_DECK && (
                  <label className="field grow">
                    <span>Nombre del mazo nuevo</span>
                    <input value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)} />
                  </label>
                )}
              </div>
              <label className="radio">
                <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
                Saltear filas cuyo frente ya existe en ese mazo
              </label>
              <div>
                <button type="button" className="btn btn-primary" onClick={handleImport} disabled={busy}>
                  {busy ? 'Importando…' : `Importar ${parsed.rows.length} ${parsed.rows.length === 1 ? 'fila' : 'filas'}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
