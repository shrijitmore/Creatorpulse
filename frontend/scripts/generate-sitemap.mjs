// Generates public/sitemap.xml from the route list + content stores.
// Runs automatically before every build (prebuild). Add content → it shows up.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { SITE } from '../src/lib/seo.js'
import { POSTS } from '../src/content/blog.js'
import { TERMS } from '../src/content/glossary.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const today = new Date().toISOString().slice(0, 10)

// Static public, indexable routes with priority + change frequency.
const staticRoutes = [
  { path: '/',         priority: '1.0', changefreq: 'weekly' },
  { path: '/pricing',  priority: '0.9', changefreq: 'monthly' },
  { path: '/blog',     priority: '0.8', changefreq: 'weekly' },
  { path: '/glossary', priority: '0.7', changefreq: 'monthly' },
  { path: '/contact',  priority: '0.5', changefreq: 'yearly' },
  { path: '/terms',    priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy',  priority: '0.3', changefreq: 'yearly' },
  { path: '/refund',   priority: '0.3', changefreq: 'yearly' },
]

const dynamicRoutes = [
  ...POSTS.map(p => ({ path: `/blog/${p.slug}`, priority: '0.7', changefreq: 'monthly', lastmod: p.updated || p.date })),
  ...TERMS.map(t => ({ path: `/glossary/${t.slug}`, priority: '0.6', changefreq: 'yearly' })),
]

const urls = [...staticRoutes, ...dynamicRoutes].map(r => {
  const loc = `${SITE.url}${r.path === '/' ? '/' : r.path}`
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${r.lastmod || today}</lastmod>`,
    `    <changefreq>${r.changefreq}</changefreq>`,
    `    <priority>${r.priority}</priority>`,
    '  </url>',
  ].join('\n')
}).join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

const out = join(__dirname, '..', 'public', 'sitemap.xml')
writeFileSync(out, xml, 'utf8')
console.log(`[sitemap] wrote ${staticRoutes.length + dynamicRoutes.length} URLs → public/sitemap.xml`)
