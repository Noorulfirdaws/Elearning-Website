'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
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
import { Container, Section } from '@/components/ui/container';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Subject {
  name: string;
  level: string;
  description: string;
  chapters: number;
  exercises: number;
  icon: LucideIcon;
  gradient: string;
  glow: string;
}

const subjects: Subject[] = [
  {
    name: 'Mathématiques',
    level: 'Collège → Terminale',
    description:
      'Algèbre, géométrie, fonctions et probabilités. Chaque notion expliquée pas à pas, avec exercices corrigés.',
    chapters: 48,
    exercises: 6200,
    icon: Sigma,
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'bg-blue-500/20',
  },
  {
    name: 'Physique-Chimie',
    level: 'Collège → Terminale',
    description:
      'Mécanique, électricité, réactions chimiques. Des expériences claires et des schémas animés.',
    chapters: 40,
    exercises: 4800,
    icon: Atom,
    gradient: 'from-violet-500 to-fuchsia-600',
    glow: 'bg-violet-500/20',
  },
  {
    name: 'SVT',
    level: 'Collège → Terminale',
    description:
      'Le corps humain, la génétique, l’écologie et la Terre. Comprendre le vivant en profondeur.',
    chapters: 36,
    exercises: 3900,
    icon: FlaskConical,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'bg-emerald-500/20',
  },
  {
    name: 'Français',
    level: 'Collège → Terminale',
    description:
      'Grammaire, expression écrite, analyse de textes et préparation à l’oral du Bac.',
    chapters: 42,
    exercises: 4100,
    icon: BookOpen,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'bg-rose-500/20',
  },
  {
    name: 'Histoire-Géo',
    level: 'Collège → Terminale',
    description:
      'Grands repères historiques, géographie du monde et éducation civique, cartes à l’appui.',
    chapters: 38,
    exercises: 3400,
    icon: Globe2,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'bg-amber-500/20',
  },
  {
    name: 'Anglais',
    level: 'Collège → Terminale',
    description:
      'Vocabulaire, grammaire et compréhension. Progresse à l’oral comme à l’écrit avec l’IA.',
    chapters: 34,
    exercises: 3000,
    icon: Languages,
    gradient: 'from-sky-500 to-cyan-600',
    glow: 'bg-sky-500/20',
  },
  {
    name: 'Arabe',
    level: 'Collège → Terminale',
    description:
      'Lecture, écriture, grammaire et expression en langue arabe, pas à pas.',
    chapters: 30,
    exercises: 2600,
    icon: BookText,
    gradient: 'from-teal-500 to-cyan-600',
    glow: 'bg-teal-500/20',
  },
  {
    name: 'Éducation islamique',
    level: 'Collège → Terminale',
    description:
      'Valeurs, histoire et enseignements essentiels, expliqués avec clarté.',
    chapters: 24,
    exercises: 1800,
    icon: Moon,
    gradient: 'from-emerald-600 to-green-700',
    glow: 'bg-emerald-500/20',
  },
  {
    name: 'Informatique',
    level: 'Collège → Terminale',
    description:
      'Bureautique, culture numérique et initiation au code pour le monde d’aujourd’hui.',
    chapters: 22,
    exercises: 2100,
    icon: Code2,
    gradient: 'from-slate-600 to-slate-800',
    glow: 'bg-slate-500/20',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

function SubjectCard({ subject }: { subject: Subject }) {
  const Icon = subject.icon;
  return (
    <motion.a
      variants={item}
      href="/apprendre"
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-6',
        'shadow-soft transition-all duration-300 ease-premium hover:-translate-y-1.5 hover:shadow-lift'
      )}
    >
      <div
        className={cn(
          'glow-orb -right-10 -top-10 h-40 w-40 opacity-0 transition-opacity duration-500 group-hover:opacity-100',
          subject.glow
        )}
      />

      <div className="relative flex items-start justify-between">
        <span
          className={cn(
            'grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 ease-premium group-hover:scale-105',
            subject.gradient
          )}
        >
          <Icon className="h-7 w-7" />
        </span>
        <span className="badge-ai">
          <Sparkles className="h-3 w-3" /> IA
        </span>
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

      <div className="relative mt-5 flex items-center gap-4 text-xs font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <BookMarked className="h-3.5 w-3.5" /> {subject.chapters} chapitres
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" /> {subject.exercises.toLocaleString('fr-FR')} exercices
        </span>
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-border pt-4">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
          <div className={cn('h-full w-2/3 rounded-full bg-gradient-to-r', subject.gradient)} />
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          Explorer
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      </div>
    </motion.a>
  );
}

export function SubjectsSection() {
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
            <SubjectCard key={s.name} subject={s} />
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
