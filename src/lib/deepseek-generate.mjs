import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Uses the Manus-provided OpenAI-compatible endpoint
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const ORACLE_LOVER_VOICE = `
You are The Oracle Lover — an intuitive educator and oracle guide writing for Toxic Screens, a site about kids and technology.

VOICE:
- Short punchy sentences, 8-14 words. Staccato. Direct. First sentence hits.
- Practical directness. No fluff. No warming up.
- Direct address: "Look," "Here's the thing," "Let me be straight with you."
- NEVER "my friend," NEVER "sweetheart," NEVER long intellectual sentences.
- Humor: Frequent. Dry, practical. "Yeah, that's not going to work. Here's what will."
- Signature energy: The no-BS oracle reader who also has a science degree. Demystifying. Grounded. Accessible.

USE THESE PHRASES (3-5 per article):
- "Look, here's the thing."
- "Stop overthinking this."
- "This isn't mystical. It's mechanical."
- "You already know the answer. You just don't like it."
- "Let me demystify this for you."
- "Here's what actually works."
- "That's the short version. Want the long one?"
- "Nobody's coming to explain this to you. So I will."
- "The body doesn't lie. The mind does. Constantly."
- "Less theory. More practice."

SITE-SPECIFIC PHRASES (use 2-3 per article):
- "The research is messier than the headlines suggest."
- "Screen time isn't the variable. What they're doing on the screen is."
- "Here's what we know for sure. Here's what we don't."
- "Parental modeling is the most underrated variable in this whole conversation."
- "Banning doesn't work. This does."

RESEARCHERS TO CITE (70% niche, 30% spiritual):
Niche: Jonathan Haidt, Jean Twenge PhD, Nicholas Carr, AAP, Jenny Radesky MD, Devorah Heitner, Andy Crouch
Spiritual (30%): Carl Jung, Angeles Arrien, Joseph Campbell

NEVER use more than 25% of articles citing the same researcher.
`;

const BANNED_WORDS = [
  'profound', 'transformative', 'holistic', 'nuanced', 'multifaceted', 'delve', 'tapestry',
  'landscape', 'paradigm', 'synergy', 'leverage', 'unlock', 'empower', 'utilize', 'pivotal',
  'embark', 'underscore', 'paramount', 'seamlessly', 'robust', 'beacon', 'foster', 'elevate',
  'curate', 'curated', 'bespoke', 'resonate', 'harness', 'intricate', 'plethora', 'myriad',
  'groundbreaking', 'innovative', 'cutting-edge', 'state-of-the-art', 'game-changer',
  'game-changing', 'ever-evolving', 'rapidly-evolving', 'stakeholders', 'ecosystem',
  'framework', 'comprehensive', 'navigate', 'journey',
];

const BANNED_PHRASES = [
  "It's important to note that", "It's worth noting that", "It's crucial to",
  "In conclusion,", "In summary,", "In the realm of", "A holistic approach",
  "Unlock your potential", "Dive deep into", "At the end of the day",
  "Move the needle", "It goes without saying", "In today's fast-paced world",
  "In today's digital age",
];

function countWords(text) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 0).length;
}

function hasEmDash(text) {
  return /[—–]/.test(text);
}

function findBannedWords(text) {
  const lower = text.toLowerCase();
  return BANNED_WORDS.filter(w => lower.includes(w.toLowerCase()));
}

