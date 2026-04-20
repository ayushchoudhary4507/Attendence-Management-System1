import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.platform': '"browser"',
  },
  resolve: {
    alias: {
      'socket.io-client': 'socket.io-client/dist/socket.io.js'
    }
  },
  server: {
    hmr: {
      overlay: true
    },
    watch: {
      usePolling: true,
      interval: 1000
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
