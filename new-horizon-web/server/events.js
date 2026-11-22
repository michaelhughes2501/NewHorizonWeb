// Fans database NOTIFY events out to Server-Sent Events subscribers.
// Replaces Supabase Realtime for new messages and notifications.
//
// LISTEN needs a session that stays open, so this uses the direct (unpooled)
// connection string. Triggers from neon/migrations/002_web_api.sql send
// { kind, id, user_ids } on the `nh_events` channel.
import pg from 'pg'

export const CHANNEL = 'nh_events'

export function createEventHub() {
  const subscribers = new Map() // userId -> Set<fn>
  return {
    subscribe(userId, fn) {
      if (!subscribers.has(userId)) subscribers.set(userId, new Set())
      subscribers.get(userId).add(fn)
      return () => {
        const set = subscribers.get(userId)
        if (!set) return
        set.delete(fn)
        if (!set.size) subscribers.delete(userId)
      }
    },
    publish(raw) {
      let event
      try {
        event = typeof raw === 'string' ? JSON.parse(raw) : raw
      } catch {
        return
      }
      if (!event || !Array.isArray(event.user_ids)) return
      for (const userId of new Set(event.user_ids.filter(Boolean))) {
        for (const fn of subscribers.get(userId) || []) {
          try {
            fn(event)
          } catch (err) {
            console.error('[events] subscriber failed:', err.message)
          }
        }
      }
    },
    size() {
      let n = 0
      for (const set of subscribers.values()) n += set.size
      return n
    },
  }
}

export function listenForEvents(hub, connectionString, { retryMs = 5000 } = {}) {
  let client
  let stopped = false
  let timer
  const connect = async () => {
    client = new pg.Client({ connectionString })
    client.on('notification', (msg) => {
      if (msg.channel === CHANNEL) hub.publish(msg.payload)
    })
    client.on('error', (err) => {
      console.error('[events] listener error:', err.message)
      retry()
    })
    try {
      await client.connect()
      await client.query(`LISTEN ${CHANNEL}`)
    } catch (err) {
      console.error('[events] could not start listener:', err.message)
      retry()
    }
  }
  const retry = () => {
    if (stopped || timer) return
    client?.end().catch(() => {})
    timer = setTimeout(() => {
      timer = undefined
      connect()
    }, retryMs)
  }
  connect()
  return () => {
    stopped = true
    clearTimeout(timer)
    return client?.end().catch(() => {})
  }
}
