const STORAGE_KEY = 'resumepilot_recent_activity';
const MAX_ITEMS = 12;

export const ACTIVITY_TYPES = {
  BUILD: 'build',
  OPTIMIZE: 'optimize',
  ATS: 'ats',
  DASHBOARD: 'dashboard',
  COVER_LETTER: 'cover-letter',
  INTERVIEW: 'interview',
};

const TYPE_META = {
  [ACTIVITY_TYPES.BUILD]: { label: 'Resume Built', route: '/resume-builder', icon: 'FiFileText' },
  [ACTIVITY_TYPES.OPTIMIZE]: { label: 'Resume Optimized', route: '/resume-optimizer', icon: 'FiZap' },
  [ACTIVITY_TYPES.ATS]: { label: 'ATS Score Checked', route: '/ats-checker', icon: 'FiTarget' },
  [ACTIVITY_TYPES.DASHBOARD]: { label: 'Recruiter Dashboard', route: '/recruiter-dashboard', icon: 'FiBarChart2' },
  [ACTIVITY_TYPES.COVER_LETTER]: { label: 'Cover Letter', route: '/cover-letter', icon: 'FiMail' },
  [ACTIVITY_TYPES.INTERVIEW]: { label: 'Interview Prep', route: '/interview-prep', icon: 'FiMessageSquare' },
};

function safeParse(json, fallback) {
  if (json === null || json === undefined) return fallback;
  try {
    const parsed = JSON.parse(json);
    // JSON.parse(null) / JSON.parse('null') legitimately returns null without
    // throwing, so guard against that explicitly rather than relying on catch.
    return parsed === null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/** Returns all saved activity, newest first. Always an array — never null. */
export function getRecentActivity() {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Saves a new activity entry. `data` should be a plain, serializable object
 * containing whatever the page needs to restore its previous result without
 * re-calling the API (e.g. the form inputs + the generated result).
 */
export function saveActivity({ type, summary, data }) {
  if (typeof window === 'undefined') return;
  const meta = TYPE_META[type];
  if (!meta) return;

  const entry = {
    id: `${type}-${Date.now()}`,
    type,
    label: meta.label,
    route: meta.route,
    icon: meta.icon,
    summary: summary || '',
    timestamp: new Date().toISOString(),
    data,
  };

  const existing = getRecentActivity();
  const updated = [entry, ...existing].slice(0, MAX_ITEMS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // Storage quota exceeded (e.g. very large resume text) — drop the oldest
    // entries and retry once with a smaller list before giving up silently.
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 4)));
    } catch {
      /* give up silently — activity tracking is a nice-to-have, not critical */
    }
  }

  return entry;
}

export function clearRecentActivity() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function removeActivity(id) {
  if (typeof window === 'undefined') return;
  const updated = getRecentActivity().filter((a) => a.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/** Lightweight "2 hours ago" style relative time formatter (no extra dependency). */
export function timeAgo(isoString) {
  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}
