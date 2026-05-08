/**
 * Toxic Screens — Express Server
 * Serves the React SPA + API routes + sitemap/robots/llms.txt
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as db from '../src/lib/db.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = process.env.PORT || 3000;
const SITE_URL = process.env.SITE_URL || 'https://screentoxic.com';

const app = express();
app.use(express.json());

// ─── Initialize DB ────────────────────────────────────────────────────────────
await db.initDb();
console.log('[server] Database initialized');

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ─── API: Articles ────────────────────────────────────────────────────────────
app.get('/api/articles', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 12, 50);
    const category = req.query.category || null;
    const result = db.getArticles({ page, limit, category });
    res.json(result);
  } catch (err) {
    console.error('[api] GET /api/articles error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/articles/popular', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    res.json(db.getPopularArticles(limit));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/articles/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    res.json(db.getRecentArticles(limit));
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/articles/categories', (req, res) => {
  try {
    res.json(db.getCategoryCounts());
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/articles/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const article = db.getArticleBySlug(slug);
    if (!article || article.status !== 'published') {
      return res.status(404).json({ error: 'Article not found' });
    }
    db.incrementViewCount(slug);
    const related = db.getRelatedArticles(slug, article.category, 3);
    res.json({ article, related });
  } catch (err) {
    console.error('[api] GET /api/articles/:slug error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── API: Assessments ─────────────────────────────────────────────────────────
app.get('/api/assessments', (req, res) => {
  try {
    res.json(db.getAllAssessments());
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/assessments/:slug', (req, res) => {
  try {
    const assessment = db.getAssessmentBySlug(req.params.slug);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── SEO: Sitemap ─────────────────────────────────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  try {
    const articles = db.getAllPublishedSlugs();
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/articles', priority: '0.9', changefreq: 'daily' },
      { loc: '/assessments', priority: '0.9', changefreq: 'weekly' },
      { loc: '/assessments/screen-time-health-check', priority: '0.8', changefreq: 'monthly' },
      { loc: '/assessments/social-media-readiness', priority: '0.8', changefreq: 'monthly' },
      { loc: '/assessments/family-tech-balance', priority: '0.8', changefreq: 'monthly' },
      { loc: '/tools', priority: '0.7', changefreq: 'weekly' },
      { loc: '/about', priority: '0.6', changefreq: 'monthly' },
    ];

    const urls = [
      ...staticPages.map(p => `
  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`),
      ...articles.map(a => `
  <url>
    <loc>${SITE_URL}/articles/${a.slug}</loc>
    <lastmod>${(a.last_modified_at || new Date().toISOString()).split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`),
    ].join('');

    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`);
  } catch (err) {
    res.status(500).send('Error generating sitemap');
  }
});

// ─── SEO: Robots.txt ─────────────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /api/

# OpenAI / ChatGPT / SearchGPT
User-agent: GPTBot
Allow: /

# Anthropic Claude
User-agent: Claude-Web
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: anthropic-ai
Allow: /

# Perplexity AI
User-agent: PerplexityBot
Allow: /

# Brave Search AI
User-agent: Brave
Allow: /

# You.com YouChat
User-agent: YouBot
Allow: /

# Kagi Search
User-agent: KagiBot
Allow: /

# Bing / Microsoft Copilot
User-agent: Bingbot
Allow: /
User-agent: msnbot
Allow: /

# DuckDuckGo
User-agent: DuckDuckBot
Allow: /

# Google
User-agent: Googlebot
Allow: /
User-agent: Googlebot-Image
Allow: /

# AI training crawlers
User-agent: CCBot
Allow: /
User-agent: cohere-ai
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/sitemap-images.xml
`);
});

// ─── AEO: ai.txt ──────────────────────────────────────────────────────────────
app.get('/ai.txt', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(`# ai.txt — Toxic Screens (screentoxic.com)
Allow: all
Allow-Training: yes
Allow-Indexing: yes
Allow-Summarization: yes
Contact: hello@screentoxic.com
Site: ${SITE_URL}
Sitemap: ${SITE_URL}/sitemap.xml
LLMs: ${SITE_URL}/llms.txt
`);
});

// ─── AEO: llms.txt ────────────────────────────────────────────────────────────
app.get('/llms.txt', (req, res) => {
  try {
    const articles = db.getRecentArticles(20);
    const articleList = articles.map(a =>
      `- [${a.title}](${SITE_URL}/articles/${a.slug}) — ${a.category.replace(/-/g, ' ')}`
    ).join('\n');

    res.set('Content-Type', 'text/plain');
    res.send(`# Toxic Screens

## About
Toxic Screens is an evidence-based, non-alarmist resource on kids and technology, screen time, and the anxious generation. Written by The Oracle Lover — an intuitive educator and oracle guide.

## Mission
To give parents and caregivers the calibrated truth about children and technology — including what the research actually shows, what we don't know yet, and what actually works.

## Key Topics
- Screen time guidelines and research
- Social media and teen mental health
- Parenting strategies for the digital age
- Gaming and children
- Digital literacy
- Family tech balance

## Recent Articles
${articleList}

## Assessments
- [Screen Time Health Check](${SITE_URL}/assessments/screen-time-health-check)
- [Is Your Child Ready for Social Media?](${SITE_URL}/assessments/social-media-readiness)
- [Family Tech Balance Assessment](${SITE_URL}/assessments/family-tech-balance)

## Site URL
${SITE_URL}

## Sitemap
${SITE_URL}/sitemap.xml
`);
  } catch (err) {
    res.status(500).send('Error generating llms.txt');
  }
});

// ─── Static Files (production) ────────────────────────────────────────────────
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] Toxic Screens running on port ${PORT}`);
  console.log(`[server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
