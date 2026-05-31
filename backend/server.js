import dotenv from 'dotenv'
dotenv.config({ path: '.env.development' })
dotenv.config()
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import Redis from 'ioredis'
import { validateConfig, config } from './lib/config.js'
import { logger } from './lib/logger.js'
import { getDb, closeDb } from './db.js'
import { clerkMw } from './lib/auth.js'
import { startScrapeJob, stopScrapeJob } from './jobs/scrapeJob.js'
import trendsRouter from './routes/trends.js'
import scriptsRouter from './routes/scripts.js'
import userRouter from './routes/user.js'
import onboardingRouter from './routes/onboarding.js'
import profileRouter from './routes/profile.js'
import memoryRouter from './routes/memory.js'
import sceneRouter from './routes/scene.js'
import recordingRouter from './routes/recording.js'
import billingRouter from './routes/billing.js'
import nichesRouter from './routes/niches.js'

// Validate all required secrets before anything else starts.
validateConfig()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const { port: PORT, isProd: IS_PROD } = config

// ── Proxy trust ───────────────────────────────────────────────────────────────
// Required for correct req.ip and req.secure behind Nginx / Render / Fly / Heroku.
// TRUST_PROXY=1 means trust one hop (the load balancer). Set to your proxy count.
if (config.trustProxy) {
  app.set('trust proxy', config.trustProxy)
}

// ── HTTPS redirect ────────────────────────────────────────────────────────────
// Terminates plain HTTP at the app layer in production. In practice, HTTPS
// termination happens at the reverse proxy — this is a belt-and-suspenders guard.
if (IS_PROD) {
  app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')
    if (proto !== 'https') {
      logger.security('https.redirect', { ip: req.ip, path: req.path })
      return res.redirect(301, `https://${req.headers.host}${req.url}`)
    }
    next()
  })
}

// ── Security headers (Helmet) ─────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // 'unsafe-inline' required: Clerk's <ClerkProvider> injects inline scripts into the
      // served frontend HTML at runtime. Nonce-based CSP would require SSR support.
      // Mitigated by the explicit *.clerk.accounts.dev host allowlist.
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://clerk.usable-anchovy-5.clerk.accounts.dev', 'https://*.clerk.accounts.dev'],
      connectSrc: ["'self'", 'https://*.clerk.accounts.dev', 'https://api.clerk.dev'],
      frameSrc: ["'self'", 'https://*.clerk.accounts.dev'],
      imgSrc: ["'self'", 'data:', 'https:'],
      // 'unsafe-inline' required for Clerk's component styles injected at runtime.
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  },
  crossOriginEmbedderPolicy: false,
}))

// ── CORS ──────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = IS_PROD
  ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
  : ['http://localhost:8080', 'http://localhost:5173', 'http://127.0.0.1:8080']

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server requests (no origin) only in dev
    if (!origin) return cb(null, !IS_PROD)
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin '${origin}' not allowed`))
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// ── Rate limiting ─────────────────────────────────────────────────────────────
// These are broad IP-based guards applied before auth runs.
// Per-user, per-operation limits for expensive AI endpoints live in lib/limiters.js
// and are applied directly on the routes that need them.

// Baseline IP guard — catches bots and scrapers that haven't been fingerprinted yet.
// 60 req/min is generous for a browser; a scraper hammering the API will hit this.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('rate_limit.global', {
      ip:     req.ip,
      path:   req.path,
      userId: req.userId || null,
    })
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests — slow down.' },
    })
  },
})

// Auth-path limiter — extra tight for pre-auth routes and billing.
// Runs in addition to apiLimiter, so effective ceiling is min(20/15min, 60/min).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('rate_limit.auth_path', {
      ip:   req.ip,
      path: req.path,
    })
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests — try again in 15 minutes.' },
    })
  },
})

app.use('/api/', apiLimiter)
app.use('/api/auth', authLimiter)
app.use('/api/onboarding', authLimiter)
app.use('/api/billing', authLimiter)

// ── Body parsing ──────────────────────────────────────────────────────────────
// Audio routes receive base64-encoded recordings (up to ~15 MB of binary).
// Mount their own parser BEFORE the global 1 mb limit so express-body-parser
// uses the larger cap for those prefixes and skips re-parsing everywhere else.

app.use('/api/recording', express.json({ limit: '20mb' }))
app.use('/api/memory',    express.json({ limit: '20mb' }))
app.use(express.json({ limit: '1mb' }))

// Clerk middleware — parses auth token on every request, sets req.auth
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMw)
}

// ── Request logger ────────────────────────────────────────────────────────────
// Runs after Clerk so req.userId is available for auth-context logging.
// 5xx → error, 4xx → warn, 2xx/3xx → info.

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const data = {
      method: req.method,
      path:   req.path,
      status: res.statusCode,
      ms:     Date.now() - start,
      ip:     req.ip,
      userId: req.userId || null,
    }
    if (res.statusCode >= 500)      logger.error('request', data)
    else if (res.statusCode >= 400) logger.warn('request', data)
    else                            logger.info('request', data)
  })
  next()
})

// ── Redis / Valkey ─────────────────────────────────────────────────────────────

function initRedis() {
  const opts = {
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 5000,
  }

  if (config.redis.password) opts.password = config.redis.password

  const client = new Redis(config.redis.url, opts)

  client.on('connect', () => logger.info('redis.connected'))
  client.on('error', err => {
    // Redis is optional (caching). Don't crash, just warn.
    if (err.code !== 'ECONNREFUSED' && err.code !== 'ENOTFOUND') {
      logger.warn('redis.error', { message: err.message })
    }
  })

  client.connect()
    .then(() => { startScrapeJob(client) })
    .catch(err => {
      logger.warn('redis.unavailable', { message: err.message })
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
    name: 'Creatorpulse API',
    version: '1.0.0',
    description: 'AI-powered content intelligence platform — trend scraping, viral analysis, and script generation',
    mode: 'live',
    endpoints: [
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

// ── Dev-only test endpoints ───────────────────────────────────────────────────
// These endpoints are disabled in production to prevent internal API exposure.

if (!IS_PROD) {
  app.get('/api/gemini-test', async (req, res) => {
    try {
      const { createGeminiModel, extractResponseText, extractJson, hasGeminiCredentials } = await import('./lib/gemini.js')
      if (!hasGeminiCredentials()) {
        return res.status(503).json({ ok: false, error: 'No Gemini credentials configured' })
      }
      const model = createGeminiModel({ temperature: 0.1, maxOutputTokens: 200 })
      const response = await model.invoke('Return ONLY valid JSON: {"suggestion": "test suggestion", "reasoning": "test", "confidence": "high", "pros": ["a"], "cons": [], "cascadingChange": {"needed": false, "element": null, "reason": "", "suggestion": ""}, "dataSource": "style_suggestion"}')
      const text = extractResponseText(response)
      console.log('[gemini-test] raw response:', text.slice(0, 300))
      const parsed = extractJson(text)
      res.json({ ok: true, response: text.slice(0, 200), parsed })
    } catch (err) {
      const detail = err.cause?.message || err.message
      console.error('[gemini-test] Error:', detail, err.stack?.split('\n').slice(0,4).join(' | '))
      res.status(500).json({ ok: false, error: detail })
    }
  })

  app.post('/api/scene-test', async (req, res) => {
    try {
      const { createGeminiModel, extractResponseText, extractJson } = await import('./lib/gemini.js')
      const { sceneNumber = 2, element = 'visual', currentValue = 'Quick cuts: B-roll of people working', userPrompt = 'What if I look not in camera', tone = 'storytelling', niche = 'fitness' } = req.body || {}
      const model = createGeminiModel({ temperature: 0.4, maxOutputTokens: 4000 })
      const prompt = `You are a script coach helping a ${niche} content creator refine their reel script.
