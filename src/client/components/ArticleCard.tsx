import React from 'react';
import { Link } from 'react-router-dom';

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

interface Props {
  article: Article;
  listView?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  'screen-time': '📱',
  'social-media': '🌐',
  'mental-health': '🧠',
  'parenting': '👨‍👩‍👧',
  'research': '🔬',
  'gaming': '🎮',
  'digital-literacy': '💡',
  'family': '🏠',
};

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ArticleCard({ article, listView }: Props) {
  const icon = CATEGORY_ICONS[article.category] || '📄';

  return (
    <Link
      to={`/articles/${article.slug}`}
      className="article-card"
      aria-label={`Read: ${article.title}`}
    >
      {article.hero_url ? (
        <img
          src={article.hero_url}
          alt={article.image_alt || article.title}
          className="article-card-image"
          loading="lazy"
          width="400"
          height="225"
        />
      ) : (
        <div className="article-card-image-placeholder" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="article-card-body">
        <div className="article-card-category">{article.category.replace(/-/g, ' ')}</div>
        <h2 className="article-card-title">{article.title}</h2>
        {!listView && article.meta_description && (
          <p className="article-card-excerpt">{article.meta_description}</p>
        )}
        <div className="article-card-meta">
          {article.reading_time && <span>{article.reading_time} min read</span>}
          {article.reading_time && article.published_at && (
            <span className="article-card-meta-dot" aria-hidden="true" />
          )}
          {article.published_at && <span>{formatDate(article.published_at)}</span>}
        </div>
      </div>
    </Link>
  );
}
