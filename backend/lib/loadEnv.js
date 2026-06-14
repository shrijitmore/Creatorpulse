/**
 * Environment loader — MUST be the first import in server.js.
 *
 * In ES modules, `import` declarations are hoisted and the imported modules are
 * fully evaluated before any sibling statement in the importing file runs. That
 * means calling `dotenv.config()` in the body of server.js executes AFTER modules
 * like config.js have already read process.env — so any value captured at module
 * init (e.g. config.rateLimitUseRedis, config.redis.url) would see the unloaded
 * defaults, not the .env values.
 *
 * Importing this side-effect module first guarantees .env is loaded before any
 * other module evaluates, because imports run in source order.
 *
 * Load order: .env.development wins over .env (dotenv never overrides an already
 * set key), matching the previous behaviour.
 */

import dotenv from 'dotenv'

// Pick the env file by NODE_ENV: .env.development (default) or .env.production.
// Then load .env as a shared fallback. dotenv never overrides an already-set key,
// so the environment-specific file wins, and real OS env vars (Cloud Run) win over both.
const env = process.env.NODE_ENV || 'development'

dotenv.config({ path: `.env.${env}` })
dotenv.config()
