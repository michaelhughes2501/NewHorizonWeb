# NewHorizonWeb: builds the React app and runs the Express server, which
# serves the app and its /api routes (Neon Postgres + Neon Auth).
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# VITE_* values are inlined at build time; pass them as build args.
ARG VITE_NEON_AUTH_URL
ARG VITE_ADMIN_EMAILS
ARG VITE_GOOGLE_OAUTH_CLIENT_ID
ENV VITE_NEON_AUTH_URL=$VITE_NEON_AUTH_URL \
    VITE_ADMIN_EMAILS=$VITE_ADMIN_EMAILS \
    VITE_GOOGLE_OAUTH_CLIENT_ID=$VITE_GOOGLE_OAUTH_CLIENT_ID
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.js /app/package.json ./
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001 -G nodejs && chown -R appuser:nodejs /app
USER appuser
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1
EXPOSE 3000
CMD ["node", "server.js"]
