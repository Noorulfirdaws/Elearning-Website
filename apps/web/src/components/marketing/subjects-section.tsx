'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Sigma,
  Atom,
  FlaskConical,
  BookOpen,
  Globe2,
  Languages,
  BookText,
  Moon,
  Code2,
  Sparkles,
  ArrowRight,
  BookMarked,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import axios from '@/lib/api';
import { Container, Section } from '@/components/ui/container';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Subject {
  name: string;
  level: string;
  description: string;
  // Nom(s) réels en base (`matiere.nom`) à sommer pour ce sujet — certaines
  // matières sont scindées différemment selon le cycle (ex: "Physique-Chimie"
  // au collège devient "Physique" + "Chimie" séparément au lycée).
  dbNames: string[];
  icon: LucideIcon;
  gradient: string;
  glow: string;
}

// Descriptif marketing (cosmétique) — les CHIFFRES (chapitres/exercices),
// eux, viennent toujours de la base réelle via /matieres/stats-globales.
// Ne jamais remettre de nombres fixes ici : une matière sans contenu réel
// doit afficher "Bientôt disponible", pas un chiffre inventé.
const subjects: Subject[] = [
  {
    name: 'Mathématiques',
    level: 'Collège → Terminale',
    description:
      'Algèbre, géométrie, fonctions et probabilités. Chaque notion expliquée pas à pas, avec exercices corrigés.',
    dbNames: ['Mathématiques'],
    icon: Sigma,
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'bg-blue-500/20',
  },
  {
    name: 'Physique-Chimie',
    level: 'Collège → Terminale',
    description:
      'Mécanique, électricité, réactions chimiques. Des expériences claires et des schémas animés.',
    dbNames: ['Physique-Chimie', 'Physique', 'Chimie'],
    icon: Atom,
    gradient: 'from-violet-500 to-fuchsia-600',
    glow: 'bg-violet-500/20',
  },
  {
    name: 'SVT',
    level: 'Collège → Terminale',
    description:
      'Le corps humain, la génétique, l’écologie et la Terre. Comprendre le vivant en profondeur.',
    dbNames: ['SVT'],
    icon: FlaskConical,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'bg-emerald-500/20',
  },
  {
    name: 'Français',
    level: 'Collège → Terminale',
    description:
      'Grammaire, expression écrite, analyse de textes et préparation à l’oral du Bac.',
    dbNames: ['Français'],
    icon: BookOpen,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'bg-rose-500/20',
  },
  {
    name: 'Histoire-Géo',
    level: 'Collège → Terminale',
    description:
      'Grands repères historiques, géographie du monde et éducation civique, cartes à l’appui.',
    dbNames: ['Histoire-Géographie'],
    icon: Globe2,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'bg-amber-500/20',
  },
  {
    name: 'Anglais',
    level: 'Collège → Terminale',
    description:
      'Vocabulaire, grammaire et compréhension. Progresse à l’oral comme à l’écrit avec l’IA.',
    dbNames: ['Anglais'],
    icon: Languages,
    gradient: 'from-sky-500 to-cyan-600',
    glow: 'bg-sky-500/20',
  },
  {
    name: 'Arabe',
    level: 'Collège → Terminale',
    description:
      'Lecture, écriture, grammaire et expression en langue arabe, pas à pas.',
    dbNames: ['Arabe'],
    icon: BookText,
    gradient: 'from-teal-500 to-cyan-600',
    glow: 'bg-teal-500/20',
  },
  {
    name: 'Éducation islamique',
    level: 'Collège → Terminale',
    description:
      'Valeurs, histoire et enseignements essentiels, expliqués avec clarté.',
    dbNames: ['Éducation islamique'],
    icon: Moon,
    gradient: 'from-emerald-600 to-green-700',
    glow: 'bg-emerald-500/20',
  },
  {
    name: 'Informatique',
    level: 'Collège → Terminale',
    description:
      'Bureautique, culture numérique et initiation au code pour le monde d’aujourd’hui.',
    dbNames: ['Informatique'],
    icon: Code2,
    gradient: 'from-slate-600 to-slate-800',
    glow: 'bg-slate-500/20',
  },
];

