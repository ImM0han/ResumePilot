import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiClock, FiFileText, FiZap, FiTarget, FiBarChart2, FiMail, FiMessageSquare, FiTrash2, FiX,
} from 'react-icons/fi';
import { getRecentActivity, clearRecentActivity, removeActivity, timeAgo } from '../../utils/recentActivity.js';

const ICONS = {
  FiFileText: <FiFileText />,
  FiZap: <FiZap />,
  FiTarget: <FiTarget />,
  FiBarChart2: <FiBarChart2 />,
  FiMail: <FiMail />,
  FiMessageSquare: <FiMessageSquare />,
};

export default function RecentActivityMenu() {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const ref = useRef(null);
  const navigate = useNavigate();

  const refresh = () => setActivities(getRecentActivity() || []);

  useEffect(() => {
    refresh();
    // Keep in sync if activity is saved from another tab/page
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (activity) => {
    setOpen(false);
    // Navigate to the tool page and pass the saved result via router state,
    // so the page can restore it instantly instead of showing an empty form.
    navigate(activity.route, { state: { restoredActivity: activity } });
  };

  const handleRemove = (e, id) => {
    e.stopPropagation();
    removeActivity(id);
    refresh();
  };

  const handleClearAll = () => {
    clearRecentActivity();
    refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Recent activity"
        className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 dark:text-slate-300"
      >
        <FiClock size={18} />
        {activities.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-500" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto glass-card p-2 shadow-lg z-50"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold">Recent Activity</span>
              {activities.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1"
                >
                  <FiTrash2 size={12} /> Clear all
                </button>
              )}
            </div>

            {activities.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <FiClock className="mx-auto text-2xl text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">
                  Nothing yet — actions like building a resume or checking your ATS score will show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {activities.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleSelect(a)}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group"
                  >
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 grid place-items-center text-sm">
                      {ICONS[a.icon] || <FiClock />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.label}</div>
                      {a.summary && <div className="text-xs text-slate-400 truncate">{a.summary}</div>}
                      <div className="text-[11px] text-slate-400 mt-0.5">{timeAgo(a.timestamp)}</div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleRemove(e, a.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 p-1"
                      aria-label="Remove"
                    >
                      <FiX size={14} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
