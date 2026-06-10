'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Search, X, BookOpen, ChevronRight, GraduationCap } from 'lucide-react';
import axios from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

const NIVEAUX_FILTRES = [
  { id: '', label: 'Tous les niveaux' },
  { id: 'C6', label: '6ème' },
  { id: 'C5', label: '5ème' },
  { id: 'C4', label: '4ème' },
  { id: 'C3', label: '3ème' },
  { id: 'LS', label: 'Seconde' },
  { id: 'LP', label: 'Première' },
  { id: 'LT', label: 'Terminale' },
];

const CYCLE_COLORS: Record<string, string> = {
  college: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  lycee:   'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
};

export default function CatalogPage() {
  const [search, setSearch]   = useState('');
  const [niveau, setNiveau]   = useState('');
  const debouncedSearch = useDebounce(search, 350);

  // Récupère les niveaux pour le bloc visuel de gauche
  const { data: niveaux } = useQuery<any[]>({
    queryKey: ['niveaux'],
    queryFn: () => axios.get('/niveaux').then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

  // Recherche de chapitres
  const { data: resultats, isLoading } = useQuery<any[]>({
    queryKey: ['recherche-chapitres', debouncedSearch, niveau],
    queryFn: () =>
      axios.get('/chapitres/recherche', {
        params: { q: debouncedSearch || undefined, niveau: niveau || undefined },
      }).then(r => r.data.data),
    staleTime: 30 * 1000,
  });

  const hasSearch = debouncedSearch.trim().length > 0 || niveau.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* En-tête */}
      <section className="bg-gradient-to-br from-blue-700 to-indigo-700 text-white pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            🇩🇯 Programme scolaire de Djibouti
          </div>
          <h1 className="text-4xl font-bold mb-3">Catalogue des cours</h1>
          <p className="text-blue-100 mb-8 text-lg">
            Collège & Lycée — Mathématiques, Physique, SVT, Français, Histoire-Géo
          </p>

          {/* Barre de recherche */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un chapitre, une matière… (ex: fractions, photosynthèse)"
              className="w-full pl-14 pr-12 py-4 rounded-2xl bg-white text-gray-900 text-base shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Filtres niveau */}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {NIVEAUX_FILTRES.map(n => (
              <button
                key={n.id}
                onClick={() => setNiveau(prev => prev === n.id ? '' : n.id)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-semibold transition-all border',
                  niveau === n.id
                    ? 'bg-white text-blue-700 border-white shadow-md'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20',
                )}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* ── Résultats de recherche ───────────────────────────── */}
        <AnimatePresence mode="wait">
          {hasSearch ? (
            <motion.div
              key="resultats"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">
                  {isLoading ? 'Recherche en cours…' : `${resultats?.length || 0} chapitre${(resultats?.length || 0) > 1 ? 's' : ''} trouvé${(resultats?.length || 0) > 1 ? 's' : ''}`}
                  {debouncedSearch && <span className="text-gray-400 font-normal"> pour « {debouncedSearch} »</span>}
                </h2>
                <button
                  onClick={() => { setSearch(''); setNiveau(''); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Réinitialiser
                </button>
              </div>

              {isLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : resultats?.length === 0 ? (
                <div className="text-center py-20">
                  <Search className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Aucun chapitre trouvé</h3>
                  <p className="text-gray-400 mb-4">Essaie avec d'autres mots-clés ou change le filtre de niveau</p>
                  <button
                    onClick={() => { setSearch(''); setNiveau(''); }}
                    className="text-blue-600 hover:underline font-semibold"
                  >
                    Voir tous les cours →
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resultats?.map((ch: any, i: number) => (
                    <motion.div
                      key={ch.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link href={`/apprendre/${ch.matiere?.niveau?.id}/${ch.matiere?.id}/${ch.id}`}>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                          <div className="flex items-start gap-3 mb-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                              style={{ backgroundColor: (ch.matiere?.couleur || '#3B82F6') + '20' }}
                            >
                              {ch.matiere?.icone || '📚'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                  'text-xs font-bold px-2 py-0.5 rounded-full',
                                  CYCLE_COLORS[ch.matiere?.niveau?.cycle || 'college'],
                                )}>
                                  {ch.matiere?.niveau?.nom}
                                </span>
                                <span className="text-xs text-gray-400">{ch.matiere?.nom}</span>
                              </div>
                              <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug group-hover:text-blue-600 transition-colors">
                                Chapitre {ch.ordre} · {ch.titre}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center justify-end">
                            <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                              Étudier <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

          ) : (
            /* ── Vue par défaut : niveaux ─────────────────────── */
            <motion.div
              key="niveaux"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="font-bold text-gray-900 dark:text-white text-lg mb-6">
                Tous les niveaux disponibles
              </h2>

              {/* Collège */}
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800" />
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider px-3 py-1 bg-blue-50 dark:bg-blue-950 rounded-full border border-blue-200 dark:border-blue-800">
                    🏫 Collège — Préparation au Brevet
                  </span>
                  <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800" />
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {niveaux?.filter(n => n.cycle === 'college').map((n: any, i: number) => (
                    <NiveauCard key={n.id} niveau={n} index={i} />
                  )) || [...Array(4)].map((_, i) => (
                    <div key={i} className="h-36 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Lycée */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px flex-1 bg-green-200 dark:bg-green-800" />
                  <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider px-3 py-1 bg-green-50 dark:bg-green-950 rounded-full border border-green-200 dark:border-green-800">
                    🎓 Lycée — Préparation au Baccalauréat
                  </span>
                  <div className="h-px flex-1 bg-green-200 dark:bg-green-800" />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {niveaux?.filter(n => n.cycle === 'lycee').map((n: any, i: number) => (
                    <NiveauCard key={n.id} niveau={n} index={i} />
                  )) || [...Array(3)].map((_, i) => (
                    <div key={i} className="h-36 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
                  ))}
                </div>
              </div>

              {/* Tarifs rapide */}
              <div className="mt-12 grid sm:grid-cols-4 gap-4">
                {[
                  {
                    label: '🎒 Gratuit',
                    badge: 'Sans inscription',
                    desc: '1er chapitre de chaque matière accessible à tous',
                    color: 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700',
                  },
                  {
                    label: '📖 1 000 DJF/mois',
                    badge: 'Inscription requise',
                    desc: 'Un chapitre complet — cours, exemples, exercices, quiz',
                    color: 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800',
                  },
                  {
                    label: '🏆 5 000 DJF/mois',
                    badge: 'Inscription requise',
                    desc: 'Toutes les matières d\'un niveau scolaire complet',
                    color: 'bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800',
                  },
                  {
                    label: '🎓 10 000 DJF/mois',
                    badge: 'Inscription requise',
                    desc: 'Tout inclus + annales Brevet/Bac + simulateur d\'examen',
                    color: 'bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800',
                  },
                ].map(t => (
                  <div key={t.label} className={`${t.color} rounded-2xl p-5`}>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t.badge}</span>
                    <p className="font-bold text-gray-900 dark:text-white mt-1 mb-1">{t.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  );
}

function NiveauCard({ niveau, index }: { niveau: any; index: number }) {
  const isCollege = niveau.cycle === 'college';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y: -3 }}
    >
      <Link href={`/apprendre/${niveau.id}`}>
        <div className={`relative overflow-hidden rounded-2xl text-white p-6 shadow-md hover:shadow-xl transition-all cursor-pointer h-full bg-gradient-to-br ${
          isCollege ? 'from-blue-600 to-blue-800' : 'from-green-600 to-green-800'
        }`}>
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-2xl font-bold">{niveau.nom}</h2>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
              {niveau._count?.matieres || 0} matières
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/70 font-medium mt-4">
            <BookOpen className="h-3.5 w-3.5" />
            Voir les matières →
          </div>
          <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full" />
        </div>
      </Link>
    </motion.div>
  );
}
