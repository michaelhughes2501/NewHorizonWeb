import express from 'express'
import rateLimit from 'express-rate-limit'
import { createApiRouter } from './api.js'

// Builds the web server: the JSON API under /api and, when distDir is given,
// the built React app with a single-page-app fallback.
export function createApp({ db, verifyToken, hub, storage, distDir, fetchImpl, env = process.env } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', Number(env.TRUST_PROXY ?? 1))

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
    })
    next()
  })

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: Number(env.API_RATE_LIMIT) || 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: (req) => req.path === '/events',
    }),
    createApiRouter({ db, verifyToken, hub, storage, fetchImpl, env }),
  )

  if (distDir) {
    app.use(express.static(distDir, { index: false, maxAge: '1h' }))
    // Express 5 (path-to-regexp v8) needs a named wildcard; a bare "*" throws.
    app.get('/{*splat}', (_req, res) => res.sendFile('index.html', { root: distDir }))
  }
  return app
}
