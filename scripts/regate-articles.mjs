#!/usr/bin/env node
/**
 * regate-articles.mjs
 * Re-apply date-gating to all scheduled articles:
 *   Phase 1: 5 articles/day for 40 days  (200 articles)
 *   Phase 2: 1 article/weekday (Mon-Fri) after that (remaining articles)
 *
 * Published articles are untouched.
 * Start date: tomorrow (day after today).
 */

import { fileURLToPath } from 'url';
import path from 'path';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/screenage.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

function log(msg) { console.log(`[${new Date().toISOString().slice(0,19)}] ${msg}`); }

// Get all scheduled articles ordered by created_at (preserve original order)
const scheduled = db.prepare(
  "SELECT id, slug FROM articles WHERE status = 'scheduled' ORDER BY created_at ASC, id ASC"
).all();

log(`Found ${scheduled.length} scheduled articles to re-gate`);

// Build the publish date sequence
const dates = [];
const start = new Date();
start.setDate(start.getDate() + 1); // start tomorrow
start.setHours(8, 0, 0, 0);        // 8am each day

const PHASE1_DAYS = 40;
const PHASE1_PER_DAY = 5;
const PHASE1_TOTAL = PHASE1_DAYS * PHASE1_PER_DAY; // 200

// Phase 1: 5 per day for 40 days
let cursor = new Date(start);
for (let day = 0; day < PHASE1_DAYS; day++) {
  for (let slot = 0; slot < PHASE1_PER_DAY; slot++) {
    // Spread throughout the day: 8am, 10am, 12pm, 2pm, 4pm
    const hours = [8, 10, 12, 14, 16];
    const d = new Date(cursor);
    d.setHours(hours[slot], 0, 0, 0);
    dates.push(d.toISOString());
  }
  cursor.setDate(cursor.getDate() + 1);
}

// Phase 2: 1 per weekday (Mon=1 ... Fri=5)
// cursor is now at the start of phase 2
let phase2Count = 0;
while (dates.length < scheduled.length) {
  const dow = cursor.getDay(); // 0=Sun, 6=Sat
  if (dow >= 1 && dow <= 5) {
    const d = new Date(cursor);
    d.setHours(9, 0, 0, 0); // 9am on weekdays
    dates.push(d.toISOString());
    phase2Count++;
  }
  cursor.setDate(cursor.getDate() + 1);
}

log(`Phase 1: ${Math.min(PHASE1_TOTAL, scheduled.length)} articles over 40 days (5/day)`);
log(`Phase 2: ${phase2Count} articles at 1/weekday`);
log(`Total dates generated: ${dates.length} for ${scheduled.length} articles`);

// Apply dates to scheduled articles
const updateStmt = db.prepare("UPDATE articles SET published_at = ? WHERE id = ?");
const updateMany = db.transaction((articles, dates) => {
  for (let i = 0; i < articles.length; i++) {
    updateStmt.run(dates[i], articles[i].id);
  }
});

updateMany(scheduled, dates);

// Verify
const sample = db.prepare(
  "SELECT slug, published_at FROM articles WHERE status='scheduled' ORDER BY published_at ASC LIMIT 10"
).all();

log(`\n=== SAMPLE SCHEDULE (first 10) ===`);
sample.forEach((a, i) => log(`  ${i+1}. ${a.published_at.slice(0,16)} | ${a.slug.slice(0,55)}`));

// Show phase boundary
const phase1End = db.prepare(
  "SELECT published_at FROM articles WHERE status='scheduled' ORDER BY published_at ASC LIMIT 1 OFFSET 199"
).get();
const phase2Start = db.prepare(
  "SELECT published_at FROM articles WHERE status='scheduled' ORDER BY published_at ASC LIMIT 1 OFFSET 200"
).get();

if (phase1End) log(`\nPhase 1 ends:  ${phase1End.published_at.slice(0,16)}`);
if (phase2Start) log(`Phase 2 starts: ${phase2Start.published_at.slice(0,16)}`);

// Final counts
const total = db.prepare("SELECT COUNT(*) as n FROM articles").get();
const pub = db.prepare("SELECT COUNT(*) as n FROM articles WHERE status='published'").get();
const sched = db.prepare("SELECT COUNT(*) as n FROM articles WHERE status='scheduled'").get();
const lastDate = db.prepare(
  "SELECT published_at FROM articles WHERE status='scheduled' ORDER BY published_at DESC LIMIT 1"
).get();

log(`\n=== FINAL SUMMARY ===`);
log(`Total: ${total.n} | Published: ${pub.n} | Scheduled: ${sched.n}`);
log(`Last article publishes: ${lastDate?.published_at?.slice(0,16) || 'N/A'}`);
log(`✓ Re-gating complete`);
