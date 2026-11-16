// Punto de entrada: monta la app de React dentro de <div id="root">.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './styles/global.css'
import { App } from './App'
import { requestPersistentStorage } from './db/db'

void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter: las URLs quedan como /#/rutas. Funciona en GitHub Pages sin configuración extra. */}
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
