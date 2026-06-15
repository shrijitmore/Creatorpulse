// Pings IndexNow (Bing, Yandex, Seznam, Naver) to instantly notify search engines
// of new/updated URLs. Run after a deploy: `npm run indexnow`.
//
// Requires the key file to be live at https://influensa.xyz/<key>.txt (it ships in public/).

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SITE } from '../src/lib/seo.js'
import { POSTS } from '../src/content/blog.js'
import { TERMS } from '../src/content/glossary.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const host = new URL(SITE.url).host

const key = (await readFile(join(__dirname, '..', '.indexnow-key'), 'utf8')).trim()

const urlList = [
  '/', '/pricing', '/blog', '/glossary', '/contact', '/terms', '/privacy', '/refund',
  ...POSTS.map(p => `/blog/${p.slug}`),
  ...TERMS.map(t => `/glossary/${t.slug}`),
].map(p => `${SITE.url}${p === '/' ? '/' : p}`)

const body = {
  host,
  key,
  keyLocation: `${SITE.url}/${key}.txt`,
  urlList,
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
})

console.log(`[indexnow] ${res.status} ${res.statusText} — submitted ${urlList.length} URLs`)
