/**
 * gamification.ts — Moteur de gamification NoorAcademie
 *
 * Calcule XP, niveaux, rangs, streaks, badges et statistiques d'apprentissage
 * à partir des progressions de l'élève (GET /chapitres/progression/moi).
 *
 * 100% côté client — aucune dépendance backend nouvelle, aucun appel IA.
 *
 * Modèle XP :
 *   +50 XP  par chapitre complété
 *   +0-50 XP bonus quiz (score / 2)
 *   +1 XP   par minute de lecture (plafonné à 30/chapitre)
 */

export interface Progression {
  id: string;
  chapitreId: string;
  estComplete: boolean;
  scoreQuiz: number | null;
  tentativesQuiz: number;
  tempsLecture: number; // secondes
  completedAt: string | null;
  createdAt: string;
  chapitre?: {
    id: string;
    titre: string;
    matiere?: { nom: string; niveau?: { nom: string } };
  };
}

// ─── XP & Niveaux ─────────────────────────────────────────────────────────────

export function xpForProgression(p: Progression): number {
  let xp = 0;
  if (p.estComplete) xp += 50;
  if (p.scoreQuiz != null) xp += Math.round(p.scoreQuiz / 2);
  xp += Math.min(30, Math.floor((p.tempsLecture || 0) / 60));
  return xp;
}

export function totalXP(progressions: Progression[]): number {
  return progressions.reduce((s, p) => s + xpForProgression(p), 0);
}

/** XP cumulé requis pour ATTEINDRE le niveau n (niveau 1 = 0 XP). Courbe douce. */
export function xpRequiredForLevel(level: number): number {
  // 0, 100, 250, 450, 700, 1000, 1350, ... (+50 d'écart à chaque palier)
  return 25 * (level - 1) * (level + 2);
}

export function levelFromXP(xp: number): { level: number; currentXP: number; nextLevelXP: number; progressPct: number } {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) level++;
  const base = xpRequiredForLevel(level);
  const next = xpRequiredForLevel(level + 1);
  const currentXP = xp - base;
  const nextLevelXP = next - base;
  return { level, currentXP, nextLevelXP, progressPct: Math.min(100, Math.round((currentXP / nextLevelXP) * 100)) };
}

const RANKS: Array<{ min: number; nom: string; emoji: string }> = [
  { min: 1, nom: 'Débutant', emoji: '🌱' },
  { min: 3, nom: 'Apprenti', emoji: '📘' },
  { min: 5, nom: 'Étudiant', emoji: '🎒' },
  { min: 8, nom: 'Savant', emoji: '📗' },
  { min: 12, nom: 'Expert', emoji: '🎓' },
  { min: 17, nom: 'Maître', emoji: '🏅' },
  { min: 25, nom: 'Légende', emoji: '👑' },
];

export function rankForLevel(level: number): { nom: string; emoji: string } {
  let r = RANKS[0];
  for (const rank of RANKS) if (level >= rank.min) r = rank;
  return r;
}

// ─── Streak (jours consécutifs d'activité) ────────────────────────────────────

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function activityDays(progressions: Progression[]): Set<string> {
  const days = new Set<string>();
  for (const p of progressions) {
    if (p.createdAt) days.add(dayKey(new Date(p.createdAt)));
    if (p.completedAt) days.add(dayKey(new Date(p.completedAt)));
  }
  return days;
}

