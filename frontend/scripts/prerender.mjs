// Build-time prerender: snapshots public routes from dist/ into static HTML so
// social scrapers + AI crawlers (which don't run JS) see real content.
//
// Puppeteer is an OPTIONAL dev dependency to avoid a heavy default install:
//   npm i -D puppeteer
//   npm run build && npm run prerender
//
// Output: dist/<route>/index.html for each public route.

import { createServer } from 'node:http'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname } from 'node:path'
import { SITE } from '../src/lib/seo.js'
import { POSTS } from '../src/content/blog.js'
import { TERMS } from '../src/content/glossary.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const PORT = 5055

const ROUTES = [
  '/', '/pricing', '/blog', '/glossary', '/contact', '/terms', '/privacy', '/refund',
  ...POSTS.map(p => `/blog/${p.slug}`),
  ...TERMS.map(t => `/glossary/${t.slug}`),
]

const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain' }

async function staticServer() {
  const index = await readFile(join(DIST, 'index.html'))
  return createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(req.url.split('?')[0])
      const ext = extname(urlPath)
      if (ext) {
        const file = join(DIST, urlPath)
        if (existsSync(file)) {
          res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
          res.end(await readFile(file))
          return
        }
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(index) // SPA fallback
    } catch {
      res.writeHead(500); res.end('err')
    }
  })
}

async function main() {
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('[prerender] dist/ missing — run `npm run build` first.')
    process.exit(1)
  }

  let puppeteer
  try {
    puppeteer = (await import('puppeteer')).default
  } catch {
    console.warn('[prerender] puppeteer not installed — skipping. Run `npm i -D puppeteer` to enable prerendering.')
    process.exit(0)
  }

  const server = await staticServer()
  await new Promise(r => server.listen(PORT, r))
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  const page = await browser.newPage()

  for (const route of ROUTES) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 30000 })
    await new Promise(r => setTimeout(r, 200)) // let head effects flush
    let html = await page.content()
    html = html.replace(`http://localhost:${PORT}`, SITE.url) // normalise any absolute refs

    const dir = route === '/' ? DIST : join(DIST, route)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.html'), html, 'utf8')
    console.log(`[prerender] ${route}`)
  }

  await browser.close()
  server.close()
  console.log(`[prerender] done — ${ROUTES.length} routes`)
}

main()
