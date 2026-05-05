import React, { useState } from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="page-content">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Contact' }]} />
      <div style={{ maxWidth: 560 }}>
        <div className="page-header">
          <div className="page-header-eyebrow">Get in Touch</div>
          <h1 className="page-header-title">Contact</h1>
          <p className="page-header-description">
            Questions about the research? A topic you'd like us to cover? Reach out.
          </p>
        </div>

        {sent ? (
          <div style={{
            background: 'var(--accent-light)',
            border: '1px solid var(--accent-soft)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-xl)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-md)' }}>✓</div>
            <h2 style={{ marginBottom: 'var(--spacing-sm)' }}>Message sent</h2>
            <p style={{ color: 'var(--text-secondary)' }}>We'll get back to you soon.</p>
          </div>
        ) : (
          <form
            onSubmit={e => { e.preventDefault(); setSent(true); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}
          >
            <div>
              <label htmlFor="name" style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.875rem' }}>
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9375rem',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.875rem' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9375rem',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label htmlFor="message" style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: '0.875rem' }}>
                Message
              </label>
              <textarea
                id="message"
                required
                rows={5}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9375rem',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                }}
              />
            </div>
            <button type="submit" className="assessment-btn assessment-btn-primary" style={{ alignSelf: 'flex-start' }}>
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
