'use client';

import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronLeft, BookOpen, CheckCircle, Lock, Plus, Loader2 } from 'lucide-react';
import axios from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';
import { useAuthStore } from '@/store/auth.store';

export default function MatierePage() {
  const { niveau: niveauId, matiere: matiereId } = useParams<{ niveau: string; matiere: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR'].includes(user?.role || '');

  const [showForm, setShowForm] = useState(false);
  const [titre, setTitre] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  const { data: matiere, isLoading } = useQuery<any>({
    queryKey: ['matiere', matiereId],
    queryFn: () => axios.get(`/matieres/${matiereId}`).then(r => r.data.data),
  });

  async function handleCreate() {
    if (!titre.trim()) return;
    setCreating(true);
    setCreateMsg('');
    try {
      const slug = titre.trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
      const id = `${matiereId.slice(0, 8)}-${slug}-${Date.now().toString(36)}`;
      const ordre = (matiere?.chapitres?.length || 0) + 1;
      await axios.post('/chapitres', { id, matiereId, titre: titre.trim(), ordre, isPublished: true });
      setTitre('');
      setShowForm(false);
      setCreateMsg('✅ Chapitre créé ! Ouvre-le pour ajouter ton PDF.');
      await queryClient.invalidateQueries({ queryKey: ['matiere', matiereId] });
    } catch (e: any) {
      setCreateMsg('❌ Erreur : ' + (e?.response?.data?.message || e.message));
    } finally {
      setCreating(false);
    }
  }

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
        {isAdmin && (
          <div className="mb-6">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" /> Nouveau chapitre
              </button>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Créer un chapitre</p>
                <input
                  autoFocus
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Titre du chapitre (ex: Les temps du passé)"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={creating || !titre.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Créer
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setTitre(''); }}
                    className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
            {createMsg && <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">{createMsg}</p>}
          </div>
        )}
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
            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 transition-colors truncate">
              {chapitre.titre}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Chapitre {index + 1}</p>
          </div>

          {/* Statut */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <BookOpen className="h-4 w-4 text-gray-300 group-hover:text-green-400 transition-colors" />
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
