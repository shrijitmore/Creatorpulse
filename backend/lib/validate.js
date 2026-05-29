/**
 * Input validation middleware + sanitization helpers.
 *
 * Usage:
 *   import { validate, sanitizeText, VALID_TONES, VALID_FORMATS } from '../lib/validate.js'
 *
 *   router.post('/edit', validate({
 *     body: {
 *       element:    { required: true, oneOf: VALID_ELEMENTS },
 *       userPrompt: { required: true, type: 'string', maxLength: 500 },
 *     }
 *   }), handler)
 *
 * Types: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'uuid' | 'base64' | 'audioMime'
 */

// ── Exported allowlists ───────────────────────────────────────────────────────

export const VALID_TONES    = ['educational', 'entertaining', 'controversial', 'storytelling']
export const VALID_FORMATS  = ['30s', '60s', '90s']
export const VALID_ELEMENTS = ['visual', 'voiceover', 'hook', 'cta']
export const VALID_CYCLES   = ['monthly', 'yearly']
export const VALID_SECTIONS = ['hookVariants', 'caption', 'hashtags', 'thumbnailText', 'fullScript']

// ── Private patterns ──────────────────────────────────────────────────────────

const UUID_RE   = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/

// Niche values go into Redis cache keys — allow only safe chars
const NICHE_RE = /^[a-zA-Z0-9][a-zA-Z0-9 \-]{0,48}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/

// Coupon codes: uppercase alphanumeric + underscore
const COUPON_RE = /^[A-Z0-9_]{0,50}$/

// Razorpay ID patterns
const RAZORPAY_ORDER_RE   = /^order_[A-Za-z0-9_]+$/
const RAZORPAY_PAYMENT_RE = /^pay_[A-Za-z0-9_]+$/

// Audio MIME types accepted by Gemini — only the base type (before ';') is checked
const ALLOWED_AUDIO_BASE_MIMES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/aac',
  'audio/flac',
  'audio/x-m4a',
])

// ── Text sanitiser ────────────────────────────────────────────────────────────

/**
 * Strip null bytes and non-printable control chars, then trim and truncate.
 * Keeps \t, \n, \r and all printable Unicode.
 * Use on every user-supplied string before interpolating into AI prompts.
 */
export function sanitizeText(str, maxLen = 2000) {
  if (typeof str !== 'string') return str
  return str
    .replace(/\0/g, '')                                // null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars (keep \t \n \r)
    .trim()
    .slice(0, maxLen)
}

// ── Field-level checker ───────────────────────────────────────────────────────

function checkField(value, rules, name) {
  const absent = value === undefined || value === null || value === ''

  if (rules.required && absent) return `${name} is required`
  if (absent) return null  // optional field — absence is fine

  switch (rules.type) {
    case 'string': {
      if (typeof value !== 'string') return `${name} must be a string`
      const len = value.trim().length
      if (rules.minLength && len < rules.minLength)
        return `${name} must be at least ${rules.minLength} characters`
      if (rules.maxLength && value.length > rules.maxLength)
        return `${name} must not exceed ${rules.maxLength} characters`
      if (rules.pattern && !rules.pattern.test(value))
        return `${name} has an invalid format`
      break
    }

    case 'integer': {
      const n = Number(value)
      if (!Number.isInteger(n)) return `${name} must be an integer`
      if (rules.min !== undefined && n < rules.min) return `${name} must be at least ${rules.min}`
      if (rules.max !== undefined && n > rules.max) return `${name} must be at most ${rules.max}`
      break
    }

    case 'number': {
      const n = Number(value)
      if (Number.isNaN(n)) return `${name} must be a number`
      if (rules.min !== undefined && n < rules.min) return `${name} must be at least ${rules.min}`
      if (rules.max !== undefined && n > rules.max) return `${name} must be at most ${rules.max}`
      break
    }

    case 'boolean': {
      if (typeof value !== 'boolean') return `${name} must be a boolean`
      break
    }

    case 'uuid': {
      if (typeof value !== 'string' || !UUID_RE.test(value))
        return `${name} must be a valid UUID`
      break
    }

    case 'base64': {
      if (typeof value !== 'string') return `${name} must be a string`
      const clean = value.replace(/[\s\r\n]/g, '')
      if (!BASE64_RE.test(clean)) return `${name} contains invalid base64 characters`
      const approxBytes = Math.ceil(clean.length * 0.75)
      if (rules.maxBytes && approxBytes > rules.maxBytes) {
        const mb = (rules.maxBytes / 1048576).toFixed(0)
        return `${name} exceeds the ${mb}MB size limit`
      }
      break
    }

    case 'audioMime': {
      if (typeof value !== 'string') return `${name} must be a string`
      const base = value.split(';')[0].trim().toLowerCase()
      if (!ALLOWED_AUDIO_BASE_MIMES.has(base))
        return `${name} must be a supported audio format (webm, mp4, ogg, wav, mpeg, aac, flac)`
      break
    }

    case 'array': {
      if (!Array.isArray(value)) return `${name} must be an array`
      if (rules.minItems !== undefined && value.length < rules.minItems)
        return `${name} must contain at least ${rules.minItems} item(s)`
      if (rules.maxItems !== undefined && value.length > rules.maxItems)
        return `${name} must contain at most ${rules.maxItems} item(s)`
      if (rules.itemType === 'string') {
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== 'string')
            return `${name}[${i}] must be a string`
          if (rules.itemMaxLength && value[i].length > rules.itemMaxLength)
            return `${name}[${i}] must not exceed ${rules.itemMaxLength} characters`
          if (rules.itemPattern && !rules.itemPattern.test(value[i]))
            return `${name}[${i}] has an invalid format`
        }
      }
      if (rules.itemOneOf) {
        for (const item of value) {
          if (!rules.itemOneOf.includes(item))
            return `${name} contains an invalid value: "${item}"`
        }
      }
      break
    }
  }

  // Enum check (works with any type)
  if (rules.oneOf !== undefined && !rules.oneOf.includes(value))
    return `${name} must be one of: ${rules.oneOf.join(', ')}`

  return null
}

// ── Middleware factory ────────────────────────────────────────────────────────

/**
 * Returns Express middleware that validates req.body / req.query / req.params.
 * On failure returns 400 { success: false, error: { code, message, details } }.
 */
export function validate(schema) {
  return (req, res, next) => {
    const errors = []
    const sources = { body: req.body ?? {}, query: req.query ?? {}, params: req.params ?? {} }

    for (const [section, fields] of Object.entries(schema)) {
      const src = sources[section]
      for (const [field, rules] of Object.entries(fields)) {
        const err = checkField(src[field], rules, field)
        if (err) errors.push(err)
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code:    'VALIDATION_ERROR',
          message: errors[0],
          details: errors,
        },
      })
    }

    next()
  }
}

// ── Re-export patterns for use in routes ──────────────────────────────────────

export { NICHE_RE, COUPON_RE, RAZORPAY_ORDER_RE, RAZORPAY_PAYMENT_RE }
