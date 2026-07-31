import React, { useEffect, useState } from 'react';

export default function SlideDots({ sections }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = elements.findIndex((el) => el === entry.target);
            if (idx !== -1) setActive(idx);
          }
        });
      },
      { threshold: 0.5 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="hidden lg:flex flex-col gap-3 fixed right-6 top-1/2 -translate-y-1/2 z-40">
      {sections.map((s, i) => (
        <button
          key={s.id}
          aria-label={`Go to ${s.label}`}
          onClick={() => scrollTo(s.id)}
          className="group relative flex items-center justify-end"
        >
          <span
            className={`absolute right-6 whitespace-nowrap text-xs font-medium px-2 py-1 rounded-md bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
          >
            {s.label}
          </span>
          <span
            className={`rounded-full transition-all duration-300 ${
              active === i
                ? 'w-2.5 h-2.5 bg-gradient-to-br from-brand-600 to-accent-600'
                : 'w-2 h-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
