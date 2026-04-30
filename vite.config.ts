import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Excluimos explícitamente TODO el ecosistema de la base de datos
    exclude: ['jeep-sqlite', '@capacitor-community/sqlite', 'sql.js']
  }
})