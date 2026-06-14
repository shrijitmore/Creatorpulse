/**
 * Centralised configuration + startup validation.
 *
 * Call validateConfig() once at server boot — before any listener is started.
 * In production it exits the process immediately if a required secret is absent,
 * so a misconfigured deploy never reaches users with an open API.
 */

import { logger } from './logger.js'

const IS_PROD = process.env.NODE_ENV === 'production'

// Variables that MUST be set before the server starts in production.
const REQUIRED_IN_PROD = [
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'FRONTEND_URL',
]

export function validateConfig() {
  if (!IS_PROD) return

  const missing = REQUIRED_IN_PROD.filter(k => !process.env[k]?.trim())

  if (missing.length > 0) {
    // Use raw stderr — logger may not be fully initialised yet
    process.stderr.write(
      `[config] FATAL: Missing required env vars in production:\n` +
      missing.map(k => `  - ${k}`).join('\n') + '\n'
    )
    process.exit(1)
  }

  logger.info('config.validated', { env: 'production' })
}

// Normalise TRUST_PROXY into the shape Express expects.
//   unset  → 1 hop in prod (Cloud Run / one reverse proxy), false in dev
//   "true" → true (trust all)  |  "false"/"0" → false
//   numeric → Number (hop count)  |  anything else → passed through (IP/subnet list)
function parseTrustProxy(raw, isProd) {
  if (raw === undefined || raw === '') return isProd ? 1 : false
  if (raw === 'true')  return true
  if (raw === 'false') return false
  const n = Number(raw)
  return Number.isInteger(n) ? n : raw
}

// Typed access to every config value the app needs.
// Components import from here instead of reading process.env directly.
export const config = {
  isProd:      IS_PROD,
  port:        parseInt(process.env.PORT, 10) || 3000,
  frontendUrl: process.env.FRONTEND_URL || '',
  // Trust proxy: MUST be a number (hop count) or boolean — Express treats a STRING
  // as a list of trusted IPs, so app.set('trust proxy', '1') silently breaks req.ip
  // (it then reports the proxy's address, not the client's). Cloud Run = 1 hop.
  // 'true' → trust all; numeric string → hop count; else pass through (IP/subnet list).
  trustProxy:  parseTrustProxy(process.env.TRUST_PROXY, IS_PROD),

  clerk: {
    secretKey:      process.env.CLERK_SECRET_KEY      || '',
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || '',
  },

  db: {
    url:              process.env.DATABASE_URL || '',
    // In production, always verify the server certificate.
    // Set DB_SSL=false only for a local Postgres instance without SSL.
    rejectUnauthorized: IS_PROD
      ? process.env.DB_SSL !== 'false'
      : false,
  },

  redis: {
    url:      process.env.REDIS_URL      || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD || '',
  },

  // Redis-backed rate limiting. Required once you run more than one app instance —
  // in-memory counters are per-process, so N instances = N× the configured limit.
  // Prod: on by default (set RATE_LIMIT_REDIS=false to opt out, e.g. single instance).
  // Dev:  off by default (set RATE_LIMIT_REDIS=true to test the Redis path locally).
  rateLimitUseRedis: IS_PROD
    ? process.env.RATE_LIMIT_REDIS !== 'false'
    : process.env.RATE_LIMIT_REDIS === 'true',

  // In-process scrape timers. Safe only for a single long-lived process.
  // Prod: OFF by default — drive scraping via Cloud Scheduler → /api/internal/scrape
  //   (set INPROCESS_CRON=true only if running a single always-on instance).
  // Dev:  ON by default (set INPROCESS_CRON=false to disable).
  inProcessCron: IS_PROD
    ? process.env.INPROCESS_CRON === 'true'
    : process.env.INPROCESS_CRON !== 'false',

  razorpay: {
    keyId:     process.env.RAZORPAY_KEY_ID     || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
}
