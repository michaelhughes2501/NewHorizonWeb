import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createApp } from "./server/app.js";
import { createPool } from "./server/db.js";
import { createTokenVerifier } from "./server/auth.js";
import { createEventHub, listenForEvents } from "./server/events.js";
import { createAvatarStorage } from "./server/storage.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Fail fast: a deployed server with no database or auth settings would serve
// a site whose every sign-in and save silently fails.
const required = ["DATABASE_URL", "NEON_AUTH_BASE_URL", "NEON_AUTH_JWKS_URL"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const db = createPool(process.env.DATABASE_URL);
const verifyToken = createTokenVerifier({
  jwksUrl: process.env.NEON_AUTH_JWKS_URL,
  baseUrl: process.env.NEON_AUTH_BASE_URL,
});
const hub = createEventHub();
const stopListening = listenForEvents(
  hub,
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
);
const storage = createAvatarStorage(process.env);

const app = createApp({ db, verifyToken, hub, storage, distDir: join(__dirname, "dist") });
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const shutdown = () => {
  server.close(async () => {
    await stopListening();
    await db.end();
    process.exit(0);
  });
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
