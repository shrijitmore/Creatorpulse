/**
 * Centralised rate limiters and bot-detection middleware.
 *
 * Design principles:
 *   - Cheap reads  (GET trends, GET scripts)     → global IP limiter in server.js
 *   - Expensive AI (generate, scene edit, etc.)  → per-USER limiter here
 *   - Account ops  (onboarding/complete)         → per-IP limiter here
 *   - Scraping     (trends/refresh)              → per-USER limiter here
 *
 * Per-user keying means an attacker who rotates IPs cannot bypass quotas once
 * authenticated. Account-creation ops key by IP since userId doesn't exist yet.
 *
 * Counters are shared across instances via a Redis store (see rateLimitStore.js)
 * when rateLimitUseRedis is enabled — required for multi-instance deployments,
 * where an in-memory store would let an attacker bypass a quota by spreading
 * requests across instances. Falls back to in-memory in local dev.
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { logger } from './logger.js'
import { withStore, incrWindow } from './rateLimitStore.js'

// ── Key generators ────────────────────────────────────────────────────────────

// Authenticated endpoints: key by userId so limit is per-account, not per-IP.
// Falls back to ipKeyGenerator (handles IPv4-mapped IPv6) for pre-auth routes.
const byUser = (req) => req.userId || ipKeyGenerator(req)

// Pre-auth endpoints: key by IP (ipKeyGenerator normalises IPv4-mapped IPv6).
const byIp = (req) => ipKeyGenerator(req)

// ── Shared handler factory ────────────────────────────────────────────────────

function handler(label) {
  return (req, res) => {
    logger.security('rate_limit.' + label, {
      ip:     req.ip,
      userId: req.userId || null,
      path:   req.path,
    })
    res.status(429).json({
      success: false,
      error: {
        code:    'RATE_LIMITED',
        message: 'Too many requests — please slow down and try again later.',
      },
    })
  }
}

// ── AI generation limiter ─────────────────────────────────────────────────────
// Scripts/generate: calls the full Gemini pipeline. Tight limit per user.
// 10 full script generations per hour is generous for a real creator;
// a bot hammering this would be blocked after 10 attempts.

export const aiGenerationLimiter = rateLimit(withStore('rl:ai_gen:', {
  windowMs:            60 * 60 * 1000, // 1 hour
  max:                 10,
  keyGenerator:        byUser,
  standardHeaders:     true,
  legacyHeaders:       false,
  skipSuccessfulRequests: false,
  handler:             handler('ai_generation'),
}))

// ── AI assist limiter ─────────────────────────────────────────────────────────
// Scene edit, scene followup, niche interpret, regenerate-section.
// These are cheaper than full generation but still hit Gemini.

export const aiAssistLimiter = rateLimit(withStore('rl:ai_assist:', {
  windowMs:            60 * 60 * 1000, // 1 hour
  max:                 60,
  keyGenerator:        byUser,
  standardHeaders:     true,
  legacyHeaders:       false,
  skipSuccessfulRequests: false,
  handler:             handler('ai_assist'),
}))

// ── Recording analysis limiter ────────────────────────────────────────────────
// Sends base64 audio to Gemini. Heavy per-request cost.

export const recordingLimiter = rateLimit(withStore('rl:recording:', {
  windowMs:            60 * 60 * 1000, // 1 hour
  max:                 20,
  keyGenerator:        byUser,
  standardHeaders:     true,
  legacyHeaders:       false,
  skipSuccessfulRequests: false,
  handler:             handler('recording'),
}))

// ── Voice transcription limiter ───────────────────────────────────────────────
// Base64 audio transcription — similar cost profile to recording.

export const transcribeLimiter = rateLimit(withStore('rl:transcribe:', {
  windowMs:            60 * 60 * 1000, // 1 hour
  max:                 15,
  keyGenerator:        byUser,
  standardHeaders:     true,
  legacyHeaders:       false,
  skipSuccessfulRequests: false,
  handler:             handler('transcribe'),
}))

// ── Trends refresh limiter ────────────────────────────────────────────────────
// Triggers a full scraping pipeline across Reddit and YouTube.
// Extremely expensive — very tight limit.

export const trendsRefreshLimiter = rateLimit(withStore('rl:trends_refresh:', {
  windowMs:            60 * 60 * 1000, // 1 hour
  max:                 5,
  keyGenerator:        byUser,
  standardHeaders:     true,
  legacyHeaders:       false,
  skipSuccessfulRequests: false,
  handler:             handler('trends_refresh'),
}))

// ── Account creation limiter ──────────────────────────────────────────────────
// Onboarding completion creates a user record. Key by IP since userId is new.
// 5 accounts from the same IP in 15 minutes is a clear bot signal.

export const accountCreationLimiter = rateLimit(withStore('rl:account_create:', {
  windowMs:            15 * 60 * 1000, // 15 minutes
  max:                 5,
  keyGenerator:        byIp,
  standardHeaders:     true,
  legacyHeaders:       false,
  skipSuccessfulRequests: false,
  handler:             handler('account_creation'),
}))

// ── Bot UA detection ──────────────────────────────────────────────────────────
// Blocks requests with no User-Agent on expensive AI endpoints.
// Logs (but does not block) requests that carry known scraper signatures.
// Legitimate apps and mobile clients always send a User-Agent.

const BOT_UA_PATTERNS = [
  /python-requests/i,
  /go-http-client/i,
  /curl\//i,
  /wget\//i,
  /scrapy/i,
  /httpclient/i,
  /okhttp/i,
  /axios\/[0-9]/i,   // raw axios without a custom UA (common in bots)
  /node-fetch/i,
  /undici/i,
]

export function requireBrowserLike(req, res, next) {
  const ua = req.headers['user-agent'] || ''

  if (!ua.trim()) {
    logger.security('bot.no_ua', { ip: req.ip, path: req.path, userId: req.userId || null })
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Automated access to this endpoint is not permitted.' },
    })
  }

  if (BOT_UA_PATTERNS.some(p => p.test(ua))) {
    // Log but allow — may be a legitimate developer testing the API.
    // Escalate to a block if your logs show abuse from these UAs.
    logger.security('bot.suspicious_ua', {
      ip:     req.ip,
      ua:     ua.slice(0, 120),
      path:   req.path,
      userId: req.userId || null,
    })
  }

  next()
}

// ── Suspicious 401 tracker ────────────────────────────────────────────────────
// Tracks repeated authentication failures per IP. When an IP accumulates
// THRESHOLD failures within WINDOW_MS, it logs a security event that can
// trigger an alert in your log aggregator.
//
// This does NOT block — the auth limiter already throttles the request rate.
// Its purpose is to create a high-signal log entry for credential-stuffing
// and token-scanning patterns that would otherwise be buried in 401 noise.

const WINDOW_MS  = 10 * 60 * 1000  // 10 minutes
const WINDOW_SEC = WINDOW_MS / 1000
const THRESHOLD  = 10               // 10 failures → suspicious

const _failMap = new Map() // ip -> { count, firstAt }  (in-memory fallback only)

// Prune stale entries every 15 minutes to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of _failMap) {
    if (now - entry.firstAt > WINDOW_MS) _failMap.delete(ip)
  }
}, 15 * 60 * 1000).unref()

function trackFailedAuthInMemory(ip) {
  const now   = Date.now()
  const entry = _failMap.get(ip)

  if (!entry || now - entry.firstAt > WINDOW_MS) {
    _failMap.set(ip, { count: 1, firstAt: now })
    return 1
  }

  entry.count += 1
  return entry.count
}

/**
 * Record a failed auth attempt for an IP and return the running count within the
 * window. Uses a shared Redis counter when enabled so credential-stuffing across
 * instances is detected as one burst; falls back to per-process memory otherwise.
 * Advisory only — emits a high-signal log at THRESHOLD, does not block.
 */
export async function trackFailedAuth(ip) {
  let count = await incrWindow(`auth_fail:${ip}`, WINDOW_SEC)
  if (count == null) count = trackFailedAuthInMemory(ip)

  if (count === THRESHOLD) {
    logger.security('suspicious.auth_burst', {
      ip,
      count,
      windowS: WINDOW_SEC,
    })
  }

  return count
}
