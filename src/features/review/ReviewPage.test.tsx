// Tests de la interfaz de repaso y del editor de tarjetas.

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { db } from '../../db/db'
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

describe('sesión de repaso', () => {
  it('Espacio muestra la respuesta y 3 califica "Bien"', async () => {
    const user = userEvent.setup()
    const deck = await createDeck('Mate')
    await createNote({ deckId: deck.id, type: 'basic', front: 'Pregunta uno', back: 'Respuesta uno', tags: [] })

    renderAt('/repasar')
    expect(await screen.findByText('Pregunta uno')).toBeInTheDocument()
    expect(screen.queryByText('Respuesta uno')).not.toBeInTheDocument()

    await user.keyboard(' ')
    expect(await screen.findByText('Respuesta uno')).toBeInTheDocument()

    await user.keyboard('3')
    expect(await screen.findByText(/Listo por hoy/)).toBeInTheDocument()
    expect(await db.reviewLogs.count()).toBe(1)
    expect((await db.reviewLogs.toArray())[0].grade).toBe(3)
  })

  it('las teclas 1–4 no califican antes de mostrar la respuesta', async () => {
    const user = userEvent.setup()
    const deck = await createDeck('Mate')
    await createNote({ deckId: deck.id, type: 'basic', front: 'P', back: 'R', tags: [] })
    renderAt('/repasar')
    await screen.findByText('P')
    await user.keyboard('3')
    expect(await db.reviewLogs.count()).toBe(0)
  })

  it('"Otra vez" con el mouse y después deshacer con Ctrl+Z', async () => {
    const user = userEvent.setup()
    const deck = await createDeck('Mate')
    await createNote({ deckId: deck.id, type: 'basic', front: 'P', back: 'R', tags: [] })
    renderAt('/repasar')
    await user.click(await screen.findByRole('button', { name: /Mostrar respuesta/ }))
    await user.click(await screen.findByRole('button', { name: /Otra vez/ }))
    await waitFor(async () => expect(await db.reviewLogs.count()).toBe(1))
    await user.keyboard('{Control>}z{/Control}')
    await waitFor(async () => expect(await db.reviewLogs.count()).toBe(0))
  })

  it('sin tarjetas muestra el mensaje de fin', async () => {
    renderAt('/repasar')
    expect(await screen.findByText(/Listo por hoy/)).toBeInTheDocument()
  })
})

describe('editor de tarjetas', () => {
  it('crea una tarjeta cloze y muestra la vista previa', async () => {
    const user = userEvent.setup()
    renderAt('/tarjetas/nueva')
    await user.selectOptions(await screen.findByLabelText('Tipo'), 'cloze')
    // userEvent interpreta { y [ como teclas especiales: se escriben duplicándolos.
    await user.type(screen.getByLabelText('Texto con huecos'), 'Mendoza es {{{{c1::linda}}')
    expect(await screen.findByText(/Vista previa \(1 tarjeta\)/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText(/Tarjeta agregada/)).toBeInTheDocument()

    // Sin mazos previos, se creó "General" automáticamente.
    const decks = await db.decks.toArray()
    expect(decks.map((d) => d.name)).toEqual(['General'])
    expect(await db.cards.count()).toBe(1)
  })
})
