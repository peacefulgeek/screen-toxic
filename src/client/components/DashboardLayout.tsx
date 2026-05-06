import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ReadingProgress } from './ReadingProgress';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: number;
}

const MAIN_NAV: NavItem[] = [
  { path: '/', label: 'Home', icon: '⌂' },
  { path: '/articles', label: 'All Articles', icon: '◈' },
  { path: '/assessments', label: 'Assessments', icon: '◎' },
  { path: '/tools', label: 'Recommended Tools', icon: '◆' },
  { path: '/about', label: 'About', icon: '◉' },
];

const CATEGORIES = [
  { slug: 'screen-time', label: 'Screen Time', icon: '📱' },
  { slug: 'social-media', label: 'Social Media', icon: '🌐' },
  { slug: 'mental-health', label: 'Mental Health', icon: '🧠' },
  { slug: 'parenting', label: 'Parenting Strategies', icon: '👨‍👩‍👧' },
  { slug: 'research', label: 'The Research', icon: '🔬' },
  { slug: 'gaming', label: 'Gaming', icon: '🎮' },
  { slug: 'digital-literacy', label: 'Digital Literacy', icon: '💡' },
  { slug: 'family', label: 'Family Tech', icon: '🏠' },
];

interface SidebarModuleArticle {
  slug: string;
  title: string;
  category: string;
}

interface Props {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: Props) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [popularArticles, setPopularArticles] = useState<SidebarModuleArticle[]>([]);
  const [recentArticles, setRecentArticles] = useState<SidebarModuleArticle[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Fetch sidebar data
    Promise.all([
      fetch('/api/articles/popular').then(r => r.json()).catch(() => []),
      fetch('/api/articles/recent').then(r => r.json()).catch(() => []),
      fetch('/api/articles/categories').then(r => r.json()).catch(() => []),
    ]).then(([popular, recent, cats]) => {
      setPopularArticles(Array.isArray(popular) ? popular.slice(0, 5) : []);
      setRecentArticles(Array.isArray(recent) ? recent.slice(0, 5) : []);
      const counts: Record<string, number> = {};
      if (Array.isArray(cats)) {
        cats.forEach((c: any) => { counts[c.category] = c.count; });
      }
      setCategoryCounts(counts);
    });
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isArticlePage = location.pathname.startsWith('/articles/');

  return (
    <div className="dashboard-layout">
      {/* Reading Progress (article pages only) */}
      {isArticlePage && <ReadingProgress />}

      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Site navigation">
        {/* Logo */}
        <Link to="/" className="sidebar-logo" aria-label="Toxic Screens — Home">
          <div className="sidebar-logo-text">Toxic Screens</div>
          <div className="sidebar-logo-tagline">Kids · Technology · Evidence</div>
        </Link>

        {/* Author Block */}
        <div className="sidebar-author">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80"
            alt="The Oracle Lover — Intuitive Educator"
            className="sidebar-author-photo"
            loading="lazy"
          />
          <div className="sidebar-author-name">The Oracle Lover</div>
          <div className="sidebar-author-title">Intuitive Educator & Oracle Guide</div>
          <p className="sidebar-author-bio">
            Cutting through the noise on kids and tech. Evidence-based, non-alarmist, and honest about what the research actually shows.
          </p>
          <a
            href="https://theoraclelover.com"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-author-link"
          >
            theoraclelover.com ↗
          </a>
        </div>

        {/* Main Navigation */}
        <nav className="sidebar-nav" aria-label="Main navigation">
          <div className="sidebar-nav-section">
            <div className="sidebar-nav-label">Navigate</div>
            {MAIN_NAV.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-link ${isActive(item.path) ? 'active' : ''}`}
                aria-current={isActive(item.path) ? 'page' : undefined}
              >
                <span className="sidebar-nav-link-icon" aria-hidden="true">{item.icon}</span>
                <span className="sidebar-nav-link-text">{item.label}</span>
                {item.badge && (
                  <span className="sidebar-nav-badge" aria-label={`${item.badge} items`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="sidebar-nav-section">
            <div className="sidebar-nav-label">Categories</div>
            {CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                to={`/articles?category=${cat.slug}`}
                className={`sidebar-nav-link ${location.search.includes(cat.slug) ? 'active' : ''}`}
              >
                <span className="sidebar-nav-link-icon" aria-hidden="true">{cat.icon}</span>
                <span className="sidebar-nav-link-text">{cat.label}</span>
                {categoryCounts[cat.slug] && (
                  <span className="sidebar-nav-badge">{categoryCounts[cat.slug]}</span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Popular Articles Module */}
        {popularArticles.length > 0 && (
          <div className="sidebar-module">
            <div className="sidebar-module-title">Popular</div>
            {popularArticles.map(article => (
              <Link
                key={article.slug}
                to={`/articles/${article.slug}`}
                className="sidebar-module-item"
              >
                <div>{article.title}</div>
                <div className="sidebar-module-item-category">{article.category}</div>
              </Link>
            ))}
          </div>
        )}

        {/* Recent Articles Module */}
        {recentArticles.length > 0 && (
          <div className="sidebar-module">
            <div className="sidebar-module-title">Recent</div>
            {recentArticles.map(article => (
              <Link
                key={article.slug}
                to={`/articles/${article.slug}`}
                className="sidebar-module-item"
              >
                <div>{article.title}</div>
                <div className="sidebar-module-item-category">{article.category}</div>
              </Link>
            ))}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Mobile Header */}
        <header className="mobile-header" aria-label="Mobile navigation">
          <Link to="/" className="mobile-header-logo">Toxic Screens</Link>
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            <span />
            <span />
            <span />
          </button>
        </header>

        {/* Page Content */}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="footer-grid">
        <div>
          <div className="footer-brand-name">Toxic Screens</div>
          <p className="footer-brand-desc">
            Evidence-based, non-alarmist, and honest about what the research shows about screens and children. Including what we don't know yet.
          </p>
          <p className="footer-affiliate-disclosure">
            As an Amazon Associate, I earn from qualifying purchases. All product recommendations are independent and research-informed.
          </p>
        </div>
        <div>
          <div className="footer-section-title">Explore</div>
          <ul className="footer-links">
            <li><Link to="/articles">All Articles</Link></li>
            <li><Link to="/assessments">Assessments</Link></li>
            <li><Link to="/tools">Recommended Tools</Link></li>
            <li><Link to="/articles?category=research">The Research</Link></li>
          </ul>
        </div>
        <div>
          <div className="footer-section-title">Legal</div>
          <ul className="footer-links">
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/disclosures">Disclosures</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="footer-section-title">Connect</div>
          <ul className="footer-links">
            <li>
              <a href="https://theoraclelover.com" target="_blank" rel="noopener noreferrer">
                The Oracle Lover ↗
              </a>
            </li>
            <li><Link to="/about">About This Site</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Toxic Screens. All rights reserved.</span>
        <span>Kids · Technology · Evidence</span>
      </div>
    </footer>
  );
}
