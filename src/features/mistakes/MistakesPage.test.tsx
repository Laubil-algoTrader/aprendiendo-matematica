// Tests de interfaz del cuaderno de errores.

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { content } from '../../content'
import { db } from '../../db/db'
import { createMistake } from '../../mistakes/mistakes'

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

const lesson = [...content.lessons.values()][0]

describe('cuaderno de errores', () => {
  it('registra un error desde una lección y crea su tarjeta', async () => {
    const user = userEvent.setup()
    renderAt(`/errores/nuevo?leccion=${lesson.id}`)

    // El tema se completa solo con el título de la lección.
    expect(await screen.findByLabelText('Tema')).toHaveValue(lesson.title)
    await user.type(screen.getByLabelText('Enunciado del ejercicio'), 'Resolver -2x > 6')
    await user.type(screen.getByLabelText('Qué hice mal'), 'No invertí la desigualdad')
    await user.click(screen.getByRole('radio', { name: /Álgebra/ }))
    await user.type(screen.getByLabelText(/Corrección/), 'x < -3')
    await user.click(screen.getByRole('button', { name: 'Guardar error' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Cuaderno de errores' })).toBeInTheDocument()
    expect(await screen.findByText('Resolver -2x > 6')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '✓ Ver tarjeta' })).toBeInTheDocument()
    const [m] = await db.mistakes.toArray()
    expect(m).toMatchObject({ lessonId: lesson.id, cause: 'algebra' })
    expect(await db.notes.count()).toBe(1)
  })

  it('no guarda si falta la causa', async () => {
    const user = userEvent.setup()
    renderAt('/errores/nuevo')
    await user.type(await screen.findByLabelText('Tema'), 'Física')
    await user.type(screen.getByLabelText('Enunciado del ejercicio'), 'a')
    await user.type(screen.getByLabelText('Qué hice mal'), 'b')
    await user.type(screen.getByLabelText(/Corrección/), 'c')
    await user.click(screen.getByRole('button', { name: 'Guardar error' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('causa')
    expect(await db.mistakes.count()).toBe(0)
  })

  it('filtra por causa y por tema', async () => {
    const user = userEvent.setup()
    const base = { statement: '', whatIDid: 'x', correction: 'y' }
    await createMistake({ ...base, topic: 'Trigonometría', cause: 'unidades', statement: 'Error A' })
    await createMistake({ ...base, topic: 'Trigonometría', cause: 'concepto', statement: 'Error B' })
    await createMistake({ ...base, topic: 'Cuadrática', cause: 'concepto', statement: 'Error C' })

    renderAt('/errores')
    await screen.findByText('Error A')

    await user.click(screen.getByRole('button', { name: /^Concepto/ }))
    await waitFor(() => expect(screen.queryByText('Error A')).not.toBeInTheDocument())
    expect(screen.getByText('Error B')).toBeInTheDocument()
    expect(screen.getByText('Error C')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Trigonometría/ }))
    await waitFor(() => expect(screen.queryByText('Error C')).not.toBeInTheDocument())
    expect(screen.getByText('Error B')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(await screen.findByText('Error A')).toBeInTheDocument()
  })

  it('convierte un error existente en tarjeta', async () => {
    const user = userEvent.setup()
    await createMistake({ topic: 'T', cause: 'distraccion', statement: 'Enunciado', whatIDid: 'x', correction: 'y' })
    renderAt('/errores')
    await user.click(await screen.findByRole('button', { name: 'Convertir en tarjeta' }))
    expect(await screen.findByRole('link', { name: '✓ Ver tarjeta' })).toBeInTheDocument()
    expect(await db.cards.count()).toBe(1)
  })
})
