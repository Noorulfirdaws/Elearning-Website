'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/api';

interface Niveau {
  id: string;
  nom: string;
  cycle: string;
  ordre: number;
  _count?: { matieres: number };
}

export function FeaturedCourses() {
  const { data: niveaux, isLoading } = useQuery<Niveau[]>({
    queryKey: ['niveaux-home'],
    queryFn: () => axios.get('/niveaux').then(r => r.data.data || []),
    staleTime: 5 * 60 * 1000,
  });

  const college = (niveaux || []).filter(n => n.cycle === 'college').sort((a, b) => a.ordre - b.ordre);
  const lycee = (niveaux || []).filter(n => n.cycle === 'lycee').sort((a, b) => a.ordre - b.ordre);

  return (
    <section className="py-24 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-green-200 dark:border-green-800">
              Programme officiel 🇩🇯
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold">
              Choisis ton <span className="text-gradient">niveau</span>
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">Du collège au lycée — toutes les matières, à ton rythme.</p>
          </div>
          <Link href="/apprendre" className="hidden md:flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all">
            Tout voir <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {college.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <BookOpen className="w-4 h-4" /> Collège
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {college.map((n, i) => <NiveauCard key={n.id} niveau={n} index={i} />)}
                </div>
              </div>
            )}
            {lycee.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <GraduationCap className="w-4 h-4" /> Lycée
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {lycee.map((n, i) => <NiveauCard key={n.id} niveau={n} index={i} />)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-10 md:hidden">
          <Link href="/apprendre" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors">
            Commencer à apprendre <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function NiveauCard({ niveau, index }: { niveau: Niveau; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/apprendre/${niveau.id}`}>
        <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl border border-green-100 dark:border-gray-700 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all h-full flex flex-col justify-between">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{niveau.nom}</div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {niveau._count?.matieres ?? 0} matière{(niveau._count?.matieres ?? 0) > 1 ? 's' : ''}
            </span>
            <ArrowRight className="w-4 h-4 text-green-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
