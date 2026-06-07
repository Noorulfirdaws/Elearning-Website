'use client';

import { motion } from 'framer-motion';
import { Video, FileText, Brain, Award, Users, BarChart3, Shield, Smartphone, Zap } from 'lucide-react';

const features = [
  { icon: Video, title: 'HD Video Streaming', desc: 'Adaptive bitrate streaming with HLS/DASH, resume playback, speed control, and captions.', color: 'bg-blue-50 dark:bg-blue-950 text-blue-600' },
  { icon: Brain, title: 'AI Learning Assistant', desc: 'Personalized AI tutor that answers questions, generates quizzes, and recommends courses.', color: 'bg-purple-50 dark:bg-purple-950 text-purple-600' },
  { icon: Award, title: 'Verified Certificates', desc: 'QR-verified certificates with unique IDs. Share on LinkedIn in one click.', color: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600' },
  { icon: FileText, title: 'Rich Course Builder', desc: 'Drag-and-drop course builder with video, PDF, PPTX, DOCX, quizzes, and assignments.', color: 'bg-green-50 dark:bg-green-950 text-green-600' },
  { icon: BarChart3, title: 'Deep Analytics', desc: 'Track student progress, course completion rates, revenue, and engagement metrics.', color: 'bg-orange-50 dark:bg-orange-950 text-orange-600' },
  { icon: Users, title: 'Community Platform', desc: 'Built-in community with groups, posts, polls, events — like Facebook Groups for learning.', color: 'bg-pink-50 dark:bg-pink-950 text-pink-600' },
  { icon: Shield, title: 'Enterprise Security', desc: 'RBAC, MFA, rate limiting, CSRF protection, SOC2-ready infrastructure.', color: 'bg-red-50 dark:bg-red-950 text-red-600' },
  { icon: Smartphone, title: 'Mobile Responsive', desc: 'Pixel-perfect on every device. Progressive Web App with offline support.', color: 'bg-teal-50 dark:bg-teal-950 text-teal-600' },
  { icon: Zap, title: 'Blazing Fast', desc: 'Optimized with Redis caching, CDN delivery, and Next.js SSR for sub-second loads.', color: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600' },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-blue-200 dark:border-blue-800">
            Everything you need
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            The complete <span className="text-gradient">learning platform</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From course creation to student success — every feature you need, built with precision.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 card-hover"
            >
              <div className={`w-12 h-12 rounded-xl ${feat.color} flex items-center justify-center mb-4`}>
                <feat.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feat.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
