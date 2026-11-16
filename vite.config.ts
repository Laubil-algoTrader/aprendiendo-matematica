// Configuración de Vite (el servidor de desarrollo y el empaquetador)
// y de Vitest (los tests), que comparten este mismo archivo.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: el sitio funciona igual en GitHub Pages
  // (usuario.github.io/nombre-repo/) que en cualquier otra carpeta.
  base: './',
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Los tests de interfaz dibujan muchas fórmulas en un navegador simulado,
    // que es lento: damos margen para computadoras con menos recursos.
    testTimeout: 15_000,
  },
})
