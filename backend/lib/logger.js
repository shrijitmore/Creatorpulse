/**
 * Structured logger.
 * Production: JSON lines to stdout — ready for Datadog, CloudWatch, Logtail, etc.
 * Development: colour-coded human-readable output.
 *
 * Log levels:
 *   info     — normal operational events (request completed, cache hit)
 *   warn     — degraded-but-not-broken state (Redis down, DB retry)
 *   error    — request-level failures, unhandled exceptions
 *   security — auth events, rate-limit hits, suspicious patterns
 */

const IS_PROD = process.env.NODE_ENV === 'production'

const ANSI = {
  reset:    '\x1b[0m',
  info:     '\x1b[36m',   // cyan
  warn:     '\x1b[33m',   // yellow
  error:    '\x1b[31m',   // red
  security: '\x1b[35m',   // magenta
}

function write(level, event, data = {}) {
  const entry = {
    ts:    new Date().toISOString(),
    level,
    event,
    pid:   process.pid,
    ...data,
  }

  if (IS_PROD) {
    // Single-line JSON — one entry per line, no PII beyond userId
    process.stdout.write(JSON.stringify(entry) + '\n')
  } else {
    const color = ANSI[level] || ''
    const tag   = `${color}[${level.toUpperCase().padEnd(8)}]${ANSI.reset}`
    const rest  = Object.keys(data).length
      ? ' ' + Object.entries(data).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ')
      : ''
    process.stdout.write(`${tag} ${event}${rest}\n`)
  }
}

export const logger = {
  info:     (event, data) => write('info',     event, data),
  warn:     (event, data) => write('warn',     event, data),
  error:    (event, data) => write('error',    event, data),
  security: (event, data) => write('security', event, data),
}
