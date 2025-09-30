import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // se no futuro o backend real rodar, pode redirecionar aqui
    },
    setupMiddlewares(middlewares) {
      middlewares.use('/api/windows/latest', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            start: Math.floor(Date.now() / 1000),
            clients: {
              '192.168.0.10': { in: 123, out: 456 },
              '192.168.0.20': { in: 321, out: 654 }
            }
          })
        )
      })

      middlewares.use('/api/windows/history', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify([
            { time: Date.now() - 60000, total: 500 },
            { time: Date.now(), total: 800 }
          ])
        )
      })

      middlewares.use('/api/drilldown', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            protocols: {
              HTTP: 200,
              HTTPS: 500,
              DNS: 50
            }
          })
        )
      })

      return middlewares
    }
  }
})
