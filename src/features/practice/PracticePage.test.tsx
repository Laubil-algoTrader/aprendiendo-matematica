// Tests de interfaz de la práctica intercalada.

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { content } from '../../content'
import { db } from '../../db/db'

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

const lessons = [...content.lessons.values()].filter((l) => l.exercises.length > 0)

describe('práctica intercalada', () => {
  it('pide al menos 2 lecciones vistas', async () => {
    renderAt('/practica')
    expect(await screen.findByText(/al menos/)).toHaveTextContent('2 lecciones')
  })

  it('recorre una sesión con el teclado y muestra el resumen', async () => {
    const user = userEvent.setup()
    const [a, b] = lessons
    for (const l of [a, b]) await db.lessonProgress.put({ lessonId: l.id, status: 'seen', updatedAt: new Date() })

    renderAt('/practica')
    await user.click(await screen.findByRole('checkbox', { name: 'Tarjetas' }))
    await user.selectOptions(screen.getByLabelText('Cantidad de ítems'), '10')
    await user.click(screen.getByRole('button', { name: 'Empezar práctica' }))

    const total = Math.min(10, a.exercises.length + b.exercises.length)
    const topics: string[] = []
    for (let i = 1; i <= total; i++) {
      await screen.findByText(`${i} de ${total}`)
      // El tema no se ve hasta mostrar la respuesta.
      expect(screen.queryByText(/^Tema:/)).not.toBeInTheDocument()
      await user.keyboard(' ')
      topics.push((await screen.findByText(/^Tema:/)).textContent!)
      await user.keyboard(i === 1 ? '1' : '2') // el primero "me equivoqué", el resto bien
    }

    expect(await screen.findByRole('heading', { name: 'Resumen de la práctica' })).toBeInTheDocument()
    expect(document.querySelector('.big-number')?.textContent).toContain(`${total - 1}/${total}`)
    // Intercalado: nunca dos seguidos del mismo tema.
    expect(topics.some((t, i) => i > 0 && topics[i - 1] === t)).toBe(false)
    // El ejercicio fallado aparece para anotarlo en el cuaderno de errores.
    expect(screen.getByRole('heading', { name: /cuaderno de errores/ })).toBeInTheDocument()
  })

  it('las tarjetas en práctica se registran sin cambiar su programación', async () => {
    const user = userEvent.setup()
    const [a, b] = lessons
    for (const l of [a, b]) await db.lessonProgress.put({ lessonId: l.id, status: 'seen', updatedAt: new Date() })
    // Una tarjeta por lección, agregadas a mano desde las sugeridas.
    const { addSuggestedCards } = await import('../../content/suggested')
    await addSuggestedCards(a, 'Mate', [a.suggestedCards[0]])
    await addSuggestedCards(b, 'Mate', [b.suggestedCards[0]])
    const before = await db.cards.toArray()

    renderAt('/practica')
    await user.click(await screen.findByRole('checkbox', { name: 'Ejercicios' }))
    await user.click(screen.getByRole('button', { name: 'Empezar práctica' }))
    for (let i = 1; i <= before.length; i++) {
      await screen.findByText(`${i} de ${before.length}`)
      await user.keyboard(' ')
      await screen.findByText(/^Tema:/)
      await user.keyboard('1')
    }
    await screen.findByRole('heading', { name: 'Resumen de la práctica' })
    await waitFor(async () => expect(await db.reviewLogs.where('mode').equals('practice').count()).toBe(before.length))
    expect(await db.cards.toArray()).toEqual(before)
  })
})
