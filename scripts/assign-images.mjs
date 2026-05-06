#!/usr/bin/env node
/**
 * Toxic Screens — Assign Images Script
 * Assigns Unsplash hero images to all articles in the database.
 * Run: node scripts/assign-images.mjs
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
const { ARTICLE_IMAGES, CATEGORY_IMAGES } = await import('../src/data/article-images.mjs');

async function main() {
  console.log('🖼  Assigning images to articles...');
  await db.initDb();

  const result = db.getArticles({ page: 1, limit: 100, status: 'published' });
  const allArticles = result.articles;

  // Also get drafts
  const drafts = db.getDraftArticles(100);
  const articles = [...allArticles, ...drafts];

  console.log(`Found ${articles.length} articles to process.`);

  let updated = 0;
  for (const article of articles) {
    // Skip if already has an image
    if (article.hero_url) {
      console.log(`  ⏭  ${article.slug} — already has image`);
      continue;
    }

    const imageData = ARTICLE_IMAGES[article.slug] || CATEGORY_IMAGES[article.category] || {
      heroUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&q=80',
      imageAlt: 'Child and technology',
    };

    db.updateArticleImage(article.slug, imageData.heroUrl, imageData.imageAlt);
    console.log(`  ✓ ${article.slug}`);
    updated++;
  }

  console.log(`\n✅ Done! Updated ${updated} articles with images.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
