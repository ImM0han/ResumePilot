import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFileText, FiDownload, FiCheckCircle, FiClock } from 'react-icons/fi';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Chip from '../components/ui/Chip.jsx';
import CircularProgress from '../components/ui/CircularProgress.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { buildResume, exportResume } from '../services/api.js';
import { saveActivity, ACTIVITY_TYPES, timeAgo } from '../utils/recentActivity.js';

const BREAKDOWN_LABELS = {
  keywordMatch: 'Keyword Match', skillsMatch: 'Skills Match', experience: 'Experience',
  projects: 'Projects', education: 'Education', formatting: 'Formatting', grammar: 'Grammar',
};

const FIELDS = [
  { name: 'name', label: 'Full Name', required: true },
  { name: 'email', label: 'Email', required: true },
  { name: 'phone', label: 'Phone' },
  { name: 'location', label: 'Location' },
  { name: 'linkedin', label: 'LinkedIn URL' },
  { name: 'github', label: 'GitHub URL' },
  { name: 'portfolio', label: 'Portfolio URL' },
];

const TEXTAREAS = [
  { name: 'education', label: 'Education' },
  { name: 'experience', label: 'Experience' },
  { name: 'projects', label: 'Projects' },
  { name: 'skills', label: 'Skills (comma separated)' },
  { name: 'achievements', label: 'Achievements' },
  { name: 'certifications', label: 'Certifications' },
  { name: 'languages', label: 'Languages' },
];

const initialState = Object.fromEntries([...FIELDS, ...TEXTAREAS].map((f) => [f.name, '']));

