import { createClient } from '@supabase/supabase-js'

const PLACEHOLDERS = new Set([
  '',
  'https://your-project.supabase.co',
  'https://YOUR_PROJECT.supabase.co',
  'your-anon-key',
  'YOUR_ANON_KEY',
  'sb_publishable_xxxxxxxxxxxxxxxxxxxx',
])

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Accept either the classic anon key or the newer publishable key — App.jsx
// and NotificationCenter.jsx both treat either one as "backend configured",
// so the client here must be created with whichever one is actually set or
// those pages will believe the backend is ready while every call silently
// falls back to the no-op stub client below.
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const SUPABASE_CONFIGURED =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !PLACEHOLDERS.has(supabaseUrl) &&
  !PLACEHOLDERS.has(supabaseAnonKey)

// When Supabase is not configured (e.g. local preview / demo with no secrets),
// expose a no-op client so importing this module never throws. The app falls
// back to its built-in demo/mock data via the BACKEND_READY guard in App.jsx.
const createStubClient = () => {
  const notReady = () =>
    Promise.reject(new Error('Supabase is not configured (preview/demo mode).'))
  const queryBuilder = () => {
    const builder = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      delete: () => builder,
      eq: () => builder,
      or: () => builder,
      ilike: () => builder,
      order: () => builder,
      limit: () => builder,
      single: () => notReady(),
      then: (resolve) => resolve({ data: [], error: null, count: 0 }),
    }
    return builder
  }
  const channel = () => {
    const ch = { on: () => ch, subscribe: () => ch }
    return ch
  }
  return {
    auth: {
      signUp: notReady,
      signInWithPassword: notReady,
      signOut: () => Promise.resolve({ error: null }),
      getUser: () => Promise.resolve({ data: { user: null } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: queryBuilder,
    rpc: () => Promise.resolve({ data: null, error: null }),
    channel,
    removeChannel: () => {},
    storage: { from: () => ({ upload: notReady, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  }
}

const supabase = SUPABASE_CONFIGURED
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createStubClient()

export const AuthService = {
  async signUp({ email, password, name, username } = {}) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: data.user.id,
        auth_id: data.user.id,
        name: name || username,
        email,
      })
      if (insertError) throw insertError
    }
    return data
  },

  async signIn({ email, password } = {}) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data?.user ?? null
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null)
    })
  },

  // Alias kept for backward compatibility with App.jsx
  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
  },

  async getSession() {
    const { data } = await supabase.auth.getSession()
    return data.session
  },

  async updateCredentials({ email, password } = {}) {
    const updates = {}
    if (email) updates.email = email
    if (password) updates.password = password
    if (!Object.keys(updates).length) return
    const { data, error } = await supabase.auth.updateUser(updates)
    if (error) throw error
    return data
  },
}

export const ProfileService = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw error
    return data
  },

  async getMyProfile() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!data?.user) return null
    return ProfileService.getProfile(data.user.id)
  },

  // Public-facing member browse (Connect page, community list). Only ever
  // select fields that are safe to show other members — never offense_type,
  // email, ban_reason, or other private/criminal-history columns. See
  // CLAUDE.md: "Treat criminal-history fields as private."
  async getCommunity({ state: stateFilter, limit = 30 } = {}) {
    let query = supabase
      .from('profiles')
      .select('id, name, avatar, avatar_url, age, state, bio, release_year, interests, is_verified, last_seen, show_state, online')
      .eq('public_profile', true)
      .eq('is_banned', false)
      .limit(limit)
    if (stateFilter && stateFilter !== 'All') query = query.eq('state', stateFilter)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
<<<<<<< HEAD
      .select('id,name,avatar,avatar_url,age,state,bio,offense_type,release_year,interests,last_seen,online')
      .eq('public_profile', true)
      .eq('is_banned', false)
      .eq('is_active', true)
      .order('last_seen', { ascending: false })
      .range(offset, offset + limit - 1);

    if (state && state !== 'All') query = query.eq('state', state);
    const { data, error } = await query;
    if (error) throw error;
    return data;
=======
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
>>>>>>> origin/main
  },

  async uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    if (path.includes('..')) throw new Error('Invalid path')
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await ProfileService.updateProfile(userId, { avatar_url: publicUrl })
    return publicUrl
  },
}

