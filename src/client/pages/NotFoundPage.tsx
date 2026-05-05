import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-content" style={{ textAlign: 'center', paddingTop: 'var(--spacing-2xl)' }}>
      <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>📱</div>
      <h1 style={{ marginBottom: 'var(--spacing-md)' }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto var(--spacing-xl)' }}>
        This page doesn't exist. Maybe it was moved, or maybe you followed a broken link.
      </p>
      <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="assessment-start-btn">Go Home</Link>
        <Link to="/articles" className="assessment-start-btn" style={{ background: 'var(--bg-sidebar)', color: 'var(--accent)', border: '1px solid var(--accent-soft)' }}>
          Browse Articles
        </Link>
      </div>
    </div>
  );
}