export default function ResumeBuilder() {
  const toast = useToast();
  const location = useLocation();
  const [jobDescription, setJobDescription] = useState('');
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [restoredFrom, setRestoredFrom] = useState(null);

  // If the user got here via the Recent Activity menu, restore the previous
  // form + generated resume instantly instead of showing a blank page.
  useEffect(() => {
    const restored = location.state?.restoredActivity;
    if (restored?.data) {
      setJobDescription(restored.data.jobDescription || '');
      setForm(restored.data.form || initialState);
      setResult(restored.data.result || null);
      setRestoredFrom(restored.timestamp);
      toast.info(`Restored resume from ${timeAgo(restored.timestamp)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and Email are required.');
      return;
    }
    setLoading(true);
    setResult(null);
    setRestoredFrom(null);
    try {
      const res = await buildResume({ jobDescription, ...form });
      setResult(res.data);
      toast.success('Resume generated successfully!');
      saveActivity({
        type: ACTIVITY_TYPES.BUILD,
        summary: `${form.name || 'Untitled'} — Score ${res.data.atsPreview?.score ?? '—'}/100`,
        data: { jobDescription, form, result: res.data },
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      await exportResume({ resumeText: result.resumeText, format });
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-container py-16">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto mb-12">
        <span className="section-label">Resume Builder</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">Build an ATS-friendly resume from scratch</h1>
        <p className="text-slate-500 mt-3">Paste a job description and fill in your details — we'll write a tailored, professional resume.</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        <Card as="form" onSubmit={handleSubmit}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Job Description</label>
              <textarea
                className="input-field min-h-[110px]"
                placeholder="Paste the target job description here..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {FIELDS.map((f) => (
                <div key={f.name}>
                  <label className="text-sm font-medium mb-1.5 block">
                    {f.label} {f.required && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    className="input-field"
                    name={f.name}
                    value={form[f.name]}
                    onChange={handleChange}
                    required={f.required}
                  />
                </div>
              ))}
            </div>

            {TEXTAREAS.map((f) => (
              <div key={f.name}>
                <label className="text-sm font-medium mb-1.5 block">{f.label}</label>
                <textarea
                  className="input-field min-h-[80px]"
                  name={f.name}
                  value={form[f.name]}
                  onChange={handleChange}
                />
              </div>
            ))}

            <Button type="submit" loading={loading} icon={<FiFileText />} className="w-full">
              Generate Resume
            </Button>
          </form>
        </Card>

        <Card>
          <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
            <FiCheckCircle className="text-brand-600" /> Generated Resume
          </h3>
          {restoredFrom && (
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
              <FiClock size={12} /> Restored from {timeAgo(restoredFrom)}
            </p>
          )}
          {loading && <Skeleton rows={10} />}
          {!loading && !result && (
            <p className="text-sm text-slate-400">Your generated resume will appear here.</p>
          )}
          {!loading && result && (
            <>
              {result.atsPreview && (
                <div className="mb-4 flex items-center gap-3 text-sm">
                  <span className="px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 font-semibold">
                    ATS Score: {result.atsPreview.score}/100 ({result.atsPreview.quality})
                  </span>
                </div>
              )}
              <pre className="whitespace-pre-wrap text-sm bg-slate-50 dark:bg-white/5 rounded-xl p-4 max-h-[500px] overflow-y-auto font-sans">
                {result.resumeText}
              </pre>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button variant="secondary" icon={<FiDownload />} onClick={() => handleExport('pdf')}>PDF</Button>
                <Button variant="secondary" icon={<FiDownload />} onClick={() => handleExport('docx')}>DOCX</Button>
                <Button variant="secondary" icon={<FiDownload />} onClick={() => handleExport('txt')}>TXT</Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {!loading && result?.atsPreview?.breakdown && (
        <div className="max-w-5xl mx-auto mt-8 space-y-6">
          <Card className="grid md:grid-cols-2 gap-8 items-center">
            <div className="flex justify-center">
              <CircularProgress
                value={result.atsPreview.score}
                size={140}
                strokeWidth={11}
                label={`Quality: ${result.atsPreview.quality}`}
              />
            </div>
            <div className="space-y-3">
              {Object.entries(result.atsPreview.breakdown).map(([key, val]) => (
                <ProgressBar key={key} label={`${BREAKDOWN_LABELS[key]} (${val.weight}%)`} value={val.score} />
              ))}
            </div>
          </Card>

          {(result.atsPreview.keywordAnalysis?.criticalMissing?.length > 0 ||
            result.atsPreview.keywordAnalysis?.missing?.length > 0) && (
            <Card>
              <h3 className="font-semibold mb-3">Keyword Suggestions</h3>
              <p className="text-xs text-slate-400 mb-3">
                These appear in the job description but weren't detected in your resume. Only add them if genuinely
                applicable to you — the builder never invents experience.
              </p>
              {result.atsPreview.keywordAnalysis.criticalMissing?.length > 0 && (
                <>
                  <p className="text-xs font-medium text-rose-500 mb-2">Critical (likely required)</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {result.atsPreview.keywordAnalysis.criticalMissing.map((k) => (
                      <Chip key={k} variant="red">{k}</Chip>
                    ))}
                  </div>
                </>
              )}
              {result.atsPreview.keywordAnalysis.missing
                ?.filter((k) => !result.atsPreview.keywordAnalysis.criticalMissing.includes(k))
                .length > 0 && (
                <>
                  <p className="text-xs font-medium text-slate-400 mb-2">Nice to have</p>
                  <div className="flex flex-wrap gap-2">
                    {result.atsPreview.keywordAnalysis.missing
                      .filter((k) => !result.atsPreview.keywordAnalysis.criticalMissing.includes(k))
                      .map((k) => (
                        <Chip key={k} variant="neutral">{k}</Chip>
                      ))}
                  </div>
                </>
              )}
            </Card>
          )}

          {result.atsPreview.topImprovements?.length > 0 && (
            <Card>
              <h3 className="font-semibold mb-4">Top Improvements</h3>
              <div className="space-y-3">
                {result.atsPreview.topImprovements.map((imp, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Chip variant={imp.impact === 'High' ? 'red' : imp.impact === 'Medium' ? 'brand' : 'neutral'}>
                      {imp.impact}
                    </Chip>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <strong>{imp.area}:</strong> {imp.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
