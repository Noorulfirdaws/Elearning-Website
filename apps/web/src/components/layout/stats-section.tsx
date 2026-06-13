'use client';

import { motion } from 'framer-motion';
import { Users, BookOpen, Award, Globe } from 'lucide-react';

const stats = [
  { icon: Users, value: '7', label: 'Niveaux scolaires', color: 'text-green-500' },
  { icon: BookOpen, value: '38', label: 'Matières au programme', color: 'text-green-500' },
  { icon: Award, value: '6ème–Tle', label: 'Collège & Lycée', color: 'text-yellow-500' },
  { icon: Globe, value: '100%', label: 'Programme djiboutien', color: 'text-purple-500' },
];

export function StatsSection() {
  return (
    <section className="py-16 bg-white dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 mb-3 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
