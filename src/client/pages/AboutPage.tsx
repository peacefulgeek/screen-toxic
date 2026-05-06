import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function AboutPage() {
  return (
    <div className="page-content">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} />

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a3a5c 0%, #3A6E9C 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--spacing-2xl)',
        color: 'white',
        marginBottom: 'var(--spacing-2xl)',
        display: 'flex',
        gap: 'var(--spacing-xl)',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <img
          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80"
          alt="The Oracle Lover"
          style={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid rgba(255,255,255,0.3)',
            flexShrink: 0,
          }}
        />
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
            About Toxic Screens
          </div>
          <h1 style={{ color: 'white', marginBottom: 8, fontSize: '2rem' }}>The Oracle Lover</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', margin: 0 }}>
            Intuitive Educator & Oracle Guide
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 'var(--max-content-width)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>About This Site</h2>
        <p>
          Toxic Screens exists because the conversation about kids and technology is broken. On one side, you have moral panic — every new study becomes a headline about how screens are destroying a generation. On the other side, you have dismissal — "kids have always had new technology, stop worrying."
        </p>
        <p>
          Neither position is useful. The research is messier than the headlines suggest. Some findings are strong. Some are contested. Some are genuinely alarming. Some are overblown. Parents deserve to know the difference.
        </p>
        <p>
          Screen time isn't the variable. What children are doing on screens is. Parental modeling is the most underrated variable in this whole conversation. And banning doesn't work. This does.
        </p>

        <h2 style={{ marginTop: 'var(--spacing-xl)', marginBottom: 'var(--spacing-md)' }}>About The Oracle Lover</h2>
        <p>
          I'm the no-BS oracle reader who also has a science degree. I distinguish between strong evidence and moral panic, and I give parents tools that are practical and calibrated.
        </p>
        <p>
          My approach: read the actual studies, not the press releases. Talk to the researchers, not just the journalists. And give you the calibrated truth — including what we don't know yet.
        </p>
        <p>
          The researchers I draw on most: Jonathan Haidt, Jean Twenge PhD, Jenny Radesky MD, Nicholas Carr, Devorah Heitner, Andy Crouch, and the American Academy of Pediatrics. Plus Carl Jung and Joseph Campbell, because the archetype of the machine is older than the iPhone.
        </p>

        <div style={{
          background: 'var(--bg-sidebar)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          marginTop: 'var(--spacing-xl)',
          marginBottom: 'var(--spacing-xl)',
        }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)' }}>What I believe</h3>
          <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
            <li style={{ marginBottom: 8 }}>The research is messier than the headlines suggest.</li>
            <li style={{ marginBottom: 8 }}>Screen time isn't the variable. What children are doing on screens is.</li>
            <li style={{ marginBottom: 8 }}>Here's what we know for sure. Here's what we don't.</li>
            <li style={{ marginBottom: 8 }}>Parental modeling is the most underrated variable in this whole conversation.</li>
            <li style={{ marginBottom: 8 }}>Banning doesn't work. This does.</li>
          </ul>
        </div>

        <h2 style={{ marginBottom: 'var(--spacing-md)' }}>The Oracle Lover Network</h2>
        <p>
          Toxic Screens is part of The Oracle Lover's broader work on intuitive education and practical wisdom. For more, visit{' '}
          <a href="https://theoraclelover.com" target="_blank" rel="noopener noreferrer">
            theoraclelover.com
          </a>.
        </p>

        <div style={{ marginTop: 'var(--spacing-xl)', display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <Link to="/articles" className="assessment-start-btn">Browse Articles</Link>
          <Link to="/assessments" className="assessment-start-btn" style={{ background: 'var(--bg-sidebar)', color: 'var(--accent)', border: '1px solid var(--accent-soft)' }}>
            Take an Assessment
          </Link>
        </div>
      </div>
    </div>
  );
}
