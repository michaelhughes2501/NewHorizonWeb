import { test } from 'node:test'
import assert from 'node:assert/strict'
import { startApp, fakeDb, ME, OTHER, JOB } from './helpers.js'
import { cleanProfileUpdate } from '../api.js'

test('health is public and reports the database', async () => {
  const app = await startApp()
  const r = await app.call('/api/health', { token: null })
  await app.close()
  assert.equal(r.status, 200)
  assert.deepEqual(r.body, { ok: true, db: true })
})

test('member routes refuse requests without a valid sign-in', async () => {
  const app = await startApp()
  const none = await app.call('/api/me', { token: null })
  const bad = await app.call('/api/me', { token: 'forged' })
  await app.close()
  assert.equal(none.status, 401)
  assert.equal(bad.status, 401)
})

test('a suspended member is refused', async () => {
  const db = fakeDb([[/select id, is_banned from profiles/, [{ id: ME, is_banned: true }]]])
  const app = await startApp({ db })
  const r = await app.call('/api/me')
  await app.close()
  assert.equal(r.status, 403)
})

test('a member with no profile row gets one created from the token', async () => {
  const db = fakeDb([[/select id, is_banned from profiles/, []]])
  const app = await startApp({ db })
  await app.call('/api/me')
  await app.close()
  const insert = db.calls.find((c) => c.text.startsWith('insert into profiles'))
  assert.ok(insert)
  assert.deepEqual(insert.params, [ME, 'me@example.com', 'Me Member'])
})

test('GET /me returns the own profile with a readable offense label', async () => {
  const db = fakeDb([[/from profiles p where p.id = \$1$/, [{ id: ME, name: 'Me', offense_type: 'drug' }]]])
  const app = await startApp({ db })
  const r = await app.call('/api/me')
  await app.close()
  assert.equal(r.status, 200)
  assert.equal(r.body.offense, 'Drug offense')
})

test("another member's profile never includes private fields", async () => {
  const db = fakeDb([[/p.public_profile and not p.is_banned/, [{ id: OTHER, name: 'Other' }]]])
  const app = await startApp({ db })
  const r = await app.call(`/api/profiles/${OTHER}`)
  await app.close()
  assert.equal(r.status, 200)
  const sql = db.calls.find((c) => c.text.includes('p.public_profile and not p.is_banned')).text
  for (const col of ['offense_type', 'email', 'phone_hash', 'ban_reason', 'login_attempts']) {
    assert.ok(!sql.includes(col), `public profile query must not select ${col}`)
  }
})

test('profile updates only change allowed fields of the signed-in member', async () => {
  const db = fakeDb()
  const app = await startApp({ db })
  const r = await app.call('/api/me', {
    method: 'PATCH',
    body: { name: 'New Name', offense_type: 'Financial', role: 'super_admin', is_banned: false, id: OTHER },
  })
  await app.close()
  assert.equal(r.status, 200)
  const update = db.calls.find((c) => c.text.startsWith('update profiles set name'))
  assert.equal(update.text, 'update profiles set name = $2, offense_type = $3 where id = $1')
  assert.deepEqual(update.params, [ME, 'New Name', 'financial'])
})

test('cleanProfileUpdate rejects bad values', () => {
  assert.throws(() => cleanProfileUpdate({ age: 'old' }), /whole number/)
  assert.throws(() => cleanProfileUpdate({ offense_type: 'arson' }), /known option/)
  assert.throws(() => cleanProfileUpdate({ interests: 'jobs' }), /list/)
  assert.throws(() => cleanProfileUpdate({ name: '' }), /Name is required/)
  assert.deepEqual(cleanProfileUpdate({ interests: [' Jobs ', ''] }), { interests: ['Jobs'] })
})

test('a database check failure is reported as a 400, not a crash', async () => {
  const db = fakeDb([[/^update profiles set/, Object.assign(new Error('check'), { code: '23514' })]])
  const app = await startApp({ db })
  const r = await app.call('/api/me', { method: 'PATCH', body: { state: 'ZZ' } })
  await app.close()
  assert.equal(r.status, 400)
})

