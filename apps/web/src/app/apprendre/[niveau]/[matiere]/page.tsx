'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, BookOpen, CheckCircle, Lock } from 'lucide-react';
import axios from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';

export default function MatierePage() {
  const { niveau: niveauId, matiere: matiereId } = useParams<{ niveau: string; matiere: string }>();

  const { data: matiere, isLoading } = useQuery<any>({
    queryKey: ['matiere', matiereId],
    queryFn: () => axios.get(`/matieres/${matiereId}`).then(r => r.data.data),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (!matiere) return <div className="min-h-screen flex items-center justify-center">Matière introuvable</div>;

  const chapitres = matiere.chapitres || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* Header compact */}
      <div
        className="text-white pt-16 pb-4 px-4"
        style={{ background: `linear-gradient(135deg, ${matiere.couleur}dd, ${matiere.couleur}99)` }}
      >
        <div className="max-w-4xl mx-auto">
          <Link href={`/apprendre/${niveauId}`} className="inline-flex items-center gap-1 text-white/70 hover:text-white mb-2 text-xs transition-colors">
            <ChevronLeft className="h-3 w-3" /> {matiere.niveau?.nom}
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-lg flex-shrink-0">
              {matiere.icone}
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">{matiere.nom}</h1>
              <p className="text-white/70 text-xs">{chapitres.length} chapitre{chapitres.length > 1 ? 's' : ''} au programme</p>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des chapitres */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {chapitres.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-500 text-lg">Les chapitres arrivent bientôt !</p>
            <p className="text-gray-400 text-sm mt-2">Le contenu est en cours de préparation.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chapitres.map((chapitre: any, i: number) => (
              <ChapitreRow
                key={chapitre.id}
                chapitre={chapitre}
                niveauId={niveauId}
                matiereId={matiereId}
                index={i}
                couleur={matiere.couleur}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChapitreRow({ chapitre, niveauId, matiereId, index, couleur }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link href={`/apprendre/${niveauId}/${matiereId}/${chapitre.id}`}>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:shadow-md transition-all group flex items-center gap-4 cursor-pointer">
          {/* Numéro */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ backgroundColor: couleur }}
          >
            {index + 1}
          </div>

          {/* Titre */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
              {chapitre.titre}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Chapitre {index + 1}</p>
          </div>

          {/* Statut */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <BookOpen className="h-4 w-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-48 animate-pulse" style={{ background: '#3B82F6' }} />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
