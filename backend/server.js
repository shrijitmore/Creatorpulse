import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import Redis from 'ioredis'
import { getDb } from './db.js'
import trendsRouter from './routes/trends.js'
import scriptsRouter from './routes/scripts.js'
import userRouter from './routes/user.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// ── Middleware ─────────────────────────────────────────────────────────────────

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }))
app.use(express.json({ limit: '10mb' }))

// Request logger
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    console.log(`${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`)
  })
  next()
})

// ── Redis / Valkey ─────────────────────────────────────────────────────────────

function initRedis() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379'
  const opts = { lazyConnect: true, enableOfflineQueue: false, connectTimeout: 5000 }

  if (process.env.REDIS_PASSWORD) {
    opts.password = process.env.REDIS_PASSWORD
  }

  const client = new Redis(url, opts)

  client.on('connect', () => console.log('[redis] Connected'))
  client.on('error', err => {
    // Don't crash — Redis is optional for caching
    if (err.code !== 'ECONNREFUSED' && err.code !== 'ENOTFOUND') {
      console.error('[redis] Error:', err.message)
    }
  })

  client.connect().catch(err => {
    console.warn('[redis] Could not connect — caching disabled:', err.message)
  })

  return client
}

const redis = initRedis()
app.locals.redis = redis

// ── Health check ───────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: 'live',
    uptime: process.uptime(),
    version: '1.0.0'
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: 'live',
    uptime: process.uptime(),
    version: '1.0.0'
  })
})

// ── API info ──────────────────────────────────────────────────────────────────

app.get('/api', (req, res) => {
  res.json({
    name: 'TrendForge API',
    version: '1.0.0',
    description: 'AI-powered content intelligence platform — trend scraping, viral analysis, and script generation',
    mode: 'live',
    endpoints: [
      'POST /api/auth/login',
      'GET  /api/auth/me',
      'GET  /api/trends',
      'POST /api/trends/refresh',
      'POST /api/scripts/generate  (SSE)',
      'POST /api/scripts/regenerate-section',
      'GET  /api/scripts',
      'GET  /api/scripts/:id',
      'DELETE /api/scripts/:id',
      'PATCH /api/user/niches',
      'GET  /api/health',
      'GET  /docs'
    ],
    docs: '/docs',
    health: '/health'
  })
})

// ── Routes ────────────────────────────────────────────────────────────────────

// Auth routes (on userRouter at /api/auth/* and /api/user/*)
app.use('/api/auth', userRouter)
app.use('/api/user', userRouter)

// Trends routes
app.use('/api/trends', trendsRouter)

// Scripts routes
app.use('/api/scripts', scriptsRouter)

// ── Docs ──────────────────────────────────────────────────────────────────────

