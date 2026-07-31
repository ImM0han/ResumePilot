import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FiMenu, FiX, FiMoon, FiSun, FiZap } from 'react-icons/fi';
import RecentActivityMenu from './RecentActivityMenu.jsx';
import InstallAppButton from '../InstallAppButton';

const LINKS = [
  { to: '/resume-builder', label: 'Builder' },
  { to: '/resume-optimizer', label: 'Optimizer' },
  { to: '/ats-checker', label: 'ATS Checker' },
  { to: '/recruiter-dashboard', label: 'Dashboard' },
  { to: '/cover-letter', label: 'Cover Letter' },
  { to: '/interview-prep', label: 'Interview Prep' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl">
      <nav className="page-container flex items-center justify-between h-16">

        {/* Logo */}
        <NavLink
          to="/"
          className="flex items-center gap-2 font-extrabold text-lg"
        >
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-accent-600 text-white">
            <FiZap size={16} />
          </span>

          <span>
            ResumePilot <span className="text-brand-600">AI</span>
          </span>
        </NavLink>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-brand-600 bg-brand-50 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-300'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">

          {/* Recent Activity */}
          <RecentActivityMenu />

          {/* Dark Mode */}
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 dark:text-slate-300"
          >
            {dark ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>

          {/* Get App */}
          <div className="hidden sm:block">
            <InstallAppButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation menu"
          >
            {open ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {open && (
        <div className="lg:hidden border-t border-slate-200 dark:border-white/10 px-4 py-3 space-y-2 bg-white dark:bg-surface-dark">

          {/* Navigation Links */}
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'text-brand-600 bg-brand-50 dark:bg-brand-500/10'
                    : 'text-slate-600 dark:text-slate-300'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          {/* Mobile Get App */}
          <div className="pt-2">
            <InstallAppButton />
          </div>
        </div>
      )}
    </header>
  );
}