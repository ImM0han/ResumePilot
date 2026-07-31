import React from 'react';
import { Link } from 'react-router-dom';
import { FiZap, FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-white/10 mt-24">
      <div className="page-container py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 font-extrabold text-lg mb-3">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-accent-600 text-white">
              <FiZap size={16} />
            </span>
            ResumePilot AI
          </div>
          <p className="text-sm text-slate-500 max-w-xs">
            Optimize your resume, beat ATS systems, and get more interviews — powered by AI.
          </p>
          <div className="flex gap-3 mt-4 text-slate-400">
            <a href="#" aria-label="GitHub" className="hover:text-brand-600"><FiGithub /></a>
            <a href="#" aria-label="Twitter" className="hover:text-brand-600"><FiTwitter /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-brand-600"><FiLinkedin /></a>
          </div>
        </div>

        <div>
          <h4 className="section-label mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link to="/resume-builder" className="hover:text-brand-600">Resume Builder</Link></li>
            <li><Link to="/resume-optimizer" className="hover:text-brand-600">Resume Optimizer</Link></li>
            <li><Link to="/ats-checker" className="hover:text-brand-600">ATS Checker</Link></li>
            <li><Link to="/recruiter-dashboard" className="hover:text-brand-600">Recruiter Dashboard</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="section-label mb-3">More Tools</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link to="/cover-letter" className="hover:text-brand-600">Cover Letter</Link></li>
            <li><Link to="/interview-prep" className="hover:text-brand-600">Interview Prep</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="section-label mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link to="/about" className="hover:text-brand-600">About</Link></li>
            <li><Link to="/contact" className="hover:text-brand-600">Contact</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-white/10 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ResumePilot AI. All rights reserved.
      </div>
    </footer>
  );
}
