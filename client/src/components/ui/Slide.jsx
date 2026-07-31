import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Full-viewport "slide" section used on the Landing page.
 * - snap-start + min-h-screen gives the slide-deck feel via native scroll-snap
 *   (proximity, not mandatory, so users never feel trapped mid-scroll on tall content)
 * - whileInView + once:true plays the enter animation the first time a slide
 *   comes into view, then leaves it alone — replaying a big transform on every
 *   pass is what was making the scroll feel janky, not the snapping itself.
 */
export default function Slide({ id, children, className = '', innerClassName = '', center = true }) {
  return (
    <section
      id={id}
      style={{ scrollMarginTop: '4rem' }}
      className={`snap-start min-h-screen w-full flex flex-col ${
        center ? 'justify-center' : ''
      } relative py-20 ${className}`}
    >
      <motion.div
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className={`page-container w-full ${innerClassName}`}
      >
        {children}
      </motion.div>
    </section>
  );
}
