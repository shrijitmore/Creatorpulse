/**
 * Shared Redis store for rate limiting.
 *
 * express-rate-limit's default store is in-memory (per process). The moment the
 * app runs behind a load balancer with more than one instance, those counters
 * stop being authoritative: each instance only sees its own slice of traffic, so
 * the real limit becomes N × the configured value and an attacker can bypass a
 * quota by spreading requests across instances.
 *
 * A single Redis store shared by every limiter fixes that — all instances
 * increment the same counter.
 *
 * Usage in a limiter definition:
 *   rateLimit(withStore('rl:ai_gen:', { windowMs, max, keyGenerator, handler }))
 *
 * When rateLimitUseRedis is false (local dev by default), withStore returns the
 * options untouched and express-rate-limit falls back to its in-memory store.
 */

import Redis from 'ioredis'
import { RedisStore } from 'rate-limit-redis'
import { config } from './config.js'
import { logger } from './logger.js'

let _client = null

/** Lazily create one dedicated ioredis client for all rate limiters. */
function getClient() {
  if (_client) return _client

  const opts = {
    // Queue commands while (re)connecting rather than throwing — a brief blip
    // shouldn't turn into a wave of 500s on otherwise-fine requests.
    enableOfflineQueue:   true,
    maxRetriesPerRequest: 2,
    connectTimeout:       5000,
  }
  if (config.redis.password) opts.password = config.redis.password

  _client = new Redis(config.redis.url, opts)

  _client.on('connect', () => logger.info('ratelimit.redis_connected'))
  _client.on('error', err => {
    if (err.code !== 'ECONNREFUSED' && err.code !== 'ENOTFOUND') {
      logger.warn('ratelimit.redis_error', { message: err.message })
    }
  })

  return _client
}

/**
 * Wrap a rateLimit() options object, attaching a Redis-backed store when enabled.
 * Each limiter passes a unique prefix so their counters never collide.
 */
export function withStore(prefix, opts) {
  if (!config.rateLimitUseRedis) return opts

  const client = getClient()
  return {
    ...opts,
    store: new RedisStore({
      prefix,
      sendCommand: (...args) => client.call(...args),
    }),
  }
}

/**
 * Atomic per-window counter for advisory tracking (not enforcement) — used by the
 * failed-auth tracker. Returns the current count for `key` within `windowSec`.
 * Falls back to null when Redis is disabled/unavailable so callers can degrade.
 */
export async function incrWindow(key, windowSec) {
  if (!config.rateLimitUseRedis) return null
  try {
    const client = getClient()
    const count = await client.incr(key)
    if (count === 1) await client.expire(key, windowSec)
    return count
  } catch (err) {
    logger.warn('ratelimit.incr_error', { message: err.message })
    return null
  }
}

/** Close the shared client on shutdown. */
export async function closeRateLimitRedis() {
  if (_client) {
    try { await _client.quit() } catch (_) {}
    _client = null
  }
}
