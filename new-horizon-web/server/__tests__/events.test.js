import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createEventHub } from '../events.js'
import { startApp, fakeDb, ME, OTHER } from './helpers.js'

test('the hub only delivers events to the members named in them', () => {
  const hub = createEventHub()
  const got = { me: [], other: [] }
  const offMe = hub.subscribe(ME, (e) => got.me.push(e.id))
  hub.subscribe(OTHER, (e) => got.other.push(e.id))
  hub.publish(JSON.stringify({ kind: 'notification', id: 'n1', user_ids: [ME] }))
  hub.publish('not json')
  hub.publish({ kind: 'message', id: 'm1', user_ids: [ME, OTHER] })
  offMe()
  hub.publish({ kind: 'notification', id: 'n2', user_ids: [ME] })
  assert.deepEqual(got.me, ['n1', 'm1'])
  assert.deepEqual(got.other, ['m1'])
  assert.equal(hub.size(), 1)
})

test('the live stream sends a new notification to its owner', async () => {
  const db = fakeDb([[/from notifications where id = \$1 and user_id = \$2/, (p) => [{ id: p[0], user_id: p[1], title: 'Hi', is_read: false }]]])
  const app = await startApp({ db })
  const ctrl = new AbortController()
  const res = await fetch(`${app.base}/api/events?token=good-me`, { signal: ctrl.signal })
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/event-stream/)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  const readUntil = async (needle) => {
    while (!buf.includes(needle)) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value)
    }
  }
  await readUntil('event: ready')
  app.hub.publish({ kind: 'notification', id: 'n9', user_ids: [ME] })
  await readUntil('event: notification')
  ctrl.abort()
  await app.close()
  assert.match(buf, /"id":"n9"/)
  assert.match(buf, /"read":false/)
})

test('the live stream refuses a missing token', async () => {
  const app = await startApp()
  const r = await app.call('/api/events', { token: null })
  await app.close()
  assert.equal(r.status, 401)
})
