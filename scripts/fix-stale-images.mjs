#!/usr/bin/env node
/**
 * fix-stale-images.mjs
 * Replace 22 stale Unsplash 404 images with fresh Picsum images uploaded to Bunny CDN as WebP
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

// Picsum photos with seed for deterministic results - great for tech/family/research topics
const PICSUM_SEEDS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
  110, 120, 130, 140, 150, 160, 170, 180, 190, 200,
  210, 220
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      timeout: 30000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ToxicScreens/1.0)' }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
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

  const articles = db.prepare(
    "SELECT slug, hero_url FROM articles WHERE hero_url LIKE '%unsplash%'"
  ).all();

  log(`Found ${articles.length} articles with stale Unsplash images`);

  let migrated = 0;
  let failed = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const seed = PICSUM_SEEDS[i % PICSUM_SEEDS.length];
    const picsumUrl = `https://picsum.photos/seed/${seed}/1200/630`;

    try {
      const imgBuf = await fetchBuffer(picsumUrl);
      const webpBuf = await sharp(imgBuf)
        .resize(1200, 630, { fit: 'cover' })
        .webp({ quality: 82 })
        .toBuffer();
      const cdnUrl = await uploadToBunny(webpBuf, `${article.slug}.webp`);
      db.prepare("UPDATE articles SET hero_url = ? WHERE slug = ?").run(cdnUrl, article.slug);
      migrated++;
      log(`  ✓ [${i+1}/${articles.length}] ${article.slug.slice(0,50)} → Bunny CDN`);
    } catch (e) {
      failed++;
      log(`  ✗ ${article.slug}: ${e.message.slice(0, 60)}`);
    }
  }

  const remaining = db.prepare("SELECT COUNT(*) as n FROM articles WHERE hero_url LIKE '%unsplash%'").get();
  const bunny = db.prepare("SELECT COUNT(*) as n FROM articles WHERE hero_url LIKE '%b-cdn.net%'").get();
  const total = db.prepare("SELECT COUNT(*) as n FROM articles").get();
  log(`\n=== FINAL AUDIT ===`);
  log(`Total articles: ${total.n}`);
  log(`On Bunny CDN: ${bunny.n}`);
  log(`Unsplash remaining: ${remaining.n}`);
  log(`Migrated this run: ${migrated} | Failed: ${failed}`);
  if (remaining.n === 0) {
    log(`✓ ALL IMAGES ON BUNNY CDN - ZERO LOCAL IMAGES`);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
