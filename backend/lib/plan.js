/**
 * Plan helpers — single source of truth for "what plan is this user actually on".
 *
 * A stored plan of 'pro'/'agency' only counts while plan_expires_at is in the future.
 * Computing the effective plan at read time means an expired subscription silently
 * falls back to 'free' with no cron job required.
 */

import { PLAN_LIMITS } from '../constants.js'

export function effectivePlan(userRow) {
  const plan = userRow?.plan || 'free'
  if (plan === 'free') return 'free'

  const expires = userRow?.plan_expires_at ? new Date(userRow.plan_expires_at).getTime() : 0
  if (!expires || expires < Date.now()) return 'free'

  return plan
}

export function planLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free
}
