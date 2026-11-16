// Mapa de pantallas de la app: qué componente se muestra en cada dirección.

import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { Placeholder } from './components/Placeholder'
import { HomePage } from './features/home/HomePage'
import { SettingsPage } from './features/settings/SettingsPage'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="rutas" element={<Placeholder title="Rutas de aprendizaje" stage={3} />} />
        <Route path="repasar" element={<Placeholder title="Repasar" stage={2} />} />
        <Route path="mazos" element={<Placeholder title="Mazos y tarjetas" stage={2} />} />
        <Route path="errores" element={<Placeholder title="Cuaderno de errores" stage={4} />} />
        <Route path="practica" element={<Placeholder title="Práctica intercalada" stage={6} />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function NotFound() {
  return (
    <section>
      <h1>No encontrado</h1>
      <p>Esta página no existe.</p>
    </section>
  )
}