CURRENT SCENE ${sceneNumber}:
${element === 'visual' ? `Visual: "${currentValue}"` : `Voiceover: "${currentValue}"`}
USER WANTS: "${userPrompt}"
Return ONLY valid JSON: { "suggestion": "...", "reasoning": "...", "confidence": "high|medium|low", "pros": ["..."], "cons": [], "cascadingChange": { "needed": false, "element": null, "reason": "", "suggestion": "" }, "dataSource": "style_suggestion" }`
      const response = await model.invoke(prompt)
      const content = extractResponseText(response)
      console.log('[scene-test] response preview:', content.slice(0, 200))
      const parsed = extractJson(content)
      res.json({ ok: true, parsed })
    } catch (err) {
      const detail = err.cause?.message || err.message
      console.error('[scene-test] Error:', detail, err.stack?.split('\n').slice(0,3).join(' | '))
      res.status(500).json({ ok: false, error: detail, errorType: err.constructor.name })
    }
  })
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/auth', userRouter)
app.use('/api/user', userRouter)
app.use('/api/onboarding', onboardingRouter)
app.use('/api/profile', profileRouter)
app.use('/api/memory', memoryRouter)
app.use('/api/scene', sceneRouter)
app.use('/api/recording', recordingRouter)
app.use('/api/billing', billingRouter)
app.use('/api/niches', nichesRouter)

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
  <title>Creatorpulse API Docs</title>
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
  <h1>Creatorpulse API <span class="badge">v1.0.0</span></h1>
  <p>AI-powered content intelligence — trend scraping, viral analysis &amp; script generation</p>
</div>
<div class="container">

  <div class="section">
    <div class="section-title">Authentication</div>
    <div class="endpoint">
      <div class="endpoint-header">
        <span class="method get">GET</span>
        <span class="endpoint-path">/api/auth/me</span>
        <span class="endpoint-desc">Get current user (requires Clerk Bearer token)</span>
      </div>
      <div class="endpoint-body">
        <div class="label">Response</div>
        <pre>{ "success": true, "data": { "user": { "id": "...", "email": "...", "niches": [...], "plan": "free" } } }</pre>
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
        <pre>{ "success": true, "data": { "niches": ["fitness","tech","finance"] } }</pre>
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
      res.status(200).json({ status: 'ok', service: 'Creatorpulse API', docs: '/docs' })
    }
  })
})

// ── Error handler ─────────────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  logger.error('server.unhandled_error', {
    message: err.message,
    stack:   IS_PROD ? undefined : err.stack,
    method:  req.method,
    path:    req.path,
    ip:      req.ip,
    userId:  req.userId || null,
  })
  res.status(500).json({
    success: false,
    // Never leak stack traces or internal error details to the client in production.
    error: {
      code:    'SERVER_ERROR',
      message: IS_PROD ? 'Internal server error' : (err.message || 'Internal server error'),
    },
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────

async function start() {
  try {
    await getDb()

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('server.started', {
        port: PORT,
        env:  process.env.NODE_ENV || 'development',
      })
    })

    const shutdown = async signal => {
      logger.info('server.shutdown', { signal })
      server.close(async () => {
        try {
          stopScrapeJob()
          await closeDb()
          await redis.quit()
        } catch (_) {}
        logger.info('server.stopped')
        process.exit(0)
      })

      setTimeout(() => {
        logger.error('server.shutdown_timeout')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT',  () => shutdown('SIGINT'))
  } catch (err) {
    logger.error('server.start_failed', { message: err.message, stack: err.stack })
    process.exit(1)
  }
}

start()
