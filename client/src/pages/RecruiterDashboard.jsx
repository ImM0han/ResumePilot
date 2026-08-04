import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUploadCloud, FiFile, FiBarChart2, FiDownload, FiUser, FiClock } from 'react-icons/fi';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Chip from '../components/ui/Chip.jsx';
import CircularProgress from '../components/ui/CircularProgress.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { recruiterDashboard, exportResume } from '../services/api.js';
import { saveActivity, ACTIVITY_TYPES, timeAgo } from '../utils/recentActivity.js';

const HEATMAP_COLOR = { green: 'bg-emerald-500', yellow: 'bg-amber-500', red: 'bg-rose-500' };
const BREAKDOWN_LABELS = {
  keywordMatch: 'Keyword Match', skillsMatch: 'Skills Match', experience: 'Experience',
  projects: 'Projects', education: 'Education', formatting: 'Formatting', grammar: 'Grammar',
};

export default function RecruiterDashboard() {
  const toast = useToast();
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [restoredFrom, setRestoredFrom] = useState(null);

  useEffect(() => {
    const restored = location.state?.restoredActivity;
    if (restored?.data) {
      setJobDescription(restored.data.jobDescription || '');
      setCandidateName(restored.data.candidateName || '');
      setTargetRole(restored.data.targetRole || '');
      setResult(restored.data.result || null);
      setRestoredFrom(restored.timestamp);
      toast.info(`Restored dashboard from ${timeAgo(restored.timestamp)}`);
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
    if (!file) return toast.error('Please upload a resume (PDF or DOCX).');
    setLoading(true);
    setResult(null);
    setRestoredFrom(null);
    try {
      const res = await recruiterDashboard({ file, jobDescription, candidateName, targetRole });
      setResult(res.data);
      toast.success('Recruiter dashboard generated!');
      saveActivity({
        type: ACTIVITY_TYPES.DASHBOARD,
        summary: `${res.data.candidateName || 'Candidate'} — ${res.data.overallScore}/100`,
        data: { jobDescription, candidateName, targetRole, result: res.data },
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
        <span className="section-label">Recruiter Dashboard</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">See your resume like a recruiter does</h1>
        <p className="text-slate-500 mt-3">A full breakdown of ATS score, keyword match, formatting, and recruiter-style feedback.</p>
      </motion.div>

      <Card className="max-w-3xl mx-auto mb-8">
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <input className="input-field" placeholder="Candidate Name" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
          <input className="input-field" placeholder="Target Role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
        </div>

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
              <p className="font-medium">Drag & drop resume here, or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">PDF or DOCX, up to 8MB</p>
            </>
          )}
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium mb-1.5 block">Job Description</label>
          <textarea className="input-field min-h-[110px]" placeholder="Paste job description..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
        </div>

        <Button className="w-full mt-5" icon={<FiBarChart2 />} loading={loading} onClick={handleSubmit}>
          Generate Dashboard
        </Button>
      </Card>

      {loading && <Card className="max-w-3xl mx-auto"><Skeleton rows={8} /></Card>}

      {!loading && result && (
        <div className="max-w-6xl mx-auto space-y-8">
          {restoredFrom && (
            <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
              <FiClock size={12} /> Restored from {timeAgo(restoredFrom)}
            </p>
          )}
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white grid place-items-center font-bold">
                <FiUser />
              </div>
              <div>
                <div className="font-semibold">{result.candidateName}</div>
                <div className="text-xs text-slate-400">Target Role: {result.targetRole}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <FiClock /> Last updated {new Date(result.lastUpdated).toLocaleString()}
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CircularProgress value={result.overallScore} label="ATS Score" />
              <p className="text-xs mt-2 text-slate-400">{result.quality}</p>
            </Card>
            <Card className="text-center flex flex-col justify-center">
              <div className="text-3xl font-bold text-brand-600">{result.keywordAnalysis?.matched?.length ? Math.round((result.keywordAnalysis.matched.length / (result.keywordAnalysis.totalJDKeywords || 1)) * 100) : 0}%</div>
              <div className="text-xs text-slate-400 mt-1">Resume Match</div>
            </Card>
            <Card className="text-center flex flex-col justify-center">
              <div className="text-3xl font-bold text-emerald-500">{result.interviewChance ?? 0}%</div>
              <div className="text-xs text-slate-400 mt-1">Est. Interview Chance*</div>
            </Card>
            <Card className="text-center flex flex-col justify-center">
              <div className="text-3xl font-bold text-accent-600">{result.quality || 'N/A'}</div>
              <div className="text-xs text-slate-400 mt-1">Resume Quality</div>
            </Card>
          </div>
          <p className="text-xs text-slate-400 -mt-4 text-center">
            *Estimate only, based on ATS score, keyword match, experience relevance, and formatting — not a guarantee.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold mb-3">Skills Analysis</h3>
              <p className="text-xs text-slate-400 mb-2">Matched Skills</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {result.skillsAnalysis?.matched?.length ? result.skillsAnalysis.matched.map((s) => <Chip key={s} variant="green">{s}</Chip>) : <span className="text-sm text-slate-400">None</span>}
              </div>
              <p className="text-xs text-slate-400 mb-2">Missing Skills</p>
              <div className="flex flex-wrap gap-2">
                {result.skillsAnalysis?.missing?.length ? result.skillsAnalysis.missing.map((s) => <Chip key={s} variant="red">{s}</Chip>) : <span className="text-sm text-slate-400">None</span>}
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold mb-3">Keyword Analysis</h3>
              <p className="text-sm mb-2">Keyword Density: <strong>{result.keywordAnalysis?.density ?? 0}%</strong></p>
              <p className="text-xs text-slate-400 mb-2">Matched</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {result.keywordAnalysis?.matched?.slice(0, 12).map((k) => <Chip key={k} variant="green">{k}</Chip>)}
              </div>
              <p className="text-xs text-slate-400 mb-2">Missing (Critical)</p>
              <div className="flex flex-wrap gap-2">
                {result.keywordAnalysis?.missing?.slice(0, 12).map((k) => <Chip key={k} variant="red">{k}</Chip>)}
              </div>
            </Card>
          </div>

          {result.heatmap && (
            <Card>
              <h3 className="font-semibold mb-4">Resume Heatmap</h3>
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

          {result.breakdown && (
            <Card>
              <h3 className="font-semibold mb-4">ATS Breakdown</h3>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(result.breakdown).map(([key, val]) => (
                  <ProgressBar key={key} label={`${BREAKDOWN_LABELS[key] || key} (${val.weight}%)`} value={val.score} />
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h3 className="font-semibold mb-4">Resume Formatting Check</h3>
            <ul className="text-sm space-y-2">
              {(!result.formattingIssues || result.formattingIssues.length === 0) && (
                <li className="text-emerald-600">✓ No formatting issues detected.</li>
              )}
              {result.formattingIssues?.map((issue, i) => (
                <li key={i} className="text-rose-500">✗ {issue}</li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Resume Strength Meter</h3>
            <ProgressBar label="Overall Resume Quality" value={result.overallScore ?? 0} />
          </Card>

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

          <Card>
            <h3 className="font-semibold mb-3">AI Recruiter Feedback</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{result.recruiterFeedback}</p>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Download</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" icon={<FiDownload />} onClick={() => handleExport('pdf')}>Resume PDF</Button>
              <Button variant="secondary" icon={<FiDownload />} onClick={() => handleExport('docx')}>Resume DOCX</Button>
              <Button variant="secondary" icon={<FiDownload />} onClick={() => handleExport('txt')}>Resume TXT</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
