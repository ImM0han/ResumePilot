import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUploadCloud, FiFile, FiZap, FiDownload, FiTrendingUp, FiClock } from 'react-icons/fi';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import Chip from '../components/ui/Chip.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { optimizeResume, exportResume } from '../services/api.js';
import { saveActivity, ACTIVITY_TYPES, timeAgo } from '../utils/recentActivity.js';

export default function ResumeOptimizer() {
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
      toast.info(`Restored optimization from ${timeAgo(restored.timestamp)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback(
    (accepted, rejected) => {
      if (rejected?.length) {
        toast.error('Only PDF or DOCX files are supported.');
        return;
      }
      setFile(accepted[0]);
    },
    [toast]
  );

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
    if (!jobDescription.trim()) return toast.error('Please paste the job description.');

    setLoading(true);
    setResult(null);
    setRestoredFrom(null);
    try {
      const res = await optimizeResume({ file, jobDescription });
      setResult(res.data);
      toast.success('Resume optimized successfully!');
      saveActivity({
        type: ACTIVITY_TYPES.OPTIMIZE,
        summary: res.data.scoreComparison
          ? `Score ${res.data.scoreComparison.before} → ${res.data.scoreComparison.after}`
          : file.name,
        data: { jobDescription, result: res.data },
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      await exportResume({ resumeText: result.optimizedResume, format });
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page-container py-16">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto mb-12">
        <span className="section-label">Resume Optimizer</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">Optimize your existing resume</h1>
        <p className="text-slate-500 mt-3">Upload your resume and a job description — we'll improve wording and highlight every change, without inventing anything.</p>
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
          <label className="text-sm font-medium mb-1.5 block">Job Description</label>
          <textarea
            className="input-field min-h-[130px]"
            placeholder="Paste the target job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
        </div>

        <Button className="w-full mt-5" icon={<FiZap />} loading={loading} onClick={handleSubmit}>
          Optimize My Resume
        </Button>
      </Card>

      {loading && (
        <Card className="max-w-3xl mx-auto">
          <Skeleton rows={8} />
        </Card>
      )}

      {!loading && result && (
        <div className="max-w-5xl mx-auto space-y-8">
          {restoredFrom && (
            <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
              <FiClock size={12} /> Restored from {timeAgo(restoredFrom)}
            </p>
          )}
          {result.scoreComparison && (
            <Card className="flex items-center justify-center gap-8 text-center">
              <div>
                <div className="text-xs text-slate-400 mb-1">Before</div>
                <div className="text-3xl font-bold text-slate-400">{result.scoreComparison.before}</div>
              </div>
              <FiTrendingUp className="text-emerald-500 text-2xl" />
              <div>
                <div className="text-xs text-slate-400 mb-1">After</div>
                <div className="text-3xl font-bold text-emerald-500">{result.scoreComparison.after}</div>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold mb-3">Original Resume</h3>
              <pre className="whitespace-pre-wrap text-sm bg-slate-50 dark:bg-white/5 rounded-xl p-4 max-h-[420px] overflow-y-auto font-sans">
                {result.original}
              </pre>
            </Card>
            <Card>
              <h3 className="font-semibold mb-3">Optimized Resume</h3>
              <pre className="whitespace-pre-wrap text-sm bg-emerald-50/50 dark:bg-emerald-500/5 rounded-xl p-4 max-h-[420px] overflow-y-auto font-sans">
                {result.optimizedResume}
              </pre>
              <div className="flex flex-wrap gap-3 mt-4">
                <Button variant="secondary" icon={<FiDownload />} onClick={() => handleExport('pdf')}>PDF</Button>
                <Button variant="secondary" icon={<FiDownload />} onClick={() => handleExport('docx')}>DOCX</Button>
                <Button variant="secondary" icon={<FiDownload />} onClick={() => handleExport('txt')}>TXT</Button>
              </div>
            </Card>
          </div>

          {result.changes?.length > 0 && (
            <Card>
              <h3 className="font-semibold mb-4">What Changed</h3>
              <div className="space-y-4">
                {result.changes.map((c, i) => (
                  <div key={i} className="border-l-2 border-brand-400 pl-4">
                    <div className="text-xs font-semibold text-brand-600 mb-1">{c.section}</div>
                    <div className="text-sm text-rose-500 line-through">{c.original}</div>
                    <div className="text-sm text-emerald-600">{c.optimized}</div>
                    {c.reason && <div className="text-xs text-slate-400 mt-1">{c.reason}</div>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.recommendedKeywordsNotInserted?.length > 0 && (
            <Card>
              <h3 className="font-semibold mb-3">Recommended Keywords (Not Auto-Inserted)</h3>
              <p className="text-xs text-slate-400 mb-3">
                These appear in the job description but weren't found in your background, so we didn't fabricate them. Consider genuinely gaining or highlighting this experience.
              </p>
              <div className="flex flex-wrap gap-2">
                {result.recommendedKeywordsNotInserted.map((k) => (
                  <Chip key={k} variant="red">{k}</Chip>
                ))}
              </div>
            </Card>
          )}

          {result.note && <p className="text-xs text-slate-400 text-center">{result.note}</p>}
        </div>
      )}
    </div>
  );
}
