#!/usr/bin/env node
/**
 * render-start.mjs
 * Render.com startup script for Toxic Screens.
 *
 * On first deploy (or after disk wipe), copies the seed DB from the repo
 * to the Render persistent disk at /data/screenage.db, then starts the server.
 *
 * On subsequent deploys, the DB on /data/ is preserved as-is.
 *
 * Usage (render.yaml startCommand):
 *   node scripts/render-start.mjs
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Paths
const DISK_DB = process.env.DB_PATH || '/data/screenage.db';
const SEED_DB = path.join(projectRoot, 'data/screenage.db');
const DATA_DIR = path.dirname(DISK_DB);

console.log('[render-start] Toxic Screens startup');
console.log(`[render-start] DB_PATH: ${DISK_DB}`);

// Ensure the /data directory exists (Render mounts it)
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[render-start] Created data directory: ${DATA_DIR}`);
}

// If no DB on disk yet, copy the seed DB from the repo
if (!fs.existsSync(DISK_DB)) {
  if (fs.existsSync(SEED_DB)) {
    fs.copyFileSync(SEED_DB, DISK_DB);
    const stats = fs.statSync(DISK_DB);
    console.log(`[render-start] Seeded DB from repo (${Math.round(stats.size / 1024 / 1024)}MB) → ${DISK_DB}`);
  } else {
    console.log('[render-start] No seed DB found — will initialize empty DB on first request');
  }
} else {
  const stats = fs.statSync(DISK_DB);
  console.log(`[render-start] Existing DB found on disk (${Math.round(stats.size / 1024 / 1024)}MB) — using it`);
}

// Start the Express server
console.log('[render-start] Starting server...');
const serverPath = path.join(projectRoot, 'server/index.mjs');
const { spawn } = await import('child_process');

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env },
});

server.on('error', (e) => {
  console.error('[render-start] Server error:', e.message);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`[render-start] Server exited with code ${code}`);
  process.exit(code || 0);
});

// Forward signals
process.on('SIGTERM', () => server.kill('SIGTERM'));
process.on('SIGINT', () => server.kill('SIGINT'));
