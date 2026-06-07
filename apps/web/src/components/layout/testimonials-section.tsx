'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  { name: 'Sarah Chen', role: 'Software Engineer at Google', avatar: 'SC', rating: 5, text: 'LearnHub transformed my career. The courses are incredibly well-structured and the AI tutor helped me whenever I was stuck. Got my dream job 3 months after completing the Full-Stack course!' },
  { name: 'Marcus Johnson', role: 'Freelance Designer', avatar: 'MJ', rating: 5, text: 'The UX/UI design course was everything I needed. The certificate is actually recognized by companies. Went from $30/hr to $120/hr in 6 months.' },
  { name: 'Priya Patel', role: 'Data Scientist at Meta', avatar: 'PP', rating: 5, text: "The community is amazing. You're not just buying a course, you're joining a network of learners. The discussions and peer feedback are invaluable." },
  { name: 'Alex Rivera', role: 'CTO at Startup', avatar: 'AR', rating: 5, text: 'I enrolled my entire team on the enterprise plan. The analytics dashboard lets me track everyone\'s progress and the completion rates are through the roof.' },
  { name: 'Emma Wilson', role: 'Product Manager', avatar: 'EW', rating: 5, text: 'The quizzes and assignments are actually challenging. Not just checkbox exercises. I genuinely learned by doing. Worth every penny.' },
  { name: 'David Kim', role: 'DevOps Engineer', avatar: 'DK', rating: 5, text: 'The video quality is exceptional. Resume playback, bookmarks, note-taking — everything you need to learn at your own pace. Best LMS I\'ve used.' },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Loved by <span className="text-gradient">2 million</span> learners
          </h2>
          <p className="text-xl text-muted-foreground">Real stories from real students who transformed their careers</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 card-hover relative"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-gray-200 dark:text-gray-700" />
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map((s) => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
