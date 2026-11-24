// The New Horizon data API. Every route that touches member data runs as the
// signed-in member: the user id always comes from the verified Neon Auth
// token, never from the request body or path. This replaces the row-level
// security rules the Supabase project used.
import express from 'express'
import { bearerToken } from './auth.js'
import * as map from './mappers.js'
import { AVATAR_TYPES } from './storage.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PROFILE_FIELDS = {
  name: 'text',
  age: 'int',
  state: 'text',
  bio: 'text',
  offense_type: 'offense',
  release_year: 'int',
  interests: 'text[]',
  public_profile: 'bool',
  show_state: 'bool',
  push_notifs: 'bool',
  email_notifs: 'bool',
}
const LAST_SEEN_EVERY_MS = 60_000

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const bad = (message) => new HttpError(400, message)

function uuidParam(value, name = 'id') {
  if (typeof value !== 'string' || !UUID.test(value)) throw bad(`${name} must be a valid id.`)
  return value
}

function text(value, name, { min = 1, max = 2000 } = {}) {
  if (typeof value !== 'string') throw bad(`${name} is required.`)
  const trimmed = value.trim()
  if (trimmed.length < min || trimmed.length > max) {
    throw bad(`${name} must be between ${min} and ${max} characters.`)
  }
  return trimmed
}

function limitParam(value, fallback, max) {
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

export function cleanProfileUpdate(body = {}) {
  const out = {}
  for (const [key, kind] of Object.entries(PROFILE_FIELDS)) {
    if (!(key in body)) continue
    const value = body[key]
    if (value === null || value === '') {
      if (key === 'name') throw bad('Name is required.')
      if (kind === 'bool') continue
      out[key] = null
      continue
    }
    switch (kind) {
      case 'text':
        if (typeof value !== 'string') throw bad(`${key} must be text.`)
        out[key] = value.trim()
        break
      case 'int': {
        const n = Number(value)
        if (!Number.isInteger(n)) throw bad(`${key} must be a whole number.`)
        out[key] = n
        break
      }
      case 'bool':
        out[key] = Boolean(value)
        break
      case 'text[]':
        if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
          throw bad(`${key} must be a list of text.`)
        }
        out[key] = value.map((v) => v.trim()).filter(Boolean).slice(0, 20)
        break
      case 'offense': {
        const db = map.OFFENSE_TO_DB[value] || (Object.values(map.OFFENSE_TO_DB).includes(value) ? value : null)
        if (!db) throw bad('offense_type is not a known option.')
        out[key] = db
        break
      }
    }
  }
  return out
}

// Postgres errors that mean the member sent something invalid.
function translateDbError(err) {
  if (err?.code === '23514' || err?.code === '22P02' || err?.code === '23502') {
    return new HttpError(400, 'Some of the values are not allowed.')
  }
  if (err?.code === '23503') return new HttpError(404, 'That item no longer exists.')
  return err
}

