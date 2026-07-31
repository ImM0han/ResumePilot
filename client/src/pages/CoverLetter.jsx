import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiCopy, FiClock } from 'react-icons/fi';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { generateCoverLetter } from '../services/api.js';
import { saveActivity, ACTIVITY_TYPES, timeAgo } from '../utils/recentActivity.js';

export default function CoverLetter() {
  const toast = useToast();
  const location = useLocation();
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState('');
  const [restoredFrom, setRestoredFrom] = useState(null);

  useEffect(() => {
    const restored = location.state?.restoredActivity;
    if (restored?.data) {
      setResumeText(restored.data.resumeText || '');
      setJobDescription(restored.data.jobDescription || '');
      setCompany(restored.data.company || '');
      setRole(restored.data.role || '');
      setLetter(restored.data.letter || '');
      setRestoredFrom(restored.timestamp);
      toast.info(`Restored cover letter from ${timeAgo(restored.timestamp)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!resumeText.trim()) return toast.error('Please paste your resume content.');
    if (!jobDescription.trim()) return toast.error('Please paste the job description.');
    setLoading(true);
    setLetter('');
    setRestoredFrom(null);
    try {
      const res = await generateCoverLetter({ resumeText, jobDescription, company, role });
      setLetter(res.data.coverLetter);
      toast.success('Cover letter generated!');
      saveActivity({
        type: ACTIVITY_TYPES.COVER_LETTER,
        summary: `${role || 'Role'} at ${company || 'Company'}`,
        data: { resumeText, jobDescription, company, role, letter: res.data.coverLetter },
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letter);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="page-container py-16">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto mb-12">
        <span className="section-label">Cover Letter Generator</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">Write a tailored cover letter</h1>
        <p className="text-slate-500 mt-3">Grounded in your real resume — no invented experience.</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <input className="input-field" placeholder="Company Name" value={company} onChange={(e) => setCompany(e.target.value)} />
            <input className="input-field" placeholder="Role Title" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Your Resume (paste text)</label>
            <textarea className="input-field min-h-[160px]" placeholder="Paste your resume content..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Job Description</label>
            <textarea className="input-field min-h-[160px]" placeholder="Paste the job description..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
          </div>
          <Button className="w-full" icon={<FiMail />} loading={loading} onClick={handleSubmit}>
            Generate Cover Letter
          </Button>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-lg">Your Cover Letter</h3>
            {letter && (
              <Button variant="secondary" icon={<FiCopy />} onClick={handleCopy} className="!px-3 !py-1.5 text-xs">
                Copy
              </Button>
            )}
          </div>
          {restoredFrom && (
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
              <FiClock size={12} /> Restored from {timeAgo(restoredFrom)}
            </p>
          )}
          {loading && <Skeleton rows={10} />}
          {!loading && !letter && <p className="text-sm text-slate-400">Your generated cover letter will appear here.</p>}
          {!loading && letter && (
            <pre className="whitespace-pre-wrap text-sm bg-slate-50 dark:bg-white/5 rounded-xl p-4 max-h-[520px] overflow-y-auto font-sans">
              {letter}
            </pre>
          )}
        </Card>
      </div>
    </div>
  );
}
