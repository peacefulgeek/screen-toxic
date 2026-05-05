#!/usr/bin/env node
/**
 * The Screen Age — Cron: Auto-publish queued articles
 * Runs daily. Publishes 1 draft article per day.
 * Crontab: 0 8 * * * node /path/to/scripts/cron-publish.mjs
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

const db = await import('../src/lib/db.mjs');

async function main() {
  console.log('[cron-publish] Starting...');
  await db.initDb();

  const drafts = db.getDraftArticles(1);
  if (drafts.length === 0) {
    console.log('[cron-publish] No draft articles to publish.');
    db.logCronRun({ jobName: 'cron-publish', status: 'ok', message: 'No drafts to publish', articlesGenerated: 0 });
    return;
  }

  const article = drafts[0];
  db.publishArticle(article.slug);
  console.log(`[cron-publish] Published: ${article.title} (${article.slug})`);
  db.logCronRun({
    jobName: 'cron-publish',
    status: 'ok',
    message: `Published: ${article.slug}`,
    articlesGenerated: 1,
  });
}

main().catch(err => {
  console.error('[cron-publish] Fatal error:', err);
  process.exit(1);
});
