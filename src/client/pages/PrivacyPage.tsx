import React from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs';

export default function PrivacyPage() {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <div className="page-content">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Privacy Policy' }]} />
      <div style={{ maxWidth: 'var(--max-content-width)' }}>
        <h1>Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-xl)' }}>Last updated: {today}</p>

        <h2>Information We Collect</h2>
        <p>Toxic Screens does not collect personal information unless you voluntarily provide it through our contact form. We do not require account creation or email sign-up to use any feature of this site, including assessments.</p>

        <h2>Analytics</h2>
        <p>We may use privacy-respecting analytics to understand how visitors use the site. This data is aggregated and anonymous. No personally identifiable information is collected.</p>

        <h2>Cookies</h2>
        <p>This site uses minimal cookies necessary for basic site functionality. We do not use advertising cookies or tracking pixels.</p>

        <h2>Amazon Associates Disclosure</h2>
        <p>Toxic Screens is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com. When you click an Amazon affiliate link and make a purchase, we may earn a small commission at no additional cost to you.</p>
        <p>All product recommendations are independent. We only recommend products we believe are genuinely useful.</p>

        <h2>Medical Disclaimer</h2>
        <p>The content on Toxic Screens is for informational and educational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition or your child's wellbeing.</p>

        <h2>Children's Privacy</h2>
        <p>Toxic Screens does not knowingly collect personal information from children under 13. This site is designed for parents and caregivers.</p>

        <h2>Contact</h2>
        <p>Questions about this privacy policy? Use our <a href="/contact">contact page</a>.</p>
      </div>
    </div>
  );
}
