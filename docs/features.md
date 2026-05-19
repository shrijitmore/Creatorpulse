# Creatorpulse — Feature Roadmap

## Status legend
- ✅ Done
- 🔧 Partial / needs improvement
- 📋 Designed, not built
- ❌ Not started

---

## ONBOARDING (conversational, 7 steps)

| Feature | Status | Notes |
|---------|--------|-------|
| Name collection | ✅ | Saved to DB |
| Platform selection | ✅ | Instagram, TikTok, YT Shorts, X, LinkedIn |
| Content style selection | ✅ | Educational/Entertaining/Controversial/Storytelling |
| Audience persona (free text) | ✅ | Stored in creator_profiles |
| Primary goal | ✅ | Grow / Brand deals / Sell / Community |
| Voice sample (optional paste) | ✅ | Sent to Gemini for trait extraction |
| **Content format** | ✅ | On-camera / Voiceover-only / AI voice / Faceless |
| **Language/style selection** | ✅ | English / Hinglish / Regional with examples |
| **Audience age AI inference** | ✅ | AI-inferred label shown, user can edit in Profile |
| Voice trait extraction | ✅ | Shown in Profile radar chart + DNA traits |
| Save to Supabase | 🔧 | Saves to creator_profiles, DB connection issues |

---

## DASHBOARD

| Feature | Status | Notes |
|---------|--------|-------|
| Trend feed | ✅ | Instagram + YouTube + Reddit |
| Real-time filtering (niche/platform/signal) | ✅ | Client-side, instant |
| Creator Brief banner | ✅ | Shows voice, goal, script count |
| Editor's picks (2 per platform) | ✅ | Balanced Instagram/YouTube/Reddit |
| Signal sparklines | ✅ | Visual trend shape |
| Refresh with cache bypass | ✅ | Hits backend, invalidates Redis |
| **Platform-weighted scraping** | 📋 | User's primary platform gets 60% of scraping budget |
| **Trend TTL by signal type** | 📋 | Viral=1h, Rising=5h, New=10h |
| **Shared niche cache** | 📋 | All fitness users share 1 scrape |
| **Language-filtered trends** | 📋 | Hindi creator sees Hindi/Indian trends |
| **Cross-platform signal indicator** | ✅ | "Also trending on YouTube" badge on TrendCard |

---

## SCRIPT STUDIO

| Feature | Status | Notes |
|---------|--------|-------|
| 4-agent LangGraph pipeline | ✅ | Scrape → Analyse → Write → Copy |
| SSE progress (4 steps) | ✅ | Live step indicator |
| Tone selector (4 tones) | ✅ | Educational/Entertaining/Controversial/Storytelling |
| Format selector (30s/60s/90s) | ✅ | Controls scene count |
| Script panel (hook + scenes + CTA) | ✅ | Copy per section |
| Content kit (hooks, caption, hashtags, thumbnail) | ✅ | Copy + regen per section |
| AI Memory sidebar | ✅ | Uses real API data (recent scripts + topics) |
| Re-forge with confirm dialog | ✅ | Warns before replacing draft |
| Save to library | ✅ | Auto-saved on generation |
| Creator context injection (RAG) | 🔧 | Wired but not verified |
| Visuals in English, voiceover in creator language | ✅ | Language from profile, shown in script panel |
| **Per-scene conversational edit** | ✅ | ✏️ icon → prompt → AI responds with reasoning |
| **Cascading change warnings** | ✅ | "Changing visual affects voiceover" |
| **Followup chain per scene** | ✅ | [Apply] [Try again] [Followup →] |
| **Version history per scene** | ✅ | Revision thread shown in SceneEditModal |
| **AI response cites data source** | ✅ | platform_data vs ai_inference badge |

---

## RECORDING STUDIO (new feature)

| Feature | Status | Notes |
|---------|--------|-------|
| **Teleprompter (scene-by-scene)** | ✅ | Visual shown first, then voiceover |
| **Audio recording per scene** | ✅ | Browser MediaRecorder API |
| **Script accuracy check** | ✅ | Word-by-word comparison |
| **Filler word detection** | ✅ | um, like, basically, etc. |
| **Confidence scoring** | ✅ | Trembling, trailing off, upward inflection |
| **Energy match scoring** | ✅ | Does delivery match script tone? |
| **Emotion authenticity** | ✅ | Genuine vs. rehearsed |
| **Voice raise analysis** | ✅ | Did they stress the right words? |
| **Improvisation detection** | ✅ | Offer to update script from improvised version |
| **Per-scene feedback with timestamps** | ✅ | "At 0:08 you trailed off" |
| **Ask AI followup on feedback** | ✅ | Conversational coaching chat added |
| **Audio → Gemini analysis** | ✅ | Single Gemini call: ~$0.01-0.02 per scene |

