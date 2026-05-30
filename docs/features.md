# Creatorpulse — Feature Roadmap

## Status legend
- ✅ Done
- 🔧 Partial / needs improvement
- 📋 Designed, not built
- ❌ Not started

---

## ONBOARDING (conversational, 8 steps)

| Feature | Status | Notes |
|---------|--------|-------|
| Name collection | ✅ | Saved to DB |
| Platform selection | ✅ | Instagram, TikTok, YT Shorts, X, LinkedIn |
| Content format | ✅ | On-camera / Voiceover-only / AI voice / Faceless |
| Language/style selection | ✅ | English / Hinglish / Regional with examples |
| Content style selection | ✅ | Educational / Entertaining / Controversial / Storytelling |
| Audience persona (free text) | ✅ | Stored in creator_profiles |
| Primary goal | ✅ | Grow / Brand deals / Sell / Community |
| Voice sample (optional) | ✅ | Sent to Gemini for trait extraction |
| Audience age AI inference | ✅ | AI-inferred, editable in Profile |
| Voice trait extraction | ✅ | Shown in Profile radar chart + DNA traits |
| Save to DB | ✅ | Saves to creator_profiles via Supabase/PGlite |

---

## DASHBOARD

| Feature | Status | Notes |
|---------|--------|-------|
| Trend feed | ✅ | Instagram + YouTube + Reddit |
| Real-time filtering (niche/platform/signal) | ✅ | Client-side, instant |
| Creator brief banner | ✅ | Shows voice, goal, script count |
| Editor's picks (2 per platform) | ✅ | Balanced Instagram/YouTube/Reddit |
| Signal sparklines | ✅ | Visual trend shape |
| Refresh with cache bypass | ✅ | Hits backend, invalidates Redis |
| Shared niche cache | ✅ | All fitness users share 1 scrape per TTL window |
| Trend TTL by signal type | ✅ | Viral=1h, Rising=5h, New=10h |
| Language-filtered trends | ✅ | Hindi creators see Indian/Hindi trends boosted |
| Cross-platform signal indicator | ✅ | "Also trending on YouTube" badge on TrendCard |
| Scan continues across navigation | ✅ | TrendsContext lives in Layout — never unmounts |

---

## SCRIPT STUDIO

| Feature | Status | Notes |
|---------|--------|-------|
| 4-agent LangGraph pipeline | ✅ | Scrape → Analyse → Write → Copy |
| SSE progress (4 steps) | ✅ | Live step indicator |
| Tone selector (4 tones) | ✅ | Educational / Entertaining / Controversial / Storytelling |
| Format selector (30s/60s/90s) | ✅ | Controls scene count |
| Script panel (hook + scenes + CTA) | ✅ | Copy per section |
| Content kit (hooks, caption, hashtags, thumbnail) | ✅ | Copy + regen per section |
| AI Memory sidebar | ✅ | Recent scripts + topics from API |
| Re-forge | ✅ | Bypasses localStorage cache, always fresh generation |
| Save to library | ✅ | Auto-saved on generation |
| Creator context injection (RAG) | ✅ | Voice profile + similar scripts injected into prompt |
| Visuals in English, voiceover in creator language | ✅ | Language from profile |
| Per-scene conversational edit | ✅ | Prompt → AI responds with reasoning |
| Cascading change warnings | ✅ | "Changing visual affects voiceover" |
| Followup chain per scene | ✅ | [Apply] [Try again] [Followup →] |
| Generation persists across navigation | ✅ | ScriptGenerationContext in Layout — survives page changes |
| Script cached in localStorage | ✅ | Survives page refresh for same topic |

---

## RECORDING STUDIO

| Feature | Status | Notes |
|---------|--------|-------|
| Teleprompter (scene-by-scene) | ✅ | Visual shown first, then voiceover |
| Audio recording per scene | ✅ | Browser MediaRecorder API |
| Script accuracy check | ✅ | Word-by-word comparison |
| Filler word detection | ✅ | um, like, basically, etc. |
| Confidence scoring | ✅ | Trembling, trailing off, upward inflection |
| Energy match scoring | ✅ | Does delivery match script tone? |
| Improvisation detection | ✅ | Offer to update script from improvised version |
| Voice raise analysis | ✅ | Did they stress the right words? |
| Ask AI followup on feedback | ✅ | Conversational coaching chat |
| Audio → Gemini analysis | ✅ | ~$0.01–0.02 per scene |

---

## CREATOR PROFILE

| Feature | Status | Notes |
|---------|--------|-------|
| Voice fingerprint radar chart | ✅ | 6-axis: energy/formality/emotion/etc. |
| DNA traits display | ✅ | Extracted by Gemini from voice sample |
| Topic memory cloud | ✅ | From topic_memory table |
| Stats (scripts, topics, avg score) | ✅ | From DB |
| Niche map bars | ✅ | From niche_strengths |
| Best hooks section | ✅ | Top 5 hooks from real scripts, sorted by score |
| Signal over time chart | ✅ | From engagement scores on scripts |
| Edit profile modal | ✅ | Name, platforms, language, format, goal, audience |
| Audience age (AI + editable) | ✅ | Inline edit with ✏️ prompt |
| Delivery growth tracking | ✅ | Confidence, fillers, energy, accuracy over sessions |
| Plan badge | ✅ | Shows current plan (free/pro/agency) from API |

