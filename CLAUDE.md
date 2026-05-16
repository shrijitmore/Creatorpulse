# Creatorpulse — Engineering Rules

## Project Overview
AI-powered content intelligence platform for solo creators.
Monorepo: `apps/web` (Vite/React) + `apps/api` (Express/Node.js)

---

## Architecture

```
creatorpulse/
├── apps/
│   ├── web/          # Frontend — Vite + React + Tailwind CDN
│   └── api/          # Backend — Express + LangGraph + Gemini
├── docs/
│   ├── features.md   # All planned features with status
│   └── architecture.md
└── CLAUDE.md
```

### Frontend feature structure
Each feature is self-contained:
```
apps/web/src/features/{feature}/
  ├── index.jsx          # Main page component (default export)
  ├── components/        # Feature-specific components
  └── hooks/             # Feature-specific hooks
```

Shared across features:
```
apps/web/src/
  ├── components/ui/     # Design system — Button, Chip, Modal, etc.
  ├── components/layout/ # Shell, Sidebar, Topbar
  ├── constants/         # ALL magic values — theme, niches, platforms
  ├── lib/               # api.js, apiClient.js, auth.jsx
  └── App.jsx
```

### Backend feature structure
```
apps/api/
  ├── features/{feature}/
  │   ├── routes.js      # Express router
  │   └── *.js           # Business logic
  ├── lib/               # gemini.js, auth.js, embeddings.js, memory.js
  ├── db/index.js        # Database connection + migrations
  └── server.js          # App entry — middleware + route mounting only
```

---

## Coding Rules

### 1. NO hardcoded values — ever
All magic numbers, colors, strings go in constants files:

```js
// ❌ WRONG
<div style={{ color: '#C47338' }}>
score > 80 ? 'viral' : 'rising'
const niches = ['fitness', 'finance', 'tech']

// ✅ CORRECT
import { COLORS, SIGNAL_THRESHOLDS, NICHES } from '@/constants'
<div style={{ color: COLORS.terra }}>
score > SIGNAL_THRESHOLDS.viral ? 'viral' : 'rising'
```

### 2. NO duplicate components
Before creating any component — search existing ones first.
Every UI primitive lives in `components/ui/index.jsx`.
Never recreate Button, Chip, Modal, Tooltip, Icon, etc.

### 3. useEffect — only when truly necessary
Use only for:
- Subscriptions (WebSocket, EventSource)
- Browser APIs (MediaRecorder, IntersectionObserver)
- Clerk auth token registration
- One-time data fetch on mount (prefer React Query or SWR instead)

Never use for:
- Derived state (use useMemo)
- Event handlers
- Transforming props

```js
// ❌ WRONG
useEffect(() => {
  setFiltered(trends.filter(t => t.niche === niche))
}, [trends, niche])

// ✅ CORRECT
const filtered = useMemo(() =>
  trends.filter(t => t.niche === niche)
, [trends, niche])
```

### 4. .map() — avoid inline maps in JSX
Extract to named variables or components:

```jsx
// ❌ WRONG
return (
  <div>
    {trends.map(t => (
      <div key={t.id}>
        {t.niches.map(n => <span>{n}</span>)}
      </div>
    ))}
  </div>
)

// ✅ CORRECT
const trendCards = trends.map(t => <TrendCard key={t.id} trend={t} />)
return <div>{trendCards}</div>
```

### 5. Component rules
- One component per file
- Props destructured at top, not inline
- No anonymous arrow function components
- Default export = the page/component, named exports = sub-components

```jsx
// ❌ WRONG
export default ({ trend, onGenerate }) => <div>...</div>

// ✅ CORRECT
export default function TrendCard({ trend, onGenerate }) { ... }
```

### 6. API calls — never in components directly
All API calls go through `lib/api.js`. Components use hooks only.

```js
// ❌ WRONG — fetch inside component
useEffect(() => { fetch('/api/trends').then(...) }, [])

// ✅ CORRECT — hook wraps the api call
const { trends } = useTrends(selectedNiches)
```

### 7. Error handling
Every API call has a try/catch. Errors shown to user, never silently swallowed.
Backend: always return `{ success, data, error }` shape.
Frontend: always handle loading + error + empty states.

### 8. Backend route files — thin
Routes only: parse params, call service, return response.
Zero business logic in routes.

```js
// ❌ WRONG — logic in route
router.get('/', async (req, res) => {
  const trends = await fetch('https://reddit.com/...')
  const filtered = trends.filter(...)
  // 50 more lines
})

// ✅ CORRECT — route calls service
router.get('/', async (req, res) => {
  const trends = await getTrendsForUser(req.userId, req.query)
  res.json({ success: true, data: trends })
})
```

### 9. Environment variables
Frontend: `VITE_*` prefix, accessed via `import.meta.env.VITE_*`
Backend: accessed via `process.env.*`
Never commit `.env` files. All vars documented in `.env.example`.

### 10. Imports
Use absolute imports with `@/` alias for frontend:
```js
import { Button } from '@/components/ui'
import { COLORS } from '@/constants'
import { useTrends } from '@/features/dashboard/hooks/useTrends'
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React 18 + Tailwind CSS CDN |
| Auth | Clerk (`@clerk/clerk-react`, `@clerk/express`) |
| Backend | Express.js (Node.js ESM) |
| AI Agents | LangGraph.js + Gemini 2.5 Flash (Vertex AI) |
| Database | Supabase (PostgreSQL + pgvector) / PGlite (dev) |
| Cache | Redis (ioredis) — dynamic TTL by signal type |
| Scraping | Instagram session cookie + YouTube Data API v3 + Reddit public API |

---

## Constants files location
```
apps/web/src/constants/
  ├── theme.js       # All colors, shadows, radii
  ├── niches.js      # Niche definitions with icons, subreddits, hashtags
  ├── platforms.js   # Platform definitions, YT categories
  ├── signals.js     # Signal thresholds, TTL values
  └── index.js       # Re-exports everything
```

---

## Do NOT
- Hardcode colors, numbers, strings anywhere outside constants
- Create a component that already exists in `components/ui`
- Write business logic in route files
- Use `useEffect` for derived state
- Use inline `.map()` with complex JSX (> 3 lines)
- Import from `lucide-react` — use `components/ui` Icon object
- Add `console.log` in production code
- Commit secrets or API keys

## ALWAYS
- Check constants before writing a new value
- Check `components/ui` before writing a new component
- Handle loading, error, and empty states
- Write thin routes, fat services
- Cache expensive operations (Redis)
- Keep components under 200 lines — split if larger