/** Streak courant : jours consécutifs jusqu'à aujourd'hui (ou hier, tolérance 1 jour). */
export function currentStreak(progressions: Progression[]): number {
  const days = activityDays(progressions);
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  // Si pas d'activité aujourd'hui, on autorise à commencer hier
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ─── Statistiques ─────────────────────────────────────────────────────────────

export interface Stats {
  chapitresCompletes: number;
  chapitresCommences: number;
  minutesEtude: number;
  precisionQuiz: number | null; // % moyen
  quizFaits: number;
  matieresActives: number;
}

export function computeStats(progressions: Progression[]): Stats {
  const completes = progressions.filter(p => p.estComplete);
  const avecQuiz = progressions.filter(p => p.scoreQuiz != null);
  const matieres = new Set(progressions.map(p => p.chapitre?.matiere?.nom).filter(Boolean));
  return {
    chapitresCompletes: completes.length,
    chapitresCommences: progressions.length,
    minutesEtude: Math.round(progressions.reduce((s, p) => s + (p.tempsLecture || 0), 0) / 60),
    precisionQuiz: avecQuiz.length
      ? Math.round(avecQuiz.reduce((s, p) => s + (p.scoreQuiz || 0), 0) / avecQuiz.length)
      : null,
    quizFaits: avecQuiz.length,
    matieresActives: matieres.size,
  };
}

/** Points forts / à travailler par matière (moyenne des scores quiz). */
export function topicsBreakdown(progressions: Progression[]): Array<{ matiere: string; niveau: string; moyenne: number; nb: number }> {
  const map = new Map<string, { matiere: string; niveau: string; total: number; nb: number }>();
  for (const p of progressions) {
    if (p.scoreQuiz == null || !p.chapitre?.matiere?.nom) continue;
    const key = `${p.chapitre.matiere.niveau?.nom || ''}|${p.chapitre.matiere.nom}`;
    const e = map.get(key) || { matiere: p.chapitre.matiere.nom, niveau: p.chapitre.matiere.niveau?.nom || '', total: 0, nb: 0 };
    e.total += p.scoreQuiz;
    e.nb++;
    map.set(key, e);
  }
  return Array.from(map.values())
    .map(e => ({ matiere: e.matiere, niveau: e.niveau, moyenne: Math.round(e.total / e.nb), nb: e.nb }))
    .sort((a, b) => b.moyenne - a.moyenne);
}

/** Activité des 7 derniers jours (pour l'objectif hebdo). */
export function weekActivity(progressions: Progression[]): { chapitresCettesemaine: number; joursActifsCetteSemaine: number } {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const days = new Set<string>();
  let chapitres = 0;
  for (const p of progressions) {
    const d = p.completedAt ? new Date(p.completedAt) : null;
    if (d && d >= weekAgo) { chapitres++; days.add(dayKey(d)); }
    const c = new Date(p.createdAt);
    if (c >= weekAgo) days.add(dayKey(c));
  }
  return { chapitresCettesemaine: chapitres, joursActifsCetteSemaine: days.size };
}

/** Heatmap : les 12 dernières semaines (84 jours), intensité 0-3 par jour. */
export function heatmapData(progressions: Progression[]): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const p of progressions) {
    for (const raw of [p.createdAt, p.completedAt]) {
      if (!raw) continue;
      const k = dayKey(new Date(raw));
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  const out: Array<{ date: string; count: number }> = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 83);
  for (let i = 0; i < 84; i++) {
    const k = dayKey(cursor);
    out.push({ date: k, count: counts.get(k) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  nom: string;
  emoji: string;
  description: string;
  obtenu: boolean;
}

export function computeBadges(progressions: Progression[]): Badge[] {
  const stats = computeStats(progressions);
  const streak = currentStreak(progressions);
  const parfait = progressions.some(p => (p.scoreQuiz ?? 0) >= 100);
  const excellent = progressions.filter(p => (p.scoreQuiz ?? 0) >= 80).length;

  // Matière maîtrisée : ≥5 chapitres complétés dans une même matière
  const parMatiere = new Map<string, number>();
  for (const p of progressions) {
    if (!p.estComplete || !p.chapitre?.matiere?.nom) continue;
    const k = `${p.chapitre.matiere.niveau?.nom}|${p.chapitre.matiere.nom}`;
    parMatiere.set(k, (parMatiere.get(k) || 0) + 1);
  }
  const matiereMaitrisee = Array.from(parMatiere.values()).some(n => n >= 5);

  return [
    { id: 'premier-pas', nom: 'Premier pas', emoji: '👣', description: 'Terminer ton premier chapitre', obtenu: stats.chapitresCompletes >= 1 },
    { id: 'en-route', nom: 'En route', emoji: '🚀', description: 'Terminer 5 chapitres', obtenu: stats.chapitresCompletes >= 5 },
    { id: 'studieux', nom: 'Studieux', emoji: '📚', description: 'Terminer 10 chapitres', obtenu: stats.chapitresCompletes >= 10 },
    { id: 'infatigable', nom: 'Infatigable', emoji: '💪', description: 'Terminer 25 chapitres', obtenu: stats.chapitresCompletes >= 25 },
    { id: 'champion', nom: 'Champion', emoji: '🏆', description: 'Terminer 50 chapitres', obtenu: stats.chapitresCompletes >= 50 },
    { id: 'sans-faute', nom: 'Sans faute', emoji: '💯', description: 'Obtenir 100% à un quiz', obtenu: parfait },
    { id: 'cerveau', nom: 'Cerveau', emoji: '🧠', description: '10 quiz à 80% ou plus', obtenu: excellent >= 10 },
    { id: 'flamme-3', nom: 'Flamme', emoji: '🔥', description: '3 jours d\'affilée', obtenu: streak >= 3 },
    { id: 'flamme-7', nom: 'Semaine de feu', emoji: '⚡', description: '7 jours d\'affilée', obtenu: streak >= 7 },
    { id: 'flamme-30', nom: 'Inarrêtable', emoji: '🌟', description: '30 jours d\'affilée', obtenu: streak >= 30 },
    { id: 'specialiste', nom: 'Spécialiste', emoji: '🎯', description: '5 chapitres dans une même matière', obtenu: matiereMaitrisee },
    { id: 'marathonien', nom: 'Marathonien', emoji: '⏱️', description: '5 heures d\'étude au total', obtenu: stats.minutesEtude >= 300 },
  ];
}

// ─── Navigation helper ────────────────────────────────────────────────────────

/** Déduit le niveauId (C6, LS…) depuis un id de chapitre (ex: "c6-maths-x" → "C6"). */
export function niveauIdFromChapitreId(chapitreId: string): string | null {
  const m = chapitreId.match(/^([a-zA-Z]+[0-9]?)[-_]/);
  if (!m) return null;
  const p = m[1].toUpperCase();
  return ['C6', 'C5', 'C4', 'C3', 'LS', 'LP', 'LT'].includes(p) ? p : null;
}
