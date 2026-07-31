import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiChevronDown, FiClock } from 'react-icons/fi';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { generateInterviewPrep } from '../services/api.js';
import { saveActivity, ACTIVITY_TYPES, timeAgo } from '../utils/recentActivity.js';

const CATEGORY_LABELS = {
  hr: 'HR Questions',
  technical: 'Technical Questions',
  behavioral: 'Behavioral Questions',
  project: 'Project Questions',
  company: 'Company Questions',
};

function QuestionAccordion({ question, sampleAnswer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
      <button className="w-full flex items-center justify-between p-4 text-left text-sm font-medium" onClick={() => setOpen((o) => !o)}>
        {question}
        <FiChevronDown className={`transition-transform shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 text-sm text-slate-500">{sampleAnswer}</div>}
    </div>
  );
}

export default function InterviewPrep() {
  const toast = useToast();
  const location = useLocation();
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [restoredFrom, setRestoredFrom] = useState(null);

  useEffect(() => {
    const restored = location.state?.restoredActivity;
    if (restored?.data) {
      setResumeText(restored.data.resumeText || '');
      setJobDescription(restored.data.jobDescription || '');
      setCompany(restored.data.company || '');
      setRole(restored.data.role || '');
      setResult(restored.data.result || null);
      setRestoredFrom(restored.timestamp);
      toast.info(`Restored interview prep from ${timeAgo(restored.timestamp)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!resumeText.trim()) return toast.error('Please paste your resume content.');
    if (!jobDescription.trim()) return toast.error('Please paste the job description.');
    setLoading(true);
    setResult(null);
    setRestoredFrom(null);
    try {
      const res = await generateInterviewPrep({ resumeText, jobDescription, company, role });
      setResult(res.data);
      toast.success('Interview questions generated!');
      saveActivity({
        type: ACTIVITY_TYPES.INTERVIEW,
        summary: `${role || 'Role'} at ${company || 'Company'}`,
        data: { resumeText, jobDescription, company, role, result: res.data },
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container py-16">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto mb-12">
        <span className="section-label">Interview Preparation</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">Practice with likely interview questions</h1>
        <p className="text-slate-500 mt-3">HR, technical, behavioral, project, and company questions — with sample answers.</p>
      </motion.div>

      <Card className="max-w-3xl mx-auto mb-10 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <input className="input-field" placeholder="Company Name" value={company} onChange={(e) => setCompany(e.target.value)} />
          <input className="input-field" placeholder="Role Title" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <textarea className="input-field min-h-[130px]" placeholder="Paste your resume content..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
        <textarea className="input-field min-h-[130px]" placeholder="Paste the job description..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
        <Button className="w-full" icon={<FiMessageSquare />} loading={loading} onClick={handleSubmit}>
          Generate Interview Questions
        </Button>
      </Card>

      {loading && <Card className="max-w-3xl mx-auto"><Skeleton rows={8} /></Card>}

      {!loading && result && (
        <div className="max-w-4xl mx-auto space-y-8">
          {restoredFrom && (
            <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
              <FiClock size={12} /> Restored from {timeAgo(restoredFrom)}
            </p>
          )}
          {Object.entries(CATEGORY_LABELS).map(([key, label]) =>
            result[key]?.length ? (
              <Card key={key}>
                <h3 className="font-semibold text-lg mb-4">{label}</h3>
                <div className="space-y-3">
                  {result[key].map((q, i) => (
                    <QuestionAccordion key={i} question={q.question} sampleAnswer={q.sampleAnswer} />
                  ))}
                </div>
              </Card>
            ) : null
          )}
          {result.note && <p className="text-xs text-slate-400 text-center">{result.note}</p>}
        </div>
      )}
    </div>
  );
}
