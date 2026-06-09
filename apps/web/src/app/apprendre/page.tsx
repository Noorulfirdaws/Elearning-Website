'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import axios from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';

const CYCLE_COLORS = {
  college: { bg: 'from-blue-500 to-blue-700', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
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

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-green-600 text-white pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm font-medium mb-6">
              🇩🇯 Programme scolaire de Djibouti
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Choisir ton niveau
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Des cours structurés, des exercices pratiques et des quiz interactifs —
              conçus pour les élèves djiboutiens du collège au lycée.
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
                <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800" />
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider px-3 py-1 bg-blue-50 dark:bg-blue-950 rounded-full border border-blue-200 dark:border-blue-800">
                  🏫 Collège — Préparation au Brevet
                </span>
                <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800" />
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
