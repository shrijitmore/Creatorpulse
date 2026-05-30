# Build context: monorepo root (d:\Projects\New folder\Creatorpulse)
# docker build -t creatorpulse .

# ── Stage 1: build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# Output: /build/frontend/dist

# ── Stage 2: production backend ───────────────────────────────────────────────
FROM node:20-alpine

# Non-root user — reduces blast radius if process is compromised
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install backend production deps (layer cached separately from source)
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/ ./

# Embed built frontend — server.js serves ./dist when NODE_ENV=production
COPY --from=frontend-builder /build/frontend/dist ./dist

# All secrets injected at runtime via env vars — never baked into image
ENV NODE_ENV=production

USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
