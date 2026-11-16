// Tests de interfaz: montan la app en un navegador simulado (jsdom).

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { db } from './db/db'
import { getSettings } from './db/settings'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await db.settings.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('App', () => {
  it('muestra el menú principal y la página de inicio', async () => {
    renderAt('/')
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Repasar' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: 'Repaso de hoy' })).toBeInTheDocument()
  })

  it('guarda el límite de tarjetas nuevas desde Ajustes', async () => {
    const user = userEvent.setup()
    renderAt('/ajustes')
    const input = screen.getByLabelText('Tarjetas nuevas por día')
    await waitFor(() => expect(input).toHaveValue(15))
    await user.clear(input)
    await user.type(input, '25')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('Ajustes guardados.')).toBeInTheDocument()
    expect((await getSettings()).newCardsPerDay).toBe(25)
  })

  it('cambiar el tema a oscuro marca el documento', async () => {
    const user = userEvent.setup()
    renderAt('/ajustes')
    await user.click(screen.getByLabelText('Oscuro'))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'))
  })
})
