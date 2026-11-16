// Se ejecuta antes de cada archivo de tests.

// IndexedDB "de mentira" en memoria, para probar la base de datos sin navegador.
import 'fake-indexeddb/auto'
// Agrega comparaciones útiles para la interfaz, ej. expect(el).toBeInTheDocument().
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
