#!/usr/bin/env node
/**
 * regenerate-2part.mjs
 * Toxic Screens — Two-part article generator
 *
 * gpt-4.1-mini caps at ~1200-1500 words per call.
 * This script makes TWO calls per article and joins them:
 *   Part 1: Opening + In Short + 3 H2 sections (~900-1000 words)
 *   Part 2: 2 more H2 sections + FAQ + closing (~900-1000 words)
 * Combined: 1800-2000 words guaranteed.
 *
 * Preserves: hero_url (Bunny CDN), published_at (date-gating), status
 * Updates: body, word_count, reading_time, meta_description, og_title
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
const BATCH_SIZE = 6; // 6 articles × 2 calls = 12 concurrent API calls
const LOG_FILE = '/tmp/regen-2part.log';

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

fs.writeFileSync(LOG_FILE, `=== Regen 2-Part — ${new Date().toISOString()} ===\n`);

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

const SYSTEM_PROMPT = `You are The Oracle Lover — a science-trained, direct, slightly irreverent educator writing for Toxic Screens (screentoxic.com), a site about kids and technology.

VOICE RULES:
- Short punchy sentences (8-14 words). Staccato. Direct. First sentence hits hard.
- Direct address: "Look," "Here's the thing," "Let me be straight with you."
- NEVER "my friend," NEVER "sweetheart," NEVER long academic sentences.
- Dry humor. Practical. "Yeah, that's not going to work. Here's what will."
- Cite real researchers by name (Haidt, Twenge, Radesky, Heitner, Crouch, Carr).

REQUIRED PHRASES — use 3-5 across the full article:
- "Look, here's the thing."
- "Stop overthinking this."
- "The research is messier than the headlines suggest."
- "Screen time isn't the variable. What they're doing on the screen is."
- "Parental modeling is the most underrated variable in this whole conversation."
- "Banning doesn't work. This does."
- "Here's what we know for sure. Here's what we don't."

BANNED WORDS (never use): profound, transformative, holistic, nuanced, delve, tapestry, landscape, paradigm, synergy, leverage, unlock, empower, utilize, pivotal, embark, underscore, seamlessly, robust, beacon, foster, elevate, curate, bespoke, resonate, harness, groundbreaking, innovative, cutting-edge, game-changer, navigate, journey.

OUTPUT: Clean HTML only. No markdown. No <html>/<head>/<body> tags. No H1 (handled by template).`;

async function callAI(userPrompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.75,
        max_tokens: 2200,
      });
      return res.choices[0].message.content.trim();
    } catch (e) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, attempt * 2000));
      } else throw e;
    }
  }
}

async function generateArticle(article, idx) {
  const product = AMAZON_PRODUCTS[idx % AMAZON_PRODUCTS.length];
  const affiliateLink = `https://www.amazon.com/dp/${product.asin}?tag=${AMAZON_TAG}`;

  // ── PART 1: Opening + In Short + 3 H2 sections ───────────────────────────
  const part1Prompt = `Write PART 1 of an article for Toxic Screens titled: "${article.title}"
Category: ${article.category}

Write EXACTLY these sections (no more, no less):
1. Opening paragraph — strong hook, punchy, no H2 header, grabs attention immediately
2. <div class="in-short"><strong>In Short:</strong> [2-3 sentence TL;DR that summarizes the whole article]</div>
3. <h2>[Section 1 title — define the problem or question]</h2> — 2-3 paragraphs
4. <h2>[Section 2 title — what the research actually shows]</h2> — cite 2 researchers by name with specific findings, 2-3 paragraphs
5. <h2>[Section 3 title — what the headlines get wrong / the nuance]</h2> — 2-3 paragraphs

Use The Oracle Lover voice. Include 2-3 of the required phrases. ~900 words total.
Output clean HTML only. End with the closing </p> of Section 3. Do NOT add any "Part 1" labels.`;

  // ── PART 2: 2 more sections + FAQ + closing ───────────────────────────────
  const part2Prompt = `Write PART 2 of an article for Toxic Screens titled: "${article.title}"
Category: ${article.category}

This is the CONTINUATION of the article. Write EXACTLY these sections:
1. <h2>[Section 4 title — practical strategies for parents]</h2> — 3-5 specific, actionable tips, 2-3 paragraphs
2. <h2>[Section 5 title — age-specific guidance or special considerations]</h2> — 2-3 paragraphs. Naturally mention <a href="${affiliateLink}" rel="nofollow sponsored" target="_blank">${product.name}</a> as a helpful resource.
3. <h2>Frequently Asked Questions</h2> — 4 Q&A pairs using <details><summary>Q</summary><p>A</p></details>
4. Closing paragraph — direct, practical, no fluff, no H2

Use The Oracle Lover voice. Include 1-2 of the required phrases. ~900 words total.
Output clean HTML only. Start directly with the <h2> for Section 4. Do NOT add any "Part 2" labels.`;

  const [part1, part2] = await Promise.all([
    callAI(part1Prompt),
    callAI(part2Prompt),
  ]);

  const fullBody = part1 + '\n\n' + part2;
  const wordCount = fullBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;

  return { body: fullBody, wordCount };
}

function makeExcerpt(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 220) + (text.length > 220 ? '...' : '');
}

async function main() {
  const articles = db.prepare(`
    SELECT id, slug, title, category, hero_url, published_at, status
    FROM articles
    ORDER BY id ASC
  `).all();

  log(`=== Toxic Screens — 2-Part Regeneration ===`);
  log(`Total: ${articles.length} | Batch size: ${BATCH_SIZE} | 2 API calls per article`);
  log(`Amazon tag: ${AMAZON_TAG} | Target: 1800+ words`);
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

    await Promise.allSettled(
      batch.map(async (article, batchIdx) => {
        const globalIdx = batchStart + batchIdx;
        try {
          const { body, wordCount } = await generateArticle(article, globalIdx);
          const readTime = Math.max(1, Math.round(wordCount / 200));
          const excerpt = makeExcerpt(body);
          const ogTitle = article.title.length > 60
            ? article.title.slice(0, 57) + '...'
            : article.title;

          updateStmt.run({
            id: article.id,
            body,
            word_count: wordCount,
            reading_time: readTime,
            meta_description: excerpt,
            og_title: ogTitle,
            last_modified_at: new Date().toISOString(),
          });

          done++;
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const rate = done / (elapsed / 60);
          const remaining = Math.round((articles.length - done) / rate);
          log(`  ✓ [${done}/${articles.length}] ${wordCount}w — ${article.title.slice(0, 50)} (~${remaining}min left)`);
        } catch (e) {
          failed++;
          log(`  ✗ FAILED [${globalIdx + 1}]: ${article.title.slice(0, 50)} — ${e.message.slice(0, 60)}`);
        }
      })
    );

    // Brief pause between batches
    if (batchStart + BATCH_SIZE < articles.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  // Final audit
  const audit = db.prepare(`
    SELECT
      COUNT(*) as total,
      ROUND(AVG(word_count)) as avg_wc,
      MIN(word_count) as min_wc,
      MAX(word_count) as max_wc,
      SUM(CASE WHEN word_count >= 1800 THEN 1 ELSE 0 END) as over_1800,
      SUM(CASE WHEN word_count < 1800 THEN 1 ELSE 0 END) as under_1800
    FROM articles WHERE body IS NOT NULL
  `).get();

  log('');
  log('=== FINAL AUDIT ===');
  log(`Done: ${done} | Failed: ${failed} | Time: ${elapsed}s (${Math.round(elapsed/60)}min)`);
  log(`Avg: ${audit.avg_wc}w | Min: ${audit.min_wc}w | Max: ${audit.max_wc}w`);
  log(`Over 1800w: ${audit.over_1800} | Under 1800w: ${audit.under_1800}`);
  if (audit.under_1800 === 0) {
    log('✓ ALL 500 ARTICLES MEET 1800+ WORD REQUIREMENT');
  } else {
    log(`⚠ ${audit.under_1800} articles under 1800w`);
  }
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