app.get('/docs', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TrendForge API Docs</title>
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #12121a;
      --border: #1e1e2e;
      --accent: #7c3aed;
      --accent2: #06b6d4;
      --text: #e2e8f0;
      --muted: #64748b;
      --green: #10b981;
      --yellow: #f59e0b;
      --red: #ef4444;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: 'SF Mono', 'Fira Code', monospace; line-height: 1.6; }
    .header { background: linear-gradient(135deg, #0a0a0f 0%, #1a0a2e 100%); border-bottom: 1px solid var(--border); padding: 40px 48px; }
    .header h1 { font-size: 2rem; font-weight: 700; background: linear-gradient(90deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header p { color: var(--muted); margin-top: 8px; font-family: system-ui, sans-serif; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: var(--accent); color: white; margin-left: 12px; vertical-align: middle; }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 48px; }
    .section { margin-bottom: 48px; }
    .section-title { font-size: 1.1rem; font-weight: 700; color: var(--accent2); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
    .endpoint { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 16px; overflow: hidden; }
    .endpoint-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; cursor: pointer; }
    .method { padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; }
    .method.get { background: #064e3b; color: var(--green); }
    .method.post { background: #1e3a5f; color: #60a5fa; }
    .method.patch { background: #78350f; color: var(--yellow); }
    .method.delete { background: #450a0a; color: var(--red); }
    .endpoint-path { font-family: 'SF Mono', monospace; color: var(--text); font-size: 14px; }
    .endpoint-desc { color: var(--muted); font-family: system-ui, sans-serif; font-size: 13px; margin-left: auto; }
    .endpoint-body { padding: 0 20px 20px; border-top: 1px solid var(--border); }
    pre { background: #070710; border: 1px solid var(--border); border-radius: 6px; padding: 16px; margin-top: 12px; font-size: 12px; overflow-x: auto; color: #a5f3fc; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-top: 16px; margin-bottom: 6px; font-family: system-ui, sans-serif; }
    .sse-note { background: #1a1a2e; border: 1px solid #2d2d5e; border-radius: 6px; padding: 12px 16px; font-family: system-ui, sans-serif; font-size: 13px; color: #a78bfa; margin-top: 12px; }
  </style>
</head>
<body>
<div class="header">
  <h1>TrendForge API <span class="badge">v1.0.0</span></h1>
  <p>AI-powered content intelligence — trend scraping, viral analysis &amp; script generation</p>
</div>
<div class="container">

  <div class="section">
    <div class="section-title">Authentication</div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/auth/login</span>
        <span class="endpoint-desc">Authenticate user</span>
      </div>
      <div class="endpoint-body">
        <div class="label">Request</div>
        <pre>{ "email": "alex@trendforge.io", "password": "demo123" }</pre>
        <div class="label">Response</div>
        <pre>{ "success": true, "data": { "user": { "id": "user-1", "email": "alex@trendforge.io", "niches": ["fitness","tech"] } } }</pre>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/auth/me</span>
        <span class="endpoint-desc">Get current user</span>
      </div>
      <div class="endpoint-body">
        <div class="label">Response</div>
        <pre>{ "success": true, "data": { "user": { "id": "user-1", "email": "alex@trendforge.io", "niches": ["fitness","tech"] } } }</pre>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Trends</div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/trends?niches=fitness,tech&amp;platforms=instagram,reddit</span>
        <span class="endpoint-desc">Fetch trending topics</span>
      </div>
      <div class="endpoint-body">
        <div class="label">Response</div>
        <pre>{ "success": true, "data": { "trends": [...], "recommendations": [...] }, "meta": { "mode": "live", "cached": false, "processingMs": 1234 } }</pre>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/trends/refresh</span>
        <span class="endpoint-desc">Invalidate cache &amp; re-scrape</span>
      </div>
      <div class="endpoint-body">
        <div class="label">Request</div>
        <pre>{ "niches": ["fitness", "tech"], "platforms": ["instagram", "reddit"] }</pre>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Scripts</div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/scripts/generate</span>
        <span class="endpoint-desc">Generate script (SSE stream)</span>
      </div>
      <div class="endpoint-body">
        <div class="sse-note">⚡ Server-Sent Events — set Accept: text/event-stream</div>
        <div class="label">Request</div>
        <pre>{ "topicId": "1", "topicTitle": "The 5AM Routine", "tone": "storytelling", "format": "60s", "niche": "fitness" }</pre>
        <div class="label">SSE Events</div>
        <pre>event: progress
data: {"step":1,"status":"active","label":"Scanning trending topics..."}

event: progress
data: {"step":3,"status":"done","label":"Script written"}

event: complete
data: {"script":{...},"contentKit":{...}}</pre>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method post">POST</span>
        <span class="endpoint-path">/api/scripts/regenerate-section</span>
        <span class="endpoint-desc">Regenerate one section</span>
      </div>
      <div class="endpoint-body">
        <div class="label">Request</div>
        <pre>{ "scriptId": "uuid", "section": "hookVariants", "tone": "entertaining", "format": "60s" }</pre>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/scripts?niche=fitness&amp;format=60s</span>
        <span class="endpoint-desc">List all scripts</span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/scripts/:id</span>
        <span class="endpoint-desc">Get script + content kit</span>
      </div>
    </div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method delete">DELETE</span>
        <span class="endpoint-path">/api/scripts/:id</span>
        <span class="endpoint-desc">Delete a script</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">User</div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method patch">PATCH</span>
        <span class="endpoint-path">/api/user/niches</span>
        <span class="endpoint-desc">Update user niches</span>
      </div>
      <div class="endpoint-body">
        <div class="label">Request</div>
        <pre>{ "niches": ["fitness", "tech", "finance"] }</pre>
        <div class="label">Response</div>
        <pre>{ "success": true, "data": { "user": { "id": "user-1", "email": "alex@trendforge.io", "niches": ["fitness","tech","finance"] } } }</pre>
      </div>
    </div>
  </div>

</div>
</body>
</html>`)
})

// ── Static files (frontend) ────────────────────────────────────────────────────

const distPath = path.join(process.cwd(), 'dist')
app.use(express.static(distPath))

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/docs')) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }
    })
  }
  const indexPath = path.join(distPath, 'index.html')
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).json({ status: 'ok', service: 'TrendForge API', docs: '/docs' })
    }
  })
})

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  console.error('[server] Unhandled error:', err)
  res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: err.message || 'Internal server error' }
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────

async function start() {
  try {
    // Initialize DB (runs migrations)
    await getDb()

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 TrendForge API running on port ${PORT}`)
      console.log(`   Mode: ${isMockMode() ? '🔶 MOCK' : '🟢 LIVE'}`)
      console.log(`   Docs: http://localhost:${PORT}/docs`)
      console.log(`   Health: http://localhost:${PORT}/health\n`)
    })

    // Graceful shutdown
    const shutdown = async signal => {
      console.log(`\n[server] ${signal} received — shutting down gracefully`)
      server.close(async () => {
        try {
          await redis.quit()
          console.log('[server] Redis connection closed')
        } catch (_) {}
        console.log('[server] Server closed')
        process.exit(0)
      })

      // Force exit after 10s
      setTimeout(() => {
        console.error('[server] Forced shutdown after timeout')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (err) {
    console.error('[server] Failed to start:', err)
    process.exit(1)
  }
}

start()
