import React from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs';

const TOOLS = [
  // Books
  {
    category: 'Books',
    name: 'The Anxious Generation',
    author: 'Jonathan Haidt',
    description: 'The definitive research-backed case for why smartphones and social media are harming teen mental health — and what to do about it.',
    asin: '0593655036',
    tag: 'spankyspinola-20',
  },
  {
    category: 'Books',
    name: 'Screenwise',
    author: 'Devorah Heitner',
    description: 'Practical guidance for raising kids who use technology thoughtfully. Less about rules, more about mentorship.',
    asin: '1629144460',
    tag: 'spankyspinola-20',
  },
  {
    category: 'Books',
    name: 'The Tech-Wise Family',
    author: 'Andy Crouch',
    description: 'A framework for making intentional choices about technology in your home — not a ban, but a philosophy.',
    asin: '0801018668',
    tag: 'spankyspinola-20',
  },
  {
    category: 'Books',
    name: 'iGen',
    author: 'Jean Twenge PhD',
    description: 'The data on how smartphones changed the generation born after 1995. Sobering and essential.',
    asin: '1501151983',
    tag: 'spankyspinola-20',
  },
  {
    category: 'Books',
    name: 'The Shallows',
    author: 'Nicholas Carr',
    description: 'What the internet is doing to our brains. The attention research that started the conversation.',
    asin: '0393339750',
    tag: 'spankyspinola-20',
  },
  // Parental Controls
  {
    category: 'Parental Controls',
    name: 'Circle Home Plus',
    author: 'Circle Media',
    description: 'Network-level parental controls that work across all devices. Set time limits, filter content, and pause the internet.',
    asin: 'B07BXHB8RG',
    tag: 'spankyspinola-20',
  },
  // Blue Light
  {
    category: 'Blue Light Protection',
    name: 'Blue Light Blocking Glasses for Kids',
    author: 'TIJN',
    description: 'Lightweight, durable blue light glasses designed for children. Helps with sleep when screens are used in the evening.',
    asin: 'B07VXPB3FW',
    tag: 'spankyspinola-20',
  },
  // Alternative Activities
  {
    category: 'Alternative Activities',
    name: 'Snap Circuits Jr.',
    author: 'Elenco',
    description: 'Build real working circuits. Teaches engineering thinking and keeps kids off screens with something genuinely engaging.',
    asin: 'B00CIXVIRQ',
    tag: 'spankyspinola-20',
  },
  {
    category: 'Alternative Activities',
    name: 'Codenames Family',
    author: 'Czech Games Edition',
    description: 'The word-association game that gets the whole family talking. One of the best screen-free activities available.',
    asin: 'B07KXNB6YZ',
    tag: 'spankyspinola-20',
  },
  {
    category: 'Alternative Activities',
    name: 'TableTopics Family',
    author: 'TableTopics',
    description: 'Conversation starter cards designed for families. Turns dinner into something everyone actually looks forward to.',
    asin: 'B001JKJHQ8',
    tag: 'spankyspinola-20',
  },
  {
    category: 'Alternative Activities',
    name: 'Pandemic Board Game',
    author: 'Z-Man Games',
    description: 'Cooperative strategy game where everyone wins or loses together. Teaches systems thinking and teamwork.',
    asin: 'B00A2HD40E',
    tag: 'spankyspinola-20',
  },
];

const CATEGORIES = [...new Set(TOOLS.map(t => t.category))];

export default function ToolsPage() {
  return (
    <div className="page-content">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Recommended Tools' }]} />

      <div className="page-header">
        <div className="page-header-eyebrow">Screen Age Library</div>
        <h1 className="page-header-title">Recommended Tools</h1>
        <p className="page-header-description">
          Books, tools, and resources we actually recommend. Everything here is research-informed and niche-relevant. No filler.
        </p>
      </div>

      <div style={{
        background: 'var(--accent-light)',
        border: '1px solid var(--accent-soft)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-xl)',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
      }}>
        <strong>Disclosure:</strong> Some links on this page are Amazon affiliate links. As an Amazon Associate, we earn from qualifying purchases at no extra cost to you. We only recommend products we'd genuinely suggest to a friend.
      </div>

      {CATEGORIES.map(category => (
        <section key={category} style={{ marginBottom: 'var(--spacing-2xl)' }} aria-labelledby={`cat-${category}`}>
          <h2
            id={`cat-${category}`}
            style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              marginBottom: 'var(--spacing-lg)',
              paddingBottom: 'var(--spacing-sm)',
              borderBottom: '2px solid var(--accent-soft)',
              color: 'var(--text-primary)',
            }}
          >
            {category}
          </h2>
          <div className="tools-grid">
            {TOOLS.filter(t => t.category === category).map(tool => (
              <div key={tool.name} className="tool-card">
                <div className="tool-card-category">{tool.category}</div>
                <div className="tool-card-name">{tool.name}</div>
                {tool.author && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    by {tool.author}
                  </div>
                )}
                <p className="tool-card-description">{tool.description}</p>
                <a
                  href={`https://www.amazon.com/dp/${tool.asin}?tag=${tool.tag}`}
                  target="_blank"
                  rel="nofollow sponsored noopener noreferrer"
                  className="tool-card-link"
                >
                  View on Amazon ↗
                </a>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                  (paid link)
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
