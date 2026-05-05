#!/usr/bin/env node
/**
 * The Screen Age — Fast Seed Script
 * Generates all 30 articles using parallel batches of 5.
 * Run: node scripts/fast-seed.mjs
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

const { SEED_ARTICLES, ASSESSMENTS } = await import('../src/data/seed-articles.mjs');
const { generateArticle, slugify } = await import('../src/lib/deepseek-generate.mjs');
const db = await import('../src/lib/db.mjs');
const { ARTICLE_IMAGES, CATEGORY_IMAGES } = await import('../src/data/article-images.mjs');

const AMAZON_CATALOG = [
  { asin: '0593655036', name: 'The Anxious Generation by Jonathan Haidt' },
  { asin: '1629144460', name: 'Screenwise by Devorah Heitner' },
  { asin: '0801018668', name: 'The Tech-Wise Family by Andy Crouch' },
  { asin: '1501151983', name: 'iGen by Jean Twenge PhD' },
  { asin: '0393339750', name: 'The Shallows by Nicholas Carr' },
  { asin: 'B07BXHB8RG', name: 'Circle Home Plus Parental Controls' },
  { asin: 'B07VXPB3FW', name: 'Blue Light Blocking Glasses for Kids' },
  { asin: 'B00CIXVIRQ', name: 'Snap Circuits Jr.' },
  { asin: 'B07KXNB6YZ', name: 'Codenames Family' },
  { asin: 'B001JKJHQ8', name: 'TableTopics Family' },
];

const READING_TIMES = {
  'screen-time': 7, 'social-media': 8, 'mental-health': 8,
  'parenting': 7, 'research': 9, 'gaming': 7, 'digital-literacy': 7, 'family': 7,
};

async function generateOne(articleDef, index, total, relatedArticles) {
  const slug = slugify(articleDef.title);
  const existing = db.getArticleBySlug(slug);
  if (existing) {
    console.log(`[${index + 1}/${total}] ⏭  Already exists: ${slug}`);
    return { slug, title: articleDef.title, category: articleDef.category, skipped: true };
  }

  console.log(`[${index + 1}/${total}] Generating: ${articleDef.title.slice(0, 60)}...`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await generateArticle({
        topic: articleDef.title,
        category: articleDef.category,
        tags: articleDef.tags || [],
        catalog: AMAZON_CATALOG,
        relatedArticles,
        openerType: articleDef.openerType,
        conclusionType: articleDef.conclusionType,
      });

      const daysAgo = Math.floor((total - index) * (90 / total));
      const publishedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      const imageData = ARTICLE_IMAGES[slug] || CATEGORY_IMAGES[articleDef.category] || {
        heroUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&q=80',
        imageAlt: 'Child and technology',
      };

      const article = {
        slug,
        title: articleDef.title,
        meta_description: `${articleDef.title} — evidence-based, non-alarmist analysis from The Screen Age.`,
        og_title: articleDef.title,
        category: articleDef.category,
        tags: articleDef.tags || [],
        body: result.body,
        author: 'The Oracle Lover',
        hero_url: imageData.heroUrl,
        image_alt: imageData.imageAlt,
        reading_time: READING_TIMES[articleDef.category] || 7,
        word_count: result.wordCount,
        published_at: publishedAt,
        last_modified_at: new Date().toISOString(),
        status: 'published',
        quality_issues: result.qualityIssues || [],
      };

      db.upsertArticle(article);
      console.log(`[${index + 1}/${total}] ✓ ${slug} (${result.wordCount}w)`);
      return { slug, title: articleDef.title, category: articleDef.category };
    } catch (err) {
      if (attempt === 3) {
        console.error(`[${index + 1}/${total}] ✗ Failed: ${err.message.slice(0, 80)}`);
        return null;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

async function main() {
  console.log('⚡ The Screen Age — Fast Seed Script');
  console.log('=====================================');
  await db.initDb();

  // Seed assessments
  console.log('📋 Seeding assessments...');
  for (const assessment of ASSESSMENTS) {
    db.upsertAssessment(assessment);
    console.log(`  ✓ ${assessment.title}`);
  }

  // Process in batches of 5
  const BATCH_SIZE = 5;
  const generated = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < SEED_ARTICLES.length; i += BATCH_SIZE) {
    const batch = SEED_ARTICLES.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Batch ${Math.floor(i / BATCH_SIZE) + 1} (articles ${i + 1}-${Math.min(i + BATCH_SIZE, SEED_ARTICLES.length)}) ---`);

    const relatedArticles = generated.slice(-10).map(a => ({
      slug: a.slug, title: a.title, category: a.category,
    }));

    const results = await Promise.all(
      batch.map((articleDef, j) => generateOne(articleDef, i + j, SEED_ARTICLES.length, relatedArticles))
    );

    for (const result of results) {
      if (result) {
        generated.push(result);
        if (!result.skipped) successCount++;
      } else {
        failCount++;
      }
    }

    // Small delay between batches
    if (i + BATCH_SIZE < SEED_ARTICLES.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('\n=====================================');
  console.log(`✅ Done! ${successCount} generated, ${failCount} failed.`);
  console.log(`Total in DB: ${db.getArticles({ page: 1, limit: 1 }).pagination.total} published`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
