import React from 'react';
import { motion } from 'framer-motion';

function getColor(value) {
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

export default function ProgressBar({ label, value = 0, showValue = true }) {
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</span>
        {showValue && <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{value}%</span>}
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getColor(value)}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