export function createApiRouter({ db, verifyToken, hub, storage, fetchImpl = fetch, env = process.env }) {
  const router = express.Router()
  const lastSeenAt = new Map()

  router.use(express.json({ limit: '64kb' }))

  router.get('/health', async (_req, res) => {
    try {
      await db.query('select 1')
      res.json({ ok: true, db: true })
    } catch {
      res.status(503).json({ ok: false, db: false })
    }
  })

  // ── Google integrations (moved from the Supabase Edge Function) ─────────
  router.get('/integrations/config', (_req, res) => {
    res.json({ clientId: env.GOOGLE_OAUTH_CLIENT_ID || '' })
  })

  const googleToken = async (params) => {
    const clientId = env.GOOGLE_OAUTH_CLIENT_ID
    const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET
    if (!clientId || !clientSecret) throw new HttpError(500, 'Google OAuth is not configured.')
    const resp = await fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ...params, client_id: clientId, client_secret: clientSecret }),
    })
    const raw = await resp.text()
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      throw new HttpError(502, 'Invalid response from Google.')
    }
    if (!resp.ok) throw new HttpError(resp.status, data.error_description || data.error || 'Token request failed.')
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: Number(data.expires_in) || 0,
      scope: data.scope,
      tokenType: data.token_type,
    }
  }

  router.post('/integrations/oauth/exchange', async (req, res) => {
    const { code, codeVerifier, redirectUri } = req.body || {}
    if (!code || !codeVerifier || !redirectUri) throw bad('Missing required fields.')
    res.json(await googleToken({ code, code_verifier: codeVerifier, redirect_uri: redirectUri, grant_type: 'authorization_code' }))
  })

  router.post('/integrations/oauth/refresh', async (req, res) => {
    const { refreshToken } = req.body || {}
    if (!refreshToken) throw bad('Missing refreshToken.')
    const tokens = await googleToken({ refresh_token: refreshToken, grant_type: 'refresh_token' })
    res.json({ ...tokens, refreshToken: tokens.refreshToken || refreshToken })
  })

  // ── Everything below needs a signed-in member ──────────────────────────
  const authenticate = async (req, _res, next) => {
    const token = bearerToken(req) || (req.path === '/events' ? req.query.token : null)
    if (!token || typeof token !== 'string') return next(new HttpError(401, 'Sign in required.'))
    try {
      req.user = await verifyToken(token)
    } catch {
      return next(new HttpError(401, 'Your session has expired. Please sign in again.'))
    }
    const { rows } = await db.query('select id, is_banned from profiles where id = $1', [req.user.id])
    if (!rows.length) {
      // The neon_auth.user trigger normally creates the profile at sign-up;
      // this covers members created before that trigger existed.
      let name = (req.user.name || req.user.email?.split('@')[0] || '').trim().slice(0, 60)
      if (name.length < 2) name = 'Member'
      await db.query(
        `insert into profiles (id, email, name) values ($1, $2, $3) on conflict (id) do nothing`,
        [req.user.id, req.user.email, name],
      )
    } else if (rows[0].is_banned) {
      return next(new HttpError(403, 'This account is suspended.'))
    }
    const now = Date.now()
    if ((lastSeenAt.get(req.user.id) || 0) < now - LAST_SEEN_EVERY_MS) {
      lastSeenAt.set(req.user.id, now)
      db.query('update profiles set last_seen = now() where id = $1', [req.user.id]).catch(() => {})
    }
    next()
  }

  router.use(authenticate)

  // ── Profiles ───────────────────────────────────────────────────────────
  const getOwnProfile = async (id) => {
    const { rows } = await db.query(`select ${map.OWN_PROFILE_COLUMNS} from profiles p where p.id = $1`, [id])
    return map.ownProfile(rows[0])
  }

  router.get('/me', async (req, res) => {
    res.json(await getOwnProfile(req.user.id))
  })

  router.patch('/me', async (req, res) => {
    const updates = cleanProfileUpdate(req.body)
    const keys = Object.keys(updates)
    if (!keys.length) return res.json(await getOwnProfile(req.user.id))
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ')
    try {
      await db.query(`update profiles set ${sets} where id = $1`, [req.user.id, ...keys.map((k) => updates[k])])
    } catch (err) {
      throw translateDbError(err)
    }
    res.json(await getOwnProfile(req.user.id))
  })

  router.post('/me/avatar', express.raw({ type: Object.keys(AVATAR_TYPES), limit: '2mb' }), async (req, res) => {
    if (!storage) throw new HttpError(501, 'Photo uploads are not set up yet.')
    if (!Buffer.isBuffer(req.body) || !req.body.length) throw bad('Send the image as the request body.')
    const url = await storage.putAvatar(req.user.id, req.body, req.get('content-type'))
    await db.query('update profiles set avatar_url = $2 where id = $1', [req.user.id, url])
    res.json({ avatar_url: url })
  })

  router.get('/profiles/:id', async (req, res) => {
    const id = uuidParam(req.params.id)
    if (id === req.user.id) return res.json(await getOwnProfile(id))
    const { rows } = await db.query(
      `select ${map.PUBLIC_PROFILE_COLUMNS} from profiles p
        where p.id = $1 and p.public_profile and not p.is_banned`,
      [id],
    )
    if (!rows.length) throw new HttpError(404, 'Member not found.')
    res.json(rows[0])
  })

  router.get('/community', async (req, res) => {
    const params = [req.user.id, limitParam(req.query.limit, 30, 100)]
    let where = 'p.public_profile and not p.is_banned and p.id <> $1'
    if (req.query.state && req.query.state !== 'All') {
      params.push(String(req.query.state))
      where += ` and p.state = $${params.length} and p.show_state`
    }
    const { rows } = await db.query(
      `select ${map.PUBLIC_PROFILE_COLUMNS} from profiles p where ${where}
        order by p.last_seen desc nulls last limit $2`,
      params,
    )
    res.json(rows)
  })

  // ── Profile likes (the Connect page) ───────────────────────────────────
  router.get('/likes', async (req, res) => {
    const { rows } = await db.query(
      `select liker_id as user_a, liked_id as user_b, created_at from profile_likes
        where liker_id = $1 or liked_id = $1`,
      [req.user.id],
    )
    res.json(rows)
  })

  router.post('/likes', async (req, res) => {
    const target = uuidParam(req.body?.targetId, 'targetId')
    if (target === req.user.id) throw bad('You cannot like your own profile.')
    try {
      await db.query(
        `insert into profile_likes (liker_id, liked_id) values ($1, $2) on conflict do nothing`,
        [req.user.id, target],
      )
    } catch (err) {
      throw translateDbError(err)
    }
    res.status(201).json({ user_a: req.user.id, user_b: target })
  })

  router.delete('/likes/:targetId', async (req, res) => {
    const target = uuidParam(req.params.targetId, 'targetId')
    await db.query('delete from profile_likes where liker_id = $1 and liked_id = $2', [req.user.id, target])
    res.status(204).end()
  })

  // ── Jobs ───────────────────────────────────────────────────────────────
  const ACTIVE_JOB = 'j.is_active and (j.expires_at is null or j.expires_at > now())'

  router.get('/jobs', async (req, res) => {
    const params = []
    let where = ACTIVE_JOB
    if (req.query.location) {
      params.push(`%${String(req.query.location).replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
      where += ` and j.location ilike $${params.length}`
    }
    if (req.query.fair_chance === 'true') where += ' and j.felony_friendly'
    const { rows } = await db.query(`select j.* from jobs j where ${where} order by j.posted_at desc nulls last, j.created_at desc limit 200`, params)
    res.json(rows.map(map.job))
  })

  router.get('/jobs/:id', async (req, res) => {
    const { rows } = await db.query('select j.* from jobs j where j.id = $1', [uuidParam(req.params.id)])
    if (!rows.length) throw new HttpError(404, 'Job not found.')
    res.json(map.job(rows[0]))
  })

  router.get('/saved-jobs', async (req, res) => {
    const { rows } = await db.query(
      `select s.user_id, s.job_id, s.created_at, to_jsonb(j) as job
         from saved_jobs s join jobs j on j.id = s.job_id
        where s.user_id = $1 order by s.created_at desc`,
      [req.user.id],
    )
    res.json(rows.map((r) => ({ ...r, job: map.job(r.job) })))
  })

  router.post('/saved-jobs', async (req, res) => {
    const jobId = uuidParam(req.body?.jobId, 'jobId')
    try {
      await db.query('insert into saved_jobs (user_id, job_id) values ($1, $2) on conflict do nothing', [req.user.id, jobId])
    } catch (err) {
      throw translateDbError(err)
    }
    res.status(201).json({ user_id: req.user.id, job_id: jobId })
  })

  router.delete('/saved-jobs/:jobId', async (req, res) => {
    await db.query('delete from saved_jobs where user_id = $1 and job_id = $2', [req.user.id, uuidParam(req.params.jobId, 'jobId')])
    res.status(204).end()
  })

  router.get('/applications', async (req, res) => {
    const { rows } = await db.query(
      `select a.id, a.job_id, a.user_id, a.status, a.created_at, a.updated_at, to_jsonb(j) as job
         from job_applications a join jobs j on j.id = a.job_id
        where a.user_id = $1 order by a.created_at desc`,
      [req.user.id],
    )
    res.json(rows.map((r) => ({ ...r, job: map.job(r.job) })))
  })

  router.post('/applications', async (req, res) => {
    const jobId = uuidParam(req.body?.jobId, 'jobId')
    const cover = req.body?.coverText == null ? null : text(req.body.coverText, 'coverText', { max: 1000 })
    try {
      const { rows } = await db.query(
        `insert into job_applications (job_id, user_id, cover_text, status)
         select j.id, $2, $3, 'submitted' from jobs j where j.id = $1 and ${ACTIVE_JOB}
         on conflict (job_id, user_id) do nothing
         returning id, job_id, user_id, status, created_at`,
        [jobId, req.user.id, cover],
      )
      if (rows.length) return res.status(201).json(rows[0])
    } catch (err) {
      throw translateDbError(err)
    }
    const existing = await db.query(
      'select id, job_id, user_id, status, created_at from job_applications where job_id = $1 and user_id = $2',
      [jobId, req.user.id],
    )
    if (!existing.rows.length) throw new HttpError(404, 'That job is no longer open.')
    res.json(existing.rows[0])
  })

  // ── Messages ───────────────────────────────────────────────────────────
  const MESSAGE_SELECT = `
    select m.id, m.conversation_id, m.sender_id, m.body, m.is_read, m.created_at,
           case when c.participant1_id = m.sender_id then c.participant2_id else c.participant1_id end as recipient_id,
           sp.name as sender_name
      from messages m
      join conversations c on c.id = m.conversation_id
      join profiles sp on sp.id = m.sender_id`

  router.get('/messages/unread-count', async (req, res) => {
    const { rows } = await db.query(
      `select count(*)::int as count from messages m join conversations c on c.id = m.conversation_id
        where $1 in (c.participant1_id, c.participant2_id) and m.sender_id <> $1
          and not m.is_read and not m.is_deleted`,
      [req.user.id],
    )
    res.json({ count: rows[0]?.count ?? 0 })
  })

  router.get('/conversations', async (req, res) => {
    const { rows } = await db.query(
      `select c.id, c.last_message, c.last_message_at, c.updated_at,
              case when c.participant1_id = $1 then c.unread_count_p1 else c.unread_count_p2 end as unread,
              o.id as partner_id, o.name as partner_name, o.avatar_initials as partner_avatar
         from conversations c
         join profiles o on o.id = case when c.participant1_id = $1 then c.participant2_id else c.participant1_id end
        where $1 in (c.participant1_id, c.participant2_id)
        order by c.updated_at desc limit 100`,
      [req.user.id],
    )
    res.json(rows.map((r) => ({
      id: r.id,
      content: r.last_message,
      created_at: r.last_message_at || r.updated_at,
      unread: r.unread,
      partner: { id: r.partner_id, name: r.partner_name, avatar: r.partner_avatar },
    })))
  })

  router.get('/messages/:partnerId', async (req, res) => {
    const partner = uuidParam(req.params.partnerId, 'partnerId')
    const me = req.user.id
    const convo = await db.query(
      `select id, participant1_id from conversations
        where (participant1_id = $1 and participant2_id = $2) or (participant1_id = $2 and participant2_id = $1)`,
      [me, partner],
    )
    if (!convo.rows.length) return res.json([])
    const { id: conversationId, participant1_id: p1 } = convo.rows[0]
    const { rows } = await db.query(
      `${MESSAGE_SELECT} where m.conversation_id = $1 and not m.is_deleted order by m.created_at limit 500`,
      [conversationId],
    )
    await db.transaction(async (tx) => {
      await tx.query(
        'update messages set is_read = true where conversation_id = $1 and sender_id <> $2 and not is_read',
        [conversationId, me],
      )
      await tx.query(
        `update conversations set ${p1 === me ? 'unread_count_p1' : 'unread_count_p2'} = 0 where id = $1`,
        [conversationId],
      )
    })
    res.json(rows.map((r) => map.message(r, me)))
  })

  router.post('/messages', async (req, res) => {
    const me = req.user.id
    const recipient = uuidParam(req.body?.recipientId, 'recipientId')
    const body = text(req.body?.content, 'Message', { max: 2000 })
    if (recipient === me) throw bad('You cannot message yourself.')
    const target = await db.query('select id from profiles where id = $1 and not is_banned', [recipient])
    if (!target.rows.length) throw new HttpError(404, 'Member not found.')
    const row = await db.transaction(async (tx) => {
      const find = () => tx.query(
        `select id from conversations
          where (participant1_id = $1 and participant2_id = $2) or (participant1_id = $2 and participant2_id = $1)`,
        [me, recipient],
      )
      let convo = await find()
      if (!convo.rows.length) {
        await tx.query(
          'insert into conversations (participant1_id, participant2_id) values ($1, $2) on conflict do nothing',
          [me, recipient],
        )
        convo = await find()
      }
      const inserted = await tx.query(
        'insert into messages (conversation_id, sender_id, body) values ($1, $2, $3) returning id',
        [convo.rows[0].id, me, body],
      )
      const { rows } = await tx.query(`${MESSAGE_SELECT} where m.id = $1`, [inserted.rows[0].id])
      return rows[0]
    }).catch((err) => {
      throw translateDbError(err)
    })
    res.status(201).json(map.message(row, me))
  })

  // ── Blog ───────────────────────────────────────────────────────────────
  const POST_SELECT = `
    select b.id, b.author_id, b.title, b.slug, b.body, b.excerpt, b.category, b.emoji_icon,
           b.read_time, b.likes_count, b.comments_count, b.views_count, b.is_published,
           b.is_featured, b.published_at, b.created_at, a.name as author_name
      from blog_posts b join profiles a on a.id = b.author_id`

  router.get('/posts', async (req, res) => {
    const { rows } = await db.query(
      `${POST_SELECT} where b.is_published and not b.is_flagged
        order by b.published_at desc nulls last, b.created_at desc limit $1`,
      [limitParam(req.query.limit, 20, 100)],
    )
    res.json(rows.map(map.post))
  })

  router.get('/posts/:id', async (req, res) => {
    const { rows } = await db.query(
      `${POST_SELECT} where b.id = $1 and ((b.is_published and not b.is_flagged) or b.author_id = $2)`,
      [uuidParam(req.params.id), req.user.id],
    )
    if (!rows.length) throw new HttpError(404, 'Post not found.')
    res.json(map.post(rows[0]))
  })

  router.post('/posts', async (req, res) => {
    const title = text(req.body?.title, 'Title', { min: 5, max: 200 })
    const body = text(req.body?.content, 'Post', { min: 10, max: 20000 })
    const category = req.body?.category || 'Story'
    try {
      const { rows } = await db.query(
        `insert into blog_posts (author_id, title, body, category, excerpt)
         values ($1, $2, $3, $4, left($3, 280)) returning id`,
        [req.user.id, title, body, category],
      )
      const created = await db.query(`${POST_SELECT} where b.id = $1`, [rows[0].id])
      res.status(201).json(map.post(created.rows[0]))
    } catch (err) {
      throw translateDbError(err)
    }
  })

  router.post('/posts/:id/like', async (req, res) => {
    try {
      await db.query('insert into blog_likes (user_id, post_id) values ($1, $2) on conflict do nothing', [req.user.id, uuidParam(req.params.id)])
    } catch (err) {
      throw translateDbError(err)
    }
    res.status(204).end()
  })

  router.delete('/posts/:id/like', async (req, res) => {
    await db.query('delete from blog_likes where user_id = $1 and post_id = $2', [req.user.id, uuidParam(req.params.id)])
    res.status(204).end()
  })

  // ── Notifications ──────────────────────────────────────────────────────
  router.get('/notifications', async (req, res) => {
    const { rows } = await db.query(
      `select id, user_id, type, title, body, data, is_read, created_at from notifications
        where user_id = $1 order by created_at desc limit $2`,
      [req.user.id, limitParam(req.query.limit, 30, 100)],
    )
    res.json(rows.map(map.notification))
  })

  router.get('/notifications/unread-count', async (req, res) => {
    const { rows } = await db.query(
      'select count(*)::int as count from notifications where user_id = $1 and not is_read',
      [req.user.id],
    )
    res.json({ count: rows[0]?.count ?? 0 })
  })

  router.post('/notifications/read-all', async (req, res) => {
    await db.query('update notifications set is_read = true where user_id = $1 and not is_read', [req.user.id])
    res.status(204).end()
  })

  router.post('/notifications/:id/read', async (req, res) => {
    await db.query('update notifications set is_read = true where id = $1 and user_id = $2', [uuidParam(req.params.id), req.user.id])
    res.status(204).end()
  })

  // ── Live updates (Server-Sent Events) ──────────────────────────────────
  router.get('/events', async (req, res) => {
    if (!hub) throw new HttpError(503, 'Live updates are not available.')
    const me = req.user.id
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.flushHeaders?.()
    res.write('retry: 5000\n\n')
    const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    send('ready', { ok: true })

    const unsubscribe = hub.subscribe(me, async (evt) => {
      try {
        if (evt.kind === 'message') {
          const { rows } = await db.query(`${MESSAGE_SELECT} where m.id = $1`, [evt.id])
          if (rows[0]) send('message', map.message(rows[0], me))
        } else if (evt.kind === 'notification') {
          const { rows } = await db.query(
            'select id, user_id, type, title, body, data, is_read, created_at from notifications where id = $1 and user_id = $2',
            [evt.id, me],
          )
          if (rows[0]) send('notification', map.notification(rows[0]))
        }
      } catch (err) {
        console.error('[events] could not load event row:', err.message)
      }
    })
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000)
    // Close the stream when the sign-in token expires so the browser
    // reconnects with a fresh one.
    const ttl = req.user.exp ? Math.max(5_000, req.user.exp * 1000 - Date.now()) : 15 * 60_000
    const expire = setTimeout(() => {
      send('expired', {})
      res.end()
    }, ttl)
    req.on('close', () => {
      clearInterval(ping)
      clearTimeout(expire)
      unsubscribe()
    })
  })

  router.use((_req, _res, next) => next(new HttpError(404, 'Not found.')))

  // eslint-disable-next-line no-unused-vars
  router.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500
    if (status >= 500) console.error('[api]', err)
    res.status(status).json({ message: status >= 500 && !(err instanceof HttpError) ? 'Something went wrong.' : err.message })
  })

  return router
}
