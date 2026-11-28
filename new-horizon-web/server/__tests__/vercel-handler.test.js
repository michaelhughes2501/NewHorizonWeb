import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildHandler, createLazyHub, settingsProblem } from '../vercel-handler.js'

const GOOD = {
  DATABASE_URL: 'postgres://u:p@localhost/db',
  NEON_AUTH_BASE_URL: 'https://auth.example.test/neondb/auth',
  NEON_AUTH_JWKS_URL: 'https://auth.example.test/neondb/auth/.well-known/jwks.json',
}

function call(handler) {
  let status
  let body = ''
  const headers = {}
  const res = {
    set statusCode(v) {
      status = v
    },
    get statusCode() {
      return status
    },
    setHeader: (k, v) => (headers[k] = v),
    end: (b) => (body = b),
  }
  handler({}, res)
  return { status, headers, body: JSON.parse(body) }
}

test('missing settings answer every call with a 503', () => {
  const r = call(buildHandler({ DATABASE_URL: GOOD.DATABASE_URL }))
  assert.equal(r.status, 503)
  assert.match(r.body.message, /missing settings: NEON_AUTH_BASE_URL, NEON_AUTH_JWKS_URL/)
})

test('a malformed auth URL answers with a 503 instead of crashing', () => {
  assert.equal(settingsProblem(GOOD), null)
  const r = call(buildHandler({ ...GOOD, NEON_AUTH_JWKS_URL: 'not a url' }))
  assert.equal(r.status, 503)
  assert.match(r.body.message, /invalid settings: NEON_AUTH_JWKS_URL/)
})

test('the live-update listener opens only while a stream is open', async () => {
  let starts = 0
  let stops = 0
  const hub = createLazyHub({
    start: () => {
      starts++
      return () => stops++
    },
    idleMs: 10,
  })
  assert.equal(hub.isListening(), false)
  const offA = hub.subscribe('a', () => {})
  const offB = hub.subscribe('b', () => {})
  assert.equal(starts, 1)
  offA()
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(stops, 0, 'still one stream open')
  offB()
  await new Promise((r) => setTimeout(r, 30))
  assert.equal(stops, 1)
  assert.equal(hub.isListening(), false)
  hub.subscribe('c', () => {})
  assert.equal(starts, 2)
})

test('the wrapped hub still delivers events', () => {
  const hub = createLazyHub({ start: () => () => {} })
  const got = []
  hub.subscribe('me', (e) => got.push(e.id))
  hub.publish({ kind: 'notification', id: 'n1', user_ids: ['me'] })
  assert.deepEqual(got, ['n1'])
})

test('a full handler builds without opening a listener', () => {
  let listened = false
  const handler = buildHandler(GOOD, {
    db: { query: async () => ({ rows: [] }) },
    verifyToken: async () => ({ id: 'me' }),
    storage: null,
    listenForEvents: () => {
      listened = true
      return () => {}
    },
  })
  assert.equal(typeof handler, 'function')
  assert.equal(listened, false)
})