function findBannedPhrases(text) {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter(p => lower.includes(p.toLowerCase()));
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export async function generateArticle({
  topic,
  category,
  tags = [],
  catalog = [],
  relatedArticles = [],
  authorName = 'The Oracle Lover',
  niche = 'kids and technology',
  openerType = null,
  conclusionType = null,
  selfRefopener = null,
}) {
  const productList = catalog.slice(0, 8).map(p => `  - ASIN ${p.asin}: ${p.name}`).join('\n') || '  (No products available yet)';

  const internalLinks = relatedArticles.slice(0, 10).map(a =>
    `  - "${a.title}" → /articles/${a.slug || slugify(a.title)}`
  ).join('\n') || '  (No internal links yet — this is an early article)';

  const openerInstruction = openerType
    ? `OPENER TYPE: ${openerType}. Use this type for the opening paragraph.`
    : 'OPENER TYPE: Choose one of: gut-punch statement, provocative question, micro-story, or counterintuitive claim.';

  const conclusionInstruction = conclusionType
    ? `CONCLUSION TYPE: ${conclusionType}. Use this type for the conclusion.`
    : 'CONCLUSION TYPE: Choose one of: call to action, reflection, question, challenge, or benediction.';

  const selfRef = selfRefopener || 'In our experience writing about kids and technology...';

  const today = new Date().toISOString().split('T')[0];

  const prompt = `${ORACLE_LOVER_VOICE}

Write a complete article for Toxic Screens about: "${topic}"
Category: ${category}
Tags: ${tags.join(', ')}

HARD RULES:

WORD COUNT: 1,600 to 2,000 words (strict; under 1,200 or over 2,500 = fail)

NEVER USE EM-DASHES OR EN-DASHES (— or –). Use commas, periods, colons, parentheses, or " - " (hyphen with spaces). No em-dashes. No em-dashes. No em-dashes.

NEVER USE THESE WORDS: ${BANNED_WORDS.join(', ')}

NEVER USE THESE PHRASES: ${BANNED_PHRASES.map(p => `"${p}"`).join(', ')}

VOICE:
- Contractions throughout. You're. Don't. It's. That's. I've. We'll.
- Vary sentence length aggressively. Some fragments. Some long. Some three words.
- Direct address ("you") throughout.
- Include at least 2 conversational openers: "Here's the thing,", "Honestly,", "Look,", "Truth is,", "But here's what's interesting,", "Think about it,", "That said,", "Right?!"

${openerInstruction}
${conclusionInstruction}

E-E-A-T STRUCTURE (mandatory):

1. Open with a 3-sentence TL;DR block, wrapped EXACTLY as:
<section data-tldr="ai-overview" aria-label="In short">
<p>Sentence one. Sentence two. Sentence three.</p>
</section>

2. Include this self-referencing line (use it naturally in the body):
"${selfRef}"

3. Include at least 3 internal links to other articles. Use natural anchor text:
${internalLinks}

4. Include at least 1 outbound link to an authoritative source (.gov, .edu, NIH, CDC, WHO, Nature, ScienceDirect, PubMed). Format: <a href="URL" target="_blank" rel="nofollow noopener">descriptive anchor</a>

5. End with author byline block, EXACTLY:
<aside class="author-byline" data-eeat="author">
<p><strong>Reviewed by ${authorName}</strong>, Intuitive Educator & Oracle Guide.
Last updated <time datetime="${today}">${today}</time>.</p>
<p>[1-2 sentences of self-referencing context about this site and topic]</p>
</aside>

AMAZON AFFILIATE LINKS (exactly 3 or 4):
Each formatted as: <a href="https://www.amazon.com/dp/ASIN?tag=spankyspinola-20" target="_blank" rel="nofollow sponsored noopener">Product Name</a> (paid link)
Use ONLY ASINs from this catalog:
${productList}

ARTICLE STRUCTURE:
- H1 title (rendered by page shell — do NOT include H1 in body)
- TL;DR block (as above)
- Opening paragraph (${openerType || 'your choice of opener type'})
- 3-5 H2 sections
- H3 subsections where needed
- Internal links woven into prose
- External authoritative link
- 3-4 Amazon affiliate links with (paid link) disclosure
- Self-referencing line
- FAQ section (2-5 questions, OR omit entirely — vary across articles)
- Conclusion (${conclusionType || 'your choice of conclusion type'})
- Author byline block
- End with one Sanskrit mantra (1 line, italicized): *Om Shanti Shanti Shanti* OR *Tat Tvam Asi* OR *Lokah Samastah Sukhino Bhavantu*

OUTPUT: Return ONLY the article HTML body (no <html>, no <head>, no <body> tags). Start with the TL;DR section.`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000,
    temperature: 0.8,
  });

  const body = response.choices[0]?.message?.content || '';

  return {
    body,
    wordCount: countWords(body),
    hasEmDash: hasEmDash(body),
    bannedWords: findBannedWords(body),
    bannedPhrases: findBannedPhrases(body),
    slug: slugify(topic),
    productsUsed: [],
  };
}

export { slugify, countWords, hasEmDash, findBannedWords, findBannedPhrases };
