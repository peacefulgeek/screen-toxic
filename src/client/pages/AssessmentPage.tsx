import React, { useEffect, useState } from 'react';
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

export default function AssessmentPage() {
  const { slug } = useParams<{ slug: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [result, setResult] = useState<ScoreRange | null>(null);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/assessments/${slug}`)
      .then(r => r.json())
      .then(data => {
        setAssessment(data);
        setLoading(false);
        document.title = `${data.title} | The Screen Age`;
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const handleAnswer = (questionId: number, score: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: score }));
  };

  const handleNext = () => {
    if (!assessment) return;
    if (currentQ < assessment.questions.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      // Calculate result
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
  const progress = ((currentQ) / assessment.questions.length) * 100;
  const currentAnswer = answers[q?.id];

  return (
    <div className="page-content">
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Assessments', href: '/assessments' },
        { label: assessment.title },
      ]} />

      {/* Intro Phase */}
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

          <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
            {[
              { icon: '❓', label: `${assessment.questions.length} questions` },
              { icon: '⏱', label: `~${Math.ceil(assessment.questions.length / 3)} minutes` },
              { icon: '🔒', label: 'No sign-up required' },
              { icon: '📋', label: 'Personalized results' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
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

      {/* Quiz Phase */}
      {phase === 'quiz' && q && (
        <div className="assessment-quiz">
          {/* Progress */}
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

      {/* Result Phase */}
      {phase === 'result' && result && (
        <div className="assessment-quiz">
          <div className="assessment-result">
            <div
              className="assessment-result-score"
              style={{ color: result.color }}
            >
              {totalScore}
            </div>
            <div
              className="assessment-result-label"
              style={{ color: result.color }}
            >
              {result.label}
            </div>
            <p className="assessment-result-description">{result.description}</p>
          </div>

          <div className="assessment-recommendations">
            <h3>What to do next</h3>
            <ul>
              {result.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          {/* Score breakdown */}
          <div style={{
            background: 'var(--bg-sidebar)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--spacing-lg)',
            marginBottom: 'var(--spacing-xl)',
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>
              Score breakdown
            </div>
            <div style={{ display: 'flex', gap: 4, height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--border)' }}>
              {assessment.scoring.ranges.map(range => (
                <div
                  key={range.label}
                  style={{
                    flex: range.max - range.min + 1,
                    background: range.color,
                    opacity: totalScore >= range.min && totalScore <= range.max ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {assessment.scoring.ranges.map(range => (
                <span key={range.label}>{range.label}</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <button
              className="assessment-btn assessment-btn-secondary"
              onClick={handleRestart}
            >
              ↺ Retake Assessment
            </button>
            <Link to="/articles" className="assessment-start-btn">
              Read Related Articles →
            </Link>
            <Link to="/assessments" style={{ padding: '10px 20px', color: 'var(--text-muted)', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center' }}>
              Other Assessments
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
