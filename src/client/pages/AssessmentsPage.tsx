import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';

interface Assessment {
  slug: string;
  title: string;
  description: string;
  category: string;
  estimatedMinutes: number;
  questionCount: number;
}

const ICONS: Record<string, string> = {
  'screen-time-health-check': '📊',
  'social-media-readiness': '📱',
  'family-tech-balance': '🏠',
};

const COLORS: Record<string, string> = {
  'screen-time-health-check': '#3A6E9C',
  'social-media-readiness': '#5B8DB8',
  'family-tech-balance': '#2C5A82',
};

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/assessments')
      .then(r => r.json())
      .then(data => {
        setAssessments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="page-content">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Assessments' }]} />

      <div className="page-header">
        <div className="page-header-eyebrow">Free Tools</div>
        <h1 className="page-header-title">Assessments</h1>
        <p className="page-header-description">
          Research-based assessments to help you understand your family's relationship with technology. No email, no sign-up, no judgment.
        </p>
      </div>

      {/* Why Assessments */}
      <div style={{
        background: 'var(--accent-light)',
        border: '1px solid var(--accent-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-xl)',
        display: 'flex',
        gap: 'var(--spacing-md)',
        alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>💡</span>
        <div>
          <strong style={{ display: 'block', marginBottom: 4 }}>How these work</strong>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', margin: 0 }}>
            Each assessment is built on published research. Your answers generate a score with specific, actionable recommendations. There's no "bad" result — only information you can use.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 32 }}>
              <div className="skeleton" style={{ height: 48, width: 48, borderRadius: 8, marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 24, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 60, marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 40, width: 160 }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {assessments.map(assessment => (
            <Link
              key={assessment.slug}
              to={`/assessments/${assessment.slug}`}
              className="assessment-card"
              style={{ borderTop: `4px solid ${COLORS[assessment.slug] || 'var(--accent)'}` }}
            >
              <div className="assessment-card-icon">{ICONS[assessment.slug] || '📋'}</div>
              <div className="assessment-card-title">{assessment.title}</div>
              <p className="assessment-card-description">{assessment.description}</p>
              <div className="assessment-card-meta">
                <span>⏱ {assessment.estimatedMinutes} min</span>
                <span>· {assessment.questionCount} questions</span>
                <span>· Free</span>
              </div>
              <div className="assessment-start-btn">Start →</div>
            </Link>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop: 'var(--spacing-2xl)',
        padding: 'var(--spacing-lg)',
        background: 'var(--bg-sidebar)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        lineHeight: 1.6,
      }}>
        <strong>Note:</strong> These assessments are educational tools, not clinical instruments. They're designed to help you reflect and identify areas for attention, not to diagnose conditions. If you have serious concerns about your child's wellbeing, please consult a pediatrician or mental health professional.
      </div>
    </div>
  );
}
