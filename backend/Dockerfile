# This Dockerfile builds the backend only (no embedded frontend).
# For a full production image with the frontend included, use the
# Dockerfile at the monorepo root instead:
#   docker build -t creatorpulse .
#
# Use this file only when the frontend is served separately (e.g. on Vercel/Netlify).

FROM node:20-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production

USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
