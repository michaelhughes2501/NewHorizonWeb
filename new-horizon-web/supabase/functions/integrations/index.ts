// Deno Deploy / Supabase Edge Function.
// Handles the Google OAuth token exchange/refresh so the client_secret
// never reaches the browser.
//
// Routes:
//   GET  /functions/v1/integrations/config
//   POST /functions/v1/integrations/oauth/exchange
//   POST /functions/v1/integrations/oauth/refresh
//
// Env (set in the Supabase project's Functions -> Secrets):
//   GOOGLE_OAUTH_CLIENT_ID
//   GOOGLE_OAUTH_CLIENT_SECRET

// deno-lint-ignore-file no-explicit-any
declare const Deno: { env: { get(name: string): string | undefined }; serve?: any };

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...(init.headers || {}) },
  });
}

function readCreds() {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    const missing = [!clientId && "GOOGLE_OAUTH_CLIENT_ID", !clientSecret && "GOOGLE_OAUTH_CLIENT_SECRET"]
      .filter(Boolean).join(", ");
    return { error: json({ message: `Google OAuth not configured (missing ${missing}).` }, { status: 500 }) };
  }
  return { clientId, clientSecret };
}

// Return `expiresIn` (seconds) so the client can compute `expiresAt` against
// its own clock — avoids server/client drift.
function shapeTokens(data: any) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Number(data.expires_in) || 0,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

async function postToken(body: URLSearchParams): Promise<Response> {
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  // Read as text once — fetch bodies can only be consumed once, so a
  // json()-then-text() fallback would throw "body stream already read"
  // and hide the real parse error.
  const text = await resp.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return json({ message: `Invalid JSON from Google: ${text.slice(0, 200)}` }, { status: 502 });
  }
  if (!resp.ok) {
    return json({ message: data.error_description || data.error || "Token request failed." }, { status: resp.status });
  }
  return json(shapeTokens(data));
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const url = new URL(req.url);
  // Normalize a suffix path so this function works whether it's routed as
  // .../integrations/config or .../integrations?path=config etc.
  const path = url.pathname.replace(/^\/functions\/v1\/integrations/, "").replace(/^\/+/, "");

  if (req.method === "GET" && (path === "config" || path === "" && url.searchParams.get("op") === "config")) {
    return json({ clientId: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID") || "" });
  }

  if (req.method === "POST" && (path === "oauth/exchange" || path === "exchange")) {
    const creds = readCreds();
    if ("error" in creds) return creds.error;
    const body = await req.json().catch(() => ({})) as any;
    const { code, codeVerifier, redirectUri } = body || {};
    if (!code || !codeVerifier || !redirectUri) {
      return json({ message: "Missing required fields." }, { status: 400 });
    }
    return postToken(new URLSearchParams({
      code, code_verifier: codeVerifier, redirect_uri: redirectUri,
      grant_type: "authorization_code",
      client_id: creds.clientId, client_secret: creds.clientSecret,
    }));
  }

  if (req.method === "POST" && (path === "oauth/refresh" || path === "refresh")) {
    const creds = readCreds();
    if ("error" in creds) return creds.error;
    const body = await req.json().catch(() => ({})) as any;
    const { refreshToken } = body || {};
    if (!refreshToken) return json({ message: "Missing refreshToken." }, { status: 400 });
    const resp = await postToken(new URLSearchParams({
      refresh_token: refreshToken, grant_type: "refresh_token",
      client_id: creds.clientId, client_secret: creds.clientSecret,
    }));
    // Preserve caller's refresh token if Google didn't return a new one.
    if (resp.ok) {
      const data = await resp.clone().json();
      if (!data.refreshToken) return json({ ...data, refreshToken });
    }
    return resp;
  }

  return json({ message: "Not found." }, { status: 404 });
}

if (typeof Deno !== "undefined" && Deno.serve) Deno.serve(handle);
export default handle;