---

## LIBRARY (Saved Scripts)

| Feature | Status | Notes |
|---------|--------|-------|
| Script list with filters | ✅ | Niche, format, sort |
| Search | ✅ | Title search |
| Delete with confirm | ✅ | |
| Reopen in studio | ✅ | Loads saved script, no re-generation |
| Usage tracking (was_used flag) | ✅ | Mark as posted |
| Engagement score input | ✅ | User enters actual score |
| Performance feedback loop | ✅ | Stats + tone/format insight at top |
| Card row layout | ✅ | Niche icon tile, status badge, action buttons |

---

## SETTINGS

| Feature | Status | Notes |
|---------|--------|-------|
| Niche preferences (edit) | ✅ | Updates DB + localStorage |
| Account display | ✅ | From Clerk |
| Language preference | ✅ | Saves to profile, affects script generation |
| Content format preference | ✅ | Saves to profile |
| Notification preferences | ✅ | UI toggles |
| Subscription / plan display | ✅ | Shows current plan, links to /plans |
| API key storage | ❌ | Removed — server-side only, no browser storage |

---

## AUTH + USER

| Feature | Status | Notes |
|---------|--------|-------|
| Clerk sign-in / sign-up | ✅ | |
| JWT token → backend | ✅ | Authorization header |
| User upsert in DB on login | ✅ | clerk_id → users table |
| Onboarding gate (check DB) | ✅ | Redirects if not onboarded, falls back to localStorage |
| Sign out | ✅ | Sidebar button |

---

## SECURITY

| Feature | Status | Notes |
|---------|--------|-------|
| Input validation middleware | ✅ | validate() on all routes — types, lengths, enums, patterns |
| sanitizeText() on AI prompts | ✅ | Strips control chars, XML delimiters in prompts |
| NICHE_RE for Redis key safety | ✅ | Prevents Redis key injection |
| UUID validation on resource IDs | ✅ | All :id params validated |
| base64 + MIME allowlist on audio | ✅ | Recording and transcription endpoints |
| Razorpay ID patterns | ✅ | order_*/pay_* pattern enforced |
| Rate limiting (per-user, per-IP) | ✅ | AI endpoints, account creation, refresh |
| Helmet CSP | ✅ | Clerk domains derived from CLERK_PUBLISHABLE_KEY |
| CORS | ✅ | Any localhost in dev, FRONTEND_URL only in prod |

---

## BILLING (Razorpay)

| Feature | Status | Notes |
|---------|--------|-------|
| Create Razorpay order | ✅ | With coupon support (LAUNCH20 = 20% off) |
| Verify payment signature | ✅ | HMAC-SHA256 |
| Save plan to DB | ✅ | plan + plan_cycle + plan_expires_at |
| Simulated mode (no keys) | ✅ | Still saves plan; no actual charge |
| Free tier script quota (5/month) | ✅ | Hard-gated at /api/scripts/generate with 402 |
| Auto-expire paid plans | ✅ | Downgrade to free when plan_expires_at passes |
| Upgrade prompt on quota hit | ✅ | Shows in Studio with "Upgrade to Pro →" button |
| Sidebar usage counter | ✅ | Live "X of 5 scripts used" progress bar |
| Webhook handling | 📋 | Needed for subscription renewals |
| Email receipts | 📋 | Success page says "email on the way" — not wired |
| Payment history | 📋 | No table yet |

---

## PLANS

| Tier | Price | Scripts | Platforms | Languages |
|------|-------|---------|-----------|-----------|
| Free | ₹0 | 5/month | Reddit + YouTube | English |
| Pro | ₹999/month | Unlimited | All 3 | All |
| Agency | ₹4999/month | Unlimited | All 3 | All |

---

## CACHING ARCHITECTURE

```
Layer 1 — Niche cache (Redis, shared across all users)
  Key: trends:niche:{sorted-niches}
  TTL: viral=1h, rising=5h, new=10h
  Effect: 1000 fitness users → 1 API call per TTL window

Layer 2 — Personalisation (no API cost)
  Raw cached trends → filter by user language + platform priority

Layer 3 — Gemini profile cache (in-memory, 1h TTL)
  Creator profile system prompt cached per user
  ~60% token cost reduction per script generation

Layer 4 — Script localStorage cache
  Last generated script stored by topicId
  Re-forge bypasses cache; normal navigation restores instantly
```

---

## COST ESTIMATES (per user per month)

| Action | Cost |
|--------|------|
| Script generation (Gemini) | ~$0.002 |
| Script with profile cache | ~$0.0008 |
| Recording analysis (Gemini audio) | ~$0.05–0.10 |
| YouTube API (shared cache) | ~$0.0001 per user |
| Instagram (session cookie) | $0 |
| Reddit | $0 |

At 100 Pro users: ~$5–8/month AI costs + infrastructure.
Pro tier at ₹999/month = ₹99,900/month revenue. Margin: ~95% after infra.
