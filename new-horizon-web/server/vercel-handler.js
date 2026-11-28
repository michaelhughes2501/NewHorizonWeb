// Builds the request handler that api/index.js exports for Vercel.
//
// Two things differ from server.js, because Vercel may run many short-lived
// copies of this function at once:
// - Bad or missing settings answer every API call with a clear 503 instead of
//   crashing the function on startup.
// - The database LISTEN connection for live updates opens only while some
//   member on this copy has a live-update stream open, and closes a minute
//   after the last one leaves, so idle copies hold no extra connection.
import { createApp } from './app.js'
import { createPool } from './db.js'
import { createTokenVerifier } from './auth.js'
import { createEventHub, listenForEvents } from './events.js'
import { createAvatarStorage } from './storage.js'

const REQUIRED = ['DATABASE_URL', 'NEON_AUTH_BASE_URL', 'NEON_AUTH_JWKS_URL']
const URL_SETTINGS = ['NEON_AUTH_BASE_URL', 'NEON_AUTH_JWKS_URL']

function unavailable(message) {
  return (_req, res) => {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ message }))
  }
}

export function settingsProblem(env) {
  const missing = REQUIRED.filter((k) => !env[k])
  if (missing.length) return `Server is missing settings: ${missing.join(', ')}`
  const invalid = URL_SETTINGS.filter((k) => {
    try {
      new URL(env[k])
      return false
    } catch {
      return true
    }
  })
  if (invalid.length) return `Server has invalid settings: ${invalid.join(', ')}`
  return null
}

// Wraps the event hub so the LISTEN connection follows the open streams.
export function createLazyHub({ start, idleMs = 60_000 }) {
  const hub = createEventHub()
  let stop = null
  let idleTimer = null
  const ensureListening = () => {
    clearTimeout(idleTimer)
    idleTimer = null
    if (!stop) stop = start(hub)
  }
  const stopWhenIdle = () => {
    if (hub.size() || idleTimer) return
    idleTimer = setTimeout(() => {
      idleTimer = null
      if (hub.size() || !stop) return
      const s = stop
      stop = null
      s()
    }, idleMs)
    idleTimer.unref?.()
  }
  return {
    ...hub,
    subscribe(userId, fn) {
      ensureListening()
      const off = hub.subscribe(userId, fn)
      return () => {
        off()
        stopWhenIdle()
      }
    },
    isListening: () => Boolean(stop),
  }
}

export function buildHandler(env, deps = {}) {
  const problem = settingsProblem(env)
  if (problem) return unavailable(problem)
  const listen = deps.listenForEvents || listenForEvents
  const hub = createLazyHub({
    start: (h) => listen(h, env.DATABASE_URL_UNPOOLED || env.DATABASE_URL),
    idleMs: deps.idleMs,
  })
  return (deps.createApp || createApp)({
    db: deps.db || createPool(env.DATABASE_URL),
    verifyToken: deps.verifyToken || createTokenVerifier({ jwksUrl: env.NEON_AUTH_JWKS_URL, baseUrl: env.NEON_AUTH_BASE_URL }),
    hub,
    storage: deps.storage || createAvatarStorage(env),
  })
}
