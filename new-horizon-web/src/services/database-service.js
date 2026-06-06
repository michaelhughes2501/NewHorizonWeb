import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const AuthService = {
  async signUp({ email, password, name, username } = {}) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (data.user) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: username || name,
        email,
      })
      if (insertError) console.error('Profile insert failed:', insertError)
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
    const { data: { user } } = await supabase.auth.getUser()
    return user
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    return ProfileService.getProfile(user.id)
  },

  async getCommunity({ state: stateFilter, limit = 30 } = {}) {
    let query = supabase.from('profiles').select('*').limit(limit)
    if (stateFilter && stateFilter !== 'All') query = query.eq('state', stateFilter)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async uploadAvatar(userId, file) {
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await ProfileService.updateProfile(userId, { avatar_url: publicUrl })
    return publicUrl
  },
}

export const JobService = {
  async getJobs(filters = {}) {
    return JobService.listJobs(filters)
  },

  async listJobs(filters = {}) {
    let query = supabase.from('jobs').select('*').eq('is_approved', true).order('created_at', { ascending: false })
    if (filters.location) query = query.ilike('location', `%${filters.location}%`)
    if (filters.fair_chance) query = query.eq('is_fair_chance', true)
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

  async applyToJob(userId, jobId) {
    const { data, error } = await supabase
      .from('job_applications')
      .insert({ user_id: userId, job_id: jobId, status: 'applied' })
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
      .eq('is_read', false)
    if (error) throw error
    return count ?? 0
  },

  async listConversations(userId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(id, username), recipient:profiles!recipient_id(id, username)')
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
      .select('*, sender:profiles!sender_id(id, username)')
      .or(`and(sender_id.eq.${userId},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${userId})`)
      .order('created_at')
    if (error) throw error
    await supabase.from('messages').update({ is_read: true }).eq('sender_id', partnerId).eq('recipient_id', userId).eq('is_read', false)
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
  async getPosts(filters = {}) {
    return BlogService.listPosts(filters.limit)
  },

  async listPosts(limit = 20) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, author:profiles(id, username)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async getPost(id) {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*, author:profiles(id, username)')
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
      .eq('is_read', false)
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
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId)
    if (error) throw error
  },

  async markAllRead(userId) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
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

export default supabase
