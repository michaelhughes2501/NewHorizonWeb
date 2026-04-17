/**
 * NEW HORIZON — Database Integration Service Layer
 * Supabase + Real-time Subscriptions + Push Notifications
 *
 * Install: npm install @supabase/supabase-js
 * For React Native add: expo install expo-notifications expo-device
 */

import { createClient } from '@supabase/supabase-js';

// ─── SUPABASE CLIENT ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';
const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

// Accept either the auth user id or the profile row id while the app is still
// transitioning toward auth_id-based profile access.
const filterProfileByUser = (query, userId) => query.or(`auth_id.eq.${userId},id.eq.${userId}`);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: true, persistSession: true },
  realtime: { params: { eventsPerSecond: 10 } },
});

// ─── AUTH SERVICE ─────────────────────────────────────────────────────────────
export const AuthService = {
  async signUp({ email, password, name }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Create profile row
    const avatar = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    await supabase.from('profiles').insert({
      auth_id: data.user.id,
      email,
      name,
      avatar,
    });
    return data;
  },

  async signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  async resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://newhorizon.app/reset-password',
    });
  },
};

// ─── PROFILE SERVICE ──────────────────────────────────────────────────────────
export const ProfileService = {
  async getProfile(userId) {
    const { data, error } = await filterProfileByUser(
      supabase.from('profiles').select('*'),
      userId,
    ).single();
    if (error) throw error;
    return data;
  },

  async getMyProfile() {
    const session = await AuthService.getSession();
    if (!session) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_id', session.user.id)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await filterProfileByUser(
      supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() }),
      userId,
    )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async savePushToken(userId, token) {
    return filterProfileByUser(
      supabase.from('profiles').update({ push_token: token }),
      userId,
    );
  },

  async getCommunity({ state, limit = 20, offset = 0 }) {
    let query = supabase
      .from('profiles')
      .select('id,name,avatar,avatar_url,age,state,bio,offense_type,release_year,interests,last_seen')
      .eq('public_profile', true)
      .eq('is_banned', false)
      .eq('is_active', true)
      .order('last_seen', { ascending: false })
      .range(offset, offset + limit - 1);

    if (state && state !== 'All') query = query.eq('state', state);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async updateLastSeen(userId) {
    return filterProfileByUser(
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() }),
      userId,
    );
  },
};

// ─── CONNECTIONS SERVICE ──────────────────────────────────────────────────────
export const ConnectionService = {
  async like(fromUserId, toUserId) {
    const { data, error } = await supabase
      .from('connections')
      .upsert({ user_a: fromUserId, user_b: toUserId, status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    return data; // trigger will auto-match if mutual
  },

  async unlike(fromUserId, toUserId) {
    return supabase
      .from('connections')
      .delete()
      .eq('user_a', fromUserId)
      .eq('user_b', toUserId);
  },

  async getMatches(userId) {
    const { data } = await supabase
      .from('connections')
      .select(`
        *,
        user_a_profile:profiles!connections_user_a_fkey(id,name,avatar,state,online),
        user_b_profile:profiles!connections_user_b_fkey(id,name,avatar,state,online)
      `)
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .eq('status', 'matched');
    return data;
  },
};

// ─── MESSAGING SERVICE ────────────────────────────────────────────────────────
export const MessageService = {
  getConversationId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
  },

  async getConversations(userId) {
    const { data } = await supabase
      .from('messages')
      .select(`
        conversation_id,
        content,
        created_at,
        read,
        sender:profiles!messages_sender_id_fkey(id,name,avatar),
        recipient:profiles!messages_recipient_id_fkey(id,name,avatar)
      `)
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    // Deduplicate to one row per conversation
    const seen = new Set();
    return (data || []).filter(m => {
      if (seen.has(m.conversation_id)) return false;
      seen.add(m.conversation_id);
      return true;
    });
  },

  async getMessages(conversationId, limit = 50, before = null) {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (before) query = query.lt('created_at', before);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async sendMessage(senderId, recipientId, content) {
    const conversationId = this.getConversationId(senderId, recipientId);
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, recipient_id: recipientId, content })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markRead(conversationId, userId) {
    return supabase
      .from('messages')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('recipient_id', userId)
      .eq('read', false);
  },

  async getUnreadCount(userId) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .eq('read', false);
    return count || 0;
  },

  // Real-time subscription for a conversation
  subscribeToConversation(conversationId, onMessage) {
    return supabase
      .channel(`convo:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => onMessage(payload.new))
      .subscribe();
  },

  unsubscribe(channel) {
    supabase.removeChannel(channel);
  },
};

// ─── JOBS SERVICE ─────────────────────────────────────────────────────────────
export const JobService = {
  async getJobs({ state, type, search, limit = 20, offset = 0 } = {}) {
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .eq('is_approved', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (state && state !== 'All' && state !== 'Remote') query = query.or(`state.eq.${state},state.eq.Remote`);
    if (state === 'Remote') query = query.eq('state', 'Remote');
    if (type && type !== 'All') query = query.eq('job_type', type);
    if (search) query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async saveJob(userId, jobId) {
    return supabase.from('saved_jobs').upsert({ user_id: userId, job_id: jobId });
  },

  async unsaveJob(userId, jobId) {
    return supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', jobId);
  },

  async getSavedJobs(userId) {
    const { data } = await supabase
      .from('saved_jobs')
      .select('job_id, jobs(*)')
      .eq('user_id', userId);
    return (data || []).map(r => r.jobs);
  },

  async apply(jobId, userId, { coverNote, phone } = {}) {
    const { data, error } = await supabase
      .from('job_applications')
      .insert({ job_id: jobId, user_id: userId, cover_note: coverNote, phone })
      .select()
      .single();
    if (error) throw error;
    // Increment views
    await supabase.rpc('increment', { table: 'jobs', id: jobId, column: 'applications' });
    return data;
  },

  async getMyApplications(userId) {
    const { data } = await supabase
      .from('job_applications')
      .select('*, job:jobs(*)')
      .eq('user_id', userId)
      .order('applied_at', { ascending: false });
    return data;
  },
};

// ─── NOTIFICATIONS SERVICE ────────────────────────────────────────────────────
export const NotificationService = {
  async getNotifications(userId, limit = 30) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async markRead(notificationId) {
    return supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
  },

  async markAllRead(userId) {
    return supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);
  },

  async getUnreadCount(userId) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    return count || 0;
  },

  // Real-time notification subscription
  subscribeToNotifications(userId, onNotification) {
    return supabase
      .channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => onNotification(payload.new))
      .subscribe();
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
    await supabase.from('blog_likes').upsert({ post_id: postId, user_id: userId });
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