---

## CREATOR PROFILE

| Feature | Status | Notes |
|---------|--------|-------|
| Voice fingerprint radar chart | ✅ | 6-axis: energy/formality/emotion/etc. |
| DNA traits display | ✅ | Extracted by Gemini from voice sample |
| Topic memory cloud | ✅ | From topic_memory table |
| Stats (scripts, topics, avg score) | ✅ | From DB |
| Niche map bars | ✅ | From niche_strengths |
| Best hooks section | ✅ | Shows top 5 hooks from real scripts, sorted by score |
| Line chart (signal over time) | 🔧 | Static mock data |
| **Delivery growth tracking** | ✅ | Confidence, fillers, energy, accuracy over sessions |
| **Best scene ever** | ✅ | Highest-scored recording shown in DeliveryGrowth |
| **Improvement metrics** | ✅ | "Filler words: 10.5 → 2.1" style progress |
| **Session count** | ✅ | Recording sessions completed |
| **Audience age (AI + editable)** | ✅ | With ✏️ prompt edit |

---

## LIBRARY (Saved Scripts)

| Feature | Status | Notes |
|---------|--------|-------|
| Script list with filters | ✅ | Niche, format, sort |
| Search | ✅ | Title search |
| Delete with confirm | ✅ | |
| Reopen in studio | ✅ | |
| Platform badges | ✅ | |
| **Usage tracking (was_used flag)** | ✅ | Mark as posted |
| **Engagement score input** | ✅ | User enters actual score |
| **Performance feedback loop** | ✅ | Stats + tone/format insight shown at top of Library |

---

## SETTINGS

| Feature | Status | Notes |
|---------|--------|-------|
| Niche preferences (edit) | ✅ | Updates DB + localStorage |
| API keys section | ✅ | Vertex AI, Apify, Supabase |
| Account display | ✅ | From Clerk |
| **Language preference** | ✅ | Saves to profile, affects script generation |
| **Content format preference** | ✅ | Saves to profile |
| **Notification preferences** | ✅ | UI toggles + localStorage |
| **Subscription / Upgrade** | ✅ | Tier cards with feature list (Razorpay later) |

---

## AUTH + USER

| Feature | Status | Notes |
|---------|--------|-------|
| Clerk sign-in / sign-up | ✅ | |
| JWT token → backend | ✅ | Authorization header |
| User upsert in DB on login | ✅ | clerk_id → users table |
| Onboarding gate (check DB) | ✅ | Redirects if not onboarded |
| Sign out | ✅ | Sidebar button |
| **Multi-language UI** | 📋 | i18n later |

---

## MONETISATION (UI locks only — Razorpay later)

| Tier | Price | Features |
|------|-------|----------|
| Free | ₹0 | 5 scripts/month, 3 niches, English only, Reddit+YouTube |
| Pro | ₹999/month | Unlimited scripts, all platforms, all languages, recording |
| Agency | ₹4999/month | Multiple profiles, bulk generation, analytics |

| Feature | Free | Pro | Agency |
|---------|------|-----|--------|
| Scripts/month | 5 | Unlimited | Unlimited |
| Recording + AI coaching | ❌ | ✅ | ✅ |
| Instagram trends | ❌ | ✅ | ✅ |
| Regional languages | ❌ | ✅ | ✅ |
| Creator profiles | 1 | 1 | Multiple |
| Priority scraping | ❌ | ✅ | ✅ |

---

## CACHING ARCHITECTURE (planned)

```
Layer 1 — Niche cache (Redis, shared across all users)
  Key: trends:{niche}:{platform}
  TTL: viral=1h, rising=5h, new=10h
  Effect: 1000 fitness users → 1 API call per TTL window

Layer 2 — Personalization (no API cost)
  Raw cached trends → filter by user language + platform priority
  → re-score by audience age → Gemini personalizes

Layer 3 — Gemini context cache
  Creator profile cached as Gemini context prefix
  ~60% token cost reduction per script generation

Layer 4 — Background scraping job
  Schedule: every 1h for viral niches, 5h for rising, 10h for new
  Writes to Redis before users request
  Users always read from cache — zero API calls per request
```

---

## COST ESTIMATES (per user per month)

| Action | Cost |
|--------|------|
| Script generation (Gemini) | ~$0.002 |
| Script with profile cache | ~$0.0008 |
| Recording analysis (Gemini audio) | ~$0.05-0.10 |
| YouTube API (shared cache) | ~$0.0001 per user |
| Instagram (session cookie) | $0 |
| Reddit | $0 |

At 100 Pro users: ~$5-8/month AI costs + infrastructure.
Pro tier at ₹999/month = ₹99,900/month revenue.
Margin: ~95% after infra.
