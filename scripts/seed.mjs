#!/usr/bin/env node
/**
 * Toxic Screens — Seed Script
 * Generates 30 articles using the DeepSeek writing engine and saves them to the database.
 * Run: node scripts/seed.mjs
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

const { SEED_ARTICLES } = await import('../src/data/seed-articles.mjs');
const { generateArticle, slugify, countWords, hasEmDash, findBannedWords } = await import('../src/lib/deepseek-generate.mjs');
const db = await import('../src/lib/db.mjs');

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
  'screen-time': 7,
  'social-media': 8,
  'mental-health': 8,
  'parenting': 7,
  'research': 9,
  'gaming': 7,
  'digital-literacy': 7,
  'family': 7,
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateWithRetry(articleDef, relatedArticles, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`  Attempt ${attempt}/${maxRetries}...`);
    try {
      const result = await generateArticle({
        topic: articleDef.title,
        category: articleDef.category,
        tags: articleDef.tags || [],
        catalog: AMAZON_CATALOG,
        relatedArticles,
        openerType: articleDef.openerType,
        conclusionType: articleDef.conclusionType,
        selfRefopener: articleDef.selfRefopener,
      });

      // Quality gate
      const issues = [];
      if (result.wordCount < 1200) issues.push(`Too short: ${result.wordCount} words`);
      if (result.wordCount > 2500) issues.push(`Too long: ${result.wordCount} words`);
      if (result.hasEmDash) issues.push('Contains em-dash');
      if (result.bannedWords.length > 0) issues.push(`Banned words: ${result.bannedWords.slice(0, 3).join(', ')}`);

      if (issues.length > 0 && attempt < maxRetries) {
        console.log(`  Quality issues: ${issues.join('; ')} — retrying...`);
        await sleep(2000);
        continue;
      }

      return { ...result, qualityIssues: issues };
    } catch (err) {
      console.error(`  Error on attempt ${attempt}:`, err.message);
      if (attempt < maxRetries) await sleep(3000);
    }
  }
  return null;
}

async function main() {
  console.log('🌱 Toxic Screens — Seed Script');
  console.log('================================');
  console.log(`Generating ${SEED_ARTICLES.length} articles...\n`);

  // Ensure DB is initialized
  await db.initDb();

  // Seed assessments first
  console.log('📋 Seeding assessments...');
  const { ASSESSMENTS } = await import('../src/data/seed-articles.mjs');
  for (const assessment of ASSESSMENTS) {
    await db.upsertAssessment(assessment);
    console.log(`  ✓ ${assessment.title}`);
  }
  console.log();

  // Generate articles
  const generatedSlugs = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < SEED_ARTICLES.length; i++) {
    const articleDef = SEED_ARTICLES[i];
    const slug = slugify(articleDef.title);

    console.log(`[${i + 1}/${SEED_ARTICLES.length}] ${articleDef.title}`);
    console.log(`  Category: ${articleDef.category} | Slug: ${slug}`);

    // Check if already exists
    const existing = await db.getArticleBySlug(slug);
    if (existing) {
      console.log(`  ⏭  Already exists, skipping.\n`);
      generatedSlugs.push({ slug, title: articleDef.title, category: articleDef.category });
      successCount++;
      continue;
    }

    // Build related articles list from already-generated ones
    const relatedArticles = generatedSlugs.slice(-10).map(a => ({
      slug: a.slug,
      title: a.title,
      category: a.category,
    }));

    const result = await generateWithRetry(articleDef, relatedArticles);

    if (!result) {
      console.log(`  ✗ Failed after all retries.\n`);
      failCount++;
      continue;
    }

    // Calculate published_at (staggered over past 90 days)
    const daysAgo = Math.floor((SEED_ARTICLES.length - i) * (90 / SEED_ARTICLES.length));
    const publishedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

    const article = {
      slug,
      title: articleDef.title,
      meta_description: `${articleDef.title} — evidence-based, non-alarmist analysis from Toxic Screens.`,
      og_title: articleDef.title,
      category: articleDef.category,
      tags: articleDef.tags || [],
      body: result.body,
      author: 'The Oracle Lover',
      reading_time: READING_TIMES[articleDef.category] || 7,
      word_count: result.wordCount,
      published_at: publishedAt,
      last_modified_at: new Date().toISOString(),
      status: 'published',
      quality_issues: result.qualityIssues || [],
    };

    await db.upsertArticle(article);
    generatedSlugs.push({ slug, title: articleDef.title, category: articleDef.category });
    successCount++;

    const qualityNote = result.qualityIssues?.length > 0
      ? ` ⚠ ${result.qualityIssues.join('; ')}`
      : ' ✓';
    console.log(`  ${qualityNote} ${result.wordCount} words\n`);

    // Rate limiting: 1 request per 2 seconds
    if (i < SEED_ARTICLES.length - 1) {
      await sleep(2000);
    }
  }

  console.log('\n================================');
  console.log(`✅ Done! ${successCount} articles seeded, ${failCount} failed.`);
  console.log('================================\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
