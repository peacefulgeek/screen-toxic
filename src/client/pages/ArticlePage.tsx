import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ArticleCard } from '../components/ArticleCard';

interface Article {
  slug: string;
  title: string;
  meta_description?: string;
  og_title?: string;
  category: string;
  tags?: string[];
  hero_url?: string;
  image_alt?: string;
  reading_time?: number;
  published_at?: string;
  last_modified_at?: string;
  body: string;
  author: string;
  word_count?: number;
}

interface RelatedArticle {
  slug: string;
  title: string;
  category: string;
  hero_url?: string;
  reading_time?: number;
  published_at?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'screen-time': 'Screen Time',
  'social-media': 'Social Media',
  'mental-health': 'Mental Health',
  'parenting': 'Parenting Strategies',
  'research': 'The Research',
  'gaming': 'Gaming',
  'digital-literacy': 'Digital Literacy',
  'family': 'Family Tech',
};

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  });
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    fetch(`/api/articles/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Article not found');
        return r.json();
      })
      .then(data => {
        setArticle(data.article);
        setRelated(data.related || []);
        setLoading(false);
        // Update document title
        if (data.article?.title) {
          document.title = `${data.article.title} | Toxic Screens`;
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 40, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 12, marginBottom: 32 }} />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 18, marginBottom: 12, width: `${70 + Math.random() * 30}%` }} />
        ))}
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: 'var(--spacing-2xl)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🔍</div>
        <h1 style={{ marginBottom: 'var(--spacing-md)' }}>Article Not Found</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
          This article may have moved or doesn't exist yet.
        </p>
        <Link to="/articles" className="assessment-start-btn">Browse All Articles</Link>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[article.category] || article.category.replace(/-/g, ' ');

  return (
    <div className="page-content">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: categoryLabel, href: `/articles?category=${article.category}` },
          { label: article.title },
        ]}
      />

      {/* Article */}
      <article className="article-page" aria-labelledby="article-title">
        {/* Meta */}
        <div className="article-meta">
          <span className="article-category-badge">{categoryLabel}</span>
          {article.reading_time && <span>{article.reading_time} min read</span>}
          {article.published_at && (
            <>
              <span className="article-card-meta-dot" aria-hidden="true" />
              <time dateTime={article.published_at}>
                {formatDate(article.published_at)}
              </time>
            </>
          )}
          {article.word_count && (
            <>
              <span className="article-card-meta-dot" aria-hidden="true" />
              <span>{article.word_count.toLocaleString()} words</span>
            </>
          )}
        </div>

        {/* Title */}
        <h1 id="article-title" style={{ marginBottom: 'var(--spacing-lg)', lineHeight: 1.2 }}>
          {article.title}
        </h1>

        {/* Hero Image */}
        {article.hero_url ? (
          <img
            src={article.hero_url}
            alt={article.image_alt || article.title}
            className="article-hero-image"
            loading="eager"
            width="740"
            height="370"
          />
        ) : (
          <div className="article-hero-placeholder" aria-hidden="true">
            {article.category === 'gaming' ? '🎮' :
             article.category === 'social-media' ? '🌐' :
             article.category === 'mental-health' ? '🧠' :
             article.category === 'research' ? '🔬' : '📱'}
          </div>
        )}

        {/* Article Body */}
        <div
          className="article-body"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-xl)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {article.tags.map(tag => (
              <span
                key={tag}
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* Related Articles */}
      {related.length > 0 && (
        <aside className="related-articles" aria-labelledby="related-heading">
          <h2 className="related-articles-title" id="related-heading">Related Articles</h2>
          <div className="related-articles-grid">
            {related.map(a => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
