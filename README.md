# Creatorpulse

**AI-powered content intelligence for solo creators.** Discover viral trends, generate scripts in your voice, and get coached on your delivery.

---

## What it does

1. **Trend Discovery** — Scans YouTube and Reddit every hour. Surfaces trending topics filtered to your niche, in your language.
2. **Script Generation** — 4-agent AI pipeline writes full reel scripts (30s/60s/90s) that sound like you — Hinglish, regional languages, your tone.
3. **Per-Scene Editing** — Click any scene element, tell the AI what to change. It reasons, warns about cascading changes, and lets you iterate with a followup chain.
4. **Voice Coaching** — Record yourself reading the script scene by scene. AI analyses words, filler words, confidence, energy, emotion, and voice raise.
5. **Creator Profile** — Builds your voice fingerprint from a sample. Tracks delivery improvement over time.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React 18 + custom CSS |
| Auth | Clerk |
| Backend | Express.js (Node.js ESM) |
| AI Agents | LangGraph.js + Gemini 2.5 Flash (Vertex AI) |
| Database | Supabase (PostgreSQL + pgvector) / PGlite (dev) |
| Cache | Redis — shared niche cache, dynamic TTL |
| Scraping | YouTube Data API v3 · Reddit public API |

---

## Project structure

```
creatorpulse/
├── frontend/          # Vite + React 18
│   ├── src/
│   │   ├── constants/ # theme, niches, platforms, signals (no hardcoded values)
│   │   ├── features/  # studio/, profile/, onboarding/
│   │   ├── components/# ui/ design system + layout/
│   │   ├── pages/     # Dashboard, ScriptStudio, Onboarding, Profile, etc.
│   │   ├── hooks/     # shared hooks
│   │   └── lib/       # api.js, apiClient.js, auth.jsx
│   └── .env.local
├── backend/           # Express API (Node.js ESM)
│   ├── agents/        # scraper, trendAnalyst, scriptWriter, hookCopy, pipeline
│   ├── routes/        # trends, scripts, scene, recording, onboarding, profile, memory, user, billing, niches
│   ├── lib/           # gemini.js, auth.js, embeddings.js, memory.js
│   ├── jobs/          # scrapeJob.js (background cron)
│   ├── db.js          # DB init + migrations (Supabase pooler or PGlite dev fallback)
│   ├── constants.js   # all magic numbers/values
│   └── .env
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
```

Create `backend/.env` (copy from `backend/.env.example`):

```env
# AI — Vertex AI (Gemini)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# Database — Supabase pooler connection string
# Leave unset to use PGlite (local dev, no setup needed)
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres

# Scraping
YOUTUBE_API_KEY=AIza...

# Auth
CLERK_SECRET_KEY=sk_test_...

# Billing (optional)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_secret

# Redis (optional — falls back to in-memory cache)
# REDIS_URL=redis://localhost:6379
```

```bash
node server.js
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local` (copy from `frontend/.env.example`):

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
# VITE_API_URL=http://localhost:3000  # only needed if backend runs on different port
```

```bash
npm run dev
```

**Frontend:** `http://localhost:8080`  
**Backend:** `http://localhost:3000`

---

## Getting API keys

| Key | Where |
|-----|-------|
| Gemini / Vertex AI | [console.cloud.google.com](https://console.cloud.google.com) → Enable Vertex AI → Service Account → JSON key |
| YouTube Data API | [console.cloud.google.com](https://console.cloud.google.com) → APIs → YouTube Data API v3 → Create API Key |
| Clerk | [clerk.com](https://clerk.com) → Create application → API Keys → grab Secret Key |
| Supabase DATABASE_URL | [supabase.com](https://supabase.com) → Project → Settings → Database → Connection string → **Transaction pooler** (port 6543) |

---

## Architecture

### AI Pipeline (LangGraph)

```
User selects topic
  → Agent 1: Scrape (YouTube + Reddit in parallel)
  → Agent 2: Trend Analyst (Gemini — score virality, clean titles, detect niches)
  → Agent 3: Script Writer (Gemini — scene-by-scene script in creator's language)
  → Agent 4: Hook & Copy (Gemini — 3 hook variants, caption, hashtags, thumbnail text)
```

### API routes

| Route | Description |
|-------|-------------|
| `POST /api/auth/login` | Authenticate via Clerk token |
| `GET /api/trends` | Fetch cached trends by niche + platform |
| `POST /api/trends/refresh` | Invalidate cache, re-scrape |
| `POST /api/scripts/generate` | Generate script — SSE stream |
| `POST /api/scripts/regenerate-section` | Regenerate one section of a script |
| `GET/DELETE /api/scripts/:id` | Fetch or delete a script |
| `POST /api/scene/edit` | AI per-scene edit with followup chain |
| `POST /api/recording/analyse` | Analyse audio delivery via Gemini |
| `GET/PUT /api/onboarding` | Onboarding steps |
| `GET/PUT /api/profile` | Creator profile + voice fingerprint |
| `GET /api/niches` | Available niches |
| `POST /api/billing/create-order` | Razorpay order creation |
| `GET /health` | Health check |

### Caching strategy

```
Shared niche cache (Redis)
  Key: trends:niche:{sorted-niches}
  TTL: viral=1h · rising=5h · new=10h
  Effect: 1000 fitness users → 1 API call per TTL window

Background cron (jobs/scrapeJob.js)
  Fast niches (fitness/tech/finance): every 1h
  Slow niches (lifestyle/food/travel/beauty/gaming): every 5h
  All niches: every 10h

Gemini profile cache (memory, 1h)
  Creator profile system prompt cached per user
  ~60% token cost reduction on script generation
```

### Onboarding (8 steps)

1. Name
2. Platforms (Instagram / TikTok / YouTube Shorts / X / LinkedIn)
3. Content format (on-camera / voiceover / AI voice / faceless)
4. Language style (English / Hinglish / regional / custom)
5. Content styles (Educational / Entertaining / Controversial / Storytelling)
6. Audience persona (free text or AI-inferred)
7. Primary goal (grow / brand deals / sell / community)
8. Voice sample (optional — Gemini extracts voice traits)

---

## Features

See [`docs/features.md`](docs/features.md) for full status of every feature.

**Built:**
- ✅ Trend feed — YouTube + Reddit, shared cache, dynamic TTL
- ✅ Script generation — 4-agent pipeline, language-aware
- ✅ Per-scene AI editing with followup chain + cascading warnings
- ✅ Script diff view (original vs edited)
- ✅ Recording studio — teleprompter + audio + Gemini coaching
- ✅ Creator profile — voice radar, topic cloud, delivery growth chart
- ✅ Background scraping cron
- ✅ Clerk auth + JWT → backend
- ✅ Supabase + pgvector (RAG for similar scripts)
- ✅ Cross-platform signal badges
- ✅ Audience age AI inference + editable

**Planned:**
- 📋 Razorpay subscription (Free / Pro ₹999 / Agency ₹4999)
- 📋 Video recording analysis (currently audio-only)
- 📋 Supabase pooler connection fix
- 📋 YouTube trending by category (supplement)

---

## Dev commands

```bash
# Backend
cd backend && node server.js

# Frontend  
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build
```

---

## License

[GNU Affero General Public License v3.0](./LICENSE) — open source, copyleft.

If you run a modified version as a service, you must open-source your changes.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Report security issues privately per [SECURITY.md](./SECURITY.md).
