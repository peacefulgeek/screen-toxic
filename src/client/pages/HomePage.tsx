import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';

interface Article {
  slug: string;
  title: string;
  meta_description?: string;
  category: string;
  hero_url?: string;
  image_alt?: string;
  reading_time?: number;
  published_at?: string;
}

interface Assessment {
  slug: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  questionCount: number;
}

const ASSESSMENT_ICONS: Record<string, string> = {
  'screen-time-health-check': '📊',
  'social-media-readiness': '📱',
  'family-tech-balance': '🏠',
};

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/articles?limit=6').then(r => r.json()).catch(() => ({ articles: [] })),
      fetch('/api/assessments').then(r => r.json()).catch(() => []),
    ]).then(([articlesData, assessmentsData]) => {
      setArticles(articlesData.articles || []);
      setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);
      setLoading(false);
    });
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="hero-heading">
        <div className="hero-content">
          <div className="hero-eyebrow">Evidence-Based · Non-Alarmist · Honest</div>
          <h1 className="hero-title" id="hero-heading">
            What Does the Research Actually Say About Kids and Screens?
          </h1>
          <p className="hero-description">
            Not the headline version. The real version. We read the studies, talk to the researchers, and give you the calibrated truth about technology and children.
          </p>
          <div className="hero-cta-group">
            <Link to="/articles" className="hero-cta-primary">
              Browse All Articles →
            </Link>
            <Link to="/assessments" className="hero-cta-secondary">
              Take an Assessment
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <div className="stats-strip" role="region" aria-label="Site statistics">
        <div className="stat-item">
          <span className="stat-number">30+</span>
          <span className="stat-label">Research Articles</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">3</span>
          <span className="stat-label">Free Assessments</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">8</span>
          <span className="stat-label">Topic Categories</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">0</span>
          <span className="stat-label">Moral Panics</span>
        </div>
      </div>

      {/* Featured Articles */}
      <section className="featured-section" aria-labelledby="featured-heading">
        <div className="section-header">
          <h2 className="section-title" id="featured-heading">Latest Articles</h2>
          <Link to="/articles" className="section-link">View all →</Link>
        </div>

        {loading ? (
          <div className="card-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
                <div className="skeleton" style={{ height: 180 }} />
                <div style={{ padding: 16 }}>
                  <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 20, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 16, width: '80%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="card-grid">
            {articles.map(article => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <EmptyArticlesState />
        )}
      </section>

      {/* Assessments Section */}
      <section className="featured-section" aria-labelledby="assessments-heading" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="section-header">
          <h2 className="section-title" id="assessments-heading">Free Assessments</h2>
          <Link to="/assessments" className="section-link">View all →</Link>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)', maxWidth: 600 }}>
          Research-based tools to help you understand your family's relationship with technology. No email required.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {assessments.map(assessment => (
            <Link
              key={assessment.slug}
              to={`/assessments/${assessment.slug}`}
              className="assessment-card"
            >
              <div className="assessment-card-icon">
                {ASSESSMENT_ICONS[assessment.slug] || '📋'}
              </div>
              <div className="assessment-card-title">{assessment.title}</div>
              <p className="assessment-card-description">{assessment.description}</p>
              <div className="assessment-card-meta">
                <span>⏱ {assessment.estimatedMinutes} min</span>
                <span>· {assessment.questionCount} questions</span>
              </div>
              <div className="assessment-start-btn">Start Assessment →</div>
            </Link>
          ))}
        </div>
      </section>

      {/* About The Oracle Lover */}
      <section
        className="featured-section"
        aria-labelledby="about-heading"
        style={{
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-sidebar)',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--spacing-xl)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80"
            alt="The Oracle Lover"
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid var(--accent-soft)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="page-header-eyebrow">About the Author</div>
            <h2 className="section-title" id="about-heading" style={{ marginBottom: 'var(--spacing-md)' }}>
              The Oracle Lover
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--spacing-md)' }}>
              The no-BS oracle reader who also has a science degree. I distinguish between strong evidence and moral panic, and give parents tools that are practical and calibrated. "Here's what the research actually shows. Not the headline version."
            </p>
            <a
              href="https://theoraclelover.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
            >
              Visit theoraclelover.com ↗
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

function EmptyArticlesState() {
  return (
    <div style={{
      textAlign: 'center',
      padding: 'var(--spacing-2xl)',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>📚</div>
      <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Articles Coming Soon</h3>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
        We're building out our library of evidence-based articles on kids and technology. Check back soon.
      </p>
    </div>
  );
}
