#!/usr/bin/env node
/**
 * generate-fast.mjs
 * Toxic Screens — Fast parallel article generator
 * Uses direct OpenAI API key, batch size 15, with retry logic
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import https from 'https';
import Database from 'better-sqlite3';

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

// Use direct OpenAI key provided by user
const OPENAI_API_KEY = process.env.OPENAI_API_KEY_DIRECT || process.env.OPENAI_API_KEY;
const BUNNY_API_KEY = process.env.BUNNY_API_KEY || '6c37756b-8e97-4dc2-bda68cbb5dc4-6388-4450';
const BUNNY_STORAGE_ZONE = 'screen-toxic';
const BUNNY_CDN_URL = 'https://screen-toxic.b-cdn.net';
const BUNNY_STORAGE_URL = 'https://ny.storage.bunnycdn.com';
const AMAZON_TAG = 'spankyspinola-20';
const BATCH_SIZE = 15;
const LOG_FILE = '/tmp/generate-fast-progress.log';

const DB_PATH = path.join(projectRoot, 'data/screenage.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function log(msg) {
  const line = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// Clear old log
fs.writeFileSync(LOG_FILE, '');

// ─── OpenAI API call (direct) ───────────────────────────────────────────────
async function callOpenAI(messages, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey: OPENAI_API_KEY,
        baseURL: 'https://api.openai.com/v1',
      });
      const res = await client.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages,
        temperature: 0.8,
        max_tokens: 2800,
      });
      return res.choices[0].message.content;
    } catch (e) {
      if (attempt < retries) {
        const wait = attempt * 3000;
        log(`  ⚠ OpenAI error (attempt ${attempt}): ${e.message.slice(0,80)} — retrying in ${wait/1000}s`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        throw e;
      }
    }
  }
}

// ─── Slugify ─────────────────────────────────────────────────────────────────
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

// ─── Bunny CDN upload ─────────────────────────────────────────────────────────
async function uploadToBunny(imageBuffer, filename) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BUNNY_STORAGE_URL}/${BUNNY_STORAGE_ZONE}/articles/${filename}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'image/webp',
        'Content-Length': imageBuffer.length,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(`${BUNNY_CDN_URL}/articles/${filename}`);
        } else {
          reject(new Error(`Bunny upload failed: ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(imageBuffer);
    req.end();
  });
}

// ─── Download & convert image to WebP ────────────────────────────────────────
async function downloadAndConvertToWebP(imageUrl) {
  try {
    const { default: sharp } = await import('sharp').catch(() => null);
    if (!sharp) {
      // Fallback: download as-is and upload
      const buf = await fetchBuffer(imageUrl);
      return buf;
    }
    const buf = await fetchBuffer(imageUrl);
    return await sharp(buf).resize(1200, 630, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
  } catch (e) {
    return null;
  }
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    const req = protocol.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Unsplash image URLs by category ─────────────────────────────────────────
const CATEGORY_IMAGES = {
  'screen-time': [
    'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=1200&h=630&fit=crop',
  ],
  'social-media': [
    'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1598128558393-70ff21433be0?w=1200&h=630&fit=crop',
  ],
  'mental-health': [
    'https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=630&fit=crop',
  ],
  'parenting': [
    'https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1484665754804-74b091211472?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=630&fit=crop',
  ],
  'research': [
    'https://images.unsplash.com/photo-1532094349884-543559059e2b?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1200&h=630&fit=crop',
  ],
  'gaming': [
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&h=630&fit=crop',
  ],
  'digital-literacy': [
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200&h=630&fit=crop',
  ],
  'family': [
    'https://images.unsplash.com/photo-1511895426328-dc8714191011?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1484665754804-74b091211472?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=1200&h=630&fit=crop',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&h=630&fit=crop',
  ],
};

function getImageUrl(category, index) {
  const imgs = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['screen-time'];
  return imgs[index % imgs.length];
}

// ─── Amazon products ──────────────────────────────────────────────────────────
const AMAZON_PRODUCTS = [
  { asin: '1250762847', name: 'The Anxious Generation by Jonathan Haidt' },
  { asin: '1982141964', name: 'iGen by Jean Twenge' },
  { asin: '0393339750', name: 'The Shallows by Nicholas Carr' },
  { asin: '1984826069', name: 'Digital Minimalism by Cal Newport' },
  { asin: '0525559531', name: 'How to Raise Successful People by Esther Wojcicki' },
  { asin: 'B08N5WRWNW', name: 'Gabb Phone (screen-free phone for kids)' },
  { asin: 'B07G5WFMZN', name: 'Circle Home Plus parental controls' },
  { asin: '1250301696', name: 'The Tech-Wise Family by Andy Crouch' },
  { asin: '0525533834', name: 'Screenwise by Devorah Heitner' },
  { asin: 'B09B8YWXDF', name: 'Blue light blocking glasses for kids' },
];

function getAmazonProduct(index) {
  return AMAZON_PRODUCTS[index % AMAZON_PRODUCTS.length];
}

// ─── Article generation prompt ────────────────────────────────────────────────
const ORACLE_LOVER_VOICE = `You are The Oracle Lover — an intuitive educator writing for Toxic Screens (screentoxic.com), a site about kids and technology.

VOICE:
- Short punchy sentences, 8-14 words. Staccato. Direct. First sentence hits.
- Direct address: "Look," "Here's the thing," "Let me be straight with you."
- NEVER "my friend," NEVER "sweetheart," NEVER long intellectual sentences.
- Humor: Frequent. Dry, practical. "Yeah, that's not going to work. Here's what will."

USE THESE PHRASES (3-5 per article):
- "Look, here's the thing."
- "Stop overthinking this."
- "The research is messier than the headlines suggest."
- "Screen time isn't the variable. What they're doing on the screen is."
- "Parental modeling is the most underrated variable in this whole conversation."
- "Banning doesn't work. This does."
- "Here's what we know for sure. Here's what we don't."

CITE: Jonathan Haidt, Jean Twenge PhD, Nicholas Carr, AAP, Jenny Radesky MD, Devorah Heitner, Andy Crouch (70%), Carl Jung, Joseph Campbell (30%).

BANNED WORDS: profound, transformative, holistic, nuanced, delve, tapestry, landscape, paradigm, synergy, leverage, unlock, empower, utilize, pivotal, embark, underscore, seamlessly, robust, beacon, foster, elevate, curate, bespoke, resonate, harness, groundbreaking, innovative, cutting-edge, game-changer, navigate, journey.`;

async function generateArticle(topic, articleIndex) {
  const product = getAmazonProduct(articleIndex);
  const affiliateLink = `https://www.amazon.com/dp/${product.asin}?tag=${AMAZON_TAG}`;

  const prompt = `Write a 1800-2200 word article for Toxic Screens (screentoxic.com).

TITLE: "${topic.title}"
CATEGORY: ${topic.category}
TAGS: ${topic.tags.join(', ')}
OPENER TYPE: ${topic.openerType}
CONCLUSION TYPE: ${topic.conclusionType}

STRUCTURE:
1. Opening paragraph (${topic.openerType} style — no H2, just a strong first paragraph)
2. "In Short" block: <div class="in-short"><strong>In Short:</strong> [2-3 sentence TL;DR]</div>
3. 4-6 H2 sections with H3 subsections where needed
4. FAQ section (H2: "Frequently Asked Questions") with 3-4 Q&A pairs using <details><summary>Q</summary>A</details>
5. Affiliate mention: Naturally mention "${product.name}" with this link: <a href="${affiliateLink}" rel="nofollow sponsored" target="_blank">${product.name}</a>
6. Closing paragraph (${topic.conclusionType} style)

REQUIREMENTS:
- 1800-2200 words minimum
- Use The Oracle Lover voice throughout
- Include at least 3 of the signature phrases
- Cite at least 2 researchers by name
- No markdown — output clean HTML only (h2, h3, p, ul, li, strong, em, details, summary)
- Do NOT include <html>, <head>, <body> tags
- Do NOT include the article title as H1 (it's handled by the template)`;

  const content = await callOpenAI([
    { role: 'system', content: ORACLE_LOVER_VOICE },
    { role: 'user', content: prompt },
  ]);

  return content;
}

// ─── Date gating ─────────────────────────────────────────────────────────────
function getPublishDate(articleIndex, totalAlreadyInDb) {
  // First 30 are already published (backdated)
  // New articles: 6 per day starting tomorrow
  const newIndex = articleIndex - totalAlreadyInDb;
  const daysFromNow = Math.floor(newIndex / 6) + 1;
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

// ─── DB upsert ────────────────────────────────────────────────────────────────
const upsertStmt = db.prepare(`
  INSERT OR REPLACE INTO articles (
    slug, title, category, tags, body, hero_url,
    status, published_at, last_modified_at, word_count, reading_time,
    meta_description, og_title, author, image_alt
  ) VALUES (
    @slug, @title, @category, @tags, @body, @hero_url,
    @status, @published_at, @last_modified_at, @word_count, @reading_time,
    @meta_description, @og_title, @author, @image_alt
  )
`);

function countWords(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;
}

function makeExcerpt(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 200) + (text.length > 200 ? '...' : '');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { ARTICLES_500 } = await import('../src/data/articles-500.mjs');

  // Get existing slugs
  const existingSlugs = new Set(
    db.prepare('SELECT slug FROM articles').all().map(r => r.slug)
  );

  const totalInDb = existingSlugs.size;
  const toGenerate = ARTICLES_500.filter(a => !existingSlugs.has(slugify(a.title)));

  log(`=== Toxic Screens Fast Generator ===`);
  log(`Direct OpenAI API | BATCH_SIZE=${BATCH_SIZE}`);
  log(`Already in DB: ${totalInDb} | Need to generate: ${toGenerate.length}`);
  log(`Date-gating: 6 articles/day starting tomorrow`);
  log('');

  if (toGenerate.length === 0) {
    log('All 500 articles already generated!');
    return;
  }

  let generated = 0;
  let failed = 0;
  const startTime = Date.now();

  // Process in batches
  for (let batchStart = 0; batchStart < toGenerate.length; batchStart += BATCH_SIZE) {
    const batch = toGenerate.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toGenerate.length / BATCH_SIZE);
    log(`--- Batch ${batchNum}/${totalBatches} (${batch.length} articles) ---`);

    const results = await Promise.allSettled(
      batch.map(async (topic, batchIdx) => {
        const globalIdx = batchStart + batchIdx;
        const articleNum = totalInDb + globalIdx + 1;
        const slug = slugify(topic.title);

        try {
          // Generate content
          const content = await generateArticle(topic, globalIdx);
          const wordCount = countWords(content);
          const readTime = Math.max(1, Math.round(wordCount / 200));
          const excerpt = makeExcerpt(content);

          // Get image URL (use Unsplash URL — will be served via CDN)
          const imageUrl = getImageUrl(topic.category, globalIdx);

          // Try to upload to Bunny CDN
          let heroUrl = imageUrl;
          try {
            const imgBuf = await downloadAndConvertToWebP(imageUrl);
            if (imgBuf) {
              heroUrl = await uploadToBunny(imgBuf, `${slug}.webp`);
            }
          } catch (imgErr) {
            // Use Unsplash URL as fallback
            heroUrl = imageUrl;
          }

          // Calculate publish date
          const publishDate = getPublishDate(articleNum - 1, totalInDb);
          const status = 'scheduled';

          // Save to DB
          upsertStmt.run({
            slug,
            title: topic.title,
            category: topic.category,
            tags: JSON.stringify(topic.tags),
            body: content,
            hero_url: heroUrl,
            status,
            published_at: publishDate,
            last_modified_at: new Date().toISOString().split('T')[0],
            word_count: wordCount,
            reading_time: readTime,
            meta_description: excerpt.slice(0, 155),
            og_title: `${topic.title} | Toxic Screens`,
            author: 'The Oracle Lover',
            image_alt: topic.title,
          });

          const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
          log(`  ✓ [${articleNum}/500] ${topic.title.slice(0, 55)} (${wordCount}w, ${status} ${publishDate})`);
          return true;
        } catch (e) {
          log(`  ✗ [${articleNum}/500] FAILED: ${topic.title.slice(0, 50)} — ${e.message.slice(0, 80)}`);
          failed++;
          return false;
        }
      })
    );

    generated += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
    const total = db.prepare('SELECT COUNT(*) as n FROM articles').get().n;
    log(`Progress: ${generated}/${toGenerate.length} | Total in DB: ${total} | Fail:${failed} | ${elapsed}m elapsed`);
    log('');

    // Small pause between batches to avoid hammering the API
    if (batchStart + BATCH_SIZE < toGenerate.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const finalTotal = db.prepare('SELECT COUNT(*) as n FROM articles').get().n;
  const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
  log(`=== DONE ===`);
  log(`Generated: ${generated} | Failed: ${failed} | Total in DB: ${finalTotal} | Time: ${elapsed}m`);
}

main().catch(e => {
  log(`FATAL: ${e.message}`);
  process.exit(1);
});