interface StatMatiere { nom: string; chapitres: number; exercices: number }

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function SubjectCard({ subject, stats }: { subject: Subject; stats?: StatMatiere }) {
  const Icon = subject.icon;
  const chapitres = stats?.chapitres ?? 0;
  const exercices = stats?.exercices ?? 0;
  const disponible = chapitres > 0;

  return (
    <motion.a
      variants={item}
      href={disponible ? '/apprendre' : undefined}
      aria-disabled={!disponible}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-6',
        'shadow-soft transition-all duration-300 ease-premium',
        disponible ? 'hover:-translate-y-1.5 hover:shadow-lift' : 'cursor-default opacity-70'
      )}
    >
      <div
        className={cn(
          'glow-orb -right-10 -top-10 h-40 w-40 opacity-0 transition-opacity duration-500',
          disponible && 'group-hover:opacity-100',
          subject.glow
        )}
      />

      <div className="relative flex items-start justify-between">
        <span
          className={cn(
            'grid h-14 w-14 place-items-center rounded-2xl text-white shadow-lg transition-transform duration-300 ease-premium',
            disponible ? cn('bg-gradient-to-br group-hover:scale-105', subject.gradient) : 'bg-muted-foreground/40'
          )}
        >
          <Icon className="h-7 w-7" />
        </span>
        {disponible ? (
          <span className="badge-ai">
            <Sparkles className="h-3 w-3" /> IA
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            Bientôt disponible
          </span>
        )}
      </div>

      <h3 className="relative mt-5 font-heading text-xl font-bold tracking-tight">
        {subject.name}
      </h3>
      <p className="relative mt-0.5 text-sm font-medium text-muted-foreground">
        {subject.level}
      </p>
      <p className="relative mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {subject.description}
      </p>

      {disponible && (
        <div className="relative mt-5 flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <BookMarked className="h-3.5 w-3.5" /> {chapitres} chapitre{chapitres > 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" /> {exercices.toLocaleString('fr-FR')} exercice{exercices > 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="relative mt-4 flex items-center justify-between border-t border-border pt-4">
        {disponible ? (
          <>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
              <div className={cn('h-full w-2/3 rounded-full bg-gradient-to-r', subject.gradient)} />
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
              Explorer
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Contenu en préparation</span>
        )}
      </div>
    </motion.a>
  );
}

export function SubjectsSection() {
  const { data: statsList } = useQuery<StatMatiere[]>({
    queryKey: ['matieres-stats-globales'],
    queryFn: () => axios.get('/matieres/stats-globales').then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

  // Regroupe les totaux réels par carte marketing (ex: Physique + Chimie -> Physique-Chimie).
  const statsParCarte = new Map<string, StatMatiere>();
  for (const s of subjects) {
    const total = (statsList ?? [])
      .filter((m) => s.dbNames.includes(m.nom))
      .reduce(
        (acc, m) => ({ nom: s.name, chapitres: acc.chapitres + m.chapitres, exercices: acc.exercices + m.exercices }),
        { nom: s.name, chapitres: 0, exercices: 0 }
      );
    statsParCarte.set(s.name, total);
  }

  return (
    <Section id="matieres" className="relative">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <span className="badge-ai mb-4 inline-flex">
              🇩🇯 Programme officiel de Djibouti
            </span>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-5xl">
              Toutes les matières,
              <br className="hidden sm:block" /> du collège au lycée.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Des cours clairs et un accompagnement par l’IA dans chaque matière,
              de la 6ème à la Terminale.
            </p>
          </motion.div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {subjects.map((s) => (
            <SubjectCard key={s.name} subject={s} stats={statsParCarte.get(s.name)} />
          ))}
        </motion.div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/apprendre"
            className={buttonVariants({ variant: 'outline', size: 'lg', shape: 'pill' })}
          >
            Voir tous les niveaux
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Container>
    </Section>
  );
}
