/**
 * The Screen Age — Database Library (SQLite via better-sqlite3)
 * Designed for DigitalOcean Droplet deployment — no external DB needed.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/screenage.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let _db = null;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

export async function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      meta_description TEXT,
      og_title TEXT,
      category TEXT NOT NULL DEFAULT 'screen-time',
      tags TEXT DEFAULT '[]',
      body TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT 'The Oracle Lover',
      hero_url TEXT,
      image_alt TEXT,
      reading_time INTEGER DEFAULT 7,
      word_count INTEGER DEFAULT 0,
      published_at TEXT,
      last_modified_at TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      quality_issues TEXT DEFAULT '[]',
      view_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);

    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      estimated_minutes INTEGER DEFAULT 5,
      questions TEXT NOT NULL DEFAULT '[]',
      scoring TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cron_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_name TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      articles_generated INTEGER DEFAULT 0,
      ran_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

// ─── Articles ───────────────────────────────────────────────────────────────

export function upsertArticle(article) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO articles (
      slug, title, meta_description, og_title, category, tags, body,
      author, hero_url, image_alt, reading_time, word_count,
      published_at, last_modified_at, status, quality_issues
    ) VALUES (
      @slug, @title, @meta_description, @og_title, @category, @tags, @body,
      @author, @hero_url, @image_alt, @reading_time, @word_count,
      @published_at, @last_modified_at, @status, @quality_issues
    )
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      meta_description = excluded.meta_description,
      og_title = excluded.og_title,
      category = excluded.category,
      tags = excluded.tags,
      body = excluded.body,
      author = excluded.author,
      hero_url = COALESCE(excluded.hero_url, articles.hero_url),
      image_alt = COALESCE(excluded.image_alt, articles.image_alt),
      reading_time = excluded.reading_time,
      word_count = excluded.word_count,
      published_at = COALESCE(excluded.published_at, articles.published_at),
      last_modified_at = excluded.last_modified_at,
      status = excluded.status,
      quality_issues = excluded.quality_issues
  `);

  return stmt.run({
    ...article,
    tags: JSON.stringify(article.tags || []),
    quality_issues: JSON.stringify(article.quality_issues || []),
    hero_url: article.hero_url || null,
    image_alt: article.image_alt || null,
  });
}

export function getArticleBySlug(slug) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug);
  return row ? parseArticle(row) : null;
}

export function getArticles({ page = 1, limit = 12, category = null, status = 'published' } = {}) {
  const db = getDb();
  const offset = (page - 1) * limit;

  let where = 'WHERE status = ?';
  const params = [status];

  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM articles ${where}`).get(...params).count;
  const rows = db.prepare(
    `SELECT id, slug, title, meta_description, category, tags, hero_url, image_alt, reading_time, word_count, published_at, author
     FROM articles ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return {
    articles: rows.map(parseArticle),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

export function getPopularArticles(limit = 5) {
  const db = getDb();
  return db.prepare(
    `SELECT slug, title, category FROM articles WHERE status = 'published' ORDER BY view_count DESC, published_at DESC LIMIT ?`
  ).all(limit);
}

export function getRecentArticles(limit = 5) {
  const db = getDb();
  return db.prepare(
    `SELECT slug, title, category FROM articles WHERE status = 'published' ORDER BY published_at DESC LIMIT ?`
  ).all(limit);
}

export function getRelatedArticles(slug, category, limit = 3) {
  const db = getDb();
  let rows = db.prepare(
    `SELECT slug, title, category, hero_url, reading_time, published_at
     FROM articles WHERE status = 'published' AND slug != ? AND category = ?
     ORDER BY published_at DESC LIMIT ?`
  ).all(slug, category, limit);

  if (rows.length < limit) {
    const extra = db.prepare(
      `SELECT slug, title, category, hero_url, reading_time, published_at
       FROM articles WHERE status = 'published' AND slug != ? AND category != ?
       ORDER BY published_at DESC LIMIT ?`
    ).all(slug, category, limit - rows.length);
    rows = [...rows, ...extra];
  }

  return rows;
}

export function getCategoryCounts() {
  const db = getDb();
  return db.prepare(
    `SELECT category, COUNT(*) as count FROM articles WHERE status = 'published' GROUP BY category ORDER BY count DESC`
  ).all();
}

export function incrementViewCount(slug) {
  const db = getDb();
  db.prepare(`UPDATE articles SET view_count = view_count + 1 WHERE slug = ?`).run(slug);
}

export function updateArticleImage(slug, heroUrl, imageAlt) {
  const db = getDb();
  db.prepare(`UPDATE articles SET hero_url = ?, image_alt = ? WHERE slug = ?`).run(heroUrl, imageAlt, slug);
}

export function getAllPublishedSlugs() {
  const db = getDb();
  return db.prepare(
    `SELECT slug, last_modified_at FROM articles WHERE status = 'published' ORDER BY published_at DESC`
  ).all();
}

export function getDraftArticles(limit = 5) {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM articles WHERE status = 'draft' ORDER BY created_at ASC LIMIT ?`
  ).all(limit).map(parseArticle);
}

export function publishArticle(slug) {
  const db = getDb();
  db.prepare(
    `UPDATE articles SET status = 'published', published_at = COALESCE(published_at, datetime('now')), last_modified_at = datetime('now') WHERE slug = ?`
  ).run(slug);
}

// ─── Assessments ─────────────────────────────────────────────────────────────

export function upsertAssessment(assessment) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO assessments (slug, title, description, category, estimated_minutes, questions, scoring)
    VALUES (@slug, @title, @description, @category, @estimated_minutes, @questions, @scoring)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      category = excluded.category,
      estimated_minutes = excluded.estimated_minutes,
      questions = excluded.questions,
      scoring = excluded.scoring
  `);

  return stmt.run({
    slug: assessment.slug,
    title: assessment.title,
    description: assessment.description,
    category: assessment.category || 'general',
    estimated_minutes: assessment.estimatedMinutes || 5,
    questions: JSON.stringify(assessment.questions || []),
    scoring: JSON.stringify(assessment.scoring || {}),
  });
}

export function getAllAssessments() {
  const db = getDb();
  return db.prepare('SELECT * FROM assessments ORDER BY id').all().map(row => ({
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    estimatedMinutes: row.estimated_minutes,
    questionCount: JSON.parse(row.questions || '[]').length,
  }));
}

export function getAssessmentBySlug(slug) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM assessments WHERE slug = ?').get(slug);
  if (!row) return null;
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    estimatedMinutes: row.estimated_minutes,
    questions: JSON.parse(row.questions || '[]'),
    scoring: JSON.parse(row.scoring || '{}'),
  };
}

// ─── Cron Log ─────────────────────────────────────────────────────────────────

export function logCronRun({ jobName, status, message, articlesGenerated = 0 }) {
  const db = getDb();
  db.prepare(
    `INSERT INTO cron_log (job_name, status, message, articles_generated) VALUES (?, ?, ?, ?)`
  ).run(jobName, status, message, articlesGenerated);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseArticle(row) {
  return {
    ...row,
    tags: safeParseJson(row.tags, []),
    quality_issues: safeParseJson(row.quality_issues, []),
  };
}

function safeParseJson(str, fallback) {
  try {
    return JSON.parse(str || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}
