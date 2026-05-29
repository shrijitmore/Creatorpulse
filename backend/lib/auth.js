import { clerkMiddleware, getAuth } from '@clerk/express'
import { getDb } from '../db.js'
import { logger } from './logger.js'
import { trackFailedAuth } from './limiters.js'

const IS_PROD = process.env.NODE_ENV === 'production'

// Fail fast in production if Clerk is not configured — never silently open the API.
if (IS_PROD && !process.env.CLERK_SECRET_KEY) {
  process.stderr.write('[auth] FATAL: CLERK_SECRET_KEY is not set in production. Refusing to start.\n')
  process.exit(1)
}

export const clerkMw = clerkMiddleware()

/**
 * requireAuth — verifies Clerk JWT and upserts the user in DB.
 * In dev, falls back to DEV_USER_ID when Clerk is not configured.
 * In production, always requires a valid Clerk token.
 */
export async function requireAuth(req, res, next) {
  if (!process.env.CLERK_SECRET_KEY) {
    // Dev-only bypass — process.exit above makes this unreachable in production.
    req.userId = process.env.DEV_USER_ID || 'dev-user-1'
    return next()
  }

  try {
    const auth = getAuth(req)

    if (!auth?.userId) {
      const failCount = trackFailedAuth(req.ip)
      logger.security('auth.rejected', {
        reason:    'no_token',
        ip:        req.ip,
        path:      req.path,
        method:    req.method,
        failCount,
      })
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      })
    }

    const clerkUserId = auth.userId

    try {
      const db = await getDb()
      const existing = await db.query('SELECT id FROM users WHERE clerk_id = $1', [clerkUserId])

      if (existing.rows.length > 0) {
        req.userId = existing.rows[0].id
        logger.info('auth.ok', { userId: req.userId, path: req.path })
      } else {
        const newId = `user-${clerkUserId.replace(/[^a-z0-9]/gi, '').slice(-12)}`
        const fallbackEmail = `${newId}@clerk.user`
        await db.query(
          `INSERT INTO users (id, email, clerk_id) VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET clerk_id = COALESCE(users.clerk_id, EXCLUDED.clerk_id),
                                          updated_at = NOW()`,
          [newId, fallbackEmail, clerkUserId]
        )
        req.userId = newId
        logger.security('auth.user_created', { userId: newId, ip: req.ip })
      }
    } catch (dbErr) {
      logger.error('auth.db_error', { message: dbErr.message, clerkId: clerkUserId })
      // Derive a deterministic ID rather than failing the request
      req.userId = `user-${clerkUserId.replace(/[^a-z0-9]/gi, '').slice(-12)}`
    }

    req.clerkId = clerkUserId
    next()
  } catch (err) {
    const failCount = trackFailedAuth(req.ip)
    logger.security('auth.token_error', {
      message:   err.message,
      ip:        req.ip,
      path:      req.path,
      failCount,
    })
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token verification failed' },
    })
  }
}

export async function optionalAuth(req, res, next) {
  if (!process.env.CLERK_SECRET_KEY) {
    req.userId = process.env.DEV_USER_ID || 'dev-user-1'
    return next()
  }
  const auth = getAuth(req)
  req.userId = auth?.userId || null
  next()
}
