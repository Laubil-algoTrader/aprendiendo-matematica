// Estructura común a todas las pantallas: encabezado, menú y contenido.

import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useSettings } from '../db/settings'

const NAV_ITEMS: { to: string; label: string; end?: boolean; also?: string }[] = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/rutas', label: 'Rutas' },
  { to: '/repasar', label: 'Repasar' },
  // "Mazos" también queda marcado mientras se navegan o editan tarjetas.
  { to: '/mazos', label: 'Mazos', also: '/tarjetas' },
  { to: '/errores', label: 'Errores' },
  { to: '/practica', label: 'Práctica' },
  { to: '/ajustes', label: 'Ajustes' },
]

export function Layout() {
  const { theme } = useSettings()
  const { pathname } = useLocation()

  // Aplica el tema elegido. Con "system" no ponemos nada y el CSS sigue al sistema operativo.
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <>
      {/* Enlace oculto que aparece al presionar Tab: permite saltar el menú con el teclado. */}
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <header className="app-header">
        <NavLink to="/" className="brand" end>
          Estudiar
        </NavLink>
        <nav aria-label="Principal">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive || (item.also && pathname.startsWith(item.also)) ? 'active' : undefined
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="contenido" tabIndex={-1} className="app-main">
        <Outlet />
      </main>
    </>
  )
}
