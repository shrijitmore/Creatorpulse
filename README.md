# Creatorpulse

**AI-powered content intelligence for solo creators.** Discover viral trends, generate scripts in your voice, and get coached on your delivery.

---

## What it does

1. **Trend Discovery** — Scans Instagram, YouTube, and Reddit every hour. Surfaces trending topics filtered to your niche, in your language, with shared Redis caching (1000 fitness users → 1 API call per TTL window).
2. **Script Generation** — 4-agent AI pipeline writes full reel scripts (30s/60s/90s) that sound like you — Hinglish, regional languages, your tone. Generation state persists across navigation.
3. **Per-Scene Editing** — Click any scene element, tell the AI what to change. It reasons, warns about cascading changes, and lets you iterate with a followup chain.
4. **Voice Coaching** — Record yourself reading the script scene by scene. AI analyses words, filler words, confidence, energy, and voice raise. Tracks improvement over time.
5. **Creator Profile** — Builds your voice fingerprint from a sample. Radar chart, topic cloud, delivery growth chart.
6. **Billing** — Free tier (5 scripts/month), Pro (₹999/month), Agency (₹4999/month) via Razorpay.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React 18 + Tailwind CSS |
| Auth | Clerk |
| Backend | Express.js (Node.js ESM) |
| AI Agents | LangGraph.js + Gemini 2.5 Flash (Vertex AI) |
| Database | Supabase (PostgreSQL + pgvector) / PGlite (dev) |
| Cache | Redis — shared niche cache, dynamic TTL |
| Payments | Razorpay |
| Scraping | Instagram session cookie · YouTube Data API v3 · Reddit public API |

---

## Project structure

```
creatorpulse/
├── frontend/          # Vite + React
│   ├── src/
│   │   ├── constants/ # theme, niches, platforms, signals
│   │   ├── context/   # TrendsContext, ScriptGenerationContext
│   │   ├── features/  # studio/, profile/, dashboard/, billing/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   └── .env
├── backend/           # Express API
│   ├── agents/        # scraper, trendAnalyst, scriptWriter, hookCopy, onboarding
│   ├── routes/        # trends, scripts, scene, recording, onboarding, profile, memory, billing
│   ├── lib/           # gemini, auth, embeddings, memory, validate, limiters, billingService
│   ├── jobs/          # scrapeJob (background cron)
│   ├── constants.js   # all magic numbers/values
│   └── .env
├── Dockerfile         # multi-stage build (frontend + backend in one image)
├── docs/
│   └── features.md    # full feature roadmap with status
└── CLAUDE.md          # engineering rules
```

---

## Setup

### 1. Clone

```bash
git clone https://github.com/shrijitmore/Creatorpulse.git
cd Creatorpulse
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your keys
```

Required keys in `backend/.env` — see [backend/.env.example](backend/.env.example) for the full list:

```env
# Core (required)
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
DATABASE_URL=postgresql://...        # Supabase connection string
FRONTEND_URL=http://localhost:8080

# AI — Vertex AI (Gemini)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_CLOUD_PROJECT=your-project-id

# Billing (Razorpay)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...

# Scraping (optional in dev)
YOUTUBE_API_KEY=AIza...
INSTAGRAM_SESSION_ID=...
APIFY_API_KEY=apify_api_...
```

```bash
node server.js
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # fill in your key
```

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

```bash
npm run dev
```

**Frontend:** `http://localhost:8080` (or next available port)
**Backend:** `http://localhost:3000`

### 4. Docker (production)

```bash
# Build from monorepo root — includes frontend + backend in one image
docker build -t creatorpulse .
docker run -p 3000:3000 --env-file backend/.env creatorpulse
```

---

## Getting API keys

| Key | Where |
|-----|-------|
| Gemini / Vertex AI | [console.cloud.google.com](https://console.cloud.google.com) → Enable Vertex AI → Service Account |
| YouTube Data API | [console.cloud.google.com](https://console.cloud.google.com) → APIs → YouTube Data API v3 |
| Apify (Instagram) | [console.apify.com](https://console.apify.com/account/integrations) |
| Instagram session | Log into Instagram in browser → DevTools → Application → Cookies → `sessionid` + `csrftoken` |
| Clerk | [clerk.com](https://clerk.com) → Create application → API Keys |
| Supabase | [supabase.com](https://supabase.com) → New project → Settings → Database → Connection String |
| Razorpay | [razorpay.com](https://razorpay.com) → Settings → API Keys |

---

## Architecture

### AI Pipeline (LangGraph)

```
User selects topic
  → Agent 1: Scrape (Instagram + YouTube + Reddit in parallel)
  → Agent 2: Trend Analyst (Gemini — score virality, clean titles, detect niches)
  → Agent 3: Script Writer (Gemini — scene-by-scene script in creator's language)
  → Agent 4: Hook & Copy (Gemini — 3 hook variants, caption, hashtags, thumbnail text)
```

### Caching strategy

```
Shared niche cache (Redis)
  Key: trends:niche:{sorted-niches}
  TTL: viral=1h · rising=5h · new=10h
  Effect: 1000 fitness users → 1 API call per TTL window

Background cron (jobs/scrapeJob.js)
  Writes to Redis before users request — zero live API calls per page load

Gemini profile cache (memory, 1h TTL)
  Creator profile system prompt cached per user
  ~60% token cost reduction on script generation
```

---

## Features

See [`docs/features.md`](docs/features.md) for full status of every feature.

**Built:**
- ✅ Trend feed — 3 platforms, shared Redis cache, dynamic TTL by signal type
- ✅ Script generation — 4-agent pipeline, language-aware, persists across navigation
- ✅ Per-scene AI editing with followup chain + cascading warnings
- ✅ Recording studio — teleprompter + audio + Gemini coaching
- ✅ Creator profile — voice radar, topic cloud, delivery growth chart
- ✅ Billing — Razorpay orders + verification + plan enforcement (free 5/month, Pro unlimited)
- ✅ Input validation + security hardening across all routes
- ✅ Clerk auth + JWT → backend
- ✅ Supabase + pgvector (RAG for similar scripts)

---

## Dev commands

```bash
# Backend
cd backend && node server.js

# Frontend
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build

# Docker (full production image)
docker build -t creatorpulse .
```

---

## License

[GNU Affero General Public License v3.0](./LICENSE) — open source, copyleft.

If you run a modified version as a service, you must open-source your changes.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Report security issues privately per [SECURITY.md](./SECURITY.md).
