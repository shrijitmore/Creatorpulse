/**
 * Admin gating via an env allowlist of Clerk user IDs (ADMIN_CLERK_IDS, comma-separated).
 * Server-side only — there is no DB role to escalate and nothing in the UI to bypass.
 * Must run AFTER requireAuth, which populates req.clerkId.
 */

import { logger } from './logger.js'

function adminList() {
  return (process.env.ADMIN_CLERK_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

export function isAdminRequest(req) {
  // Dev with no Clerk configured → treat the local dev user as admin for testing,
  // unless explicitly disabled.
  if (!process.env.CLERK_SECRET_KEY) return process.env.DEV_ADMIN !== 'false'
  return Boolean(req.clerkId && adminList().includes(req.clerkId))
}

export function requireAdmin(req, res, next) {
  if (isAdminRequest(req)) return next()
  logger.security('admin.forbidden', { ip: req.ip, userId: req.userId || null, path: req.path })
  return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } })
}
