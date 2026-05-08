# Toxic Screens

**Evidence-based, non-alarmist resource on kids and technology, screen time, and the anxious generation.**

Built by The Oracle Lover — Intuitive Educator & Oracle Guide.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Custom CSS (design tokens + global) |
| Server | Express.js (ESM, Node 18+) |
| Database | SQLite via `better-sqlite3` |
| Fonts | Inter (Google Fonts) |
| Images | Bunny CDN (`screen-toxic.b-cdn.net`) — all images as compressed WebP |
| AI Writing | OpenAI-compatible API (`gpt-4.1-mini`) |
| Deployment | Render Droplet (Node + PM2) |

---

## Features

- **500 articles** across 8 categories, AI-generated with quality gate (30 live, 470 date-gated at 6/day)
- **3 interactive assessments** (Screen Time Health Check, Social Media Readiness, Family Tech Balance)
- **Dashboard Archetype E** — fixed sidebar, article card grid, reading progress bar
- **Auto-publishing cron** — drip-publishes articles at configurable rate
- **Weekly generation cron** — generates new articles automatically
- **Full SEO/AEO layer** — sitemap.xml, robots.txt, llms.txt, JSON-LD structured data
- **Bunny CDN ready** — configure `BUNNY_API_KEY` to switch from Unsplash to CDN-hosted images
- **Affiliate-ready** — auto-affiliate product blocks in articles

---

## Quick Start (Development)

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Build the frontend
pnpm build

# Start the server
node server/index.mjs
```

Visit: http://localhost:3000

---

## Scripts

| Script | Description |
|---|---|
| `pnpm build` | Build the React frontend to `dist/` |
| `node server/index.mjs` | Start the production server |
| `node scripts/fast-seed.mjs` | Generate initial 30 seed articles (requires OPENAI_API_KEY) |
| `node scripts/generate-500.mjs` | Generate all 500 articles with Bunny CDN images + date-gating |
| `node scripts/assign-images.mjs` | Re-assign hero images to articles |
| `node scripts/cron-publish.mjs` | Manually trigger the publish cron |
| `node scripts/cron-generate.mjs` | Manually trigger the generation cron |

---

## Render Deployment

### 1. Create a Droplet

Recommended: Ubuntu 22.04 LTS, 2GB RAM minimum (4GB preferred).

### 2. Install Node.js & PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2 pnpm
```

### 3. Clone & Configure

```bash
git clone https://github.com/peacefulgeek/screen-toxic.git
cd screen-toxic
pnpm install
cp .env.example .env
nano .env  # Fill in your values
pnpm build
```

### 4. Start with PM2

```bash
pm2 start server/index.mjs --name screen-toxic
pm2 startup
pm2 save
```

### 5. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name screentoxic.com www.screentoxic.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6. SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d screentoxic.com -d www.screentoxic.com
```

---

## Bunny CDN

Already configured. All images are stored on `screen-toxic.b-cdn.net` as compressed WebP (1200×630, quality 82).

Add to `.env`:
```
BUNNY_API_KEY=6c37756b-8e97-4dc2-bda68cbb5dc4-6388-4450
BUNNY_STORAGE_ZONE=screen-toxic
BUNNY_CDN_URL=https://screen-toxic.b-cdn.net
```

To re-upload images: `python3 scripts/migrate-images-to-bunny.py`

## Amazon Affiliate

All product links use tag `spankyspinola-20`. Products are embedded inline in article bodies by the AI writing engine.

To add more products, edit `AMAZON_CATALOG` in `src/data/articles-500.mjs`.

---

## Project Structure

```
screen-toxic/
├── server/
│   └── index.mjs           # Express server (API + static serving)
├── src/
│   ├── client/
│   │   ├── App.tsx          # React router
│   │   ├── components/      # DashboardLayout, ArticleCard, etc.
│   │   ├── pages/           # HomePage, ArticlePage, AssessmentPage, etc.
│   │   └── styles/          # tokens.css, global.css
│   ├── data/
│   │   ├── seed-articles.mjs    # Article topics & metadata
│   │   └── article-images.mjs  # Unsplash image mappings
│   └── lib/
│       ├── db.mjs           # SQLite database layer
│       ├── aeo.mjs          # SEO/AEO helpers
│       └── bunny.mjs        # Bunny CDN integration
├── scripts/
│   ├── fast-seed.mjs        # Batch article generation
│   ├── assign-images.mjs    # Image assignment
│   ├── cron-publish.mjs     # Auto-publish cron
│   └── cron-generate.mjs    # Auto-generate cron
├── data/
│   └── screen-toxic.db    # SQLite database (gitignored)
├── dist/                    # Built frontend (gitignored)
├── .env.example
├── .gitignore
├── package.json
├── vite.config.ts
└── README.md
```

---

## Categories

| Slug | Label |
|---|---|
| `screen-time` | Screen Time |
| `social-media` | Social Media |
| `mental-health` | Mental Health |
| `parenting` | Parenting Strategies |
| `research` | The Research |
| `gaming` | Gaming |
| `digital-literacy` | Digital Literacy |
| `family` | Family Tech |

---

## License

Private — All rights reserved. © Toxic Screens / The Oracle Lover.
