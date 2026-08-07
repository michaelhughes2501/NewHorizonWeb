export const PROVIDERS = [
  { id: 'google-classroom', label: 'Google Classroom', description: 'Post updates as Classroom announcements.',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['https://www.googleapis.com/auth/classroom.courses.readonly', 'https://www.googleapis.com/auth/classroom.announcements'] },
  { id: 'google-docs', label: 'Google Docs', description: 'Drop content into a Google Doc.',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive.file'] },
  { id: 'google-forms', label: 'Google Forms', description: 'Generate intake forms.',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['https://www.googleapis.com/auth/forms.body', 'https://www.googleapis.com/auth/drive.file'] },
  { id: 'google-keep', label: 'Google Keep', description: 'Save quick notes (Workspace + service account required).',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['https://www.googleapis.com/auth/keep'] },
];

const TOKEN_KEY_PREFIX = 'newhorizonweb_integration_tokens:';
const PENDING_KEY = 'newhorizonweb_integration_pending';

const key = (id) => TOKEN_KEY_PREFIX + id;

export function loadTokens(id) {
  if (typeof window === 'undefined') return null;
  try { const raw = localStorage.getItem(key(id)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
export function saveTokens(id, tokens) {
  const t = { ...tokens };
  if (t.expiresIn && !t.expiresAt) t.expiresAt = Date.now() + t.expiresIn * 1000;
  localStorage.setItem(key(id), JSON.stringify(t));
}
export function clearTokens(id) { localStorage.removeItem(key(id)); }
export function isExpired(t) { return !t || !t.expiresAt || Date.now() > t.expiresAt - 60000; }

const CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';
const FN_URL = import.meta.env.VITE_INTEGRATIONS_FUNCTION_URL
  || (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integrations` : '');

function randomB64Url(bytes) {
  const arr = new Uint8Array(bytes); crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function sha256B64Url(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function getClientId() { return CLIENT_ID; }
export function getFunctionUrl() { return FN_URL; }

export async function startConnect(providerId, returnTo = '/integrations') {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_OAUTH_CLIENT_ID is not set.');
  const provider = PROVIDERS.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  const redirectUri = `${window.location.origin}/integrations/callback`;
  const state = randomB64Url(16);
  const codeVerifier = randomB64Url(64);
  const codeChallenge = await sha256B64Url(codeVerifier);
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ id: providerId, state, codeVerifier, redirectUri, returnTo }));
  const url = new URL(provider.authorizationEndpoint);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', provider.scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  window.location.assign(url.toString());
}

export async function completeCallback(search) {
  if (!FN_URL) throw new Error('Integrations function URL not configured.');
  const params = new URLSearchParams(search);
  const error = params.get('error');
  if (error) throw new Error(params.get('error_description') || error);
  const code = params.get('code'), state = params.get('state');
  if (!code || !state) throw new Error('Missing authorization code in callback URL.');
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) throw new Error('No pending OAuth flow found in this browser tab.');
  let pending;
  try { pending = JSON.parse(raw); if (!pending || typeof pending !== 'object') throw new Error(); }
  catch { sessionStorage.removeItem(PENDING_KEY); throw new Error('Pending OAuth state is corrupted.'); }
  sessionStorage.removeItem(PENDING_KEY);
  if (pending.state !== state) throw new Error('OAuth state mismatch.');
  const r = await fetch(`${FN_URL}/oauth/exchange`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, codeVerifier: pending.codeVerifier, redirectUri: pending.redirectUri }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'Token exchange failed.');
  saveTokens(pending.id, data);
  // Whitelist returnTo to same-origin relative paths. Chrome normalizes
  // backslashes so /\host would become //host — reject those too.
  const returnTo = typeof pending.returnTo === 'string' ? pending.returnTo : '';
  const safe = returnTo.startsWith('/')
    && !returnTo.startsWith('//')
    && !returnTo.startsWith('/\\')
    ? returnTo
    : '/integrations';
  return { returnTo: safe };
}

export async function refreshIfExpired() {
  if (!FN_URL) return;
  for (const p of PROVIDERS) {
    const t = loadTokens(p.id);
    if (!t || !isExpired(t) || !t.refreshToken) continue;
    try {
      const r = await fetch(`${FN_URL}/oauth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: t.refreshToken }),
      });
      if (r.ok) {
        const data = await r.json();
        saveTokens(p.id, { ...data, refreshToken: data.refreshToken || t.refreshToken });
      } else if (r.status === 400 || r.status === 401) {
        clearTokens(p.id);
      }
    } catch { /* keep local tokens; user can retry */ }
  }
}
