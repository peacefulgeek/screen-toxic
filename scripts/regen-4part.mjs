#!/usr/bin/env node
/**
 * regen-4part.mjs
 * Toxic Screens — Definitive 4-part article generator
 *
 * Strategy: 4 parallel API calls per article, each ~550 words = ~2,200 words total
 * Part A: Hook + In Short + 2 H2 sections (~550w)
 * Part B: 2 H2 sections with research citations (~550w)
 * Part C: Practical strategies + age-specific guidance (~550w)
 * Part D: FAQ (4 Q&As) + affiliate link + strong closing (~550w)
 *
 * Full Oracle Lover voice guide embedded in every call.
 * Amazon tag: spankyspinola-20
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Load .env
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const API_KEY = process.env.OPENAI_API_KEY;
const AMAZON_TAG = 'spankyspinola-20';
const BATCH_SIZE = 3; // 3 articles × 4 calls = 12 concurrent calls
const LOG = '/tmp/regen-4part.log';

const DB_PATH = path.join(ROOT, 'data/screenage.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Use Manus-provided API (no baseURL override needed — env vars pre-configured)
const client = new OpenAI({ apiKey: API_KEY });

function log(msg) {
  const line = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG, line + '\n');
}

fs.writeFileSync(LOG, `=== Regen 4-Part — ${new Date().toISOString()} ===\n`);

// ─── Amazon catalog ───────────────────────────────────────────────────────────
const PRODUCTS = [
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
  { asin: '1250301696', name: 'The Tech-Wise Family by Andy Crouch' },
  { asin: '0525533834', name: 'Screenwise by Devorah Heitner' },
];

// ─── Full Oracle Lover voice guide ────────────────────────────────────────────
const ORACLE_SYSTEM = `You are The Oracle Lover — the author of Toxic Screens (screentoxic.com).

WHO YOU ARE:
You have a science background. You've read the actual studies, not just the headlines. You are not alarmist. You are not dismissive. You sit in the calibrated middle and you call out bullshit on both sides.

VOICE — NON-NEGOTIABLE RULES:
1. SHORT SENTENCES. 8-14 words max. Staccato rhythm. Like a punch.
2. Direct address: "Look," "Here's the thing," "Let me be straight with you," "Stop."
3. Dry humor. Deadpan. "Yeah, that's not going to work. Here's what will."
4. NEVER start with "In today's digital age" or any variation. NEVER.
5. First sentence of every section hits hard. No warm-up.
6. Use "you" and "your kid" — not "parents" or "children" in third person.
7. Cite real researchers by FULL NAME with specific findings: Jonathan Haidt, Jean Twenge, Jenny Radesky, Devorah Heitner, Andy Crouch, Nicholas Carr, Maryanne Wolf.
8. Acknowledge complexity without drowning in it.

REQUIRED SIGNATURE PHRASES — use at least 4 across the full article:
- "Look, here's the thing."
- "Stop overthinking this."
- "The research is messier than the headlines suggest."
- "Screen time isn't the variable. What they're doing on the screen is."
- "Parental modeling is the most underrated variable in this whole conversation."
- "Banning doesn't work. This does."
- "Here's what we know for sure. Here's what we don't."
- "The headline version of this study is wrong."

ABSOLUTELY BANNED WORDS (use any of these and you fail):
profound, transformative, holistic, nuanced, delve, tapestry, landscape, paradigm, synergy, leverage, unlock, empower, utilize, pivotal, embark, underscore, seamlessly, robust, beacon, foster, elevate, curate, bespoke, resonate, harness, groundbreaking, innovative, cutting-edge, game-changer, navigate, journey, realm, multifaceted, comprehensive, crucial, vital, essential, important (use specific instead).

STRUCTURE RULES:
- Each paragraph: 4-6 sentences minimum. No one-sentence paragraphs.
- Each H2 section: minimum 3 paragraphs.
- HTML only. No markdown. No <html>/<head>/<body> tags. No H1 (handled by template).
- Clean, semantic HTML: <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>, <details>, <summary>, <div>.`;

async function callAI(prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await client.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: ORACLE_SYSTEM },
          { role: 'user', content: prompt },
        ],
        temperature: 0.78,
        max_tokens: 2200,
      });
      return res.choices[0].message.content.trim();
    } catch (e) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, attempt * 2500));
      } else throw e;
    }
  }
}

function wc(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;
}

async function generateArticle(article, idx) {
  const product = PRODUCTS[idx % PRODUCTS.length];
  const affiliateLink = `https://www.amazon.com/dp/${product.asin}?tag=${AMAZON_TAG}`;
  const { title, category, openerType = 'gut-punch statement', conclusionType = 'call to action' } = article;

  // Opener type guidance
  const openerGuide = {
    'gut-punch statement': 'Start with a bold, counterintuitive fact or claim. No hedging.',
    'provocative question': 'Start with a question that makes the reader stop and think. Then immediately answer it.',
    'micro-story': 'Start with a 2-sentence scene — a parent, a kid, a specific moment. Then pivot to the point.',
    'counterintuitive claim': 'Start by saying the conventional wisdom is wrong. Then explain why.',
  }[openerType] || 'Start with a bold, direct statement.';

  const conclusionGuide = {
    'call to action': 'End with a specific, practical action the reader can take today.',
    'reflection': 'End with a thought-provoking observation that reframes the whole issue.',
    'challenge': 'End by challenging the reader to do something uncomfortable but necessary.',
    'question': 'End with a question that makes the reader think about their own situation.',
  }[conclusionType] || 'End with a direct, practical takeaway.';

  // ── PART A: Hook + In Short + Section 1 + Section 2 ─────────────────────
  const partA = await callAI(`Write PART A of an article titled: "${title}"
Category: ${category} | Site: Toxic Screens (screentoxic.com)

Opener style: ${openerGuide}

Write EXACTLY these elements — no more, no less:

1. OPENING PARAGRAPH (no H2 header)
   - ${openerGuide}
   - 5-6 sentences. First sentence is a punch.
   - Use Oracle Lover voice. Include one signature phrase.

2. IN-SHORT BOX:
   <div class="in-short"><strong>In Short:</strong> [2-3 sentence TL;DR that captures the whole article's argument. Punchy. Specific.]</div>

3. <h2>[First section — define the problem or set up the question clearly]</h2>
   - 3 paragraphs, 5 sentences each
   - Establish why this matters. Use a specific stat or real-world scenario.
   - Include one signature phrase.

4. <h2>[Second section — what most people believe (and why they're partly wrong)]</h2>
   - 3 paragraphs, 5 sentences each
   - Challenge the conventional wisdom with specifics.
   - Be direct. Use "you" and "your kid."

Output: Clean HTML only. ~550 words. Start immediately — no preamble.`);

  // ── PART B: Research + The Nuance ────────────────────────────────────────
  const partB = await callAI(`Write PART B of an article titled: "${title}"
Category: ${category} | Site: Toxic Screens (screentoxic.com)

Write EXACTLY these elements:

1. <h2>[Third section — what the research actually shows]</h2>
   - 3 paragraphs, 5 sentences each
   - Cite 2 specific researchers by FULL NAME (Jonathan Haidt, Jean Twenge, Jenny Radesky, Devorah Heitner, Andy Crouch, Nicholas Carr, or Maryanne Wolf)
   - Include specific study findings, not vague references
   - Use "The research is messier than the headlines suggest." or "The headline version of this study is wrong."
   - Be honest about what we don't know.

2. <h2>[Fourth section — the nuance / what the headlines get wrong]</h2>
   - 3 paragraphs, 5 sentences each
   - "Screen time isn't the variable. What they're doing on the screen is." — use this or a variation
   - Break down a specific misconception with evidence
   - Include one more signature phrase

Output: Clean HTML only. ~550 words. Start immediately with the <h2>.`);

  // ── PART C: Practical strategies + age-specific ───────────────────────────
  const partC = await callAI(`Write PART C of an article titled: "${title}"
Category: ${category} | Site: Toxic Screens (screentoxic.com)

Write EXACTLY these elements:

1. <h2>[Fifth section — practical strategies that actually work]</h2>
   - 3 paragraphs, 5 sentences each
   - 4-5 SPECIFIC, actionable strategies. Not vague advice like "set limits."
   - Real tactics: specific apps, specific conversations, specific rules.
   - "Banning doesn't work. This does." — use this or a variation.
   - "Parental modeling is the most underrated variable in this whole conversation." — include this.

2. <h2>[Sixth section — age-specific guidance: toddlers vs. tweens vs. teens]</h2>
   - 3 paragraphs, 5 sentences each
   - Break it down by age group with SPECIFIC recommendations
   - Reference what changes developmentally at each stage
   - Be direct about what works at each age

Output: Clean HTML only. ~550 words. Start immediately with the <h2>.`);

  // ── PART D: FAQ + affiliate + closing ────────────────────────────────────
  const partD = await callAI(`Write PART D (final section) of an article titled: "${title}"
Category: ${category} | Site: Toxic Screens (screentoxic.com)
Conclusion style: ${conclusionGuide}

Write EXACTLY these elements:

1. <h2>Frequently Asked Questions</h2>
   Write 4 Q&A pairs. Each answer: 4-5 sentences. Direct. Specific. No fluff.
   Format:
   <details><summary>[Question — specific and practical]</summary>
   <p>[Answer — 4-5 sentences. Oracle Lover voice. Cite a researcher if relevant.]</p>
   </details>
   [repeat 4 times]

2. AFFILIATE PARAGRAPH (no H2):
   A natural 3-4 sentence paragraph recommending <a href="${affiliateLink}" rel="nofollow sponsored" target="_blank">${product.name}</a> as a resource. Don't be salesy. Be honest about what it covers and why it's worth reading/buying.

3. CLOSING PARAGRAPH (no H2):
   - ${conclusionGuide}
   - 5-6 sentences. End strong.
   - Use "Here's what we know for sure. Here's what we don't." or "Stop overthinking this."
   - Last sentence should land like a punch.

Output: Clean HTML only. ~550 words. Start immediately with the <h2>Frequently Asked Questions</h2>.`);

  const fullBody = [partA, partB, partC, partD].join('\n\n');
  const wordCount = wc(fullBody);

  return { body: fullBody, wordCount };
}

function makeExcerpt(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 220) + (text.length > 220 ? '...' : '');
}

async function main() {
  const articles = db.prepare(`
    SELECT id, slug, title, category, hero_url, published_at, status
    FROM articles ORDER BY id ASC
  `).all();

  log(`=== Toxic Screens — 4-Part Regeneration ===`);
  log(`Total: ${articles.length} | Batch: ${BATCH_SIZE} | 4 API calls/article`);
  log(`Amazon tag: ${AMAZON_TAG} | Target: 2000-2200 words`);
  log('');

  // Load topic metadata for openerType/conclusionType
  let topicMeta = {};
  try {
    const { ARTICLES_500 } = await import('../src/data/articles-500.mjs');
    for (const a of ARTICLES_500) {
      topicMeta[a.title] = { openerType: a.openerType, conclusionType: a.conclusionType };
    }
    log(`Loaded topic metadata for ${Object.keys(topicMeta).length} articles`);
  } catch (e) {
    log(`Warning: Could not load topic metadata — using defaults`);
  }

  const updateStmt = db.prepare(`
    UPDATE articles
    SET body = @body, word_count = @word_count, reading_time = @reading_time,
        meta_description = @meta_description, og_title = @og_title,
        last_modified_at = @last_modified_at
    WHERE id = @id
  `);

  let done = 0, failed = 0;
  const startTime = Date.now();

  for (let batchStart = 0; batchStart < articles.length; batchStart += BATCH_SIZE) {
    const batch = articles.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(articles.length / BATCH_SIZE);
    log(`--- Batch ${batchNum}/${totalBatches} ---`);

    await Promise.allSettled(
      batch.map(async (article, batchIdx) => {
        const globalIdx = batchStart + batchIdx;
        const meta = topicMeta[article.title] || {};
        const articleWithMeta = { ...article, ...meta };

        try {
          const { body, wordCount } = await generateArticle(articleWithMeta, globalIdx);
          const readTime = Math.max(1, Math.round(wordCount / 200));
          const excerpt = makeExcerpt(body);
          const ogTitle = article.title.length > 60 ? article.title.slice(0, 57) + '...' : article.title;

          updateStmt.run({
            id: article.id, body, word_count: wordCount, reading_time: readTime,
            meta_description: excerpt, og_title: ogTitle,
            last_modified_at: new Date().toISOString(),
          });

          done++;
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = done / (elapsed / 60);
          const remaining = Math.round((articles.length - done) / Math.max(rate, 0.1));
          log(`  ✓ [${done}/${articles.length}] ${wordCount}w — ${article.title.slice(0, 52)} (~${remaining}min left)`);
        } catch (e) {
          failed++;
          log(`  ✗ FAILED [${globalIdx + 1}]: ${article.title.slice(0, 50)} — ${e.message.slice(0, 80)}`);
        }
      })
    );

    // Small pause between batches to avoid rate limits
    if (batchStart + BATCH_SIZE < articles.length) {
      await new Promise(r => setTimeout(r, 800));
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  // Final audit
  const audit = db.prepare(`
    SELECT COUNT(*) as total, ROUND(AVG(word_count)) as avg_wc,
           MIN(word_count) as min_wc, MAX(word_count) as max_wc,
           SUM(CASE WHEN word_count >= 1800 THEN 1 ELSE 0 END) as over_1800,
           SUM(CASE WHEN word_count >= 2000 THEN 1 ELSE 0 END) as over_2000,
           SUM(CASE WHEN word_count < 1800 THEN 1 ELSE 0 END) as under_1800
    FROM articles WHERE body IS NOT NULL
  `).get();

  log('');
  log('=== FINAL AUDIT ===');
  log(`Done: ${done} | Failed: ${failed} | Time: ${elapsed}s (${Math.round(elapsed/60)}min)`);
  log(`Avg: ${audit.avg_wc}w | Min: ${audit.min_wc}w | Max: ${audit.max_wc}w`);
  log(`Over 2000w: ${audit.over_2000} | Over 1800w: ${audit.over_1800} | Under 1800w: ${audit.under_1800}`);
  if (audit.under_1800 === 0) {
    log('✓ ALL 500 ARTICLES MEET 1800+ WORD REQUIREMENT');
  } else {
    log(`⚠ ${audit.under_1800} articles under 1800w`);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
