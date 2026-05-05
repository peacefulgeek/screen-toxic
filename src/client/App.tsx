import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import './styles/tokens.css';
import './styles/global.css';

const HomePage = lazy(() => import('./pages/HomePage'));
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'));
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const AssessmentsPage = lazy(() => import('./pages/AssessmentsPage'));
const AssessmentPage = lazy(() => import('./pages/AssessmentPage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const DisclosuresPage = lazy(() => import('./pages/DisclosuresPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function LoadingFallback() {
  return (
    <div className="loading-fallback" aria-label="Loading page">
      <div className="loading-spinner" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DashboardLayout>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/articles" element={<ArticlesPage />} />
            <Route path="/articles/:slug" element={<ArticlePage />} />
            <Route path="/assessments" element={<AssessmentsPage />} />
            <Route path="/assessments/:slug" element={<AssessmentPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/disclosures" element={<DisclosuresPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </BrowserRouter>
  );
}
