import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 3000, // <-- CHANGE PORT HERE (e.g., 3000, 5174, etc.)
    open: true,
  }

})
