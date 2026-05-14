import { createRequire } from 'module'

const require = createRequire(import.meta.url)

let db = null

async function initPglite() {
  const { PGlite } = await import('@electric-sql/pglite')
  const client = new PGlite('/tmp/pglite-trendforge')
  await client.waitReady
  return {
    query: async (sql, params) => {
      const result = await client.query(sql, params)
      return { rows: result.rows }
    }
  }
}

function initPg(connectionString) {
  const pg = require('pg')
  const { Pool } = pg
  // Strip sslmode from URL, add ssl config manually
  const cleanUrl = connectionString.replace(/[?&]sslmode=[^&]*/g, '')
  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false }
  })
  return {
    query: async (sql, params) => {
      const result = await pool.query(sql, params)
      return { rows: result.rows }
    }
  }
}

export async function getDb() {
  if (db) return db

  if (process.env.DATABASE_URL) {
    console.log('[db] Using PostgreSQL via pg.Pool')
    db = initPg(process.env.DATABASE_URL)
  } else {
    console.log('[db] Using PGlite at /tmp/pglite-trendforge')
    db = await initPglite()
  }

  await runMigrations(db)
  return db
}

async function runMigrations(db) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      niches TEXT[],
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      topic_id TEXT,
      topic_title TEXT,
      tone TEXT,
      format TEXT,
      hook_line TEXT,
      scenes JSONB,
      cta TEXT,
      niche TEXT,
      platform TEXT,
      user_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS content_kits (
      id TEXT PRIMARY KEY,
      script_id TEXT UNIQUE,
      hook_variants TEXT[],
      caption TEXT,
      hashtags JSONB,
      thumbnail_text TEXT
    )`,
    `INSERT INTO users (id, email, niches)
     VALUES ('user-1', 'alex@trendforge.io', ARRAY['fitness','tech'])
     ON CONFLICT DO NOTHING`
  ]

  for (const sql of statements) {
    try {
      await db.query(sql, [])
    } catch (err) {
      console.error('[db] Migration error:', err.message)
    }
  }

  console.log('[db] Migrations complete')
}
