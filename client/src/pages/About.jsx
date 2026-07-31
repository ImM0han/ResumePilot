import React from 'react';
import { motion } from 'framer-motion';
import { FiTarget, FiShield, FiZap } from 'react-icons/fi';
import Card from '../components/ui/Card.jsx';

const VALUES = [
  { icon: <FiTarget />, title: 'Accuracy First', desc: 'Our ATS scoring is a transparent, weighted algorithm — never a random number.' },
  { icon: <FiShield />, title: 'Truthful AI', desc: 'We never invent experience, companies, or numbers. Only your real story, better told.' },
  { icon: <FiZap />, title: 'Instant & Free', desc: 'No login, no signup, no database. Just paste, upload, and go.' },
];

export default function About() {
  return (
    <div className="page-container py-20">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto mb-16">
        <span className="section-label">About Us</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">Helping job seekers beat the ATS</h1>
        <p className="text-slate-500 mt-4">
          ResumePilot AI was built on a simple idea: everyone deserves a fair shot at getting past
          applicant tracking systems and in front of a real recruiter. We combine deterministic,
          transparent scoring with AI-assisted writing to help you present your true experience in
          the strongest possible way — without ever fabricating your story.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {VALUES.map((v, i) => (
          <Card key={v.title} delay={i * 0.1} className="text-center">
            <div className="w-11 h-11 mx-auto rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 text-white grid place-items-center mb-4 text-lg">
              {v.icon}
            </div>
            <h3 className="font-semibold text-lg mb-2">{v.title}</h3>
            <p className="text-sm text-slate-500">{v.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
