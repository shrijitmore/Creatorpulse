import { Router } from 'express'
import crypto from 'crypto'
import { runScrapeTier, SCRAPE_TIERS } from '../jobs/scrapeJob.js'
import { validate } from '../lib/validate.js'
import { logger } from '../lib/logger.js'

const router = Router()

const VALID_TIERS = Object.keys(SCRAPE_TIERS)

/**
 * Authenticates internal cron callers (e.g. Cloud Scheduler) via a shared secret
 * header. Timing-safe compare. For stronger auth, front this with Cloud
 * Scheduler OIDC + a Cloud Run IAM invoker check instead.
 */
function verifyCronSecret(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const provided = req.headers['x-cron-secret'] || ''
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// POST /api/internal/scrape?tier=fast|slow|all
// Runs one scrape tier synchronously and caches the result in Redis. Triggered
// by Cloud Scheduler in production (replaces in-process timers on serverless).
router.post(
  '/scrape',
  validate({ query: { tier: { type: 'string', oneOf: VALID_TIERS } } }),
  async (req, res) => {
    if (!verifyCronSecret(req)) {
      logger.security('cron.unauthorized', { ip: req.ip, path: req.path })
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } })
    }

    const tier = req.query.tier || 'fast'
    try {
      const redis = req.app.locals.redis
      const trends = await runScrapeTier(tier, redis)
      logger.info('cron.scrape_done', { tier, count: trends.length })
      res.json({ success: true, data: { tier, count: trends.length } })
    } catch (err) {
      logger.error('cron.scrape_error', { tier, message: err.message })
      res.status(500).json({ success: false, error: { code: 'SCRAPE_ERROR', message: err.message } })
    }
  }
)

export default router
