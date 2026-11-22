import { createApp } from '../app.js'
import { createEventHub } from '../events.js'

export const ME = '11111111-1111-4111-8111-111111111111'
export const OTHER = '22222222-2222-4222-8222-222222222222'
export const JOB = '33333333-3333-4333-8333-333333333333'

// A stand-in for the pg pool: each handler is [regex, rows | fn(params)].
// Every query is recorded so tests can check which user id was used.
export function fakeDb(handlers = []) {
  const calls = []
  const run = async (text, params = []) => {
    calls.push({ text: text.replace(/\s+/g, ' ').trim(), params })
    for (const [re, result] of handlers) {
      if (re.test(text)) {
        const rows = typeof result === 'function' ? await result(params, text) : result
        if (rows instanceof Error) throw rows
        return { rows, rowCount: rows.length }
      }
    }
    if (/^\s*select id, is_banned from profiles/.test(text)) return { rows: [{ id: params[0], is_banned: false }] }
    return { rows: [], rowCount: 0 }
  }
  return {
    calls,
    query: run,
    transaction: (fn) => fn({ query: run }),
  }
}

export const tokens = {
  'good-me': { id: ME, email: 'me@example.com', name: 'Me Member', exp: Math.floor(Date.now() / 1000) + 900 },
  'good-other': { id: OTHER, email: 'other@example.com', name: 'Other', exp: Math.floor(Date.now() / 1000) + 900 },
}

export async function verifyToken(token) {
  if (!tokens[token]) throw new Error('bad token')
  return tokens[token]
}

export async function startApp({ db = fakeDb(), hub = createEventHub(), storage = null, fetchImpl, env = {} } = {}) {
  const app = createApp({ db, verifyToken, hub, storage, fetchImpl, env: { API_RATE_LIMIT: '10000', ...env } })
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const base = `http://127.0.0.1:${server.address().port}`
  const call = async (path, { token = 'good-me', method = 'GET', body, headers = {} } = {}) => {
    const init = { method, headers: { ...headers } }
    if (token) init.headers.Authorization = `Bearer ${token}`
    if (body !== undefined) {
      if (Buffer.isBuffer(body)) init.body = body
      else {
        init.headers['Content-Type'] = 'application/json'
        init.body = JSON.stringify(body)
      }
    }
    const res = await fetch(`${base}${path}`, init)
    const text = await res.text()
    let json
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = text
    }
    return { status: res.status, body: json, headers: res.headers }
  }
  return { base, call, db, hub, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r) }) }
}
