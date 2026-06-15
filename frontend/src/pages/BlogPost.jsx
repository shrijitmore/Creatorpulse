import React from 'react'
import { useParams, Link } from 'react-router-dom'
import MarketingShell from '../components/MarketingShell.jsx'
import Seo from '../components/Seo.jsx'
import JsonLd, { breadcrumb } from '../components/JsonLd.jsx'
import { SITE } from '../lib/seo.js'
import { getPost } from '../content/blog.js'

function renderBlock(block, i) {
  if (block.h2) return <h2 key={i}>{block.h2}</h2>
  if (block.ul) return <ul key={i}>{block.ul.map((li, j) => <li key={j}>{li}</li>)}</ul>
  return <p key={i}>{block.p}</p>
}

export default function BlogPost() {
  const { slug } = useParams()
  const post = getPost(slug)

  if (!post) {
    return (
      <MarketingShell>
        <Seo title="Post not found — Influensa" path={`/blog/${slug}`} noindex />
        <h1 style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink)' }}>Post not found</h1>
        <p style={{ color: 'var(--mute)', marginTop: 8 }}><Link to="/blog">← Back to the blog</Link></p>
      </MarketingShell>
    )
  }

  const url = `${SITE.url}/blog/${post.slug}`
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: { '@type': 'Organization', name: post.author, url: SITE.url + '/' },
    publisher: { '@type': 'Organization', name: 'Influensa', logo: { '@type': 'ImageObject', url: SITE.url + '/icon-512.png' } },
    image: SITE.ogImage,
    mainEntityOfPage: url,
    keywords: (post.tags || []).join(', '),
  }
  const crumbLd = breadcrumb([
    { name: 'Home', url: SITE.url + '/' },
    { name: 'Blog', url: SITE.url + '/blog' },
    { name: post.title, url },
  ])

  return (
    <MarketingShell>
      <Seo title={`${post.title} — Influensa`} description={post.description} path={`/blog/${post.slug}`} />
      <JsonLd id="post-article" data={articleLd} />
      <JsonLd id="post-crumb" data={crumbLd} />

      <article className="legal-prose">
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mute-2)', marginBottom: 4 }}>
          <Link to="/blog">Blog</Link> · {new Date(post.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {post.readMins} min read
        </p>
        <h1>{post.title}</h1>
        <p className="legal-updated">{post.description}</p>
        {post.body.map(renderBlock)}

        <div style={{ marginTop: 40, padding: 24, border: '1px solid var(--line)', borderRadius: 14, background: 'var(--paper-2)' }}>
          <h2 style={{ marginTop: 0 }}>Turn trends into scripts with Influensa</h2>
          <p>Influensa scores rising trends for your niche and drafts scripts in your voice — in about 60 seconds.</p>
          <Link to="/sign-up" className="btn btn-primary btn-sm" style={{ marginTop: 8 }}>Get started free</Link>
        </div>
      </article>
    </MarketingShell>
  )
}
