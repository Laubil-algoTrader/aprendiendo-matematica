// Tests de interfaz: importar CSV y backup desde Ajustes.

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../App'
import { db } from '../../db/db'
import { exportBackup, serializeBackup } from '../../lib/backup'
import { createDeck, createNote } from '../../srs/notes'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('importar CSV', () => {
  it('revisa el archivo, muestra problemas e importa a un mazo nuevo', async () => {
    const user = userEvent.setup()
    renderAt('/mazos/importar')
    const csv = 'frente,dorso,etiquetas\n¿2+2?,4,aritmetica\nsin dorso,,\n¿3·3?,9,aritmetica\n'
    await user.upload(await screen.findByLabelText('Archivo CSV'), new File([csv], 'Cuentas.csv', { type: 'text/csv' }))

    expect(await screen.findByText(/con problemas/)).toHaveTextContent('1 con problemas')
    expect(screen.getByLabelText('Nombre del mazo nuevo')).toHaveValue('Cuentas')
    await user.click(screen.getByRole('button', { name: 'Importar 2 filas' }))

    expect(await screen.findByText(/Se importaron 2 notas/)).toBeInTheDocument()
    const [deck] = await db.decks.toArray()
    expect(deck.name).toBe('Cuentas')
    expect(await db.cards.where('deckId').equals(deck.id).count()).toBe(2)
  })
})

describe('backup en Ajustes', () => {
  it('importar un backup reemplaza los datos después de confirmar', async () => {
    const user = userEvent.setup()
    // Preparamos un backup con un mazo "Del backup" y después dejamos otro mazo en la base.
    const deck = await createDeck('Del backup')
    await createNote({ deckId: deck.id, type: 'basic', front: 'P', back: 'R', tags: [] })
    const text = serializeBackup(await exportBackup())
    await Promise.all(db.tables.map((t) => t.clear()))
    await createDeck('Actual')

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderAt('/ajustes')
    await user.upload(
      await screen.findByLabelText('Importar backup…'),
      new File([text], 'backup.json', { type: 'application/json' }),
    )
    expect(await screen.findByText('Datos importados correctamente.')).toBeInTheDocument()
    expect(confirm.mock.calls[0][0]).toContain('1 mazos, 1 notas y 1 tarjetas')
    expect((await db.decks.toArray()).map((d) => d.name)).toEqual(['Del backup'])
  })

  it('si no se confirma, no cambia nada', async () => {
    const user = userEvent.setup()
    const text = serializeBackup(await exportBackup())
    await createDeck('Actual')
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderAt('/ajustes')
    await user.upload(await screen.findByLabelText('Importar backup…'), new File([text], 'b.json'))
    await waitFor(async () => expect((await db.decks.toArray()).map((d) => d.name)).toEqual(['Actual']))
  })

  it('muestra un error claro con un archivo que no es backup', async () => {
    const user = userEvent.setup()
    renderAt('/ajustes')
    await user.upload(await screen.findByLabelText('Importar backup…'), new File(['{"hola":1}'], 'x.json'))
    expect(await screen.findByText('Este archivo no es un backup de esta app.')).toBeInTheDocument()
  })

  it('exportar descarga un archivo con fecha en el nombre', async () => {
    const user = userEvent.setup()
    const createUrl = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderAt('/ajustes')
    await user.click(await screen.findByRole('button', { name: 'Descargar backup (JSON)' }))
    await waitFor(() => expect(click).toHaveBeenCalled())
    const anchor = click.mock.contexts[0] as HTMLAnchorElement
    expect(anchor.download).toMatch(/^estudiar-backup-\d{4}-\d{2}-\d{2}\.json$/)
  })
})
