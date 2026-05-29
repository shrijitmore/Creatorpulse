FROM node:20-alpine

# Run as a non-root user — reduces blast radius if the process is compromised.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install dependencies first (layer-cached separately from source).
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source — .dockerignore excludes .env*, node_modules, logs, dev files.
COPY . .

# Declare the runtime environment.
# All secrets are injected at runtime via environment variables, never baked in.
ENV NODE_ENV=production

# Drop privileges before starting the process.
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
