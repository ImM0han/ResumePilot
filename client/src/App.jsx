import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const ResumeBuilder = lazy(() => import('./pages/ResumeBuilder.jsx'));
const ResumeOptimizer = lazy(() => import('./pages/ResumeOptimizer.jsx'));
const ATSChecker = lazy(() => import('./pages/ATSChecker.jsx'));
const RecruiterDashboard = lazy(() => import('./pages/RecruiterDashboard.jsx'));
const CoverLetter = lazy(() => import('./pages/CoverLetter.jsx'));
const InterviewPrep = lazy(() => import('./pages/InterviewPrep.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/resume-builder" element={<ResumeBuilder />} />
              <Route path="/resume-optimizer" element={<ResumeOptimizer />} />
              <Route path="/ats-checker" element={<ATSChecker />} />
              <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
              <Route path="/cover-letter" element={<CoverLetter />} />
              <Route path="/interview-prep" element={<InterviewPrep />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
