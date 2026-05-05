import React from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function DisclosuresPage() {
  return (
    <div className="page-content">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Disclosures' }]} />
      <div style={{ maxWidth: 'var(--max-content-width)' }}>
        <h1>Disclosures</h1>

        <h2>Affiliate Disclosure (FTC)</h2>
        <p>The Screen Age participates in the Amazon Services LLC Associates Program. This means that when you click on certain product links on this site and make a purchase, we may receive a commission. This comes at no additional cost to you.</p>
        <p>We only recommend products we believe are genuinely useful and relevant to the topics we cover. Our editorial content is independent of our affiliate relationships.</p>
        <p>All affiliate links are marked with "(paid link)" near the link.</p>

        <h2>Medical and Professional Disclaimer</h2>
        <p>The content on The Screen Age is for informational and educational purposes only. Nothing on this site constitutes medical advice, psychological advice, or professional guidance. The assessments on this site are educational tools, not clinical instruments.</p>
        <p>If you have concerns about your child's mental health, behavior, or wellbeing, please consult a qualified healthcare professional.</p>

        <h2>Research Accuracy</h2>
        <p>We strive to accurately represent the research we cite. Science evolves. Where research is contested or preliminary, we say so. We link to primary sources wherever possible.</p>

        <h2>Contact</h2>
        <p>Questions about our disclosures? <a href="/contact">Contact us</a>.</p>
      </div>
    </div>
  );
}
