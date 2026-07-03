'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronLeft, CheckCircle, XCircle, BookOpen, PenLine,
  HelpCircle, ExternalLink, ChevronDown, ChevronUp, Youtube,
  Paperclip, Upload, Trash2, Download, Lock, FileText, FileSpreadsheet,
  Presentation, Image as ImageIcon, File,
} from 'lucide-react';
import axios from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';
import { ChapitreVideo } from '@/components/course/chapitre-video';
import { cn } from '@/lib/utils';
import { useOfflineProgress } from '@/hooks/use-offline-progress';
import { useAcces } from '@/hooks/use-acces';
import Paywall from '@/components/payment/paywall';
import { useAuthStore } from '@/store/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

const TABS = ['cours', 'exemples', 'exercices', 'quiz', 'ressources'] as const;
type Tab = typeof TABS[number];

const TAB_ICONS: Record<Tab, any> = {
  cours: BookOpen, exemples: PenLine, exercices: PenLine, quiz: HelpCircle, ressources: Paperclip,
};
const TAB_LABELS: Record<Tab, string> = {
  cours: 'Cours', exemples: 'Exemples', exercices: 'Exercices', quiz: 'Quiz', ressources: 'Ressources',
};

// Icônes par type de fichier
function FichierIcone({ type }: { type: string }) {
  if (type === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (['doc', 'docx'].includes(type)) return <FileText className="h-5 w-5 text-green-600" />;
  if (['xls', 'xlsx'].includes(type)) return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (['ppt', 'pptx'].includes(type)) return <Presentation className="h-5 w-5 text-orange-500" />;
  if (['jpg', 'jpeg', 'png', 'webp'].includes(type)) return <ImageIcon className="h-5 w-5 text-purple-500" />;
  return <File className="h-5 w-5 text-gray-400" />;
}

function formatTaille(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ChapitreDetailPage() {
  const router = useRouter();
  const { niveau: niveauId, matiere: matiereId, chapitre: chapitreId } = useParams<{
    niveau: string; matiere: string; chapitre: string;
  }>();

  const [activeTab,    setActiveTab]    = useState<Tab>('cours');
  const [corrigesVus,  setCorrigesVus]  = useState<Set<number>>(new Set());
  const [accesDebloque, setAccesDebloque] = useState(false);

  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizDone,    setQuizDone]    = useState(false);
  const [reponses,    setReponses]    = useState<Record<number, string>>({});
  const [quizScore,   setQuizScore]   = useState(0);

  // Upload état
  const [uploadFile,   setUploadFile]   = useState<File | null>(null);
  const [uploadNom,    setUploadNom]    = useState('');
  const [uploadAcces,  setUploadAcces]  = useState<'GRATUIT' | 'CHAPITRE' | 'CLASSE'>('CLASSE');
  const [uploading,    setUploading]    = useState(false);
  const [uploadMsg,    setUploadMsg]    = useState('');

  // PDF embed viewer
  const [previewFichier, setPreviewFichier] = useState<{ nom: string; blobUrl: string } | null>(null);

  // PDF export
  const [exportingPdf, setExportingPdf] = useState(false);

  // Auth
  const { accessToken, user } = useAuthStore();

  // Cache local IndexedDB (offline-first)
  const { progression, sauvegarderQuiz } = useOfflineProgress(chapitreId);

  // Données du chapitre
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['chapitre', chapitreId],
    queryFn:  () => axios.get(`/chapitres/${chapitreId}`).then(r => r.data.data),
  });

  const chapitre  = data;
  const contenu   = chapitre?.contenuCours as any;
  const exemples  = (chapitre?.exemples  as any[]) || [];
  const exercices = (chapitre?.exercices as any[]) || [];
  const quiz      = (chapitre?.quiz      as any[]) || [];
  const fichiers  = (chapitre?.fichiers  as any[]) || [];

  // Rôle utilisateur
  const userRole = (user as any)?.role || '';
  const estInstructeur = ['SUPER_ADMIN', 'ADMIN', 'INSTRUCTOR'].includes(userRole);

  // Accès CLASSE : raison indique si c'est ACCES_CLASSE ou ROLE_ADMIN
  const autoriseClasse =
    estInstructeur ||
    raison === 'ACCES_CLASSE' ||
    raison === 'ROLE_ADMIN' ||
    raison === 'ACCES_EXAMEN';

  // Vérification d'accès (offline-first via IndexedDB)
  const chapitrePremier = chapitre?.ordre === 1;
  const niveauIdReel    = chapitre?.matiere?.niveauId || niveauId;

  const { autorise, chargement: accesCh, rafraichir, raison } = useAcces({
    chapitreId,
    niveauId:           niveauIdReel,
    estPremierChapitre: chapitrePremier,
    token:              accessToken,
  });

  // Restaurer le dernier score si l'élève a déjà fait ce quiz
  useEffect(() => {
    if (progression?.quizDoneAt && progression.scoreQuiz !== null) {
      setQuizScore(progression.scoreQuiz);
      setQuizDone(true);
      setReponses(progression.reponses || {});
    }
  }, [progression]);

  const saveProgression = useMutation({
    mutationFn: (payload: any) =>
      axios.post(`/chapitres/${chapitreId}/progression`, payload).then(r => r.data),
  });

  // ─── Handlers Upload ──────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadMsg('');
    const form = new FormData();
    form.append('fichier', uploadFile);
    form.append('nom', uploadNom || uploadFile.name);
    form.append('acces', uploadAcces);
    try {
      await axios.post(`/chapitres/${chapitreId}/fichiers`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMsg('✅ Fichier ajouté avec succès !');
      setUploadFile(null);
      setUploadNom('');
      // Reload chapitre data
      window.location.reload();
    } catch (e: any) {
      setUploadMsg('❌ Erreur : ' + (e.response?.data?.message || e.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFichier = async (fichierId: string) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    await axios.delete(`/chapitres/${chapitreId}/fichiers/${fichierId}`);
    window.location.reload();
  };

  const handleDownload = async (fichier: any) => {
    const url = `/chapitres/${chapitreId}/fichiers/${fichier.id}/download`;
    try {
      const res = await axios.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fichier.nom;
      link.click();
    } catch {
      alert('Accès refusé ou fichier non disponible.');
    }
  };

  const handlePreview = async (fichier: any) => {
    const url = `/chapitres/${chapitreId}/fichiers/${fichier.id}/download`;
    try {
      const res = await axios.get(url, { responseType: 'blob' });
      const mimeType = fichier.type === 'pdf' ? 'application/pdf' : res.data.type;
      const blob = new Blob([res.data], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      setPreviewFichier({ nom: fichier.nom, blobUrl });
    } catch {
      alert('Impossible d\'afficher ce fichier.');
    }
  };

  const closePreview = () => {
    if (previewFichier) URL.revokeObjectURL(previewFichier.blobUrl);
    setPreviewFichier(null);
  };

  const handleExportPdf = () => {
    setExportingPdf(true);
    window.print();
    setTimeout(() => setExportingPdf(false), 2000);
  };

  // ─── Handlers Quiz ──────────────────────────────────────────────────────────

  const toggleCorrige = (i: number) => {
    setCorrigesVus(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const choisirReponse = (qIdx: number, option: string) => {
    if (quizDone) return;
    setReponses(prev => ({ ...prev, [qIdx]: option }));
  };

  const validerQuiz = async () => {
    let correct = 0;
    quiz.forEach((q: any, i: number) => {
      if (reponses[i] === q.reponse_correcte) correct++;
    });
    const score = Math.round((correct / quiz.length) * 100);
    setQuizScore(score);
    setQuizDone(true);

    // Sauvegarde locale immédiate + sync API en arrière-plan
    await sauvegarderQuiz(
      score,
      reponses,
      () => saveProgression.mutateAsync({ estComplete: score >= 60, scoreQuiz: score }),
    );
  };

  const recommencerQuiz = () => {
    setReponses({});
    setQuizDone(false);
    setQuizScore(0);
  };

  // ─── États de chargement ───────────────────────────────────────────────────

  if (isLoading || (accesCh && !autorise && !chapitrePremier && !estInstructeur)) {
    return <LoadingSkeleton />;
  }

  if (!chapitre || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chapitre introuvable ou non disponible.</p>
      </div>
    );
  }

  // ─── Mur de paiement ───────────────────────────────────────────────────────

  if (!autorise && !accesDebloque && !estInstructeur) {
    return (
      <Paywall
        chapitreId={chapitreId}
        niveauId={niveauIdReel}
        niveauNom={chapitre.matiere?.niveau?.nom || niveauId}
        chapitreNom={chapitre.titre}
        token={accessToken}
        onAccesDebloque={() => {
          setAccesDebloque(true);
          rafraichir();
        }}
        onConnexion={() =>
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
        }
      />
    );
  }

  // ─── Rendu principal ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-gray-950">
      {/* CSS d'impression PDF */}
      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; }
          .max-w-5xl { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>
      <Navbar />

      {/* ─── Barre de navigation du cours ───────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pt-16 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6">
          {/* Fil d'ariane */}
          <div className="flex items-center gap-2 text-sm text-gray-400 pt-3 pb-2">
            <Link href="/apprendre" className="hover:text-green-600 transition-colors">Apprendre</Link>
            <span>/</span>
            <Link href={`/apprendre/${niveauId}`} className="hover:text-green-600 transition-colors capitalize">
              {chapitre.matiere?.niveau?.nom || niveauId}
            </Link>
            <span>/</span>
            <Link href={`/apprendre/${niveauId}/${matiereId}`} className="hover:text-green-600 transition-colors">
              {chapitre.matiere?.nom}
            </Link>
            <span>/</span>
            <span className="text-gray-600 dark:text-gray-300 truncate max-w-xs">{chapitre.titre}</span>
          </div>

          {/* Titre + badges */}
          <div className="flex items-center justify-between gap-3 pb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {chapitre.titre}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              {progression?.meilleurScore != null && (
                <span className={cn(
                  'text-xs font-bold px-3 py-1 rounded-full',
                  progression.estComplete
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
                )}>
                  {progression.estComplete ? '✅' : '🔄'} {progression.meilleurScore}%
                </span>
              )}
              {typeof navigator !== 'undefined' && !navigator.onLine && (
                <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-full">
                  📴 Hors-ligne
                </span>
              )}
            </div>
          </div>

          {/* Méta leçon : durée estimée · difficulté · XP */}
          <div className="flex flex-wrap items-center gap-2 pb-3 text-[11px]">
            <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full font-medium">
              ⏱️ ~{Math.max(10, 8 + (chapitre.contenuCours?.points_cles?.length || 0) * 4 + exemples.length * 3 + quiz.length)} min
            </span>
            <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full font-medium">
              {chapitre.ordre <= 3 ? '🟢 Facile' : chapitre.ordre <= 7 ? '🟡 Intermédiaire' : '🔴 Avancé'}
            </span>
            <span className="inline-flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 px-2.5 py-1 rounded-full font-bold">
              ⚡ +{50 + (quiz.length > 0 ? 50 : 0)} XP max
            </span>
            {exercices.length > 0 && (
              <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full font-medium">
                ✍️ {exercices.length} exercice{exercices.length > 1 ? 's' : ''} corrigé{exercices.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Onglets */}
          <div className="flex gap-0 mt-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = TAB_ICONS[tab];
              const hasContent =
                tab === 'cours'       ? true
                : tab === 'exemples'  ? exemples.length > 0
                : tab === 'exercices' ? exercices.length > 0
                : tab === 'quiz'      ? quiz.length > 0
                : true; // ressources — toujours visible
              if (!hasContent) return null;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2',
                    activeTab === tab
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {TAB_LABELS[tab]}
                  {tab === 'quiz' && quiz.length > 0 && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full font-bold',
                      activeTab === tab ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
                    )}>
                      {quiz.length}
                    </span>
                  )}
                  {tab === 'ressources' && fichiers.length > 0 && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full font-bold',
                      activeTab === tab ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
                    )}>
                      {fichiers.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Contenu — Style document A4 ────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">

          {/* ══ COURS — Style document A4 ══════════════════════════════════ */}
          {activeTab === 'cours' && (
            <motion.div
              key="cours"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Feuille A4 */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">

                {/* En-tête du document */}
                <div className="bg-gradient-to-r from-green-700 to-green-500 px-10 py-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-200 text-xs font-medium uppercase tracking-widest">
                      {chapitre.matiere?.niveau?.nom || niveauId} · {chapitre.matiere?.nom} · Chapitre {chapitre.ordre}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white leading-snug">{chapitre.titre}</h2>
                </div>

                {/* Corps du document */}
                <div className="px-10 py-10">

                  {/* Introduction */}
                  {contenu?.introduction && (
                    <div className="mb-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-1 w-8 bg-green-600 rounded-full" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-green-600">Introduction</h3>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed border-l-4 border-green-200 dark:border-green-700 pl-6 italic">
                        {contenu.introduction}
                      </p>
                    </div>
                  )}

                  {/* Points clés */}
                  {(contenu?.points_cles || []).length > 0 && (
                    <div className="mb-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-1 w-8 bg-green-600 rounded-full" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-green-600">Points clés du cours</h3>
                      </div>
                      <div className="space-y-6">
                        {(contenu?.points_cles || []).map((point: any, i: number) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="flex gap-5"
                          >
                            {/* Numéro */}
                            <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                              {i + 1}
                            </div>
                            {/* Contenu */}
                            <div className="flex-1 pt-1">
                              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                                {point.titre}
                              </h4>
                              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-base">
                                {point.explication}
                              </p>
                              {point.formule && (
                                <div className="mt-4 bg-amber-50 dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700 rounded-xl px-6 py-4 text-center">
                                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide mb-1">Formule à retenir</p>
                                  <p className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                                    {point.formule}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vidéos intégrées (YouTube + Khan Academy) */}
                  <ChapitreVideo
                    youtubeUrl={chapitre.youtubeUrl}
                    khanAcademyUrl={chapitre.khanAcademyUrl}
                    motsCles={chapitre.youtubeMotsCles}
                    titre={chapitre.titre}
                  />

                  {/* Pied de page document */}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mt-6 flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      NoorAcademie Djibouti · Programme officiel {chapitre.matiere?.niveau?.nom || niveauId}
                    </p>
                    {exemples.length > 0 && (
                      <button
                        onClick={() => setActiveTab('exemples')}
                        className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                      >
                        Voir les exemples <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ EXEMPLES — Style document ══════════════════════════════════ */}
          {activeTab === 'exemples' && (
            <motion.div key="exemples" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-amber-400 px-10 py-5">
                  <p className="text-amber-100 text-xs font-medium uppercase tracking-widest mb-0.5">{chapitre.matiere?.nom} · Chapitre {chapitre.ordre}</p>
                  <h2 className="text-xl font-bold text-white">Exemples résolus <span className="text-amber-100 text-sm font-normal">· {exemples.length} exemple{exemples.length > 1 ? 's' : ''}</span></h2>
                </div>
                <div className="px-10 py-10 space-y-10">
                  {exemples.map((ex: any, i: number) => (
                    <div key={i}>
                      <div className="flex items-start gap-5">
                        <div className="flex-shrink-0 w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                            {ex.situation}
                          </h4>
                          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-3">
                              📋 Résolution pas à pas
                            </p>
                            <p className="text-gray-700 dark:text-gray-300 leading-loose whitespace-pre-line text-base">
                              {ex.resolution_pas_a_pas}
                            </p>
                          </div>
                        </div>
                      </div>
                      {i < exemples.length - 1 && <div className="border-t border-dashed border-gray-200 dark:border-gray-700 mt-10" />}
                    </div>
                  ))}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex justify-between items-center">
                    <button onClick={() => setActiveTab('cours')} className="text-gray-400 hover:text-green-600 text-sm flex items-center gap-1 transition-colors">
                      <ChevronLeft className="h-4 w-4" /> Retour au cours
                    </button>
                    {exercices.length > 0 && (
                      <button onClick={() => setActiveTab('exercices')} className="bg-amber-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition-colors text-sm flex items-center gap-2">
                        Passer aux exercices <ChevronDown className="h-4 w-4 -rotate-90" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ EXERCICES — Style document ═════════════════════════════════ */}
          {activeTab === 'exercices' && (
            <motion.div key="exercices" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="bg-gradient-to-r from-green-700 to-green-500 px-10 py-5">
                  <p className="text-green-100 text-xs font-medium uppercase tracking-widest mb-0.5">{chapitre.matiere?.nom} · Chapitre {chapitre.ordre}</p>
                  <h2 className="text-xl font-bold text-white">Exercices d'application <span className="text-green-100 text-sm font-normal">· {exercices.length} exercice{exercices.length > 1 ? 's' : ''}</span></h2>
                </div>
                <div className="px-10 py-10 space-y-8">
                  {exercices.map((ex: any, i: number) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                      {/* Énoncé */}
                      <div className="px-7 py-5 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {i + 1}
                          </div>
                          <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Exercice {i + 1}</p>
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium leading-relaxed text-base">
                          {ex.enonce}
                        </p>
                      </div>
                      {/* Corrigé */}
                      <div className="px-7 py-4">
                        <button
                          onClick={() => toggleCorrige(i)}
                          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-600 transition-colors py-1"
                        >
                          {corrigesVus.has(i) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {corrigesVus.has(i) ? 'Masquer le corrigé' : '📖 Voir le corrigé détaillé'}
                        </button>
                        <AnimatePresence>
                          {corrigesVus.has(i) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 bg-green-50 dark:bg-green-950 rounded-xl p-6 border border-green-200 dark:border-green-800"
                            >
                              <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest mb-3">✅ Corrigé détaillé</p>
                              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line leading-loose text-base">
                                {ex.corrige_detaille}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 dark:border-gray-800 pt-6 flex justify-between items-center">
                    <button onClick={() => setActiveTab('exemples')} className="text-gray-400 hover:text-green-600 text-sm flex items-center gap-1 transition-colors">
                      <ChevronLeft className="h-4 w-4" /> Retour aux exemples
                    </button>
                    {quiz.length > 0 && (
                      <button onClick={() => setActiveTab('quiz')} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors text-sm flex items-center gap-2">
                        Faire le quiz <ChevronDown className="h-4 w-4 -rotate-90" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ QUIZ — Style document ══════════════════════════════════════ */}
          {activeTab === 'quiz' && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-10 py-5">
                  <p className="text-purple-100 text-xs font-medium uppercase tracking-widest mb-0.5">{chapitre.matiere?.nom} · Chapitre {chapitre.ordre}</p>
                  <h2 className="text-xl font-bold text-white">Quiz de validation <span className="text-purple-100 text-sm font-normal">· {quiz.length} questions · Score min. 60%</span></h2>
                </div>
                <div className="px-10 py-10">
              {!quizStarted && !quizDone ? (
                <div className="text-center py-12">
                  <div className="text-7xl mb-6">🎯</div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Prêt à vous tester ?</h3>
                  <p className="text-gray-500 mb-8 text-lg">{quiz.length} questions sur <strong>{chapitre.titre}</strong></p>
                  <button
                    onClick={() => setQuizStarted(true)}
                    className="bg-purple-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-purple-700 transition-colors shadow-lg"
                  >
                    Commencer le quiz →
                  </button>
                </div>
              ) : quizDone ? (
                <QuizResultats score={quizScore} quiz={quiz} reponses={reponses} onRecommencer={recommencerQuiz} />
              ) : (
                <div className="space-y-6">
                  {quiz.map((q: any, i: number) => (
                    <QuizQuestion key={i} question={q} index={i} repChoisie={reponses[i]} onChoisir={(opt: string) => choisirReponse(i, opt)} />
                  ))}
                  <button
                    onClick={validerQuiz}
                    disabled={Object.keys(reponses).length < quiz.length}
                    className="w-full bg-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
                  >
                    Valider mes réponses ({Object.keys(reponses).length}/{quiz.length})
                  </button>
                </div>
              )}
                </div>{/* fin px-10 py-10 */}
              </div>{/* fin carte blanche */}
            </motion.div>
          )}

          {/* ══ RESSOURCES — Fichiers + PDF ════════════════════════════════ */}
          {activeTab === 'ressources' && (
            <motion.div key="ressources" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">

                {/* En-tête */}
                <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 px-10 py-5">
                  <p className="text-emerald-100 text-xs font-medium uppercase tracking-widest mb-0.5">
                    {chapitre.matiere?.nom} · Chapitre {chapitre.ordre}
                  </p>
                  <h2 className="text-xl font-bold text-white">
                    Ressources pédagogiques{' '}
                    <span className="text-emerald-100 text-sm font-normal">· Fiches & PDF</span>
                  </h2>
                </div>

                <div className="px-10 py-10 space-y-8">

                  {/* ─── Téléchargement PDF du cours (accès CLASSE) ── */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">
                      📄 Exporter le cours en PDF
                    </h3>
                    {autoriseClasse || estInstructeur ? (
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleExportPdf}
                          disabled={exportingPdf}
                          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors text-sm disabled:opacity-60"
                        >
                          <Download className="h-4 w-4" />
                          {exportingPdf ? 'Préparation...' : 'Télécharger le cours (PDF)'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4">
                        <Lock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                            Accès Classe requis — 5 000 DJF
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            Achète l'accès à toute l'année pour débloquer les PDF et les fiches
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─── Liste des fichiers ─────────────────────────── */}
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">
                      📎 Fiches téléchargeables ({fichiers.length})
                    </h3>

                    {fichiers.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">Aucune fiche disponible pour l'instant.</p>
                    ) : (
                      <div className="space-y-3">
                        {fichiers.map((f: any) => {
                          const accessible =
                            estInstructeur ||
                            f.acces === 'GRATUIT' ||
                            (f.acces === 'CLASSE' && autoriseClasse) ||
                            (f.acces === 'CHAPITRE' && autorise);

                          return (
                            <div
                              key={f.id}
                              className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <FichierIcone type={f.type} />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{f.nom}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400">{f.type?.toUpperCase()} · {formatTaille(f.taille)}</span>
                                  <span className={cn(
                                    'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                                    f.acces === 'GRATUIT' ? 'bg-green-100 text-green-700' :
                                    f.acces === 'CLASSE'  ? 'bg-amber-100 text-amber-700' :
                                    'bg-green-100 text-green-700',
                                  )}>
                                    {f.acces === 'GRATUIT' ? 'Gratuit' : f.acces === 'CLASSE' ? 'Classe 5000 DJF' : 'Chapitre'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {accessible ? (
                                  <>
                                    {f.type === 'pdf' && (
                                      <button
                                        onClick={() => handlePreview(f)}
                                        className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                                      >
                                        <FileText className="h-3.5 w-3.5" /> Aperçu
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDownload(f)}
                                      className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                                    >
                                      <Download className="h-3.5 w-3.5" /> Télécharger
                                    </button>
                                  </>
                                ) : (
                                  <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
                                    <Lock className="h-3.5 w-3.5" /> Accès requis
                                  </span>
                                )}
                                {estInstructeur && (
                                  <button
                                    onClick={() => handleDeleteFichier(f.id)}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ─── Zone upload (instructeurs uniquement) ──────── */}
                  {estInstructeur && (
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-8">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">
                        📤 Ajouter une fiche
                      </h3>
                      <div className="space-y-4 bg-emerald-50 dark:bg-emerald-950 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
                        {/* Choisir fichier */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                            Fichier (PDF, Word, Excel, PPT, image — max 20 Mo)
                          </label>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                            onChange={e => {
                              const f = e.target.files?.[0] || null;
                              setUploadFile(f);
                              if (f && !uploadNom) setUploadNom(f.name.replace(/\.[^/.]+$/, ''));
                            }}
                            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer"
                          />
                        </div>
                        {/* Nom affiché */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                            Nom affiché aux élèves
                          </label>
                          <input
                            type="text"
                            value={uploadNom}
                            onChange={e => setUploadNom(e.target.value)}
                            placeholder="ex : Fiche de révision Chapitre 3"
                            className="w-full px-4 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none"
                          />
                        </div>
                        {/* Niveau d'accès */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                            Niveau d'accès
                          </label>
                          <select
                            value={uploadAcces}
                            onChange={e => setUploadAcces(e.target.value as any)}
                            className="w-full px-4 py-2 border border-emerald-200 dark:border-emerald-700 rounded-lg text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none"
                          >
                            <option value="GRATUIT">Gratuit (tous les élèves)</option>
                            <option value="CHAPITRE">Chapitre uniquement (1 000 DJF)</option>
                            <option value="CLASSE">Classe (5 000 DJF)</option>
                          </select>
                        </div>
                        {/* Bouton upload */}
                        <button
                          onClick={handleUpload}
                          disabled={uploading || !uploadFile}
                          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          <Upload className="h-4 w-4" />
                          {uploading ? 'Envoi en cours...' : 'Ajouter le fichier'}
                        </button>
                        {uploadMsg && (
                          <p className={cn('text-sm font-medium', uploadMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600')}>
                            {uploadMsg}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>{/* fin max-w-5xl */}

      {/* ─── Modal Aperçu PDF ─────────────────────────────────────────── */}
      {previewFichier && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Barre du modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-emerald-600 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 flex-shrink-0" />
                <span className="font-semibold truncate">{previewFichier.nom}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewFichier.blobUrl}
                  download={previewFichier.nom}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger
                </a>
                <button
                  onClick={closePreview}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-xl font-bold leading-none"
                  title="Fermer"
                >
                  ×
                </button>
              </div>
            </div>
            {/* Iframe PDF */}
            <iframe
              src={previewFichier.blobUrl}
              className="flex-1 w-full"
              title={previewFichier.nom}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composants internes ──────────────────────────────────────────────────────

function QuizQuestion({
  question,
  index,
  repChoisie,
  onChoisir,
}: {
  question: any;
  index: number;
  repChoisie: string | undefined;
  onChoisir: (opt: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <p className="font-semibold text-gray-900 dark:text-white mb-4">
        <span className="text-green-600 mr-2">{index + 1}.</span>
        {question.question}
      </p>
      <div className="space-y-2">
        {question.options.map((opt: string, j: number) => {
          const repondu   = repChoisie !== undefined && repChoisie !== null;
          const estBonne  = opt === question.reponse_correcte;
          const estChoisie = repChoisie === opt;
          let style = 'border-gray-200 dark:border-gray-700 hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/30 text-gray-700 dark:text-gray-300';
          if (repondu) {
            if (estBonne) {
              // La bonne réponse est toujours en vert une fois répondu
              style = 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300';
            } else if (estChoisie) {
              // Le choix de l'élève, mauvais → rouge
              style = 'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300';
            } else {
              style = 'border-gray-200 dark:border-gray-700 text-gray-400 opacity-60';
            }
          }
          return (
            <button
              key={j}
              onClick={() => onChoisir(opt)}
              disabled={repondu}
              className={cn('w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all', style)}
            >
              <span className="font-bold mr-2 text-gray-400">{String.fromCharCode(65 + j)}.</span>
              {opt}
              {repondu && estBonne && <span className="ml-2">✓</span>}
              {repondu && estChoisie && !estBonne && <span className="ml-2">✗</span>}
            </button>
          );
        })}
      </div>
      {repChoisie !== undefined && repChoisie !== null && question.explication_pedagogique && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          💡 {question.explication_pedagogique}
        </p>
      )}
    </div>
  );
}

function QuizResultats({
  score,
  quiz,
  reponses,
  onRecommencer,
}: {
  score: number;
  quiz: any[];
  reponses: Record<number, string>;
  onRecommencer: () => void;
}) {
  const reussi = score >= 60;

  return (
    <div>
      {/* Score */}
      <div className={cn(
        'rounded-2xl p-8 text-center mb-8',
        reussi
          ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800',
      )}>
        <div className="text-6xl mb-3">{reussi ? '🏆' : '📚'}</div>
        <div className={cn(
          'text-5xl font-bold mb-2',
          reussi ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
        )}>
          {score}%
        </div>
        <p className={cn(
          'text-lg font-semibold mb-1',
          reussi ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300',
        )}>
          {reussi ? 'Bravo ! Chapitre validé ✅' : 'Continue à réviser 💪'}
        </p>
        <p className="text-sm text-gray-500">
          {quiz.filter((_: any, i: number) => reponses[i] === quiz[i].reponse_correcte).length} bonne
          {quiz.filter((_: any, i: number) => reponses[i] === quiz[i].reponse_correcte).length > 1 ? 's' : ''}{' '}
          réponse
          {quiz.filter((_: any, i: number) => reponses[i] === quiz[i].reponse_correcte).length > 1 ? 's' : ''}{' '}
          sur {quiz.length}
        </p>
      </div>

      {/* Corrections */}
      <div className="space-y-4 mb-8">
        {quiz.map((q: any, i: number) => {
          const correct = reponses[i] === q.reponse_correcte;
          return (
            <div
              key={i}
              className={cn(
                'rounded-2xl border p-4',
                correct
                  ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
              )}
            >
              <div className="flex items-start gap-3 mb-2">
                {correct
                  ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  : <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />}
                <p className="font-medium text-sm text-gray-900 dark:text-white">{q.question}</p>
              </div>
              {!correct && (
                <p className="text-sm text-gray-600 dark:text-gray-400 ml-8 mb-1">
                  Ta réponse :{' '}
                  <span className="text-red-600 font-medium">{reponses[i]}</span>
                  {' | '}
                  Bonne réponse :{' '}
                  <span className="text-green-700 dark:text-green-400 font-medium">
                    {q.reponse_correcte}
                  </span>
                </p>
              )}
              <p className="text-xs text-gray-500 ml-8 italic">{q.explication_pedagogique}</p>
            </div>
          );
        })}
      </div>

      <button
        onClick={onRecommencer}
        className="w-full border-2 border-green-600 text-green-600 py-3 rounded-xl font-semibold hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
      >
        Recommencer le quiz
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="h-32 bg-white border-b animate-pulse" />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
