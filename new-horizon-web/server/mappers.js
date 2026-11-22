// Shape database rows the way the React app already reads them, so the
// pages keep working unchanged after the move from Supabase.

export const OFFENSE_TO_DB = {
  'Non-violent': 'non-violent',
  'Drug offense': 'drug',
  Financial: 'financial',
  Violent: 'violent',
  'Prefer not to say': 'prefer_not_to_say',
}
export const OFFENSE_FROM_DB = Object.fromEntries(
  Object.entries(OFFENSE_TO_DB).map(([label, value]) => [value, label]),
)

// Columns any member may see about another member. Never add offense_type,
// email, phone_hash, ban fields or login fields here (see CLAUDE.md:
// criminal-history fields are private).
export const PUBLIC_PROFILE_COLUMNS = `
  p.id, p.name, p.avatar_initials AS avatar, p.avatar_url, p.age,
  CASE WHEN p.show_state THEN p.state ELSE NULL END AS state,
  p.bio, p.release_year, p.interests, p.is_verified, p.last_seen, p.show_state,
  (p.last_seen > now() - interval '5 minutes') AS online`

export const OWN_PROFILE_COLUMNS = `
  p.id, p.email, p.name, p.avatar_initials AS avatar, p.avatar_url, p.age, p.state,
  p.bio, p.offense_type, p.release_year, p.interests, p.role, p.is_verified,
  p.profile_complete, p.public_profile, p.show_state, p.push_notifs, p.email_notifs,
  p.last_seen, p.created_at, p.updated_at`

export function ownProfile(row) {
  if (!row) return null
  return { ...row, offense: OFFENSE_FROM_DB[row.offense_type] || 'Prefer not to say' }
}

export function job(row) {
  if (!row) return null
  return { ...row, type: row.job_type, wage: row.wage_display || undefined, logo: row.logo_emoji || undefined }
}

export function post(row) {
  if (!row) return null
  const { author_name, ...rest } = row
  return {
    ...rest,
    content: row.body,
    likes: row.likes_count ?? 0,
    comments: row.comments_count ?? 0,
    img: row.emoji_icon || undefined,
    readTime: row.read_time ? `${row.read_time} min` : undefined,
    author: { id: row.author_id, name: author_name || 'New Horizon' },
  }
}

export function notification(row) {
  if (!row) return null
  return { ...row, read: Boolean(row.is_read), action_url: row.data?.action_url }
}

export function message(row, me) {
  if (!row) return null
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    recipient_id: row.recipient_id,
    content: row.body,
    read: Boolean(row.is_read),
    created_at: row.created_at,
    sender: { id: row.sender_id, name: row.sender_name },
    mine: me ? row.sender_id === me : undefined,
  }
}
