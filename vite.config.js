import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self' https://accounts.google.com; script-src 'unsafe-inline' 'unsafe-eval' 'self' http://localhost:5173 http://localhost:* https://apis.google.com https://accounts.google.com https://www.gstatic.com blob: data:; connect-src 'self' http://localhost:5173 http://localhost:* https://accounts.google.com https://www.googleapis.com;"
    }
  }
})
