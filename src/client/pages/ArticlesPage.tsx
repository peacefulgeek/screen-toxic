import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { Breadcrumbs } from '../components/Breadcrumbs';

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

interface Category {
  category: string;
  count: number;
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

export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const activeCategory = searchParams.get('category') || '';

  const fetchArticles = useCallback(async (cat: string, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: '12' });
      if (cat) params.set('category', cat);
      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
    } catch (e) {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/articles/categories')
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchArticles(activeCategory, page);
  }, [activeCategory, page, fetchArticles]);

  const handleCategoryChange = (cat: string) => {
    setPage(1);
    if (cat) {
      setSearchParams({ category: cat });
    } else {
      setSearchParams({});
    }
  };

  const categoryLabel = activeCategory
    ? CATEGORY_LABELS[activeCategory] || activeCategory.replace(/-/g, ' ')
    : 'All Articles';

  return (
    <div className="page-content">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: categoryLabel },
        ]}
      />

      <div className="page-header">
        <div className="page-header-eyebrow">The Screen Age</div>
        <h1 className="page-header-title">{categoryLabel}</h1>
        <p className="page-header-description">
          {activeCategory
            ? `Evidence-based articles on ${categoryLabel.toLowerCase()}.`
            : 'Evidence-based, non-alarmist articles on kids, technology, and screen time.'}
          {total > 0 && ` ${total} article${total !== 1 ? 's' : ''}.`}
        </p>
      </div>

      {/* Category Filter */}
      <div className="category-filter" role="group" aria-label="Filter by category">
        <button
          className={`category-filter-btn ${!activeCategory ? 'active' : ''}`}
          onClick={() => handleCategoryChange('')}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.category}
            className={`category-filter-btn ${activeCategory === cat.category ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat.category)}
          >
            {CATEGORY_LABELS[cat.category] || cat.category.replace(/-/g, ' ')}
            <span style={{ marginLeft: 4, opacity: 0.7 }}>({cat.count})</span>
          </button>
        ))}
      </div>

      {/* View Toggle + Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {loading ? 'Loading...' : `${total} article${total !== 1 ? 's' : ''}`}
        </span>
        <div className="view-toggle" role="group" aria-label="View mode">
          <button
            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            ⊞
          </button>
          <button
            className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            ≡
          </button>
        </div>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className={`card-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)' }}>
              <div className="skeleton" style={{ height: viewMode === 'list' ? 140 : 180 }} />
              <div style={{ padding: 16 }}>
                <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 20, marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 16, width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : articles.length > 0 ? (
        <div className={`card-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {articles.map(article => (
            <ArticleCard key={article.slug} article={article} listView={viewMode === 'list'} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>📭</div>
          <p>No articles found{activeCategory ? ` in this category` : ''}. Check back soon.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xl)' }}>
          <button
            className="assessment-btn assessment-btn-secondary"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span style={{ padding: '10px 16px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="assessment-btn assessment-btn-secondary"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
