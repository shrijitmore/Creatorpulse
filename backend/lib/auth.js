import { clerkMiddleware, getAuth } from '@clerk/express'
import { getDb } from '../db.js'

/**
 * Clerk middleware — mounts on server.js to parse auth on every request.
 * Sets req.auth = { userId, sessionId, ... } when valid Clerk JWT present.
 */
export const clerkMw = clerkMiddleware()

/**
 * requireAuth — verifies user is authenticated and upserts them in DB.
 * Relies on clerkMw having run first (mounted globally in server.js).
 */
export async function requireAuth(req, res, next) {
  // Dev bypass — no Clerk key configured
  if (!process.env.CLERK_SECRET_KEY) {
    req.userId = process.env.DEV_USER_ID || 'user-1'
    req.userEmail = 'alex@trendforge.io'
    return next()
  }

  try {
    const auth = getAuth(req)

    if (!auth?.userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } })
    }

    const clerkUserId = auth.userId

    // Upsert user in DB
    try {
      const db = await getDb()
      const existing = await db.query('SELECT id FROM users WHERE clerk_id = $1', [clerkUserId])
      if (existing.rows.length > 0) {
        req.userId = existing.rows[0].id
      } else {
        const newId = `user-${clerkUserId.slice(-8)}`
        const fallbackEmail = `${clerkUserId.slice(-8)}@clerk.user`
        await db.query(
          `INSERT INTO users (id, email, clerk_id) VALUES ($1, $2, $3)
           ON CONFLICT (clerk_id) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
          [newId, fallbackEmail, clerkUserId]
        )
        const created = await db.query('SELECT id FROM users WHERE clerk_id = $1', [clerkUserId])
        req.userId = created.rows[0]?.id || newId
      }
    } catch (dbErr) {
      console.error('[auth] DB upsert error:', dbErr.message)
      req.userId = clerkUserId  // fallback to Clerk ID
    }

    req.clerkId = clerkUserId
    next()
  } catch (err) {
    console.error('[auth] Error:', err.message)
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token verification failed' } })
  }
}

export async function optionalAuth(req, res, next) {
  if (!process.env.CLERK_SECRET_KEY) {
    req.userId = process.env.DEV_USER_ID || 'user-1'
    return next()
  }
  const auth = getAuth(req)
  req.userId = auth?.userId || 'anon'
  next()
}
