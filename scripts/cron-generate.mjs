#!/usr/bin/env node
/**
 * The Screen Age — Cron: Generate new articles
 * Runs weekly. Generates 3 new articles and saves them as drafts.
 * Crontab: 0 6 * * 1 node /path/to/scripts/cron-generate.mjs
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
const { generateArticle, slugify } = await import('../src/lib/deepseek-generate.mjs');

// New article topics for ongoing generation
const NEW_TOPICS = [
  { title: "The Dopamine Loop: Why Kids Can't Stop Scrolling", category: 'mental-health', tags: ['dopamine', 'scrolling', 'addiction', 'teens'] },
  { title: "Parental Controls in 2024: What Actually Works", category: 'parenting', tags: ['parental controls', 'tools', 'Circle', 'safety'] },
  { title: "The Social Media Minimum Age Debate: What Countries Are Doing", category: 'social-media', tags: ['minimum age', 'regulation', 'policy', 'social media'] },
  { title: "Screen Time and Obesity: What the Research Shows", category: 'research', tags: ['obesity', 'physical activity', 'screen time', 'health'] },
  { title: "How to Raise a Digital Native Without Losing Your Mind", category: 'parenting', tags: ['digital native', 'parenting', 'practical guide'] },
  { title: "The Attention Economy and Your Child's Brain", category: 'digital-literacy', tags: ['attention economy', 'brain', 'focus', 'children'] },
  { title: "YouTube Kids: Is It Actually Safe?", category: 'screen-time', tags: ['YouTube Kids', 'safety', 'content', 'children'] },
  { title: "Gaming Disorder: What the WHO Classification Actually Means", category: 'gaming', tags: ['gaming disorder', 'WHO', 'ICD-11', 'classification'] },
  { title: "Tech-Free Sundays: A Family Experiment That Actually Works", category: 'family', tags: ['tech-free', 'family', 'digital detox', 'practical'] },
  { title: "The Research on Minecraft: Is It Really Educational?", category: 'gaming', tags: ['Minecraft', 'education', 'research', 'children'] },
];

const AMAZON_CATALOG = [
  { asin: '0593655036', name: 'The Anxious Generation by Jonathan Haidt' },
  { asin: '1629144460', name: 'Screenwise by Devorah Heitner' },
  { asin: '0801018668', name: 'The Tech-Wise Family by Andy Crouch' },
  { asin: '1501151983', name: 'iGen by Jean Twenge PhD' },
  { asin: '0393339750', name: 'The Shallows by Nicholas Carr' },
  { asin: 'B07BXHB8RG', name: 'Circle Home Plus Parental Controls' },
  { asin: 'B07VXPB3FW', name: 'Blue Light Blocking Glasses for Kids' },
  { asin: 'B00CIXVIRQ', name: 'Snap Circuits Jr.' },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('[cron-generate] Starting...');
  await db.initDb();

  const recentArticles = db.getRecentArticles(10);
  let generated = 0;

  for (const topic of NEW_TOPICS.slice(0, 3)) {
    const slug = slugify(topic.title);
    const existing = db.getArticleBySlug(slug);
    if (existing) {
      console.log(`[cron-generate] Already exists: ${slug}`);
      continue;
    }

    console.log(`[cron-generate] Generating: ${topic.title}`);
    try {
      const result = await generateArticle({
        topic: topic.title,
        category: topic.category,
        tags: topic.tags,
        catalog: AMAZON_CATALOG,
        relatedArticles: recentArticles,
      });

      db.upsertArticle({
        slug,
        title: topic.title,
        meta_description: `${topic.title} — evidence-based analysis from The Screen Age.`,
        og_title: topic.title,
        category: topic.category,
        tags: topic.tags,
        body: result.body,
        author: 'The Oracle Lover',
        reading_time: 7,
        word_count: result.wordCount,
        last_modified_at: new Date().toISOString(),
        status: 'draft',
        quality_issues: result.qualityIssues || [],
      });

      console.log(`[cron-generate] Saved draft: ${slug} (${result.wordCount} words)`);
      generated++;
      await sleep(3000);
    } catch (err) {
      console.error(`[cron-generate] Error generating ${slug}:`, err.message);
    }
  }

  db.logCronRun({
    jobName: 'cron-generate',
    status: 'ok',
    message: `Generated ${generated} new draft articles`,
    articlesGenerated: generated,
  });

  console.log(`[cron-generate] Done. Generated ${generated} articles.`);
  process.exit(0);
}

main().catch(err => {
  console.error('[cron-generate] Fatal error:', err);
  process.exit(1);
});
