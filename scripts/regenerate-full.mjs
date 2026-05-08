#!/usr/bin/env node
/**
 * regenerate-full.mjs
 * Regenerates ALL 500 articles at 1800-2200 words.
 * Uses max_tokens: 4500 to ensure full length output.
 * Preserves existing hero_url (Bunny CDN images) and published_at (date-gating).
 * Only updates: body, word_count, reading_time, meta_description, og_title
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Load .env
const envPath = path.join(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) process.env[key] = val;
    }
  }
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY_DIRECT || process.env.OPENAI_API_KEY;
const AMAZON_TAG = 'spankyspinola-20';
const BATCH_SIZE = 8; // smaller batches for longer articles
const LOG_FILE = '/tmp/regenerate-full-progress.log';

const DB_PATH = path.join(projectRoot, 'data/screenage.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',
});

function log(msg) {
  const line = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

fs.writeFileSync(LOG_FILE, `=== Regenerate Full — ${new Date().toISOString()} ===\n`);

// ─── Amazon products ──────────────────────────────────────────────────────────
const AMAZON_PRODUCTS = [
  { asin: '1250762847', name: 'The Anxious Generation by Jonathan Haidt' },
  { asin: '1982141964', name: 'iGen by Jean Twenge' },
  { asin: '0393339750', name: 'The Shallows by Nicholas Carr' },
  { asin: '1984826069', name: 'Digital Minimalism by Cal Newport' },
  { asin: '0525559531', name: 'How to Raise Successful People by Esther Wojcicki' },
  { asin: '1250301696', name: 'The Tech-Wise Family by Andy Crouch' },
  { asin: '0525533834', name: 'Screenwise by Devorah Heitner' },
  { asin: 'B09B8YWXDF', name: 'Blue Light Blocking Glasses for Kids' },
  { asin: 'B07G5WFMZN', name: 'Circle Home Plus Parental Controls' },
  { asin: '0593418271', name: 'Hunt, Gather, Parent by Michaeleen Doucleff' },
];

const ORACLE_LOVER_VOICE = `You are The Oracle Lover — a science-trained, direct, slightly irreverent educator writing for Toxic Screens (screentoxic.com), a site about kids and technology.

VOICE RULES:
- Short punchy sentences (8-14 words). Staccato. Direct. First sentence hits hard.
- Direct address: "Look," "Here's the thing," "Let me be straight with you."
- NEVER "my friend," NEVER "sweetheart," NEVER long academic sentences.
- Dry humor. Practical. "Yeah, that's not going to work. Here's what will."
- Cite real researchers by name (Haidt, Twenge, Radesky, Heitner, Crouch, Carr).

REQUIRED PHRASES — use 3-5 per article:
- "Look, here's the thing."
- "Stop overthinking this."
- "The research is messier than the headlines suggest."
- "Screen time isn't the variable. What they're doing on the screen is."
- "Parental modeling is the most underrated variable in this whole conversation."
- "Banning doesn't work. This does."
- "Here's what we know for sure. Here's what we don't."

BANNED WORDS (never use): profound, transformative, holistic, nuanced, delve, tapestry, landscape, paradigm, synergy, leverage, unlock, empower, utilize, pivotal, embark, underscore, seamlessly, robust, beacon, foster, elevate, curate, bespoke, resonate, harness, groundbreaking, innovative, cutting-edge, game-changer, navigate, journey.`;

async function generateArticle(article, idx, retries = 3) {
  const product = AMAZON_PRODUCTS[idx % AMAZON_PRODUCTS.length];
  const affiliateLink = `https://www.amazon.com/dp/${product.asin}?tag=${AMAZON_TAG}`;

  const prompt = `Write a COMPLETE 1800-2200 word article for Toxic Screens (screentoxic.com).

TITLE: "${article.title}"
CATEGORY: ${article.category}

REQUIRED STRUCTURE (do not skip any section):
1. Opening paragraph — strong hook, no H2, first sentence grabs attention
2. "In Short" block: <div class="in-short"><strong>In Short:</strong> [2-3 sentence TL;DR]</div>
3. Section 1 (H2) — define the problem or question clearly
4. Section 2 (H2) — what the research actually shows (cite 2+ researchers by name)
5. Section 3 (H2) — the nuance / what the headlines get wrong
6. Section 4 (H2) — practical strategies for parents (3-5 specific, actionable tips)
7. Section 5 (H2) — age-specific guidance or special considerations
8. FAQ section: <h2>Frequently Asked Questions</h2> with 4 Q&A pairs using <details><summary>Q</summary><p>A</p></details>
9. Affiliate mention: Naturally weave in "${product.name}" as a recommended resource: <a href="${affiliateLink}" rel="nofollow sponsored" target="_blank">${product.name}</a>
10. Closing paragraph — direct, practical, no fluff

HARD REQUIREMENTS:
- MINIMUM 1800 words. Count carefully. Do not stop early.
- Use The Oracle Lover voice throughout — punchy, direct, dry humor
- Include at least 4 of the required phrases listed above
- Cite at least 2 real researchers by name with specific findings
- Output ONLY clean HTML (h2, h3, p, ul, li, strong, em, details, summary, div)
- Do NOT include <html>, <head>, <body>, or <article> tags
- Do NOT include the title as H1 (handled by the page template)
- Do NOT use markdown — HTML only`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: ORACLE_LOVER_VOICE },
          { role: 'user', content: prompt },
        ],
        temperature: 0.75,
        max_tokens: 4500,
      });
      const content = res.choices[0].message.content;
      const wordCount = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;
      if (wordCount < 1200 && attempt < retries) {
        log(`  ⚠ Too short (${wordCount}w) for "${article.title.slice(0,40)}" — retrying`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return { content, wordCount };
    } catch (e) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, attempt * 3000));
      } else {
        throw e;
      }
    }
  }
}

function makeExcerpt(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 220) + (text.length > 220 ? '...' : '');
}

async function main() {
  // Get all articles from DB (preserve hero_url and published_at)
  const articles = db.prepare(`
    SELECT id, slug, title, category, hero_url, published_at, status
    FROM articles
    ORDER BY id ASC
  `).all();

  log(`=== Toxic Screens — Full Regeneration ===`);
  log(`Total articles to regenerate: ${articles.length}`);
  log(`Model: gpt-4.1-mini | max_tokens: 4500 | Batch size: ${BATCH_SIZE}`);
  log(`Target: 1800-2200 words per article`);
  log('');

  const updateStmt = db.prepare(`
    UPDATE articles
    SET body = @body,
        word_count = @word_count,
        reading_time = @reading_time,
        meta_description = @meta_description,
        og_title = @og_title,
        last_modified_at = @last_modified_at
    WHERE id = @id
  `);

  let done = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let batchStart = 0; batchStart < articles.length; batchStart += BATCH_SIZE) {
    const batch = articles.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(articles.length / BATCH_SIZE);

    log(`--- Batch ${batchNum}/${totalBatches} ---`);

    const results = await Promise.allSettled(
      batch.map(async (article, batchIdx) => {
        const globalIdx = batchStart + batchIdx;
        try {
          const { content, wordCount } = await generateArticle(article, globalIdx);
          const readTime = Math.max(1, Math.round(wordCount / 200));
          const excerpt = makeExcerpt(content);
          const ogTitle = article.title.length > 60
            ? article.title.slice(0, 57) + '...'
            : article.title;

          updateStmt.run({
            id: article.id,
            body: content,
            word_count: wordCount,
            reading_time: readTime,
            meta_description: excerpt,
            og_title: ogTitle,
            last_modified_at: new Date().toISOString(),
          });

          done++;
          log(`  ✓ [${done}/${articles.length}] ${wordCount}w — ${article.title.slice(0, 55)}`);
        } catch (e) {
          failed++;
          log(`  ✗ FAILED: ${article.title.slice(0, 55)} — ${e.message.slice(0, 60)}`);
        }
      })
    );

    // Brief pause between batches to avoid rate limiting
    if (batchStart + BATCH_SIZE < articles.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  // Final word count audit
  const audit = db.prepare(`
    SELECT
      COUNT(*) as total,
      AVG(word_count) as avg_wc,
      MIN(word_count) as min_wc,
      MAX(word_count) as max_wc,
      SUM(CASE WHEN word_count >= 1800 THEN 1 ELSE 0 END) as over_1800,
      SUM(CASE WHEN word_count < 1800 THEN 1 ELSE 0 END) as under_1800
    FROM articles
    WHERE body IS NOT NULL
  `).get();

  log('');
  log('=== FINAL AUDIT ===');
  log(`Total: ${audit.total} | Done: ${done} | Failed: ${failed} | Time: ${elapsed}s`);
  log(`Avg words: ${Math.round(audit.avg_wc)} | Min: ${audit.min_wc} | Max: ${audit.max_wc}`);
  log(`Over 1800w: ${audit.over_1800} | Under 1800w: ${audit.under_1800}`);
  if (audit.under_1800 === 0) {
    log('✓ ALL ARTICLES MEET 1800+ WORD REQUIREMENT');
  } else {
    log(`⚠ ${audit.under_1800} articles still under 1800 words — run again to retry`);
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
