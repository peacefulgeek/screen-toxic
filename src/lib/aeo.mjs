const SITE_DOMAIN = process.env.SITE_DOMAIN || 'thescreenage.com';
const SITE_NAME = 'The Screen Age';

const STRIP_PARAMS = new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'fbclid','gclid','mc_eid','ref','source','_ga','_gl',
]);

export function buildCanonical(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = SITE_DOMAIN;
  let path = req.path.replace(/\/+$/, '') || '/';
  const url = new URL(`${proto}://${host}${path}`);
  for (const p of STRIP_PARAMS) url.searchParams.delete(p);
  return url.toString();
}

export function buildRobotsTxt(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = SITE_DOMAIN;
  return `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: YouBot
Allow: /

Sitemap: ${proto}://${host}/sitemap.xml
Sitemap: ${proto}://${host}/news-sitemap.xml
`;
}

export async function buildLlmsTxt() {
  let articles = [];
  try {
    const db = await import('./db.mjs');
    articles = db.getRecentArticles(100);
  } catch (e) {
    console.warn('[aeo] buildLlmsTxt db error:', e.message);
  }

  const lines = [
    `# ${SITE_NAME}`,
    ``,
    `> Evidence-based, non-alarmist resource on kids and technology, screen time, and the anxious generation.`,
    ``,
    `## About`,
    `${SITE_NAME} publishes research-grounded articles on children's screen use, digital parenting, teen mental health, and the science behind technology's effects on developing minds.`,
    ``,
    `## Articles`,
    ...articles.map(a => `- [${a.title}](https://${SITE_DOMAIN}/articles/${a.slug}): ${a.meta_description || ''}`),
    ``,
    `## Contact`,
    `For questions, visit https://${SITE_DOMAIN}/contact`,
  ];

  return lines.join('\n');
}

export async function buildLlmsFullTxt() {
  let articles = [];
  try {
    const db = await import('./db.mjs');
    const result = db.getArticles({ page: 1, limit: 50 });
    articles = result.articles;
  } catch (e) {
    console.warn('[aeo] buildLlmsFullTxt db error:', e.message);
  }

  const sections = articles.map(a => {
    const stripped = (a.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
    return `## ${a.title}\nURL: https://${SITE_DOMAIN}/articles/${a.slug}\nCategory: ${a.category}\n\n${stripped}\n`;
  });

  return `# ${SITE_NAME} — Full Content Index\n\n${sections.join('\n---\n\n')}`;
}

export function buildArticleJsonLd({ article, siteUrl }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.meta_description || '',
    image: article.hero_url || '',
    author: {
      '@type': 'Person',
      name: 'The Oracle Lover',
      url: 'https://theoraclelover.com',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: `https://${SITE_DOMAIN}`,
    },
    datePublished: article.published_at,
    dateModified: article.last_modified_at || article.published_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${siteUrl}/articles/${article.slug}`,
    },
  };
}

export function buildBreadcrumbJsonLd({ items }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: `https://${SITE_DOMAIN}`,
    description: 'Evidence-based resource on kids and technology, screen time, and the anxious generation.',
    knowsAbout: [
      'Screen time and children',
      'Teen mental health',
      'Digital parenting',
      'Social media effects on adolescents',
      'Technology and child development',
      'Parental controls',
      'Digital literacy',
    ],
  };
}
