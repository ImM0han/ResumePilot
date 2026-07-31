import React from 'react';
import { FiLoader } from 'react-icons/fi';

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  icon,
  className = '',
  ...props
}) {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <button className={`${base} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <FiLoader className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
