import { createRequire } from 'module'
import { tmpdir } from 'os'
import { join } from 'path'
import { rm, writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { logger } from './lib/logger.js'

const require = createRequire(import.meta.url)

let db = null
let pgliteClient = null

// ── Supabase / PostgreSQL ─────────────────────────────────────────────────────

function initPg(connectionString) {
  const pg = require('pg')
  const { Pool } = pg
  const IS_PROD = process.env.NODE_ENV === 'production'

  // Strip any sslmode query param — we set SSL options explicitly below.
  const cleanUrl = connectionString.replace(/[?&]sslmode=[^&]*/g, '')

  // SSL strategy:
  //   DB_SSL=false   → no TLS (only for a local Postgres without SSL).
  //   DB_CA_CERT set → verify the chain against the provided CA (full security).
  //   otherwise      → TLS on, chain verification off.
  //
  // The Supabase transaction pooler presents a CA that isn't in Node's trust
  // store, so rejectUnauthorized:true throws "self-signed certificate in
  // certificate chain". Default to an encrypted-but-unverified connection so the
  // app works out of the box; set DB_CA_CERT (download the cert from Supabase →
  // Settings → Database → SSL configuration) to enable strict verification.
  let sslConfig
  if (process.env.DB_SSL === 'false') {
    sslConfig = false
  } else if (process.env.DB_CA_CERT) {
    sslConfig = { ca: process.env.DB_CA_CERT, rejectUnauthorized: true }
  } else {
    sslConfig = { rejectUnauthorized: false }
    if (IS_PROD) logger.warn('db.ssl_unverified', { hint: 'set DB_CA_CERT for full certificate verification' })
  }

  const pool = new Pool({ connectionString: cleanUrl, ssl: sslConfig })

  return {
    query: async (sql, params) => {
      const result = await pool.query(sql, params)
      return { rows: result.rows }
    }
  }
}

// ── PGlite (local dev fallback) ───────────────────────────────────────────────

const LOCK_FILE = join(tmpdir(), 'pglite-trendforge.lock')

async function acquireProcessLock() {
  // If a stale lock file exists from a crashed process, remove it first.
  if (existsSync(LOCK_FILE)) {
    try {
      const pid = parseInt((await import('fs')).readFileSync(LOCK_FILE, 'utf8'))
      // Check if that PID is still alive (platform-safe: kill 0 just checks)
      try { process.kill(pid, 0) } catch { await unlink(LOCK_FILE).catch(() => {}) }
    } catch { await unlink(LOCK_FILE).catch(() => {}) }
  }
  // Write our own PID as the lock
  await writeFile(LOCK_FILE, String(process.pid))
}

async function releaseLock() {
  await unlink(LOCK_FILE).catch(() => {})
}

async function initPglite() {
  const { PGlite } = await import('@electric-sql/pglite')
  const dbPath = join(tmpdir(), 'pglite-trendforge')
  logger.info('db.pglite_path', { path: dbPath })

  await acquireProcessLock()

  async function tryOpen(path) {
    const c = new PGlite(path)
    await c.waitReady
    return c
  }

  let client
  try {
    client = await tryOpen(dbPath)
  } catch (err) {
    logger.warn('db.pglite_retry', { message: err.message })
    await new Promise(r => setTimeout(r, 1500))
    try {
      client = await tryOpen(dbPath)
    } catch {
      // Data dir is unrecoverable — wipe and recreate (dev only, last resort).
      logger.warn('db.pglite_reset', { path: dbPath })
      await rm(dbPath, { recursive: true, force: true })
      client = await tryOpen(dbPath)
    }
  }

  pgliteClient = client
  return {
    query: async (sql, params) => {
      const result = await client.query(sql, params)
      return { rows: result.rows }
    }
  }
}

export async function closeDb() {
  if (pgliteClient) {
    try { await pgliteClient.close() } catch {}
    pgliteClient = null
  }
  await releaseLock()
  db = null
}

// ── Init ──────────────────────────────────────────────────────────────────────

export async function getDb() {
  if (db) return db

  if (process.env.DATABASE_URL) {
    logger.info('db.init', { driver: 'postgresql' })
    db = initPg(process.env.DATABASE_URL)
  } else {
    logger.info('db.init', { driver: 'pglite' })
    db = await initPglite()
  }

  await runMigrations(db)
  return db
}

// ── Migrations ────────────────────────────────────────────────────────────────

async function runMigrations(db) {
  const isSupabase = !!process.env.DATABASE_URL

  const statements = [
    // pgvector extension (Supabase has it pre-installed)
    isSupabase
      ? `CREATE EXTENSION IF NOT EXISTS vector`
      : null,

    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT,
      niches      TEXT[],
      clerk_id    TEXT UNIQUE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Creator profiles — deep personalization data
    `CREATE TABLE IF NOT EXISTS creator_profiles (
      id              TEXT PRIMARY KEY,
      user_id         TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      creator_name    TEXT,
      platforms        TEXT[],
      content_styles   TEXT[],
      content_format   TEXT DEFAULT 'on-camera',
      language_style   TEXT DEFAULT 'English',
      audience_persona TEXT,
      audience_age     TEXT,
      primary_goal     TEXT,
      raw_voice_sample TEXT,
      voice_traits     JSONB DEFAULT '[]',
      niche_strengths  JSONB DEFAULT '{}',
      onboarding_done  BOOLEAN DEFAULT FALSE,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Add missing columns to users (handles old PGlite DBs missing these)
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS niches TEXT[]`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_cycle TEXT DEFAULT 'monthly'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT`,
    // is_comp = plan granted by admin (free access / discount), not via Razorpay
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_comp BOOLEAN DEFAULT FALSE`,
    // Ensure clerk_id unique index exists (ALTER TABLE ADD COLUMN does not add constraints)
    `CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_id_unique ON users (clerk_id) WHERE clerk_id IS NOT NULL`,

    // Add new columns to existing table (safe if already exists)
    `ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS content_format TEXT DEFAULT 'on-camera'`,
    `ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS language_style TEXT DEFAULT 'English'`,
    `ALTER TABLE creator_profiles ADD COLUMN IF NOT EXISTS audience_age TEXT`,

    // Scripts
    `CREATE TABLE IF NOT EXISTS scripts (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic_id      TEXT,
      topic_title   TEXT,
      tone          TEXT,
      format        TEXT,
      hook_line     TEXT,
      scenes        JSONB,
      cta           TEXT,
      niche         TEXT,
      platform      TEXT,
      engagement_score INTEGER,
      was_used      BOOLEAN DEFAULT FALSE,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Content kits
    `CREATE TABLE IF NOT EXISTS content_kits (
      id             TEXT PRIMARY KEY,
      script_id      TEXT UNIQUE NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
      hook_variants  TEXT[],
      caption        TEXT,
      hashtags       JSONB,
      thumbnail_text TEXT
    )`,

    // Script embeddings for RAG (pgvector — only on Supabase)
    isSupabase
      ? `CREATE TABLE IF NOT EXISTS script_embeddings (
          id         TEXT PRIMARY KEY,
          user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          script_id  TEXT NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
          embedding  vector(768),
          content    TEXT,
          metadata   JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`
      : `CREATE TABLE IF NOT EXISTS script_embeddings (
          id         TEXT PRIMARY KEY,
          user_id    TEXT NOT NULL,
          script_id  TEXT NOT NULL,
          content    TEXT,
          metadata   JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`,

    // Vector index (Supabase only)
    isSupabase
      ? `CREATE INDEX IF NOT EXISTS script_embeddings_vector_idx
         ON script_embeddings USING ivfflat (embedding vector_cosine_ops)
         WITH (lists = 50)`
      : null,

    // Topic memory — tracks topics per user to avoid repeats
    `CREATE TABLE IF NOT EXISTS topic_memory (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic      TEXT NOT NULL,
      niche      TEXT,
      count      INTEGER DEFAULT 1,
      last_used  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, topic)
    )`,

    // Recording sessions — tracks delivery improvement over time
    `CREATE TABLE IF NOT EXISTS recording_sessions (
      id               TEXT PRIMARY KEY,
      user_id          TEXT NOT NULL,
      scene_number     INTEGER,
      overall_score    INTEGER DEFAULT 0,
      confidence_score INTEGER DEFAULT 0,
      energy_score     INTEGER DEFAULT 0,
      accuracy_score   INTEGER DEFAULT 0,
      filler_count     INTEGER DEFAULT 0,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Payments — audit trail of every Razorpay charge (reconciliation, refunds, disputes)
    `CREATE TABLE IF NOT EXISTS payments (
      id                       TEXT PRIMARY KEY,
      user_id                  TEXT REFERENCES users(id) ON DELETE SET NULL,
      razorpay_payment_id      TEXT UNIQUE,
      razorpay_subscription_id TEXT,
      razorpay_order_id        TEXT,
      plan                     TEXT,
      cycle                    TEXT,
      amount                   INTEGER,
      currency                 TEXT DEFAULT 'INR',
      status                   TEXT,
      method                   TEXT,
      raw                      JSONB,
      created_at               TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS payments_user_idx ON payments (user_id)`,

    // Coupons — admin-managed access codes (free / comp access granted at redemption)
    `CREATE TABLE IF NOT EXISTS coupons (
      code             TEXT PRIMARY KEY,
      kind             TEXT DEFAULT 'free_access',
      plan             TEXT DEFAULT 'pro',
      duration_days    INTEGER DEFAULT 30,
      active           BOOLEAN DEFAULT TRUE,
      max_redemptions  INTEGER,
      redemptions      INTEGER DEFAULT 0,
      expires_at       TIMESTAMPTZ,
      note             TEXT,
      created_by       TEXT,
      created_at       TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Admin audit — every privileged action (who changed what, when)
    `CREATE TABLE IF NOT EXISTS admin_audit (
      id              TEXT PRIMARY KEY,
      admin_clerk_id  TEXT,
      action          TEXT NOT NULL,
      target_user_id  TEXT,
      detail          JSONB DEFAULT '{}',
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Seed default user for local dev — skipped in production
    process.env.NODE_ENV !== 'production'
      ? `INSERT INTO users (id, email, name, niches)
         VALUES ('dev-user-1', 'dev@localhost', 'Dev User', ARRAY['fitness','tech'])
         ON CONFLICT DO NOTHING`
      : null,
  ].filter(Boolean)

  for (const sql of statements) {
    try {
      await db.query(sql, [])
    } catch (err) {
      // ivfflat index may fail on small datasets — non-fatal
      if (!err.message.includes('ivfflat')) {
        logger.error('db.migration_error', { message: err.message.slice(0, 120) })
      }
    }
  }

  logger.info('db.migrations_complete')
}
