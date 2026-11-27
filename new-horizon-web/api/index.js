// Vercel entry: runs the Express API (server/) as one Vercel Function for
// every /api/* path. The built React app is served by Vercel's CDN from dist/
// (see vercel.json), so this function only answers /api requests.
import { createApp } from "../server/app.js";
import { createPool } from "../server/db.js";
import { createTokenVerifier } from "../server/auth.js";
import { createEventHub, listenForEvents } from "../server/events.js";
import { createAvatarStorage } from "../server/storage.js";

const env = process.env;
const missing = ["DATABASE_URL", "NEON_AUTH_BASE_URL", "NEON_AUTH_JWKS_URL"].filter((k) => !env[k]);

let handler;
if (missing.length) {
  // Answer every API call with a clear 503 instead of crashing the function.
  handler = (_req, res) => {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: `Server is missing settings: ${missing.join(", ")}` }));
  };
} else {
  const hub = createEventHub();
  // One LISTEN connection per function instance feeds the live-update streams.
  listenForEvents(hub, env.DATABASE_URL_UNPOOLED || env.DATABASE_URL);
  handler = createApp({
    db: createPool(env.DATABASE_URL),
    verifyToken: createTokenVerifier({ jwksUrl: env.NEON_AUTH_JWKS_URL, baseUrl: env.NEON_AUTH_BASE_URL }),
    hub,
    storage: createAvatarStorage(env),
  });
}

export default handler;
