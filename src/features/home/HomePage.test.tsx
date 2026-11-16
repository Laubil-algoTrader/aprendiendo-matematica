// Tests del panel de inicio.

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../App'
import { content } from '../../content'
import { db } from '../../db/db'
import { createDeck, createNote } from '../../srs/notes'
import { getDailyQueue, gradeCard } from '../../srs/queue'

/** Texto completo de los números grandes del panel (pendientes y racha). */
function bigNumbers(): string[] {
  return [...document.querySelectorAll('.big-number')].map((e) => e.textContent!.replace(/\s+/g, ' ').trim())
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('panel de inicio', () => {
  it('sin tarjetas invita a agregarlas y la racha está en cero', async () => {
    renderHome()
    expect(await screen.findByText(/Todavía no tenés tarjetas/)).toBeInTheDocument()
    expect(bigNumbers()).toContain('🔥 0 días seguidos')
  })

  it('muestra las tarjetas pendientes y, después de repasar, la racha', async () => {
    const deck = await createDeck('Mate')
    for (const f of ['a', 'b', 'c']) await createNote({ deckId: deck.id, type: 'basic', front: f, back: 'x', tags: [] })
    const { next } = await getDailyQueue()
    await gradeCard(next!.id, 4)

    renderHome()
    expect(await screen.findByRole('link', { name: 'Repasar ahora' })).toBeInTheDocument()
    expect(bigNumbers()).toEqual(['2 tarjetas pendientes', '🔥 1 día seguido'])
    expect(screen.getByText(/Hoy repasaste 1 tarjeta/)).toBeInTheDocument()
  })

  it('sugiere la primera lección disponible de cada ruta', async () => {
    const route = content.routes[0]
    const first = route.modules.flatMap((m) => m.lessons).find((l) => l.prerequisites.length === 0)!
    renderHome()
    expect(await screen.findByRole('link', { name: `Empezar: ${first.title}` })).toBeInTheDocument()
  })

  it('muestra el progreso de la ruta', async () => {
    const route = content.routes[0]
    const total = route.modules.flatMap((m) => m.lessons).length
    const lesson = route.modules.flatMap((m) => m.lessons)[0]
    await db.lessonProgress.put({ lessonId: lesson.id, status: 'completed', updatedAt: new Date() })
    renderHome()
    expect(await screen.findByText(`1 de ${total} lecciones completadas`)).toBeInTheDocument()
  })
})
