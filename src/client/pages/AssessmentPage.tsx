import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';

interface Option {
  value: number;
  label: string;
  score: number;
}
interface Question {
  id: number;
  text: string;
  type: string;
  options: Option[];
}
interface ScoreRange {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
  recommendations: string[];
}
interface Assessment {
  slug: string;
  title: string;
  description: string;
  questions: Question[];
  scoring: { ranges: ScoreRange[] };
}

// Animated SVG score ring
function ScoreRing({ score, maxScore, color }: { score: number; maxScore: number; color: string }) {
  const [animated, setAnimated] = useState(0);
  const pct = Math.round((score / maxScore) * 100);
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (animated / 100) * circ;
  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 150);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto 1.5rem' }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>of {maxScore}</span>
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  const { slug } = useParams<{ slug: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [result, setResult] = useState<ScoreRange | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/assessments/${slug}`)
      .then(r => r.json())
      .then(data => {
        setAssessment(data);
        setLoading(false);
        document.title = `${data.title} | Toxic Screens`;
      })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (phase === 'result') {
      fetch('/api/articles?limit=3&status=published')
        .then(r => r.json())
        .then(data => setRelatedArticles(data.articles || []))
        .catch(() => {});
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [phase]);

  const handleAnswer = (questionId: number, score: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: score }));
  };

  const handleNext = () => {
    if (!assessment) return;
    if (currentQ < assessment.questions.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      const score = Object.values(answers).reduce((sum, s) => sum + s, 0);
      setTotalScore(score);
      const range = assessment.scoring.ranges.find(r => score >= r.min && score <= r.max);
      setResult(range || assessment.scoring.ranges[assessment.scoring.ranges.length - 1]);
      setPhase('result');
    }
  };

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ(q => q - 1);
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setAnswers({});
    setPhase('intro');
    setResult(null);
    setTotalScore(0);
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="skeleton" style={{ height: 20, width: '50%', marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 40, marginBottom: 16 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: 'var(--spacing-2xl)' }}>
        <h1>Assessment Not Found</h1>
        <Link to="/assessments" className="assessment-start-btn" style={{ marginTop: 'var(--spacing-lg)', display: 'inline-flex' }}>
          Back to Assessments
        </Link>
      </div>
    );
  }

  const q = assessment.questions[currentQ];
  const progress = (currentQ / assessment.questions.length) * 100;
  const currentAnswer = answers[q?.id];
  const maxScore = assessment.questions.length * 4;
  const shareText = result
    ? `I just took the "${assessment.title}" quiz on Toxic Screens. My result: ${result.label}. Check yours at screentoxic.com`
    : '';

  return (
    <div className="page-content">
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Assessments', href: '/assessments' },
        { label: assessment.title },
      ]} />

      {/* ── INTRO ─────────────────────────────────────────────────── */}
      {phase === 'intro' && (
        <div className="assessment-quiz">
          <div style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--spacing-2xl)',
            color: 'white',
            marginBottom: 'var(--spacing-xl)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>📊</div>
            <h1 style={{ color: 'white', marginBottom: 'var(--spacing-md)', fontSize: '1.75rem' }}>
              {assessment.title}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, maxWidth: 480, margin: '0 auto' }}>
              {assessment.description}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
            {[
              { icon: '❓', label: `${assessment.questions.length} questions` },
              { icon: '⏱', label: `~${Math.ceil(assessment.questions.length / 3)} minutes` },
              { icon: '🔒', label: 'No sign-up required' },
              { icon: '📋', label: 'Personalized results' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg-secondary)',
                padding: '10px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <button
            className="assessment-btn assessment-btn-primary"
            onClick={() => setPhase('quiz')}
            style={{ fontSize: '1rem', padding: '14px 32px' }}
          >
            Start Assessment →
          </button>
        </div>
      )}

      {/* ── QUIZ ──────────────────────────────────────────────────── */}
      {phase === 'quiz' && q && (
        <div className="assessment-quiz">
          <div className="assessment-progress-bar" aria-label="Quiz progress">
            <div
              className="assessment-progress-fill"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          <div className="assessment-question-number">
            Question {currentQ + 1} of {assessment.questions.length}
          </div>

          <div className="assessment-question-text">{q.text}</div>

          <div className="assessment-options" role="radiogroup" aria-label={q.text}>
            {q.options.map(option => (
              <button
                key={option.value}
                className={`assessment-option ${currentAnswer === option.score ? 'selected' : ''}`}
                onClick={() => handleAnswer(q.id, option.score)}
                role="radio"
                aria-checked={currentAnswer === option.score}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="assessment-nav">
            <button
              className="assessment-btn assessment-btn-secondary"
              onClick={handleBack}
              disabled={currentQ === 0}
            >
              ← Back
            </button>
            <button
              className="assessment-btn assessment-btn-primary"
              onClick={handleNext}
              disabled={currentAnswer === undefined}
            >
              {currentQ === assessment.questions.length - 1 ? 'See Results →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* ── RESULTS ───────────────────────────────────────────────── */}
      {phase === 'result' && result && (
        <div ref={resultRef}>
          {/* Hero result card */}
          <div style={{
            background: 'var(--bg-card)',
            border: `2px solid ${result.color}`,
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--spacing-2xl)',
            textAlign: 'center',
            marginBottom: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative background glow */}
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 300, height: 300,
              background: `radial-gradient(circle, ${result.color}15 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />

            {/* Floating emoji confetti */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.5rem' }}
              aria-hidden="true">
              {['🎯', '✨', '📊', '💡', '🌟'].map((e, i) => (
                <span key={i} style={{
                  animation: `float 3s ease-in-out ${i * 0.3}s infinite`,
                  display: 'inline-block',
                }}>{e}</span>
              ))}
            </div>

            <ScoreRing score={totalScore} maxScore={maxScore} color={result.color} />

            <div style={{
              display: 'inline-block',
              background: result.color + '18',
              border: `2px solid ${result.color}40`,
              borderRadius: 50,
              padding: '0.5rem 1.5rem',
              marginBottom: '1rem',
            }}>
              <span style={{ color: result.color, fontWeight: 700, fontSize: '1.1rem' }}>{result.label}</span>
            </div>

            <p style={{
              fontSize: '1.05rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              maxWidth: 520,
              margin: '0 auto 1.5rem',
            }}>
              {result.description}
            </p>

            {/* Score range bar */}
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, marginBottom: 6 }}>
                {assessment.scoring.ranges.map(range => (
                  <div key={range.label} style={{
                    flex: range.max - range.min + 1,
                    background: range.color,
                    opacity: totalScore >= range.min && totalScore <= range.max ? 1 : 0.2,
                    transition: 'opacity 0.5s',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', fontSize: '0.7rem' }}>
                {assessment.scoring.ranges.map(range => (
                  <span key={range.label} style={{
                    flex: range.max - range.min + 1,
                    textAlign: 'center',
                    color: totalScore >= range.min && totalScore <= range.max ? range.color : 'var(--text-muted)',
                    fontWeight: totalScore >= range.min && totalScore <= range.max ? 700 : 400,
                  }}>
                    {range.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action plan */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            marginBottom: '1.5rem',
          }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Your Action Plan</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Based on your answers, here's what we recommend:
            </p>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {result.recommendations.map((rec, i) => (
                <li key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <span style={{
                    flexShrink: 0,
                    width: 28, height: 28,
                    background: result.color,
                    color: '#fff',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700,
                  }}>{i + 1}</span>
                  <span style={{ lineHeight: 1.6, paddingTop: 4 }}>{rec}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Share */}
          <div style={{
            background: 'var(--bg-sidebar)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            <p style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Share your result
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#000', color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
                }}
              >𝕏 Share on X</a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://screentoxic.com/assessments/' + slug)}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  padding: '0.5rem 1.25rem',
                  background: '#1877F2', color: '#fff',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
                }}
              >Facebook</a>
              <button
                onClick={() => navigator.clipboard.writeText(`https://screentoxic.com/assessments/${slug}`).then(() => alert('Link copied!'))}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                }}
              >📋 Copy Link</button>
            </div>
          </div>

          {/* Related articles */}
          {relatedArticles.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Read Next</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {relatedArticles.map(article => (
                  <Link
                    key={article.slug}
                    to={`/articles/${article.slug}`}
                    style={{
                      display: 'block',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = '';
                      (e.currentTarget as HTMLElement).style.boxShadow = '';
                    }}
                  >
                    {article.hero_url && (
                      <img
                        src={article.hero_url}
                        alt={article.title}
                        style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    )}
                    <div style={{ padding: '1rem' }}>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: 'var(--accent)', display: 'block', marginBottom: '0.4rem',
                      }}>{article.category?.replace(/-/g, ' ')}</span>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4, margin: 0 }}>
                        {article.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA row */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="assessment-btn assessment-btn-secondary" onClick={handleRestart}>
              ↺ Retake Assessment
            </button>
            <Link to="/assessments" style={{
              padding: '10px 20px', color: 'var(--text-muted)',
              fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
            }}>
              Other Assessments
            </Link>
            <Link to="/articles" className="assessment-start-btn">
              Browse All Articles →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
