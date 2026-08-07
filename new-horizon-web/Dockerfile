# NewHorizonWeb frontend - Vite
FROM node:20-alpine as base
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm ci --frozen-lockfile || npm install

FROM node:20-alpine as builder
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine as runtime
WORKDIR /app
RUN npm install -g serve@latest
COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001 && chown -R appuser:nodejs /app

USER appuser

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:5173 || exit 1

EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
