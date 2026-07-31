import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <h1 className="text-8xl font-extrabold bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="text-2xl font-bold mt-4">Page not found</h2>
        <p className="text-slate-500 mt-2 max-w-md">
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <Link to="/" className="btn-primary mt-8 inline-flex">
          <FiArrowLeft /> Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
