import React from 'react';
import { motion } from 'framer-motion';

function getColor(value) {
  if (value >= 80) return '#10b981'; // emerald
  if (value >= 60) return '#f59e0b'; // amber
  return '#f43f5e'; // rose
}

export default function CircularProgress({ value = 0, size = 120, strokeWidth = 10, label = '' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = getColor(value);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            className="text-slate-200 dark:text-white/10"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {value}
          </span>
          <span className="text-[10px] text-slate-400">/ 100</span>
        </div>
      </div>
      {label && <span className="text-sm font-medium text-slate-500">{label}</span>}
    </div>
  );
}
