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

// Typed access to every config value the app needs.
// Components import from here instead of reading process.env directly.
export const config = {
  isProd:      IS_PROD,
  port:        parseInt(process.env.PORT, 10) || 3000,
  frontendUrl: process.env.FRONTEND_URL || '',
  trustProxy:  process.env.TRUST_PROXY  || (IS_PROD ? '1' : false),

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

  razorpay: {
    keyId:     process.env.RAZORPAY_KEY_ID     || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  },
}