export const ConnectionService = {
  async likeProfile(userId, targetId) {
    const { data, error } = await supabase
      .from('connections')
      .insert({ user_a: userId, user_b: targetId })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async unlikeProfile(userId, targetId) {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('user_a', userId)
      .eq('user_b', targetId)
    if (error) throw error
  },

  async getConnections(userId) {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    if (error) throw error
    return data
  },
}

export const JobService = {
  async getJobs(filters = {}) {
    return JobService.listJobs(filters)
  },

  async listJobs(filters = {}) {
    let query = supabase.from('jobs').select('*').eq('is_approved', true).order('created_at', { ascending: false })
    if (filters.location) query = query.ilike('location', `%${filters.location}%`)
    if (filters.fair_chance) query = query.eq('felony_friendly', true)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getJob(id) {
    const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async saveJob(userId, jobId) {
    const { error } = await supabase.from('saved_jobs').insert({ user_id: userId, job_id: jobId })
    if (error) throw error
  },

  async getSavedJobs(userId) {
    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*, job:jobs(*)')
      .eq('user_id', userId)
    if (error) throw error
    return data
  },

  async unsaveJob(userId, jobId) {
    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', jobId)
    if (error) throw error
  },

  async applyToJob(userId, jobId) {
    const { data, error } = await supabase
      .from('job_applications')
      .insert({ user_id: userId, job_id: jobId, status: 'submitted' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async listApplications(userId) {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*, job:jobs(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
}

export const MessageService = {
  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read', false)
    if (error) throw error
    return count ?? 0
  },

  async listConversations(userId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(id, name), recipient:profiles!recipient_id(id, name)')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
    if (error) throw error
    const seen = new Set()
    return data.filter(m => {
      const key = [m.sender_id, m.recipient_id].sort().join('-')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  },

  async getMessages(userId, partnerId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(id, name)')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
      .order('created_at')
    if (error) throw error
    await supabase.from('messages').update({ read: true, read_at: new Date().toISOString() }).eq('sender_id', partnerId).eq('recipient_id', userId).eq('read', false)
    return data
  },

  async sendMessage(senderId, recipientId, content) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: senderId, recipient_id: recipientId, content })
      .select()
      .single()
    if (error) throw error
    return data
  },

  subscribeToMessages(userId, partnerId, callback) {
    return supabase
      .channel(`messages:${[userId, partnerId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `recipient_id=eq.${userId}`,
      }, payload => callback(payload.new))
      .subscribe()
  },

  unsubscribe(channel) {
    supabase.removeChannel(channel)
  },
}

export const BlogService = {
  async getPosts(limit) {
    return BlogService.listPosts(limit)
  },

  async listPosts(limit = 20) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, author:profiles(id, name)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async getPost(id) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, author:profiles(id, name)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createPost(userId, { title, content, category }) {
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({ author_id: userId, title, content, category })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async likePost(userId, postId) {
    const { error } = await supabase.from('blog_likes').insert({ user_id: userId, post_id: postId })
    if (error) throw error
    await supabase.rpc('increment_post_likes', { post_id: postId })
  },
}

export const NotificationService = {
  async getUnreadCount(userId) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
    if (error) throw error
    return count ?? 0
  },

  async listNotifications(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) throw error
    return data
  },

  async markRead(notificationId) {
    const { error } = await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', notificationId)
    if (error) throw error
  },

  async markAllRead(userId) {
    const { error } = await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('user_id', userId).eq('read', false)
    if (error) throw error
  },

  subscribeToNotifications(userId, callback) {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => callback(payload.new))
      .subscribe()
  },
}

<<<<<<< HEAD
  unsubscribe(channel) {
    if (channel) supabase.removeChannel(channel);
  },

  // Send Expo push notification
  async sendPushNotification(expoPushToken, { title, body, data = {} }) {
    if (!expoPushToken) return;
    try {
      await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ to: expoPushToken, title, body, data, sound: 'default', badge: 1 }),
      });
    } catch (e) {
      console.error('Push notification failed:', e);
    }
  },

  // Send push via Edge Function (server-side, recommended)
  async sendServerPush(userId, notification) {
    return supabase.functions.invoke('send-push', {
      body: { user_id: userId, ...notification },
    });
  },

  // Create a notification record + send push
  async createAndSend(userId, { type, title, body, icon = '🔔', data = {}, actionUrl }) {
    // 1. Insert into DB
    await supabase.from('notifications').insert({ user_id: userId, type, title, body, icon, data, action_url: actionUrl });
    // 2. Get user's push token
    const { data: profile, error } = await filterProfileByUser(
      supabase.from('profiles').select('push_token, push_notifs'),
      userId,
    ).single();
    if (error && error.code !== 'PGRST116') throw error;
    // 3. Send push if enabled
    if (profile?.push_notifs && profile?.push_token) {
      await this.sendPushNotification(profile.push_token, { title, body, data });
    }
  },
};

// ─── BLOG SERVICE ─────────────────────────────────────────────────────────────
export const BlogService = {
  async getPosts({ category, limit = 12, offset = 0 } = {}) {
    let query = supabase
      .from('blog_posts')
      .select('*, author:profiles(name,avatar)')
      .eq('is_published', true)
      .eq('is_approved', true)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (category && category !== 'All') query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async likePost(postId, userId) {
    // Idempotent like via UNIQUE(post_id, user_id) on blog_likes.
    const { error: likeError } = await supabase
      .from('blog_likes')
      .upsert({ post_id: postId, user_id: userId });
    if (likeError) throw likeError;
    // Increment the cached counter via RPC (defined in database-schema.sql).
    await supabase.rpc('increment_post_likes', { post_id: postId });
  },

  async submitPost(userId, post) {
    return supabase.from('blog_posts').insert({
      author_id: userId,
      ...post,
      is_published: false,
      is_approved: false,
    });
  },
};

// ─── REPORTS SERVICE ──────────────────────────────────────────────────────────
export const ReportService = {
  async submit(reporterId, { targetType, targetId, reason, details }) {
    return supabase.from('reports').insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      reason,
      details,
    });
  },
};

// ─── REAL-TIME PRESENCE ───────────────────────────────────────────────────────
export const PresenceService = {
  channel: null,

  async joinPresence(userId) {
    this.channel = supabase.channel('online-users', {
      config: { presence: { key: userId } },
    });
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel.presenceState();
      return Object.keys(state);
    }).subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        await this.channel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });
    return this.channel;
  },

  leavePresence() {
    if (this.channel) supabase.removeChannel(this.channel);
  },
};

// ─── EDGE FUNCTION: send-push (deploy to supabase/functions/send-push/index.ts)
export const EDGE_FUNCTION_PUSH = `
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { user_id, title, body, data } = await req.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const { data: profile } = await supabase.from('profiles').select('push_token,push_notifs').eq('id', user_id).single();
  if (!profile?.push_token || !profile?.push_notifs) return new Response('No token', { status: 200 });
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: profile.push_token, title, body, data, sound: 'default' }),
  });
  return new Response(await res.text(), { status: 200 });
});
`;
=======
export default supabase
>>>>>>> origin/main
