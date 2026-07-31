import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiMail } from 'react-icons/fi';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Contact() {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all fields.');
      return;
    }
    // No backend persistence per project spec (no database) — this is a UI-only confirmation.
    setSent(true);
    toast.success('Message received! We\'ll get back to you soon.');
  };

  return (
    <div className="page-container py-20">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-xl mx-auto mb-12">
        <span className="section-label">Contact</span>
        <h1 className="text-3xl md:text-4xl font-bold mt-3">Get in touch</h1>
        <p className="text-slate-500 mt-3">Questions, feedback, or partnership ideas — we'd love to hear from you.</p>
      </motion.div>

      <Card className="max-w-xl mx-auto">
        {sent ? (
          <div className="text-center py-8">
            <FiMail className="mx-auto text-4xl text-emerald-500 mb-3" />
            <h3 className="font-semibold text-lg">Thanks for reaching out!</h3>
            <p className="text-sm text-slate-500 mt-2">We've received your message and will respond as soon as possible.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input className="input-field" name="name" placeholder="Your Name" value={form.name} onChange={handleChange} />
            <input className="input-field" name="email" type="email" placeholder="Your Email" value={form.email} onChange={handleChange} />
            <textarea className="input-field min-h-[140px]" name="message" placeholder="Your Message" value={form.message} onChange={handleChange} />
            <Button type="submit" icon={<FiSend />} className="w-full">Send Message</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
