# Toxic Screens — Post-Launch Submission Checklist
**Domain:** screentoxic.com  
**Bunny CDN:** screen-toxic.b-cdn.net  
**Amazon Tag:** spankyspinola-20  
**Git Repo:** github.com/peacefulgeek/screen-toxic

---

## Phase 1 — Before Launch (Do These First)

### DNS & Hosting
- [ ] Point screentoxic.com A record → Render.com IP
- [ ] Add `cdn.screentoxic.com` CNAME → `screen-toxic.b-cdn.net` (Bunny custom hostname)
- [ ] Verify HTTPS is active on Render (auto via Let's Encrypt)
- [ ] Set `SITE_URL=https://screentoxic.com` in Render environment variables
- [ ] Set `OPENAI_API_KEY` in Render environment variables
- [ ] Set `BUNNY_API_KEY=6c37756b-8e97-4dc2-bda68cbb5dc4-6388-4450` in Render environment variables
- [ ] Confirm `/health` endpoint returns `{"status":"ok"}` on live domain

### Render Disk (SQLite persistence)
- [ ] Create a Render Disk (1 GB, mount at `/data`) in Render dashboard
- [ ] Confirm `DB_PATH=/data/screenage.db` env var is set
- [ ] On first deploy, run `node scripts/render-start.mjs` (auto-seeds DB from repo)
- [ ] Verify 500 articles appear at `https://screentoxic.com/api/articles?limit=5`

### Cron Jobs (Render Cron Service or external)
- [ ] Set up cron: `0 * * * * node scripts/cron-publish.mjs` (hourly, publishes gated articles)
- [ ] Confirm Phase 1: 5 articles/day for 40 days (May 7 – June 15, 2026)
- [ ] Confirm Phase 2: 1 article/weekday after June 15, 2026

---

## Phase 2 — Search Engine Submission

### Google Search Console
- [ ] Go to https://search.google.com/search-console
- [ ] Add property: `https://screentoxic.com`
- [ ] Verify via HTML tag (add to `index.html` `<head>`) or DNS TXT record
- [ ] Submit sitemap: `https://screentoxic.com/sitemap.xml`
- [ ] Submit image sitemap: `https://screentoxic.com/sitemap-images.xml`
- [ ] Request indexing of homepage
- [ ] Check Coverage report after 48 hours

### Bing Webmaster Tools
- [ ] Go to https://www.bing.com/webmasters
- [ ] Add site: `https://screentoxic.com`
- [ ] Verify via XML file or DNS TXT record
- [ ] Submit sitemap: `https://screentoxic.com/sitemap.xml`
- [ ] Enable "Crawl Control" — set to normal
- [ ] Import from Google Search Console (saves time)

### Bing IndexNow (instant indexing)
- [ ] Generate IndexNow API key at https://www.bing.com/indexnow
- [ ] Add `/{api-key}.txt` file to server static routes
- [ ] Submit all 55 published article URLs via IndexNow API

---

## Phase 3 — AI Search Engine Submission

### You.com (YouChat indexing)
- [ ] Go to https://you.com/submit
- [ ] Submit site URL: `https://screentoxic.com`
- [ ] Submit sitemap URL: `https://screentoxic.com/sitemap.xml`
- [ ] Verify `YouBot` is allowed in `robots.txt` ✓ (already done)

### Brave Search
- [ ] Go to https://search.brave.com/webmasters
- [ ] Add site: `https://screentoxic.com`
- [ ] Submit sitemap: `https://screentoxic.com/sitemap.xml`
- [ ] Verify `Brave` user-agent is allowed in `robots.txt` ✓ (already done)

### Perplexity AI
- [ ] No manual submission needed — auto-crawls via `PerplexityBot` ✓
- [ ] Verify `robots.txt` allows `PerplexityBot` ✓ (already done)
- [ ] Confirm `llms.txt` is live: `https://screentoxic.com/llms.txt`
- [ ] Confirm `ai.txt` is live: `https://screentoxic.com/ai.txt`

### ChatGPT / SearchGPT (OpenAI)
- [ ] No manual submission — auto-crawls via `GPTBot` ✓
- [ ] Verify `GPTBot` is allowed in `robots.txt` ✓ (already done)

### Kagi Search
- [ ] No manual submission — auto-crawls via `KagiBot` ✓
- [ ] Verify `KagiBot` is allowed in `robots.txt` ✓ (already done)

### DuckDuckGo
- [ ] No manual submission — auto-crawls via Bing index
- [ ] Verify Bing sitemap submission is complete (above)

### Claude / Anthropic
- [ ] No manual submission — auto-crawls via `ClaudeBot` ✓
- [ ] Verify `ClaudeBot` and `anthropic-ai` are in `robots.txt` ✓ (already done)

---

## Phase 4 — Social & Rich Media

### Pinterest Rich Pins
- [ ] Go to https://developers.pinterest.com/tools/url-debugger/
- [ ] Validate one article URL, e.g.: `https://screentoxic.com/articles/the-anxious-generation-a-summary-of-haidt-s-key-arguments`
- [ ] Confirm Open Graph tags are detected (og:title, og:image, og:description) ✓
- [ ] Apply for Rich Pins if prompted

### Open Graph / Twitter Cards
- [ ] Test any article URL at https://cards-dev.twitter.com/validator
- [ ] Test at https://developers.facebook.com/tools/debug/
- [ ] Confirm `og:image` points to Bunny CDN WebP ✓

---

## Phase 5 — Amazon Associates

### Verify Amazon Tag
- [ ] Confirm tag `spankyspinola-20` is active in Amazon Associates dashboard
- [ ] Test one affiliate link: `https://www.amazon.com/dp/1250762847?tag=spankyspinola-20`
- [ ] Confirm link redirects correctly to The Anxious Generation on Amazon
- [ ] Add screentoxic.com to your Amazon Associates approved websites list

### Verified ASINs in Articles
| ASIN | Product |
|------|---------|
| 1250762847 | The Anxious Generation — Jonathan Haidt |
| 1982141964 | iGen — Jean Twenge |
| 0393339750 | The Shallows — Nicholas Carr |
| 1984826069 | Digital Minimalism — Cal Newport |
| 0525559531 | How to Raise Successful People — Esther Wojcicki |
| 1250301696 | The Tech-Wise Family — Andy Crouch |
| 0525533834 | Screenwise — Devorah Heitner |
| B09B8YWXDF | Blue Light Blocking Glasses for Kids |
| B07G5WFMZN | Circle Home Plus Parental Controls |
| 0593418271 | Hunt, Gather, Parent — Michaeleen Doucleff |

> **Note:** Verify each ASIN is still active on Amazon before launch. ASINs occasionally change when products are relisted.

---

## Phase 6 — Analytics & Monitoring

### Google Analytics 4
- [ ] Create GA4 property at https://analytics.google.com
- [ ] Add GA4 measurement ID to `index.html` (or as env var `VITE_GA_ID`)
- [ ] Verify pageview events firing on article pages
- [ ] Set up conversion event for assessment completions

### Google Search Console Monitoring
- [ ] Set up email alerts for crawl errors
- [ ] Check Core Web Vitals report after first week
- [ ] Monitor "Queries" report for keyword opportunities

### Uptime Monitoring
- [ ] Set up free uptime monitor at https://uptimerobot.com
- [ ] Monitor: `https://screentoxic.com/health`
- [ ] Set alert email for downtime

---

## Phase 7 — Content Verification

### Article Quality Audit
- [ ] Confirm all 500 articles are in DB: `GET /api/articles?limit=500`
- [ ] Confirm 55 articles are published (live now)
- [ ] Confirm 445 articles are scheduled (date-gated)
- [ ] Spot-check 5 articles for: 1800+ words, Amazon links, hero images on Bunny CDN
- [ ] Verify no broken images (all hero_url fields point to `screen-toxic.b-cdn.net`)

### Assessment Verification
- [ ] Complete all 3 assessments end-to-end:
  - [ ] Screen Time Health Check (`/assessments/screen-time-health-check`)
  - [ ] Is Your Child Ready for Social Media? (`/assessments/social-media-readiness`)
  - [ ] Family Tech Balance Assessment (`/assessments/family-tech-balance`)
- [ ] Confirm results page shows: score ring, label, recommendations, share buttons, related articles
- [ ] Confirm retake button works
- [ ] Confirm "Browse All Articles" CTA works

### Technical SEO
- [ ] Validate sitemap: `https://screentoxic.com/sitemap.xml`
- [ ] Validate robots.txt: `https://screentoxic.com/robots.txt`
- [ ] Validate llms.txt: `https://screentoxic.com/llms.txt`
- [ ] Validate ai.txt: `https://screentoxic.com/ai.txt`
- [ ] Test JSON-LD structured data at https://validator.schema.org/
- [ ] Run Lighthouse audit — target 90+ Performance, 100 SEO

---

## Quarterly Maintenance (Cron Auto-Handles)

The `cron-generate.mjs` script runs weekly and generates new articles automatically. No manual action needed. To trigger manually:

```bash
node scripts/cron-generate.mjs
```

To re-gate articles if you change the publishing schedule:
```bash
node scripts/regate-articles.mjs
```

---

## Quick Reference — Live Endpoints

| Endpoint | URL |
|----------|-----|
| Homepage | https://screentoxic.com |
| Articles | https://screentoxic.com/articles |
| Assessments | https://screentoxic.com/assessments |
| Sitemap | https://screentoxic.com/sitemap.xml |
| Image Sitemap | https://screentoxic.com/sitemap-images.xml |
| robots.txt | https://screentoxic.com/robots.txt |
| llms.txt | https://screentoxic.com/llms.txt |
| ai.txt | https://screentoxic.com/ai.txt |
| Health check | https://screentoxic.com/health |
| API articles | https://screentoxic.com/api/articles |
| API assessments | https://screentoxic.com/api/assessments |
