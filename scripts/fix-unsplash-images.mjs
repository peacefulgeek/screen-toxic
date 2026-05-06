#!/usr/bin/env node
/**
 * fix-unsplash-images.mjs
 * Migrate any remaining Unsplash fallback images to Bunny CDN as WebP
 */

import { fileURLToPath } from 'url';
import path from 'path';
import https from 'https';
import http from 'http';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const BUNNY_API_KEY = '6c37756b-8e97-4dc2-bda68cbb5dc4-6388-4450';
const BUNNY_STORAGE_ZONE = 'screen-toxic';
const BUNNY_CDN_URL = 'https://screen-toxic.b-cdn.net';
const BUNNY_STORAGE_URL = 'https://ny.storage.bunnycdn.com';

const DB_PATH = path.join(projectRoot, 'data/screenage.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function log(msg) { console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`); }

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { timeout: 20000 }, (res) => {
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

async function main() {
  const { default: sharp } = await import('sharp');

  // Get all articles with Unsplash images
  const articles = db.prepare(
    "SELECT slug, hero_url FROM articles WHERE hero_url LIKE '%unsplash%'"
  ).all();

  log(`Found ${articles.length} articles with Unsplash images to migrate`);

  const updateStmt = db.prepare("UPDATE articles SET hero_url = ?, og_title = og_title WHERE slug = ?");

  let migrated = 0;
  let failed = 0;

  // Process in batches of 5
  for (let i = 0; i < articles.length; i += 5) {
    const batch = articles.slice(i, i + 5);
    await Promise.allSettled(batch.map(async (article) => {
      try {
        const imgBuf = await fetchBuffer(article.hero_url);
        const webpBuf = await sharp(imgBuf).resize(1200, 630, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
        const cdnUrl = await uploadToBunny(webpBuf, `${article.slug}.webp`);
        db.prepare("UPDATE articles SET hero_url = ? WHERE slug = ?").run(cdnUrl, article.slug);
        migrated++;
        log(`  ✓ ${article.slug} → ${cdnUrl}`);
      } catch (e) {
        failed++;
        log(`  ✗ ${article.slug}: ${e.message.slice(0, 60)}`);
      }
    }));
  }

  const remaining = db.prepare("SELECT COUNT(*) as n FROM articles WHERE hero_url LIKE '%unsplash%'").get();
  const bunny = db.prepare("SELECT COUNT(*) as n FROM articles WHERE hero_url LIKE '%b-cdn.net%'").get();
  log(`Done. Migrated: ${migrated} | Failed: ${failed}`);
  log(`Bunny CDN: ${bunny.n} | Unsplash remaining: ${remaining.n}`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
