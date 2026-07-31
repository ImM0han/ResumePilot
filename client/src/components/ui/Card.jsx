import React from 'react';
import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = false, delay = 0, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay }}
      className={`glass-card p-6 ${hover ? 'hover:-translate-y-1 hover:shadow-lg transition-transform duration-300' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
