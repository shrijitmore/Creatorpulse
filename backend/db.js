import { createRequire } from 'module'
import { tmpdir } from 'os'
import { join } from 'path'
import { rm, writeFile, unlink } from 'fs/promises'
import { existsSync } from 'fs'

const require = createRequire(import.meta.url)

let db = null
let pgliteClient = null

// ── Supabase / PostgreSQL ─────────────────────────────────────────────────────

function initPg(connectionString) {
  const pg = require('pg')
  const { Pool } = pg
  const cleanUrl = connectionString.replace(/[?&]sslmode=[^&]*/g, '')
  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
  })
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
  console.log(`[db] PGlite path: ${dbPath}`)

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
    // node --watch restarts before the old process releases the lock.
    console.warn('[db] PGlite init failed, retrying in 1.5s...')
    await new Promise(r => setTimeout(r, 1500))
    try {
      client = await tryOpen(dbPath)
    } catch {
      // Data dir is unrecoverable — wipe and recreate (dev only, last resort).
      console.warn('[db] PGlite still failing, resetting data directory...')
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
    console.log('[db] Using PostgreSQL (Supabase)')
    db = initPg(process.env.DATABASE_URL)
  } else {
    console.log('[db] Using PGlite (local dev)')
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

    // Seed default user (dev only)
    `INSERT INTO users (id, email, name, niches)
     VALUES ('user-1', 'alex@trendforge.io', 'Alex', ARRAY['fitness','tech'])
     ON CONFLICT DO NOTHING`,
  ].filter(Boolean)

  for (const sql of statements) {
    try {
      await db.query(sql, [])
    } catch (err) {
      // ivfflat index may fail on small datasets — non-fatal
      if (!err.message.includes('ivfflat')) {
        console.error('[db] Migration error:', err.message.slice(0, 120))
      }
    }
  }

  console.log('[db] Migrations complete')
}
