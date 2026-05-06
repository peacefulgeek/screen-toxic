#!/usr/bin/env node
/**
 * cron-publish.mjs
 * Toxic Screens — Auto-publish scheduler
 *
 * Publishing schedule:
 *   Phase 1 (days 1–40 from launch): 5 articles/day
 *     Publish times: 8am, 10am, 12pm, 2pm, 4pm
 *   Phase 2 (day 41+ from launch):   1 article/weekday (Mon–Fri)
 *     Publish time: 9am
 *
 * This script publishes any article whose published_at <= NOW() and status = 'scheduled'.
 * Run it hourly via cron — it is idempotent and safe to run multiple times.
 *
 * Setup (system cron — run every hour):
 *   0 * * * * cd /var/www/screen-toxic && node scripts/cron-publish.mjs >> /var/log/screen-toxic-publish.log 2>&1
 *
 * Setup (PM2 — run every hour):
 *   pm2 start scripts/cron-publish.mjs --name cron-publish --cron "0 * * * *" --no-autorestart
 *
 * To re-gate all articles (e.g. after changing the schedule):
 *   node scripts/regate-articles.mjs
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

function log(msg) {
  console.log(`[${new Date().toISOString()}] [cron-publish] ${msg}`);
}

async function main() {
  const now = new Date().toISOString();
  log(`Running publish check at ${now}`);

  // Find all scheduled articles whose published_at has arrived
  const due = db.prepare(`
    SELECT id, slug, title, published_at FROM articles
    WHERE status = 'scheduled'
      AND published_at IS NOT NULL
      AND published_at <= ?
    ORDER BY published_at ASC
  `).all(now);

  log(`Found ${due.length} article(s) due for publishing`);

  if (due.length === 0) {
    log('Nothing to publish right now.');

    // Show next upcoming article
    const next = db.prepare(`
      SELECT title, published_at FROM articles
      WHERE status = 'scheduled' AND published_at IS NOT NULL
      ORDER BY published_at ASC LIMIT 1
    `).get();
    if (next) {
      log(`Next scheduled: "${next.title?.slice(0, 55)}" at ${next.published_at?.slice(0, 16)}`);
    }
    db.close();
    return;
  }

  const publishStmt = db.prepare(`
    UPDATE articles
    SET status = 'published', last_modified_at = ?
    WHERE id = ?
  `);

  const publishAll = db.transaction((articles) => {
    const ts = new Date().toISOString();
    for (const article of articles) {
      publishStmt.run(ts, article.id);
    }
  });

  publishAll(due);

  for (const a of due) {
    log(`  ✓ Published: "${a.title?.slice(0, 60)}" (was scheduled for ${a.published_at?.slice(0, 16)})`);
  }

  // Log to cron_log if table exists
  try {
    db.prepare(`
      INSERT INTO cron_log (job_name, status, message, articles_generated)
      VALUES ('cron-publish', 'success', ?, ?)
    `).run(`Published ${due.length} articles`, due.length);
  } catch (_) { /* cron_log table may not exist — that's fine */ }

  // Summary stats
  const stats = db.prepare(`
    SELECT status, COUNT(*) as n FROM articles GROUP BY status
  `).all();
  log(`DB stats: ${stats.map(s => `${s.status}:${s.n}`).join(' | ')}`);

  // Next upcoming
  const next = db.prepare(`
    SELECT title, published_at FROM articles
    WHERE status = 'scheduled' AND published_at IS NOT NULL
    ORDER BY published_at ASC LIMIT 1
  `).get();
  if (next) {
    log(`Next scheduled: "${next.title?.slice(0, 55)}" at ${next.published_at?.slice(0, 16)}`);
  } else {
    log('No more scheduled articles — full backlog published!');
  }

  log(`Done. Published ${due.length} article(s) this run.`);
  db.close();
}

main().catch(e => {
  console.error(`[cron-publish] FATAL: ${e.message}`);
  process.exit(1);
});
