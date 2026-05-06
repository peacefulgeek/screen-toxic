#!/usr/bin/env node
/**
 * generate-500.mjs
 * Generates all 500 articles for Toxic Screens (screentoxic.com)
 * - Parallel batches of 8 articles
 * - Each article gets a Bunny CDN hero image (WebP compressed via Pillow)
 * - Date-gating: first 30 published (already done), rest at 6/day going forward
 * - Amazon tag: spankyspinola-20
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// ── Load .env ─────────────────────────────────────────────────────────────────
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

import { generateArticle, slugify } from '../src/lib/deepseek-generate.mjs';
import { ARTICLES_500, AMAZON_CATALOG } from '../src/data/articles-500.mjs';

// ── DB setup ──────────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(projectRoot, 'data/screenage.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Ensure all columns exist
try { db.exec(`ALTER TABLE articles ADD COLUMN hero_url TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE articles ADD COLUMN image_alt TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE articles ADD COLUMN reading_time INTEGER DEFAULT 7`); } catch(e) {}
try { db.exec(`ALTER TABLE articles ADD COLUMN quality_issues TEXT DEFAULT '[]'`); } catch(e) {}
try { db.exec(`ALTER TABLE articles ADD COLUMN meta_description TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE articles ADD COLUMN og_title TEXT`); } catch(e) {}
try { db.exec(`ALTER TABLE articles ADD COLUMN last_modified_at TEXT`); } catch(e) {}

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO articles
    (slug, title, meta_description, og_title, category, tags, body, author,
     hero_url, image_alt, reading_time, word_count, published_at, last_modified_at,
     status, quality_issues)
  VALUES
    (@slug, @title, @meta_description, @og_title, @category, @tags, @body, @author,
     @hero_url, @image_alt, @reading_time, @word_count, @published_at, @last_modified_at,
     @status, @quality_issues)
`);

// ── Bunny CDN config ──────────────────────────────────────────────────────────
const BUNNY_API_KEY = process.env.BUNNY_API_KEY || '6c37756b-8e97-4dc2-bda68cbb5dc4-6388-4450';
const BUNNY_STORAGE_ZONE = 'screen-toxic';
const BUNNY_CDN_URL = 'https://screen-toxic.b-cdn.net';

// ── Unsplash image IDs by category ───────────────────────────────────────────
const CATEGORY_IMAGES = {
  'screen-time': [
    'photo-1611532736597-de2d4265fba3','photo-1587614382346-4ec70e388b28',
    'photo-1593642632559-0c6d3fc62b89','photo-1516321318423-f06f85e504b3',
    'photo-1555774698-0b77e0d5fac6','photo-1526374965328-7f61d4dc18c5',
    'photo-1518770660439-4636190af475','photo-1504868584819-f8e8b4b6d7e3',
    'photo-1488590528505-98d2b5aba04b','photo-1519389950473-47ba0277781c',
    'photo-1581090464777-f3220bbe1b8b','photo-1512941937669-90a1b58e7e9c',
    'photo-1544717305-2782549b5136','photo-1558618666-fcd25c85cd64',
    'photo-1542744173-8e7e53415bb0',
  ],
  'social-media': [
    'photo-1611162617213-7d7a39e9b1d7','photo-1562577309-4932fdd64cd1',
    'photo-1611162616305-c69b3fa7fbe0','photo-1516251193007-45ef944ab0c6',
    'photo-1573152143286-0c422b4d2175','photo-1432888498266-38ffec3eaf0a',
    'photo-1529156069898-49953e39b3ac','photo-1534536281715-e28d76689b4d',
    'photo-1560472354-b33ff0c44a43','photo-1611162618071-b39a2ec055fb',
    'photo-1607703703520-bb638e84caf2','photo-1563986768609-322da13575f3',
    'photo-1596558450255-7c0d7c420081','photo-1609921212029-bb5a28e60960',
    'photo-1614680376573-df3480f0c6ff',
  ],
  'mental-health': [
    'photo-1559757148-5c350d0d3c56','photo-1493836512294-502baa1986e2',
    'photo-1541199249251-f713e6145474','photo-1516302752625-fcc3c50ae61f',
    'photo-1506126613408-eca07ce68773','photo-1522202176988-66273c2fd55f',
    'photo-1573497019940-1c28c88b4f3e','photo-1474631245212-32dc3c8310c6',
    'photo-1434494878577-86c23bcb06b9','photo-1499209974431-9dddcece7f88',
    'photo-1484480974693-6ca0a78fb36b','photo-1545205597-3d9d02c29597',
    'photo-1531983412531-1f49a365ffed','photo-1488521787991-ed7bbaae773c',
    'photo-1507003211169-0a1dd7228f2d',
  ],
  'parenting': [
    'photo-1476703993599-0035a21b17a9','photo-1536640712-4d4c36ff0e4e',
    'photo-1491013516836-7db643ee125a','photo-1516627145497-ae6968895b74',
    'photo-1484665754804-74b091211472','photo-1581579438747-1dc8d17bbce4',
    'photo-1591035897819-f4bdf739f446','photo-1555252333-9f8e92e65df9',
    'photo-1560328055-e938bb2ed50a','photo-1602524816149-3d8f3e1e3c8a',
    'photo-1531983412531-1f49a365ffed','photo-1508214751196-bcfd4ca60f91',
    'photo-1511895426328-dc8714191011','photo-1529156069898-49953e39b3ac',
    'photo-1471286174890-9c112ffca5b4',
  ],
  'research': [
    'photo-1507003211169-0a1dd7228f2d','photo-1532094349884-543bc11b234d',
    'photo-1454165804606-c3d57bc86b40','photo-1551288049-bebda4e38f71',
    'photo-1516321497487-e288fb19713f','photo-1434030216411-0b793f4b4173',
    'photo-1476357471311-43c0db9fb2b4','photo-1497633762265-9d179a990aa6',
    'photo-1503676260728-1c00da094a0b','photo-1456513080510-7bf3a84b82f8',
    'photo-1543286386-713bdd548da4','photo-1532012197267-da84d127e765',
    'photo-1481627834876-b7833e8f5570','photo-1524995997946-a1c2e315a42f',
    'photo-1491841573634-28140fc7ced7',
  ],
  'gaming': [
    'photo-1493711662062-fa541adb3fc8','photo-1538481199705-c710c4e965fc',
    'photo-1560253023-3ec5d502959f','photo-1550745165-9bc0b252726f',
    'photo-1612287230202-1ff1d85d1bdf','photo-1542751371-adc38448a05e',
    'photo-1591488320449-011701bb6704','photo-1593305841991-05c297ba4575',
    'photo-1509198397868-475647b2a1e5','photo-1527443224154-c4a3942d3acf',
    'photo-1585620385456-4759f9b5c7d9','photo-1616588589676-62b3bd4ff6d2',
    'photo-1598550476439-6847785fcea6','photo-1556438064-2d7646166914',
    'photo-1560419015-7c427e8ae5ba',
  ],
  'digital-literacy': [
    'photo-1516321318423-f06f85e504b3','photo-1488229297570-58520851e868',
    'photo-1504639725590-34d0984388bd','photo-1451187580459-43490279c0fa',
    'photo-1580894908361-967195033215','photo-1573164713714-d95e436ab8d6',
    'photo-1531297484001-80022131f5a1','photo-1498050108023-c5249f4df085',
    'photo-1555949963-ff9fe0c870eb','photo-1461749280684-dccba630e2f6',
    'photo-1517694712202-14dd9538aa97','photo-1526374965328-7f61d4dc18c5',
    'photo-1550751827-4bd374c3f58b','photo-1563986768494-4641a7e9e5e8',
    'photo-1518770660439-4636190af475',
  ],
  'family': [
    'photo-1511895426328-dc8714191011','photo-1484665754804-74b091211472',
    'photo-1476703993599-0035a21b17a9','photo-1536640712-4d4c36ff0e4e',
    'photo-1581579438747-1dc8d17bbce4','photo-1491013516836-7db643ee125a',
    'photo-1516627145497-ae6968895b74','photo-1560328055-e938bb2ed50a',
    'photo-1591035897819-f4bdf739f446','photo-1508214751196-bcfd4ca60f91',
    'photo-1529156069898-49953e39b3ac','photo-1555252333-9f8e92e65df9',
    'photo-1602524816149-3d8f3e1e3c8a','photo-1471286174890-9c112ffca5b4',
    'photo-1545558014-8692077e9b5c',
  ],
};

// ── Progress ──────────────────────────────────────────────────────────────────
const LOG_FILE = '/tmp/generate-500-progress.log';
let generated = 0, failed = 0, skipped = 0;

function log(msg) {
  const line = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch(e) {}
}

// ── Download image ────────────────────────────────────────────────────────────
function downloadImage(url, hops = 0) {
  if (hops > 5) return Promise.reject(new Error('Too many redirects'));
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 ToxicScreens/1.0', 'Accept': 'image/*' },
      timeout: 25000,
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return downloadImage(res.headers.location, hops + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
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

// ── Convert to WebP via Python Pillow ────────────────────────────────────────
async function toWebP(buffer) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tmpIn = `/tmp/tsa_in_${id}.jpg`;
  const tmpOut = `/tmp/tsa_out_${id}.webp`;
  try {
    fs.writeFileSync(tmpIn, buffer);
    execSync(`python3 -c "
from PIL import Image
img = Image.open('${tmpIn}').convert('RGB')
w, h = img.size
r = 1200/630
if w/h > r:
    nw = int(h*r); img = img.crop(((w-nw)//2, 0, (w-nw)//2+nw, h))
else:
    nh = int(w/r); img = img.crop((0, (h-nh)//2, w, (h-nh)//2+nh))
img = img.resize((1200,630), Image.LANCZOS)
img.save('${tmpOut}', 'WEBP', quality=82)
"`, { timeout: 30000 });
    return fs.readFileSync(tmpOut);
  } finally {
    try { fs.unlinkSync(tmpIn); } catch(e) {}
    try { fs.unlinkSync(tmpOut); } catch(e) {}
  }
}

// ── Upload to Bunny CDN ───────────────────────────────────────────────────────
function uploadToBunny(buffer, filename) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'ny.storage.bunnycdn.com',
      path: `/${BUNNY_STORAGE_ZONE}/articles/${filename}`,
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'image/webp',
        'Content-Length': buffer.length,
      },
      timeout: 30000,
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve(`${BUNNY_CDN_URL}/articles/${filename}`);
        } else {
          reject(new Error(`Bunny ${res.statusCode}: ${body.slice(0,80)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Bunny timeout')); });
    req.write(buffer);
    req.end();
  });
}

// ── Get hero image ────────────────────────────────────────────────────────────
async function getHeroImage(slug, category) {
  const images = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['screen-time'];
  const hash = slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const imageId = images[hash % images.length];
  const url = `https://images.unsplash.com/${imageId}?w=1200&h=630&fit=crop&auto=format&q=80`;
  try {
    const raw = await downloadImage(url);
    const webp = await toWebP(raw);
    return await uploadToBunny(webp, `${slug}.webp`);
  } catch (e) {
    log(`  WARN image ${slug}: ${e.message}`);
    return `${BUNNY_CDN_URL}/articles/${slug}.webp`;
  }
}

// ── Date-gating ───────────────────────────────────────────────────────────────
function getGating(originalIndex) {
  const IMMEDIATE = 30;
  if (originalIndex < IMMEDIATE) {
    const d = new Date();
    d.setDate(d.getDate() - (IMMEDIATE - originalIndex));
    return { publishedAt: d.toISOString().split('T')[0], status: 'published' };
  }
  const futureIndex = originalIndex - IMMEDIATE;
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(futureIndex / 6) + 1);
  return { publishedAt: d.toISOString().split('T')[0], status: 'scheduled' };
}

// ── Generate one article ──────────────────────────────────────────────────────
async function generateOne(articleDef, originalIndex, existingSlugs, relatedForLinks) {
  const slug = slugify(articleDef.title);
  if (existingSlugs.has(slug)) { skipped++; return; }

  try {
    const result = await generateArticle({
      topic: articleDef.title,
      category: articleDef.category,
      tags: articleDef.tags,
      catalog: AMAZON_CATALOG,
      relatedArticles: relatedForLinks,
      authorName: 'The Oracle Lover',
      niche: 'kids and technology',
      openerType: articleDef.openerType,
      conclusionType: articleDef.conclusionType,
      selfRefopener: `At Toxic Screens, we've been covering ${articleDef.category.replace(/-/g, ' ')} research for years...`,
    });

    const heroUrl = await getHeroImage(slug, articleDef.category);
    const { publishedAt, status } = getGating(originalIndex);
    const metaDesc = result.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 157) + '...';
    const readingTime = Math.max(5, Math.round(result.wordCount / 200));
    const qualityIssues = [];
    if (result.wordCount < 1400) qualityIssues.push(`short:${result.wordCount}`);
    if (result.hasEmDash) qualityIssues.push('em-dash');
    if (result.bannedWords?.length) qualityIssues.push(`banned:${result.bannedWords.slice(0,3).join(',')}`);

    insertStmt.run({
      slug,
      title: articleDef.title,
      meta_description: metaDesc,
      og_title: articleDef.title,
      category: articleDef.category,
      tags: JSON.stringify(articleDef.tags),
      body: result.body,
      author: 'The Oracle Lover',
      hero_url: heroUrl,
      image_alt: `${articleDef.title} — Toxic Screens`,
      reading_time: readingTime,
      word_count: result.wordCount,
      published_at: publishedAt,
      last_modified_at: new Date().toISOString().split('T')[0],
      status,
      quality_issues: JSON.stringify(qualityIssues),
    });

    // Add to existingSlugs so parallel batch doesn't duplicate
    existingSlugs.add(slug);
    generated++;
    log(`✓ [${originalIndex + 1}/500] ${articleDef.title.slice(0,55)} (${result.wordCount}w, ${status} ${publishedAt})`);
  } catch (e) {
    failed++;
    log(`✗ [${originalIndex + 1}/500] FAIL: ${articleDef.title.slice(0,45)} — ${e.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try { fs.unlinkSync(LOG_FILE); } catch(e) {}
  log('=== Toxic Screens 500-Article Generator ===');
  log(`Amazon tag: spankyspinola-20 | Bunny: ${BUNNY_CDN_URL}`);
  log(`Date-gating: 30 immediate, then 6/day`);

  const allSlugs = new Set(db.prepare('SELECT slug FROM articles').all().map(r => r.slug));
  log(`Already in DB: ${allSlugs.size} articles`);

  const toGenerate = ARTICLES_500
    .map((def, i) => ({ def, i }))
    .filter(({ def }) => !allSlugs.has(slugify(def.title)));

  log(`Need to generate: ${toGenerate.length} articles\n`);
  if (toGenerate.length === 0) { log('All done!'); return; }

  const relatedForLinks = db.prepare('SELECT title, slug FROM articles ORDER BY RANDOM() LIMIT 20').all();

  const BATCH = 8;
  const t0 = Date.now();

  for (let i = 0; i < toGenerate.length; i += BATCH) {
    const batch = toGenerate.slice(i, i + BATCH);
    const bNum = Math.floor(i / BATCH) + 1;
    const bTotal = Math.ceil(toGenerate.length / BATCH);
    log(`\n--- Batch ${bNum}/${bTotal} ---`);

    await Promise.all(batch.map(({ def, i: idx }) => generateOne(def, idx, allSlugs, relatedForLinks)));

    const elapsed = ((Date.now() - t0) / 60000).toFixed(1);
    log(`Progress: ${Math.min(i + BATCH, toGenerate.length)}/${toGenerate.length} | Gen:${generated} Skip:${skipped} Fail:${failed} | ${elapsed}m`);

    if (i + BATCH < toGenerate.length) await new Promise(r => setTimeout(r, 1500));
  }

  const finalCount = db.prepare('SELECT COUNT(*) as n FROM articles').get();
  log(`\n=== DONE === Gen:${generated} Skip:${skipped} Fail:${failed} | DB total: ${finalCount.n}`);
}

main().catch(e => { log(`FATAL: ${e.message}`); process.exit(1); });
