# The Screen Age

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
| Images | Unsplash (CDN-ready, Bunny CDN when configured) |
| AI Writing | OpenAI-compatible API (`gpt-4.1-mini`) |
| Deployment | DigitalOcean Droplet (Node + PM2) |

---

## Features

- **30 seed articles** across 8 categories, AI-generated with quality gate
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
| `node scripts/fast-seed.mjs` | Generate all 30 seed articles (requires OPENAI_API_KEY) |
| `node scripts/assign-images.mjs` | Assign Unsplash hero images to articles |
| `node scripts/cron-publish.mjs` | Manually trigger the publish cron |
| `node scripts/cron-generate.mjs` | Manually trigger the generation cron |

---

## DigitalOcean Deployment

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
git clone https://github.com/YOUR_ORG/the-screen-age.git
cd the-screen-age
pnpm install
cp .env.example .env
nano .env  # Fill in your values
pnpm build
```

### 4. Start with PM2

```bash
pm2 start server/index.mjs --name the-screen-age
pm2 startup
pm2 save
```

### 5. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name thescreenage.com www.thescreenage.com;

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
sudo certbot --nginx -d thescreenage.com -d www.thescreenage.com
```

---

## Adding Bunny CDN

1. Create a Bunny storage zone named `the-screen-age`
2. Create a pull zone pointing to the storage zone
3. Add to `.env`:
   ```
   BUNNY_API_KEY=your-api-key
   BUNNY_STORAGE_ZONE=the-screen-age
   BUNNY_PULL_ZONE=https://the-screen-age.b-cdn.net
   ```
4. Run `node scripts/assign-images.mjs` to migrate images to CDN

---

## Project Structure

```
the-screen-age/
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
│   └── the-screen-age.db    # SQLite database (gitignored)
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

Private — All rights reserved. © The Screen Age / The Oracle Lover.
