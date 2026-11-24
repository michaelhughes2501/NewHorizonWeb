// Data access for the New Horizon web app.
//
// Sign-in runs on Neon Auth (Managed Better Auth) through its Supabase-style
// adapter, so session handling looks the same as before. Every data call goes
// to this app's own Express API (/api, see server/api.js), which checks the
// signed-in member on each request and talks to the Neon "New_Horizons"
// database. Nothing in the browser holds a database credential.
import { createAuthClient } from '@neon/auth'
import { SupabaseAuthAdapter } from '@neon/auth/vanilla/adapters'

const PLACEHOLDERS = new Set(['', 'https://your-project.neonauth.example/neondb/auth'])

const authUrl = import.meta.env.VITE_NEON_AUTH_URL
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

export const BACKEND_READY = Boolean(authUrl) && !PLACEHOLDERS.has(authUrl)

// Without an auth URL (local preview / demo with no secrets) expose a stub
// so importing this module never throws; the pages fall back to demo data.
const createStubAuth = () => {
  const notReady = () =>
    Promise.resolve({ data: { user: null, session: null }, error: new Error('Neon Auth is not configured (preview/demo mode).') })
  return {
    signUp: notReady,
    signInWithPassword: notReady,
    signOut: () => Promise.resolve({ error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    updateUser: notReady,
    resetPasswordForEmail: notReady,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getBetterAuthInstance: () => null,
  }
}

const auth = BACKEND_READY
  ? createAuthClient(authUrl, { adapter: SupabaseAuthAdapter() })
  : createStubAuth()

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function accessToken() {
  const { data } = await auth.getSession()
  return data?.session?.access_token || null
}

async function api(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  if (!BACKEND_READY) throw new ApiError(503, 'The backend is not configured (preview/demo mode).')
  const token = await accessToken()
  const init = { method, headers: { ...headers } }
  if (token) init.headers.Authorization = `Bearer ${token}`
  if (body !== undefined) {
    if (raw) {
      init.body = body
    } else {
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
  }
  const res = await fetch(`${API_BASE}${path}`, init)
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.message || `Request failed (${res.status}).`)
  return data
}

const qs = (params) => {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
  const s = search.toString()
  return s ? `?${s}` : ''
}

const unwrap = (result) => {
  if (result?.error) throw result.error
  return result?.data
}

export const AuthService = {
  async signUp({ email, password, name, username } = {}) {
    // The neon_auth.user trigger creates the member's profile row.
    return unwrap(await auth.signUp({ email, password, options: { data: { name: name || username } } }))
  },

  async signIn({ email, password } = {}) {
    return unwrap(await auth.signInWithPassword({ email, password }))
  },

  async signOut() {
    const { error } = await auth.signOut()
    if (error) throw error
  },

  async getUser() {
    const { data } = await auth.getUser()
    return data?.user ?? null
  },

  onAuthStateChange(callback) {
    return auth.onAuthStateChange((_event, session) => callback(session?.user ?? null))
  },

  // Alias kept for backward compatibility with App.jsx
  onAuthChange(callback) {
    return auth.onAuthStateChange((event, session) => callback(event, session))
  },

  async getSession() {
    const { data } = await auth.getSession()
    return data?.session ?? null
  },

  // Better Auth needs the current password to set a new one.
  async updateCredentials({ email, password, currentPassword } = {}) {
    const client = auth.getBetterAuthInstance?.()
    if (!client) throw new Error('Neon Auth is not configured (preview/demo mode).')
    if (email) {
      const r = await client.changeEmail({ newEmail: email })
      if (r?.error) throw new Error(r.error.message || 'Could not change email.')
    }
    if (password) {
      if (!currentPassword) throw new Error('Enter your current password to set a new one.')
      const r = await client.changePassword({ currentPassword, newPassword: password, revokeOtherSessions: true })
      if (r?.error) throw new Error(r.error.message || 'Could not change password.')
    }
  },

  async requestPasswordReset(email) {
    return unwrap(await auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` }))
  },
}

export const ProfileService = {
  // Your own profile returns every field; anyone else's returns only the
  // fields safe to show other members (never criminal-history data).
  getProfile: (userId) => api(`/profiles/${encodeURIComponent(userId)}`),

  async getMyProfile() {
    if (!(await accessToken())) return null
    return api('/me')
  },

  getCommunity: ({ state, limit = 30 } = {}) => api(`/community${qs({ state, limit })}`),

  // userId is kept for call-site compatibility; the API only ever updates the
  // signed-in member's own profile.
  updateProfile: (_userId, updates) => api('/me', { method: 'PATCH', body: updates }),

  async uploadAvatar(_userId, file) {
    const { avatar_url } = await api('/me/avatar', {
      method: 'POST',
      body: file,
      raw: true,
      headers: { 'Content-Type': file.type },
    })
    return avatar_url
  },
}

// "Connections" on the Connect page are profile likes; a mutual like makes a
// match and a notification (handled by a database trigger).
export const ConnectionService = {
  likeProfile: (_userId, targetId) => api('/likes', { method: 'POST', body: { targetId } }),
  unlikeProfile: (_userId, targetId) => api(`/likes/${encodeURIComponent(targetId)}`, { method: 'DELETE' }),
  getConnections: () => api('/likes'),
}

export const JobService = {
  getJobs: (filters = {}) => JobService.listJobs(filters),
  listJobs: (filters = {}) =>
    api(`/jobs${qs({ location: filters.location, fair_chance: filters.fair_chance ? 'true' : undefined })}`),
  getJob: (id) => api(`/jobs/${encodeURIComponent(id)}`),
  saveJob: (_userId, jobId) => api('/saved-jobs', { method: 'POST', body: { jobId } }),
  getSavedJobs: () => api('/saved-jobs'),
  unsaveJob: (_userId, jobId) => api(`/saved-jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' }),
  applyToJob: (_userId, jobId, coverText) => api('/applications', { method: 'POST', body: { jobId, coverText } }),
  listApplications: () => api('/applications'),
}

// ── Live updates ─────────────────────────────────────────────────────────
// One Server-Sent Events stream per tab, shared by every subscriber. The
// stream carries a short-lived sign-in token, so it reconnects with a fresh
// token when the server closes it.
const live = { source: null, listeners: new Set(), timer: null }

async function openStream() {
  if (live.source || !live.listeners.size) return
  const token = await accessToken()
  if (!token) return
  const source = new EventSource(`${API_BASE}/events${qs({ token })}`)
  live.source = source
  const dispatch = (type) => (e) => {
    let data
    try {
      data = JSON.parse(e.data)
    } catch {
      return
    }
    for (const fn of live.listeners) fn(type, data)
  }
  source.addEventListener('message', dispatch('message'))
  source.addEventListener('notification', dispatch('notification'))
  const reconnect = () => {
    source.close()
    if (live.source === source) live.source = null
    if (!live.listeners.size || live.timer) return
    live.timer = setTimeout(() => {
      live.timer = null
      openStream()
    }, 3000)
  }
  source.addEventListener('expired', reconnect)
  source.onerror = reconnect
}

function subscribeLive(fn) {
  live.listeners.add(fn)
  openStream()
  return {
    unsubscribe() {
      live.listeners.delete(fn)
      if (!live.listeners.size) {
        clearTimeout(live.timer)
        live.timer = null
        live.source?.close()
        live.source = null
      }
    },
  }
}

export const MessageService = {
  async getUnreadCount() {
    const { count } = await api('/messages/unread-count')
    return count ?? 0
  },
  listConversations: () => api('/conversations'),
  getMessages: (_userId, partnerId) => api(`/messages/${encodeURIComponent(partnerId)}`),
  sendMessage: (_userId, recipientId, content) => api('/messages', { method: 'POST', body: { recipientId, content } }),

  subscribeToMessages(userId, partnerId, callback) {
    return subscribeLive((type, msg) => {
      if (type !== 'message') return
      const between =
        (msg.sender_id === partnerId && msg.recipient_id === userId) ||
        (msg.sender_id === userId && msg.recipient_id === partnerId)
      if (between && msg.sender_id !== userId) callback(msg)
    })
  },

  unsubscribe(channel) {
    channel?.unsubscribe?.()
  },
}

export const BlogService = {
  getPosts: (limit) => BlogService.listPosts(limit),
  listPosts: (limit = 20) => api(`/posts${qs({ limit })}`),
  getPost: (id) => api(`/posts/${encodeURIComponent(id)}`),
  createPost: (_userId, { title, content, category }) => api('/posts', { method: 'POST', body: { title, content, category } }),
  // A like trigger keeps blog_posts.likes_count in step, so there is no
  // separate counter call.
  likePost: (_userId, postId) => api(`/posts/${encodeURIComponent(postId)}/like`, { method: 'POST' }),
  unlikePost: (_userId, postId) => api(`/posts/${encodeURIComponent(postId)}/like`, { method: 'DELETE' }),
}

export const NotificationService = {
  async getUnreadCount() {
    const { count } = await api('/notifications/unread-count')
    return count ?? 0
  },
  listNotifications: () => api('/notifications'),
  markRead: (notificationId) => api(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST' }),
  markAllRead: () => api('/notifications/read-all', { method: 'POST' }),

  subscribeToNotifications(_userId, callback) {
    return subscribeLive((type, n) => {
      if (type === 'notification') callback(n)
    })
  },

  unsubscribe(channel) {
    channel?.unsubscribe?.()
  },
}

export default auth
