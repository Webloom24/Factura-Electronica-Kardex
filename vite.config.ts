import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BASE PATH para GitHub Pages:
// Cambia '/factura-simulada/' por el nombre de TU repositorio en GitHub.
// Ejemplo: si tu repo es github.com/usuario/mi-repo → base: '/mi-repo/'
// Para desarrollo local: base: '/'
// El workflow de GitHub Actions pasa VITE_BASE_PATH automáticamente.

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/',
})
