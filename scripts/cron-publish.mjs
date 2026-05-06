#!/usr/bin/env node
/**
 * cron-publish.mjs
 * Toxic Screens — Auto-publish scheduler
 * 
 * Runs daily and publishes any articles whose published_at date has arrived
 * (status = 'scheduled', published_at <= today).
 * 
 * Date-gating: 6 articles/day are unlocked as their published_at date passes.
 * 
 * Setup (PM2):
 *   pm2 start scripts/cron-publish.mjs --name cron-publish --cron "0 6 * * *" --no-autorestart
 * 
 * Setup (system cron):
 *   0 6 * * * cd /var/www/screen-toxic && node scripts/cron-publish.mjs >> /var/log/screen-toxic-cron.log 2>&1
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
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

const DB_PATH = process.env.DB_PATH || path.join(projectRoot, 'data/screenage.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const today = new Date().toISOString().split('T')[0];

function log(msg) {
  console.log(`[${new Date().toISOString()}] [cron-publish] ${msg}`);
}

async function main() {
  log(`Running daily publish check for ${today}`);

  // Find all scheduled articles whose publish date has arrived
  const due = db.prepare(`
    SELECT slug, title, published_at FROM articles
    WHERE status = 'scheduled' AND published_at <= ?
    ORDER BY published_at ASC
  `).all(today);

  log(`Found ${due.length} articles due for publishing`);

  if (due.length === 0) {
    log('Nothing to publish today.');
    return;
  }

  const publishStmt = db.prepare(`
    UPDATE articles 
    SET status = 'published', last_modified_at = ?
    WHERE slug = ?
  `);

  let published = 0;
  for (const article of due) {
    try {
      publishStmt.run(today, article.slug);
      published++;
      log(`  ✓ Published: "${article.title.slice(0, 60)}" (scheduled for ${article.published_at})`);
    } catch (e) {
      log(`  ✗ Failed to publish ${article.slug}: ${e.message}`);
    }
  }

  // Log to cron_log table
  try {
    db.prepare(`
      INSERT INTO cron_log (job_name, status, message, articles_generated)
      VALUES ('cron-publish', 'success', ?, ?)
    `).run(`Published ${published} articles on ${today}`, published);
  } catch(e) { /* cron_log table may not exist */ }

  log(`Done. Published ${published}/${due.length} articles.`);

  // Stats
  const stats = db.prepare(`
    SELECT status, COUNT(*) as n FROM articles GROUP BY status
  `).all();
  log(`DB stats: ${stats.map(s => `${s.status}:${s.n}`).join(', ')}`);
}

main().catch(e => {
  console.error(`[cron-publish] FATAL: ${e.message}`);
  process.exit(1);
});
