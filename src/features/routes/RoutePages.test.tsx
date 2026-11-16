// Tests de interfaz de rutas y lecciones, usando el contenido real de /content.

import { render, screen, waitFor, within } from '@testing-library/react'
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

const route = content.routes[0]
// Una lección con prerrequisitos y una sin, tomadas del contenido real.
const withPrereq = [...content.lessons.values()].find((l) => l.prerequisites.length > 0)!
const prereq = content.lessons.get(withPrereq.prerequisites[0])!

describe('rutas y lecciones', () => {
  it('la ruta muestra sus módulos y marca los módulos vacíos como "Próximamente"', async () => {
    renderAt(`/rutas/${route.id}`)
    expect(await screen.findByRole('heading', { level: 1, name: route.title })).toBeInTheDocument()
    for (const m of route.modules) {
      expect(screen.getByRole('heading', { level: 2, name: m.title })).toBeInTheDocument()
    }
    expect(screen.getAllByText('Próximamente').length).toBe(route.modules.filter((m) => m.lessons.length === 0).length)
  })

  it('una lección con prerrequisitos pendientes los muestra; al completarlos desaparece el aviso', async () => {
    const user = userEvent.setup()
    renderAt(`/lecciones/${withPrereq.id}`)
    const notice = await screen.findByRole('complementary', { name: 'Prerrequisitos pendientes' })
    expect(within(notice).getByRole('link', { name: prereq.title })).toBeInTheDocument()

    // Abrir la lección la marca como empezada.
    await waitFor(async () => expect((await db.lessonProgress.get(withPrereq.id))?.status).toBe('seen'))

    await db.lessonProgress.put({ lessonId: prereq.id, status: 'completed', updatedAt: new Date() })
    await waitFor(() =>
      expect(screen.queryByRole('complementary', { name: 'Prerrequisitos pendientes' })).not.toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Marcar como completada' }))
    expect(await screen.findByText('✓ Completada')).toBeInTheDocument()
  })

  it('agrega las tarjetas sugeridas con un clic', async () => {
    const user = userEvent.setup()
    const lesson = [...content.lessons.values()].find((l) => l.suggestedCards.length > 0)!
    renderAt(`/lecciones/${lesson.id}`)
    await user.click(await screen.findByRole('button', { name: 'Agregar todas a mis mazos' }))
    // Crear varias notas en la base simulada puede tardar un poco: damos hasta 5 s.
    expect(
      await screen.findByText(`Se agregaron ${lesson.suggestedCards.length} tarjetas`, { exact: false }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(await db.notes.count()).toBe(lesson.suggestedCards.length)
    await waitFor(() => expect(screen.getAllByText('✓ En tus mazos')).toHaveLength(lesson.suggestedCards.length))
  })
})
