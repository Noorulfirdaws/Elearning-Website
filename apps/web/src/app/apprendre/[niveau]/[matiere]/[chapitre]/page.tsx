'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronLeft, CheckCircle, XCircle, BookOpen, PenLine,
  HelpCircle, ExternalLink, ChevronDown, ChevronUp, Youtube,
} from 'lucide-react';
import axios from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';
import { cn } from '@/lib/utils';
import { useOfflineProgress } from '@/hooks/use-offline-progress';
import { useAcces } from '@/hooks/use-acces';
import Paywall from '@/components/payment/paywall';
import { useAuthStore } from '@/store/auth.store';

// ─── Types ────────────────────────────────────────────────────────────────────

const TABS = ['cours', 'exemples', 'exercices', 'quiz'] as const;
type Tab = typeof TABS[number];

const TAB_ICONS: Record<Tab, any> = {
  cours: BookOpen, exemples: PenLine, exercices: PenLine, quiz: HelpCircle,
};
const TAB_LABELS: Record<Tab, string> = {
  cours: 'Cours', exemples: 'Exemples', exercices: 'Exercices', quiz: 'Quiz',
};

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

  // Auth
  const { accessToken } = useAuthStore();

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

  // Vérification d'accès (offline-first via IndexedDB)
  const chapitrePremier = chapitre?.ordre === 1;
  const niveauIdReel    = chapitre?.matiere?.niveauId || niveauId;

  const { autorise, chargement: accesCh, rafraichir } = useAcces({
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

  // ─── Handlers ──────────────────────────────────────────────────────────────

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

  if (isLoading || (accesCh && !autorise && !chapitrePremier)) {
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

  if (!autorise && !accesDebloque) {
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
          router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`)
        }
      />
    );
  }

  // ─── Rendu principal ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* ─── En-tête sticky ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pt-20 pb-4 px-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto">
          <Link
            href={`/apprendre/${niveauId}/${matiereId}`}
            className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-2 text-sm transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {chapitre.matiere?.nom}
          </Link>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {chapitre.titre}
            </h1>

            {/* Badge score offline */}
            {progression?.meilleurScore !== null && progression?.meilleurScore !== undefined && (
              <span className={cn(
                'flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full',
                progression.estComplete
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
              )}>
                {progression.estComplete ? '✅' : '🔄'} {progression.meilleurScore}%
              </span>
            )}

            {typeof navigator !== 'undefined' && !navigator.onLine && (
              <span className="flex-shrink-0 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-1 rounded-full">
                📴 Hors-ligne
              </span>
            )}
          </div>

          {/* Onglets */}
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
            {TABS.map(tab => {
              const Icon = TAB_ICONS[tab];
              const hasContent =
                tab === 'cours'      ? true
                : tab === 'exemples'  ? exemples.length > 0
                : tab === 'exercices' ? exercices.length > 0
                : quiz.length > 0;

              if (!hasContent) return null;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                    activeTab === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {TAB_LABELS[tab]}
                  {tab === 'quiz' && quiz.length > 0 && (
                    <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                      {quiz.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Contenu ────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">

          {/* ══ COURS ══════════════════════════════════════════════════════ */}
          {activeTab === 'cours' && (
            <motion.div
              key="cours"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {/* Introduction */}
              {contenu?.introduction && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-2xl p-5 mb-6">
                  <p className="text-blue-900 dark:text-blue-100 leading-relaxed">
                    {contenu.introduction}
                  </p>
                </div>
              )}

              {/* Points clés */}
              <div className="space-y-4">
                {(contenu?.points_cles || []).map((point: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {point.titre}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                          {point.explication}
                        </p>
                        {point.formule && (
                          <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 font-mono text-sm text-gray-900 dark:text-white text-center font-semibold">
                            {point.formule}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Lien YouTube */}
              {chapitre.youtubeUrl && (
                <div className="mt-8 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Youtube className="h-6 w-6 text-red-600" />
                    <p className="font-semibold text-red-900 dark:text-red-100">Vidéo explicative</p>
                  </div>
                  {chapitre.youtubeMotsCles && (
                    <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                      Recherche : <em className="font-medium">{chapitre.youtubeMotsCles}</em>
                    </p>
                  )}
                  <a
                    href={chapitre.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Voir sur YouTube
                  </a>
                </div>
              )}

              {/* Bouton suivant */}
              {exemples.length > 0 && (
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => setActiveTab('exemples')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Voir les exemples →
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ EXEMPLES ═══════════════════════════════════════════════════ */}
          {activeTab === 'exemples' && (
            <motion.div
              key="exemples"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {exemples.map((ex: any, i: number) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm"
                >
                  <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-100 dark:border-amber-900 px-5 py-3">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                      Exemple {i + 1}
                    </p>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{ex.situation}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Résolution pas à pas
                    </p>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                      {ex.resolution_pas_a_pas}
                    </div>
                  </div>
                </div>
              ))}

              {exercices.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveTab('exercices')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Passer aux exercices →
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ EXERCICES ══════════════════════════════════════════════════ */}
          {activeTab === 'exercices' && (
            <motion.div
              key="exercices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {exercices.map((ex: any, i: number) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm"
                >
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                      Exercice {i + 1}
                    </p>
                    <p className="text-gray-900 dark:text-white font-medium leading-relaxed">
                      {ex.enonce}
                    </p>
                  </div>
                  <div className="px-5 py-3">
                    <button
                      onClick={() => toggleCorrige(i)}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors py-1"
                    >
                      {corrigesVus.has(i)
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />}
                      {corrigesVus.has(i) ? 'Masquer le corrigé' : 'Voir le corrigé'}
                    </button>

                    <AnimatePresence>
                      {corrigesVus.has(i) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 bg-green-50 dark:bg-green-950 rounded-xl p-4 border border-green-200 dark:border-green-800"
                        >
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">
                            ✅ Corrigé détaillé
                          </p>
                          <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-line leading-relaxed">
                            {ex.corrige_detaille}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ))}

              {quiz.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveTab('quiz')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Faire le quiz →
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ QUIZ ═══════════════════════════════════════════════════════ */}
          {activeTab === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {!quizStarted && !quizDone ? (
                /* Écran de démarrage */
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎯</div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Quiz de validation
                  </h2>
                  <p className="text-gray-500 mb-2">
                    {quiz.length} question{quiz.length > 1 ? 's' : ''} sur{' '}
                    <strong>{chapitre.titre}</strong>
                  </p>
                  <p className="text-sm text-gray-400 mb-8">Score minimum pour valider : 60%</p>
                  <button
                    onClick={() => setQuizStarted(true)}
                    className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    Commencer le quiz
                  </button>
                </div>
              ) : quizDone ? (
                /* Résultats */
                <QuizResultats
                  score={quizScore}
                  quiz={quiz}
                  reponses={reponses}
                  onRecommencer={recommencerQuiz}
                />
              ) : (
                /* Questions */
                <div className="space-y-6">
                  {quiz.map((q: any, i: number) => (
                    <QuizQuestion
                      key={i}
                      question={q}
                      index={i}
                      repChoisie={reponses[i]}
                      onChoisir={(opt: string) => choisirReponse(i, opt)}
                    />
                  ))}
                  <button
                    onClick={validerQuiz}
                    disabled={Object.keys(reponses).length < quiz.length}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
                  >
                    Valider mes réponses ({Object.keys(reponses).length}/{quiz.length})
                  </button>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
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
        <span className="text-blue-600 mr-2">{index + 1}.</span>
        {question.question}
      </p>
      <div className="space-y-2">
        {question.options.map((opt: string, j: number) => (
          <button
            key={j}
            onClick={() => onChoisir(opt)}
            className={cn(
              'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all',
              repChoisie === opt
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-gray-700 dark:text-gray-300',
            )}
          >
            <span className="font-bold mr-2 text-gray-400">{String.fromCharCode(65 + j)}.</span>
            {opt}
          </button>
        ))}
      </div>
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
        className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
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
