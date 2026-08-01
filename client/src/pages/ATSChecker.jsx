import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUploadCloud, FiFile, FiSearch, FiClock } from 'react-icons/fi';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Chip from '../components/ui/Chip.jsx';
import CircularProgress from '../components/ui/CircularProgress.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { checkATS } from '../services/api.js';
import { saveActivity, ACTIVITY_TYPES, timeAgo } from '../utils/recentActivity.js';

const HEATMAP_COLOR = { green: 'bg-emerald-500', yellow: 'bg-amber-500', red: 'bg-rose-500' };
const BREAKDOWN_LABELS = {
  keywordMatch: 'Keyword Match', skillsMatch: 'Skills Match', experience: 'Experience',
  projects: 'Projects', formatting: 'Formatting', grammar: 'Grammar', education: 'Education',
  achievements: 'Achievements', actionVerbs: 'Action Verbs',
};

export default function ATSChecker() {
  const toast = useToast();
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [restoredFrom, setRestoredFrom] = useState(null);

  useEffect(() => {
    const restored = location.state?.restoredActivity;
    if (restored?.data) {
      setJobDescription(restored.data.jobDescription || '');
      setResult(restored.data.result || null);
      setRestoredFrom(restored.timestamp);
      toast.info(`Restored ATS check from ${timeAgo(restored.timestamp)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected?.length) return toast.error('Only PDF or DOCX files are supported.');
    setFile(accepted[0]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  });

  const handleSubmit = async () => {
    if (!file) return toast.error('Please upload your resume (PDF or DOCX).');
    setLoading(true);
    setResult(null);
    setRestoredFrom(null);
    try {
      const res = await checkATS({ file, jobDescription });
      setResult(res.data);
      toast.success('ATS analysis complete!');
      saveActivity({
        type: ACTIVITY_TYPES.ATS,
        summary: `${file.name} — Score ${res.data.overallScore}/100 (${res.data.quality})`,
        data: { jobDescription, result: res.data },
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
        <span className="section-label">ATS Score Checker</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">See your real ATS score</h1>
        <p className="text-slate-500 mt-3">Calculated with a transparent, weighted algorithm — not a random number.</p>
      </motion.div>

      <Card className="max-w-3xl mx-auto mb-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/5' : 'border-slate-200 dark:border-white/10'
          }`}
        >
          <input {...getInputProps()} />
          <FiUploadCloud className="mx-auto text-4xl text-brand-500 mb-3" />
          {file ? (
            <p className="flex items-center justify-center gap-2 font-medium"><FiFile /> {file.name}</p>
          ) : (
            <>
              <p className="font-medium">Drag & drop your resume here, or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">PDF or DOCX, up to 8MB</p>
            </>
          )}
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium mb-1.5 block">Job Description (optional, improves accuracy)</label>
          <textarea
            className="input-field min-h-[110px]"
            placeholder="Paste the target job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>

        <Button className="w-full mt-5" icon={<FiSearch />} loading={loading} onClick={handleSubmit}>
          Check ATS Score
        </Button>
      </Card>

      {loading && <Card className="max-w-3xl mx-auto"><Skeleton rows={8} /></Card>}

      {!loading && result && (
        <div className="max-w-5xl mx-auto space-y-8">
          {restoredFrom && (
            <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
              <FiClock size={12} /> Restored from {timeAgo(restoredFrom)}
            </p>
          )}
          <Card className="grid md:grid-cols-2 gap-8 items-center">
            <div className="flex justify-center">
              <CircularProgress value={result.overallScore ?? 0} size={160} strokeWidth={12} label={`Quality: ${result.quality || 'N/A'}`} />
            </div>
            <div className="space-y-4">
              {result.breakdown ? (
                Object.entries(result.breakdown).map(([key, val]) => (
                  <ProgressBar key={key} label={`${BREAKDOWN_LABELS[key] || key} (${val.weight}%)`} value={val.score} />
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  Score breakdown isn't available in this response — your backend may be running an older version. Try
                  restarting the backend or pulling the latest code.
                </p>
              )}
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold mb-3">Matched Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {result.keywordAnalysis?.matched?.length ? (
                  result.keywordAnalysis.matched.map((k) => <Chip key={k} variant="green">{k}</Chip>)
                ) : (
                  <p className="text-sm text-slate-400">No JD provided or no matches found.</p>
                )}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold mb-3">Missing Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {result.keywordAnalysis?.missing?.length ? (
                  result.keywordAnalysis.missing.map((k) => <Chip key={k} variant="red">{k}</Chip>)
                ) : (
                  <p className="text-sm text-slate-400">Great — no missing keywords detected.</p>
                )}
              </div>
            </Card>
          </div>

          {result.heatmap && (
            <Card>
              <h3 className="font-semibold mb-4">Resume Section Heatmap</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(result.heatmap).map(([section, status]) => (
                  <div key={section} className="text-center">
                    <div className={`w-full h-2.5 rounded-full mb-2 ${HEATMAP_COLOR[status] || 'bg-slate-300'}`} />
                    <span className="text-xs capitalize text-slate-500">{section}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold mb-3">Action Verb Analysis</h3>
              <p className="text-xs text-slate-400 mb-2">Strong verbs found</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {result.actionVerbs?.strong?.length ? result.actionVerbs.strong.map((v) => <Chip key={v} variant="green">{v}</Chip>) : <span className="text-sm text-slate-400">None detected</span>}
              </div>
              <p className="text-xs text-slate-400 mb-2">Weak phrases to replace</p>
              <div className="flex flex-wrap gap-2">
                {result.actionVerbs?.weak?.length ? result.actionVerbs.weak.map((v) => <Chip key={v} variant="red">{v}</Chip>) : <span className="text-sm text-slate-400">None detected</span>}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold mb-3">Grammar & Formatting</h3>
              <p className="text-sm mb-2">Readability Score: <strong>{result.readabilityScore ?? 'N/A'}/100</strong></p>
              <ul className="text-sm text-slate-500 list-disc list-inside space-y-1">
                {result.formattingIssues?.length ? result.formattingIssues.map((i, idx) => <li key={idx}>{i}</li>) : <li>No major formatting issues found.</li>}
              </ul>
            </Card>
          </div>

          {result.topImprovements?.length > 0 && (
            <Card>
              <h3 className="font-semibold mb-4">Top Improvements</h3>
              <div className="space-y-3">
                {result.topImprovements.map((imp, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Chip variant={imp.impact === 'High' ? 'red' : imp.impact === 'Medium' ? 'brand' : 'neutral'}>{imp.impact}</Chip>
                    <p className="text-sm text-slate-600 dark:text-slate-300"><strong>{imp.area}:</strong> {imp.suggestion}</p>
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
