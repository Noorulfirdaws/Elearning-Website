'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BookOpen, Clock, Target, Flame, Zap, Trophy, ChevronRight,
  Play, CheckCircle, TrendingUp, TrendingDown, CalendarDays, Award,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import axios from '@/lib/api';
import { Navbar } from '@/components/layout/navbar';
import { cn } from '@/lib/utils';
import {
  Progression, totalXP, levelFromXP, rankForLevel, currentStreak,
  computeStats, computeBadges, topicsBreakdown, weekActivity, heatmapData,
  niveauIdFromChapitreId,
} from '@/lib/gamification';

const OBJECTIF_HEBDO = 5; // chapitres par semaine

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  const { data: progressions, isLoading } = useQuery<Progression[]>({
    queryKey: ['ma-progression'],
    queryFn: () => axios.get('/chapitres/progression/moi').then(r => r.data.data || []),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const g = useMemo(() => {
    const p = progressions || [];
    const xp = totalXP(p);
    const lvl = levelFromXP(xp);
    return {
      xp,
      ...lvl,
      rank: rankForLevel(lvl.level),
      streak: currentStreak(p),
      stats: computeStats(p),
      badges: computeBadges(p),
      topics: topicsBreakdown(p),
      week: weekActivity(p),
      heatmap: heatmapData(p),
    };
  }, [progressions]);

  // « Continuer » : progression la plus récente non complétée, sinon la plus récente
  const continueP = useMemo(() => {
    const p = [...(progressions || [])].sort(
      (a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime(),
    );
    return p.find(x => !x.estComplete) || p[0] || null;
  }, [progressions]);

  const badgesObtenus = g.badges.filter(b => b.obtenu);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-24 pb-16">

        {/* ─── Hero : salut + niveau + streak ─────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white mb-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -bottom-16 right-24 w-32 h-32 bg-white/5 rounded-full" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
            <div>
              <p className="text-green-100 text-sm mb-1">{g.rank.emoji} {g.rank.nom} · Niveau {g.level}</p>
              <h1 className="text-2xl sm:text-3xl font-bold mb-3">
                Bon retour, {user.firstName} 👋
              </h1>
              {/* Barre XP */}
              <div className="max-w-md">
                <div className="flex justify-between text-xs text-green-100 mb-1">
                  <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> {g.xp} XP</span>
                  <span>{g.currentXP}/{g.nextLevelXP} vers niv. {g.level + 1}</span>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${g.progressPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-yellow-300 rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Streak + badges compteurs */}
            <div className="flex items-center gap-4">
              <div className="bg-white/15 backdrop-blur rounded-2xl px-5 py-4 text-center">
                <div className="text-3xl mb-0.5">🔥</div>
                <div className="text-2xl font-bold leading-none">{g.streak}</div>
                <div className="text-[11px] text-green-100 mt-1">jour{g.streak > 1 ? 's' : ''} d&apos;affilée</div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-2xl px-5 py-4 text-center">
                <div className="text-3xl mb-0.5">🏅</div>
                <div className="text-2xl font-bold leading-none">{badgesObtenus.length}</div>
                <div className="text-[11px] text-green-100 mt-1">badge{badgesObtenus.length > 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Stats cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={CheckCircle} label="Chapitres terminés" value={String(g.stats.chapitresCompletes)} delay={0} />
          <StatCard icon={Clock} label="Temps d'étude" value={g.stats.minutesEtude >= 60 ? `${Math.floor(g.stats.minutesEtude / 60)}h ${g.stats.minutesEtude % 60}min` : `${g.stats.minutesEtude} min`} delay={0.05} />
          <StatCard icon={Target} label="Précision quiz" value={g.stats.precisionQuiz != null ? `${g.stats.precisionQuiz}%` : '—'} delay={0.1} />
          <StatCard icon={BookOpen} label="Matières actives" value={String(g.stats.matieresActives)} delay={0.15} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ─── Colonne principale ───────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Continuer l'apprentissage */}
            <Section titre="Continuer l'apprentissage" icone={Play}>
              {isLoading ? (
                <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
              ) : continueP?.chapitre ? (
                <ContinueCard p={continueP} />
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎒</div>
                  <p className="text-gray-500 mb-4">Tu n&apos;as pas encore commencé de chapitre.</p>
                  <Link href="/apprendre" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-700 transition-colors text-sm">
                    Choisir mon niveau <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </Section>

            {/* Objectif de la semaine */}
            <Section titre="Objectif de la semaine" icone={Target}>
              <div className="flex items-center gap-6">
                <ProgressRing value={g.week.chapitresCettesemaine} max={OBJECTIF_HEBDO} />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">
                    {g.week.chapitresCettesemaine >= OBJECTIF_HEBDO
                      ? '🎉 Objectif atteint, bravo !'
                      : `${OBJECTIF_HEBDO - g.week.chapitresCettesemaine} chapitre${OBJECTIF_HEBDO - g.week.chapitresCettesemaine > 1 ? 's' : ''} restant${OBJECTIF_HEBDO - g.week.chapitresCettesemaine > 1 ? 's' : ''}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {g.week.chapitresCettesemaine}/{OBJECTIF_HEBDO} chapitres terminés cette semaine ·{' '}
                    {g.week.joursActifsCetteSemaine} jour{g.week.joursActifsCetteSemaine > 1 ? 's' : ''} actif{g.week.joursActifsCetteSemaine > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Section>

            {/* Points forts / à travailler */}
            {g.topics.length > 0 && (
              <Section titre="Mes matières" icone={TrendingUp}>
                <div className="space-y-3">
                  {g.topics.map(t => (
                    <div key={`${t.niveau}-${t.matiere}`} className="flex items-center gap-3">
                      <div className="w-40 flex-shrink-0 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{t.matiere}</p>
                        <p className="text-[11px] text-gray-400">{t.niveau} · {t.nb} quiz</p>
                      </div>
                      <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all',
                            t.moyenne >= 80 ? 'bg-green-500' : t.moyenne >= 60 ? 'bg-yellow-400' : 'bg-red-400')}
                          style={{ width: `${t.moyenne}%` }}
                        />
                      </div>
                      <div className="w-16 text-right flex items-center justify-end gap-1">
                        {t.moyenne >= 80
                          ? <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                          : t.moyenne < 60 ? <TrendingDown className="w-3.5 h-3.5 text-red-400" /> : null}
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.moyenne}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                {g.topics.some(t => t.moyenne < 60) && (
                  <p className="text-xs text-gray-400 mt-4">
                    💡 Conseil : refais les quiz des matières en rouge pour consolider tes bases.
                  </p>
                )}
              </Section>
            )}

            {/* Calendrier d'activité */}
            <Section titre="Mon activité (12 semaines)" icone={CalendarDays}>
              <Heatmap data={g.heatmap} />
            </Section>
          </div>

          {/* ─── Colonne latérale ─────────────────────────────────────── */}
          <div className="space-y-6">
            {/* Badges */}
            <Section titre="Mes badges" icone={Award}>
              <div className="grid grid-cols-3 gap-3">
                {g.badges.map(b => (
                  <div
                    key={b.id}
                    title={`${b.nom} — ${b.description}`}
                    className={cn(
                      'aspect-square rounded-2xl flex flex-col items-center justify-center text-center p-2 border transition-all',
                      b.obtenu
                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-40 grayscale',
                    )}
                  >
                    <div className="text-2xl mb-1">{b.emoji}</div>
                    <div className="text-[9px] font-semibold text-gray-600 dark:text-gray-300 leading-tight">{b.nom}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                {badgesObtenus.length}/{g.badges.length} débloqués
              </p>
            </Section>

            {/* Missions du jour */}
            <Section titre="Missions du jour" icone={Flame}>
              <div className="space-y-2.5">
                <Mission done={g.week.joursActifsCetteSemaine > 0 && g.streak > 0} label="Étudier aujourd'hui" xp={10} />
                <Mission done={g.week.chapitresCettesemaine > 0} label="Terminer 1 chapitre cette semaine" xp={50} />
                <Mission done={(g.stats.precisionQuiz ?? 0) >= 80 && g.stats.quizFaits > 0} label="Moyenne quiz ≥ 80%" xp={30} />
              </div>
            </Section>

            {/* Raccourcis */}
            <Section titre="Raccourcis" icone={Trophy}>
              <div className="space-y-2">
                <Raccourci href="/apprendre" label="📚 Tous mes cours" />
                <Raccourci href="/catalog" label="🔎 Chercher un chapitre" />
                <Raccourci href="/settings" label="⚙️ Mon profil" />
              </div>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Sous-composants ──────────────────────────────────────────────────────── */

function Section({ titre, icone: Icon, children }: { titre: string; icone: any; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6"
    >
      <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-4">
        <Icon className="w-4 h-4 text-green-600" /> {titre}
      </h2>
      {children}
    </motion.section>
  );
}

function StatCard({ icon: Icon, label, value, delay }: { icon: any; label: string; value: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5"
    >
      <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-green-600" />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white leading-none mb-1">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </motion.div>
  );
}

function ContinueCard({ p }: { p: Progression }) {
  const niveauId = niveauIdFromChapitreId(p.chapitreId);

  // Résout l'id de la matière pour construire le lien /apprendre/[niveau]/[matiere]/[chapitre]
  const { data: matieres } = useQuery<any[]>({
    queryKey: ['matieres-niveau', niveauId],
    queryFn: () => axios.get(`/matieres/niveau/${niveauId}`).then(r => r.data.data || []),
    enabled: !!niveauId,
    staleTime: 10 * 60 * 1000,
  });
  const matiereId = matieres?.find(m => m.nom === p.chapitre?.matiere?.nom)?.id;
  const href = niveauId && matiereId
    ? `/apprendre/${niveauId}/${matiereId}/${p.chapitreId}`
    : '/apprendre';

  return (
    <Link href={href}>
      <div className="flex items-center gap-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-gray-900 rounded-2xl border border-green-100 dark:border-green-900 p-5 hover:shadow-md transition-all group cursor-pointer">
        <div className="w-12 h-12 rounded-2xl bg-green-600 flex items-center justify-center flex-shrink-0 shadow group-hover:scale-105 transition-transform">
          <Play className="w-5 h-5 text-white ml-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-green-700 dark:text-green-400 font-semibold uppercase tracking-wide mb-0.5">
            {p.chapitre?.matiere?.niveau?.nom} · {p.chapitre?.matiere?.nom}
          </p>
          <p className="font-bold text-gray-900 dark:text-white truncate">{p.chapitre?.titre}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {p.estComplete ? '✅ Terminé — réviser' : p.scoreQuiz != null ? `Quiz : ${p.scoreQuiz}% — continue !` : 'En cours'}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform flex-shrink-0" />
      </div>
    </Link>
  );
}

function ProgressRing({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg viewBox="0 0 80 80" className="w-24 h-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className="stroke-gray-100 dark:stroke-gray-800" />
        <motion.circle
          cx="40" cy="40" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
          className="stroke-green-500"
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          strokeDasharray={c}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900 dark:text-white">{pct}%</span>
      </div>
    </div>
  );
}

function Heatmap({ data }: { data: Array<{ date: string; count: number }> }) {
  // 84 jours → colonnes de 7 (semaines)
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  for (let i = 0; i < data.length; i += 7) weeks.push(data.slice(i, i + 7));
  const color = (c: number) =>
    c === 0 ? 'bg-gray-100 dark:bg-gray-800'
      : c === 1 ? 'bg-green-200 dark:bg-green-900'
        : c <= 3 ? 'bg-green-400 dark:bg-green-700'
          : 'bg-green-600 dark:bg-green-500';
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map(d => (
              <div
                key={d.date}
                title={`${d.date} — ${d.count} activité${d.count > 1 ? 's' : ''}`}
                className={cn('w-3.5 h-3.5 rounded-[4px]', color(d.count))}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-400">
        Moins
        <div className="w-3 h-3 rounded-[3px] bg-gray-100 dark:bg-gray-800" />
        <div className="w-3 h-3 rounded-[3px] bg-green-200 dark:bg-green-900" />
        <div className="w-3 h-3 rounded-[3px] bg-green-400 dark:bg-green-700" />
        <div className="w-3 h-3 rounded-[3px] bg-green-600 dark:bg-green-500" />
        Plus
      </div>
    </div>
  );
}

function Mission({ done, label, xp }: { done: boolean; label: string; xp: number }) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border p-3',
      done
        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
        : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800',
    )}>
      <div className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
        done ? 'bg-green-500' : 'border-2 border-gray-300 dark:border-gray-600',
      )}>
        {done && <CheckCircle className="w-4 h-4 text-white" />}
      </div>
      <span className={cn('flex-1 text-sm', done ? 'text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200')}>
        {label}
      </span>
      <span className="text-[11px] font-bold text-yellow-600 flex items-center gap-0.5">
        <Zap className="w-3 h-3" />{xp}
      </span>
    </div>
  );
}

function Raccourci({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/30 transition-colors">
      {label}
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </Link>
  );
}
