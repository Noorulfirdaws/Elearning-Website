'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import axios from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';

const CYCLE_COLORS = {
  college: { bg: 'from-green-500 to-green-700', badge: 'bg-green-100 text-green-700', border: 'border-green-200' },
  lycee:   { bg: 'from-green-500 to-green-700', badge: 'bg-green-100 text-green-700', border: 'border-green-200' },
};

const NIVEAU_DESC: Record<string, string> = {
  C6: 'Début du collège — bases solides en maths, sciences et français',
  C5: 'Approfondissement — fractions, géométrie, corps humain',
  C4: 'Milieu de collège — équations, physique, histoire mondiale',
  C3: 'Préparation au Brevet — révisions complètes et examens blancs',
  LS: 'Entrée au lycée — nouveaux programmes, spécialisations',
  LP: 'Première — approfondissement avant le Bac',
  LT: 'Terminale — préparation intensive au Baccalauréat',
};

export default function ApprendrePage() {
  const { data: niveaux, isLoading } = useQuery<any[]>({
    queryKey: ['niveaux'],
    queryFn: () => axios.get('/niveaux').then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

  const college = niveaux?.filter(n => n.cycle === 'college') || [];
  const lycee   = niveaux?.filter(n => n.cycle === 'lycee')   || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* Hero animé (image en mouvement — effet Ken Burns) */}
      <section className="relative text-white pt-16 overflow-hidden">
        {/* Image de fond animée */}
        <div className="absolute inset-0">
          <img
            src="/hero-apprendre.jpg"
            alt=""
            className="w-full h-full object-cover animate-kenburns"
          />
          {/* Voile léger pour la lisibilité (photo bien visible) */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/70 via-slate-900/40 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-14 sm:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs font-medium mb-4">
              🇩🇯 Programme scolaire de Djibouti
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Choisis ton niveau</h1>
            <p className="text-slate-100 text-sm sm:text-base max-w-lg">
              Du collège au lycée — cours, vidéos, exercices corrigés et quiz pour réussir le Brevet et le Bac.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-44 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Collège */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-green-200 dark:bg-green-800" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider px-3 py-1 bg-green-50 dark:bg-green-950 rounded-full border border-green-200 dark:border-green-800">
                  🏫 Collège — Préparation au Brevet
                </span>
                <div className="h-px flex-1 bg-green-200 dark:bg-green-800" />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {college.map((n, i) => (
                  <NiveauCard key={n.id} niveau={n} index={i} />
                ))}
              </div>
            </div>

            {/* Lycée */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-green-200 dark:bg-green-800" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider px-3 py-1 bg-green-50 dark:bg-green-950 rounded-full border border-green-200 dark:border-green-800">
                  🎓 Lycée — Préparation au Baccalauréat
                </span>
                <div className="h-px flex-1 bg-green-200 dark:bg-green-800" />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                {lycee.map((n, i) => (
                  <NiveauCard key={n.id} niveau={n} index={i + 4} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NiveauCard({ niveau, index }: { niveau: any; index: number }) {
  const colors = CYCLE_COLORS[niveau.cycle as keyof typeof CYCLE_COLORS];
  const desc = NIVEAU_DESC[niveau.id] || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -4 }}
    >
      <Link href={`/apprendre/${niveau.id}`}>
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors.bg} text-white p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer h-full`}>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold">{niveau.nom}</h2>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
              {niveau._count?.matieres || 0} matières
            </span>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">{desc}</p>
          <div className="mt-4 flex items-center gap-1 text-xs text-white/70 font-medium">
            Voir les matières →
          </div>
          {/* Decoration */}
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
        </div>
      </Link>
    </motion.div>
  );
}