test('likes are always made as the signed-in member', async () => {
  const db = fakeDb()
  const app = await startApp({ db })
  const r = await app.call('/api/likes', { method: 'POST', body: { targetId: OTHER, userId: OTHER } })
  const self = await app.call('/api/likes', { method: 'POST', body: { targetId: ME } })
  const junk = await app.call('/api/likes', { method: 'POST', body: { targetId: "x' or 1=1" } })
  await app.close()
  assert.equal(r.status, 201)
  assert.deepEqual(db.calls.find((c) => c.text.startsWith('insert into profile_likes')).params, [ME, OTHER])
  assert.equal(self.status, 400)
  assert.equal(junk.status, 400)
})

test('likes list is shaped as user_a / user_b for the Connect page', async () => {
  const db = fakeDb([[/from profile_likes/, [{ user_a: ME, user_b: OTHER }]]])
  const app = await startApp({ db })
  const r = await app.call('/api/likes')
  await app.close()
  assert.deepEqual(r.body, [{ user_a: ME, user_b: OTHER }])
})

test('jobs list only active jobs and maps fields the page reads', async () => {
  const db = fakeDb([[/from jobs j where/, [{ id: JOB, title: 'Cook', job_type: 'full-time', wage_display: '$18/hr', logo_emoji: '🍳' }]]])
  const app = await startApp({ db })
  const r = await app.call('/api/jobs?location=50%25_off&fair_chance=true')
  await app.close()
  const q = db.calls.find((c) => c.text.includes('from jobs j where'))
  assert.match(q.text, /j.is_active/)
  assert.match(q.text, /j.felony_friendly/)
  assert.deepEqual(q.params, ['%50\\%\\_off%'])
  assert.equal(r.body[0].type, 'full-time')
  assert.equal(r.body[0].wage, '$18/hr')
})

test('applying to a job that is closed returns 404', async () => {
  const app = await startApp()
  const r = await app.call('/api/applications', { method: 'POST', body: { jobId: JOB } })
  await app.close()
  assert.equal(r.status, 404)
})

test('sending a message creates the conversation and stores the text', async () => {
  const CONVO = '44444444-4444-4444-8444-444444444444'
  let convoCreated = false
  const db = fakeDb([
    [/select id from profiles where id = \$1 and not is_banned/, [{ id: OTHER }]],
    [/select id from conversations/, () => (convoCreated ? [{ id: CONVO }] : [])],
    [/insert into conversations/, () => { convoCreated = true; return [] }],
    [/insert into messages/, [{ id: 'm1' }]],
    [/where m.id = \$1/, [{ id: 'm1', conversation_id: CONVO, sender_id: ME, recipient_id: OTHER, body: 'hi', is_read: false, sender_name: 'Me' }]],
  ])
  const app = await startApp({ db })
  const r = await app.call('/api/messages', { method: 'POST', body: { recipientId: OTHER, content: '  hi  ' } })
  await app.close()
  assert.equal(r.status, 201)
  assert.equal(r.body.content, 'hi')
  assert.equal(r.body.recipient_id, OTHER)
  assert.deepEqual(db.calls.find((c) => c.text.startsWith('insert into messages')).params, [CONVO, ME, 'hi'])
})

test('empty and oversized messages are rejected', async () => {
  const app = await startApp()
  const empty = await app.call('/api/messages', { method: 'POST', body: { recipientId: OTHER, content: '   ' } })
  const big = await app.call('/api/messages', { method: 'POST', body: { recipientId: OTHER, content: 'x'.repeat(2001) } })
  await app.close()
  assert.equal(empty.status, 400)
  assert.equal(big.status, 400)
})

