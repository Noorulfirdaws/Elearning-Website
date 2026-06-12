'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, BookOpen, ChevronRight } from 'lucide-react';
import axios from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';

export default function NiveauPage() {
  const { niveau: niveauId } = useParams<{ niveau: string }>();

  const { data: niveau, isLoading } = useQuery<any>({
    queryKey: ['niveau', niveauId],
    queryFn: () => axios.get(`/niveaux/${niveauId}`).then(r => r.data.data),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!niveau) return <div className="min-h-screen flex items-center justify-center">Niveau introuvable</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* Header compact */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white pt-16 pb-4 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/apprendre" className="inline-flex items-center gap-1 text-blue-100 hover:text-white mb-1 text-xs transition-colors">
            <ChevronLeft className="h-3 w-3" /> Tous les niveaux
          </Link>
          <h1 className="text-lg font-bold">{niveau.nom}</h1>
          <p className="text-blue-100 text-xs">{niveau.matieres?.length || 0} matières disponibles</p>
        </div>
      </div>

      {/* Matières */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {niveau.matieres?.map((matiere: any, i: number) => (
            <MatiereCard key={matiere.id} matiere={matiere} niveauId={niveauId} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MatiereCard({ matiere, niveauId, index }: { matiere: any; niveauId: string; index: number }) {
  const chapitresCount = matiere._count?.chapitres || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      whileHover={{ y: -3 }}
    >
      <Link href={`/apprendre/${niveauId}/${matiere.id}`}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-all h-full cursor-pointer group">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm"
              style={{ backgroundColor: matiere.couleur + '20', border: `2px solid ${matiere.couleur}30` }}
            >
              {matiere.icone}
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all mt-1" />
          </div>

          <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{matiere.nom}</h3>

          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <BookOpen className="h-4 w-4" />
            <span>{chapitresCount} chapitre{chapitresCount > 1 ? 's' : ''}</span>
          </div>

          {/* Barre de progression simulée */}
          <div className="mt-4 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: '0%', backgroundColor: matiere.couleur }}
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-48 bg-blue-600 animate-pulse" />
      <div className="max-w-4xl mx-auto px-4 py-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
