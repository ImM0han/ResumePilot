import React from 'react';

export function SkeletonLine({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 dark:bg-white/10 ${className}`} />;
}

export default function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-3 w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className={`h-4 ${i === rows - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
