import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiZap, FiTarget, FiFileText, FiBarChart2, FiMail, FiMessageSquare,
  FiCheckCircle, FiArrowRight, FiChevronDown, FiUpload, FiSearch, FiDownload,
} from 'react-icons/fi';
import Card from '../components/ui/Card.jsx';
import CircularProgress from '../components/ui/CircularProgress.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import Chip from '../components/ui/Chip.jsx';
import Slide from '../components/ui/Slide.jsx';
import SlideDots from '../components/ui/SlideDots.jsx';

const FEATURES = [
  { icon: <FiFileText />, title: 'ATS Resume Builder', desc: 'Generate a fully ATS-friendly resume tailored to any job description in seconds.' },
  { icon: <FiZap />, title: 'Resume Optimizer', desc: 'Upload your existing resume and let AI rewrite weak sections without inventing facts.' },
  { icon: <FiTarget />, title: 'ATS Score Checker', desc: 'Get a real, algorithm-based ATS score — not a random number.' },
  { icon: <FiBarChart2 />, title: 'Recruiter Dashboard', desc: 'See your resume the way recruiters and ATS systems do, with a full breakdown.' },
  { icon: <FiMail />, title: 'Cover Letter Generator', desc: 'Create a tailored, professional cover letter grounded in your real resume.' },
  { icon: <FiMessageSquare />, title: 'Interview Prep', desc: 'Practice with likely HR, technical, and behavioral questions with sample answers.' },
];

const STEPS = [
  { icon: <FiUpload />, title: 'Paste JD or Upload Resume', desc: 'Paste a job description, or upload your existing PDF/DOCX resume.' },
  { icon: <FiSearch />, title: 'AI Analyzes Everything', desc: 'Our engine extracts keywords, checks formatting, and scores your resume.' },
  { icon: <FiDownload />, title: 'Download & Apply', desc: 'Export your optimized, ATS-ready resume as PDF, DOCX, or TXT.' },
];

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Software Engineer', quote: 'My interview callbacks doubled after using the optimizer. The keyword suggestions were spot on.' },
  { name: 'Daniel Ortiz', role: 'Product Manager', quote: 'The recruiter dashboard view helped me understand exactly what was missing from my resume.' },
  { name: 'Aisha Khan', role: 'Data Analyst', quote: 'Clean, fast, and the ATS score actually felt accurate compared to other tools I tried.' },
];

const FAQS = [
  { q: 'Is ResumePilot AI free to use?', a: 'Yes — all core features including the resume builder, optimizer, ATS checker, and recruiter dashboard are free to use.' },
  { q: 'Do I need to sign up?', a: 'No. There is no login, signup, or database required. Everything works instantly in your browser session.' },
  { q: 'Will the AI invent experience I don\u2019t have?', a: 'Never. Our AI rules strictly forbid inventing companies, projects, dates, or numbers — it only improves wording and structure.' },
  { q: 'How is the ATS score calculated?', a: 'Using a fixed, transparent weighted algorithm across keyword match, skills, experience, formatting, grammar, and more — not a random number.' },
];