test('reading a conversation marks only the other side as read', async () => {
  const CONVO = '44444444-4444-4444-8444-444444444444'
  const db = fakeDb([
    [/select id, participant1_id from conversations/, [{ id: CONVO, participant1_id: OTHER }]],
    [/where m.conversation_id = \$1/, [{ id: 'm1', sender_id: OTHER, recipient_id: ME, body: 'yo', is_read: false }]],
  ])
  const app = await startApp({ db })
  const r = await app.call(`/api/messages/${OTHER}`)
  await app.close()
  assert.equal(r.body[0].content, 'yo')
  const mark = db.calls.find((c) => c.text.startsWith('update messages set is_read'))
  assert.deepEqual(mark.params, [CONVO, ME])
  assert.ok(db.calls.some((c) => c.text === 'update conversations set unread_count_p2 = 0 where id = $1'))
})

test('notifications can only be marked read for the signed-in member', async () => {
  const N = '55555555-5555-4555-8555-555555555555'
  const db = fakeDb()
  const app = await startApp({ db })
  const r = await app.call(`/api/notifications/${N}/read`, { method: 'POST' })
  await app.close()
  assert.equal(r.status, 204)
  assert.deepEqual(db.calls.find((c) => c.text.startsWith('update notifications')).params, [N, ME])
})

test('blog posts come back with the fields the page reads', async () => {
  const db = fakeDb([[/from blog_posts b join profiles a/, [{ id: 'p1', author_id: OTHER, author_name: 'Other', body: 'Long story', likes_count: 3, comments_count: 1, read_time: 4 }]]])
  const app = await startApp({ db })
  const r = await app.call('/api/posts')
  await app.close()
  assert.deepEqual(r.body[0].author, { id: OTHER, name: 'Other' })
  assert.equal(r.body[0].content, 'Long story')
  assert.equal(r.body[0].likes, 3)
  assert.equal(r.body[0].readTime, '4 min')
})

test('photo upload says when storage is not set up', async () => {
  const app = await startApp()
  const r = await app.call('/api/me/avatar', { method: 'POST', body: Buffer.from('png'), headers: { 'Content-Type': 'image/png' } })
  await app.close()
  assert.equal(r.status, 501)
})

test('photo upload stores the file and saves its address', async () => {
  const db = fakeDb()
  const storage = { putAvatar: async (id, body, type) => `https://cdn.example/${id}.${type.split('/')[1]}` }
  const app = await startApp({ db, storage })
  const r = await app.call('/api/me/avatar', { method: 'POST', body: Buffer.from('png'), headers: { 'Content-Type': 'image/png' } })
  await app.close()
  assert.equal(r.status, 200)
  assert.equal(r.body.avatar_url, `https://cdn.example/${ME}.png`)
  assert.deepEqual(db.calls.find((c) => c.text.startsWith('update profiles set avatar_url')).params, [ME, r.body.avatar_url])
})

test('Google token exchange keeps the client secret on the server', async () => {
  let sent
  const fetchImpl = async (_url, init) => {
    sent = Object.fromEntries(init.body)
    return new Response(JSON.stringify({ access_token: 'a', expires_in: 3600 }), { status: 200 })
  }
  const app = await startApp({ fetchImpl, env: { GOOGLE_OAUTH_CLIENT_ID: 'cid', GOOGLE_OAUTH_CLIENT_SECRET: 'shh' } })
  const r = await app.call('/api/integrations/oauth/exchange', { token: null, method: 'POST', body: { code: 'c', codeVerifier: 'v', redirectUri: 'https://x/cb' } })
  await app.close()
  assert.equal(r.status, 200)
  assert.equal(r.body.accessToken, 'a')
  assert.equal(sent.client_secret, 'shh')
  assert.ok(!JSON.stringify(r.body).includes('shh'))
})

test('unknown API paths return JSON 404', async () => {
  const app = await startApp()
  const r = await app.call('/api/nope')
  await app.close()
  assert.equal(r.status, 404)
  assert.equal(r.body.message, 'Not found.')
})