const SLIDES = [
  { id: 'hero', label: 'Home' },
  { id: 'trusted', label: 'Trusted By' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'ats-preview', label: 'ATS Preview' },
  { id: 'recruiter-preview', label: 'Dashboard' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
  { id: 'cta', label: 'Get Started' },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null);

  // Scope scroll-snap to the Landing page only, so other routes keep normal scrolling.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('snap-y', 'snap-proximity', 'scroll-smooth');
    return () => root.classList.remove('snap-y', 'snap-proximity', 'scroll-smooth');
  }, []);

  return (
    <div className="relative">
      <SlideDots sections={SLIDES} />

      {/* HERO */}
      <Slide id="hero" className="overflow-hidden bg-grid-pattern text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/60 via-white to-white dark:from-brand-950/20 dark:via-surface-dark dark:to-surface-dark -z-10" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-float -z-10" />
        <div className="absolute top-40 -left-24 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl animate-float -z-10" style={{ animationDelay: '2s' }} />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs font-medium text-brand-600 dark:text-brand-300 mb-6"
        >
          <FiZap size={14} /> AI-Powered Resume Optimization
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight"
        >
          Optimize Your Resume.{' '}
          <span className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">
            Beat ATS.
          </span>{' '}
          Get More Interviews.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto"
        >
          ResumePilot AI builds, optimizes, and scores your resume against real job descriptions —
          no login, no signup, no database. Just results.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/resume-builder" className="btn-primary text-base !px-7 !py-3.5">
            Build My Resume <FiArrowRight />
          </Link>
          <Link to="/ats-checker" className="btn-secondary text-base !px-7 !py-3.5">
            Check My ATS Score
          </Link>
        </motion.div>

        <p className="mt-6 text-xs text-slate-400">No credit card. No account required. 100% free.</p>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-400"
        >
          <FiChevronDown size={22} />
        </motion.div>
      </Slide>

      {/* TRUSTED BY */}
      <Slide id="trusted" className="border-y border-slate-100 dark:border-white/5">
        <p className="text-center text-xs uppercase tracking-widest text-slate-400 mb-6">
          Trusted by job seekers targeting top companies
        </p>
        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 opacity-60 text-lg font-bold text-slate-400">
          <span>Google</span><span>Amazon</span><span>Microsoft</span><span>Netflix</span><span>Stripe</span><span>Meta</span>
        </div>
      </Slide>

      {/* FEATURES */}
      <Slide id="features">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="section-label">Features</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">Everything you need to land the interview</h2>
          <p className="text-slate-500 mt-4">A complete AI resume toolkit — from writing to scoring to interview prep.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <Card key={f.title} hover delay={i * 0.05}>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 text-white grid place-items-center mb-4 text-lg">
                {f.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </Card>
          ))}
        </div>
      </Slide>

      {/* HOW IT WORKS */}
      <Slide id="how-it-works">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="section-label">How it works</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">Three steps to a better resume</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <Card key={s.title} delay={i * 0.1} className="text-center relative">
              <div className="w-12 h-12 mx-auto rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 grid place-items-center text-xl mb-4">
                {s.icon}
              </div>
              <div className="absolute top-6 left-6 text-xs font-bold text-slate-300">0{i + 1}</div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500">{s.desc}</p>
            </Card>
          ))}
        </div>
      </Slide>

      {/* ATS PREVIEW */}
      <Slide id="ats-preview">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="section-label">ATS Score Preview</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4">
              See exactly how ATS systems read your resume
            </h2>
            <p className="text-slate-500 mb-6">
              Our scoring algorithm weighs keyword match, skills, experience, formatting, grammar, and more —
              giving you a transparent, real score instead of a guess.
            </p>
            <ul className="space-y-3">
              {['Keyword Match Analysis', 'Skills Gap Detection', 'Formatting & Grammar Checks'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <FiCheckCircle className="text-emerald-500" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <Card className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-8">
              <CircularProgress value={87} label="ATS Score" />
              <div className="flex-1 space-y-4 w-full">
                <ProgressBar label="Keyword Match" value={82} />
                <ProgressBar label="Skills Match" value={75} />
                <ProgressBar label="Formatting" value={94} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full">
              <Chip variant="green">React.js</Chip>
              <Chip variant="green">Node.js</Chip>
              <Chip variant="red">Kubernetes</Chip>
              <Chip variant="red">GraphQL</Chip>
            </div>
          </Card>
        </div>
      </Slide>

      {/* RECRUITER DASHBOARD PREVIEW */}
      <Slide id="recruiter-preview">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="section-label">Recruiter Dashboard</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">A recruiter's-eye view of your resume</h2>
          <p className="text-slate-500 mt-4">Understand your resume the same way hiring teams and ATS software do.</p>
        </div>
        <Card className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'ATS Score', value: '87/100' },
            { label: 'Resume Match', value: '91%' },
            { label: 'Est. Interview Chance', value: '78%' },
            { label: 'Resume Quality', value: 'Excellent' },
          ].map((m) => (
            <div key={m.label} className="text-center p-4">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">{m.value}</div>
              <div className="text-xs text-slate-400 mt-1">{m.label}</div>
            </div>
          ))}
        </Card>
      </Slide>

      {/* TESTIMONIALS */}
      <Slide id="testimonials">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="section-label">Testimonials</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">Loved by job seekers everywhere</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <Card key={t.name} delay={i * 0.1}>
              <div className="flex items-center gap-1 text-amber-400 mb-3">{'★★★★★'}</div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white grid place-items-center text-xs font-bold">
                  {t.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Slide>

      {/* PRICING */}
      <Slide id="pricing">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="section-label">Pricing</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">Simple. Free. No catch.</h2>
        </div>
        <Card className="max-w-md mx-auto text-center border-2 !border-brand-300 dark:!border-brand-500/40">
          <h3 className="text-lg font-semibold text-brand-600">Free Forever</h3>
          <div className="text-5xl font-extrabold my-4">$0</div>
          <ul className="space-y-2 text-sm text-slate-500 mb-6">
            {['Unlimited resume builds', 'Unlimited ATS checks', 'Cover letters & interview prep', 'PDF, DOCX & TXT export'].map((f) => (
              <li key={f} className="flex items-center justify-center gap-2">
                <FiCheckCircle className="text-emerald-500" /> {f}
              </li>
            ))}
          </ul>
          <Link to="/resume-builder" className="btn-primary w-full">Get Started Free</Link>
        </Card>
      </Slide>

      {/* FAQ */}
      <Slide id="faq" innerClassName="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="section-label">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="glass-card overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 text-left font-medium"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {f.q}
                <FiChevronDown className={`transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && <div className="px-5 pb-5 text-sm text-slate-500">{f.a}</div>}
            </div>
          ))}
        </div>
      </Slide>

      {/* FINAL CTA */}
      <Slide id="cta">
        <Card className="text-center bg-gradient-to-br from-brand-600 to-accent-600 !border-0 py-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to beat the ATS?</h2>
          <p className="text-brand-100 mb-8 max-w-lg mx-auto">
            Build or optimize your resume in minutes — completely free, no signup required.
          </p>
          <Link to="/resume-builder" className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-7 py-3.5 rounded-xl hover:scale-[1.02] transition-transform">
            Start Now <FiArrowRight />
          </Link>
        </Card>
      </Slide>
    </div>
  );
}
