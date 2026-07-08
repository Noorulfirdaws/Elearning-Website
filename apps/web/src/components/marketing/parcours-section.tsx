'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Flame,
  Trophy,
  Zap,
  Target,
  Star,
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Container, Section } from '@/components/ui/container';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const jours = [
  { d: 'L', done: true },
  { d: 'M', done: true },
  { d: 'M', done: true },
  { d: 'J', done: true },
  { d: 'V', done: true },
  { d: 'S', done: false },
  { d: 'D', done: false },
];

const badges: { icon: LucideIcon; label: string; color: string; unlocked: boolean }[] = [
  { icon: Flame, label: 'Assidu', color: 'from-orange-500 to-red-500', unlocked: true },
  { icon: Zap, label: 'Rapide', color: 'from-amber-400 to-yellow-500', unlocked: true },
  { icon: Star, label: 'Brillant', color: 'from-blue-500 to-indigo-500', unlocked: true },
  { icon: Trophy, label: 'Champion', color: 'from-violet-500 to-fuchsia-500', unlocked: false },
  { icon: Award, label: 'Maître', color: 'from-emerald-500 to-teal-500', unlocked: false },
];

const features: { icon: LucideIcon; title: string; desc: string; tint: string }[] = [
  { icon: Zap, title: 'XP & Niveaux', desc: 'Gagne de l’expérience à chaque leçon et monte en niveau.', tint: 'bg-amber-500/10 text-amber-600' },
  { icon: Trophy, title: 'Badges', desc: 'Débloque des récompenses en atteignant tes objectifs.', tint: 'bg-violet-500/10 text-violet-600' },
  { icon: Flame, title: 'Série quotidienne', desc: 'Garde ta flamme allumée en apprenant chaque jour.', tint: 'bg-orange-500/10 text-orange-600' },
  { icon: Target, title: 'Objectifs', desc: 'Fixe-toi des buts et suis ta progression jour après jour.', tint: 'bg-primary/10 text-primary' },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export function ParcoursSection() {
  return (
    <Section id="parcours" className="relative overflow-hidden bg-secondary/40">
      <div className="glow-orb left-1/2 top-0 h-72 w-72 -translate-x-1/2 bg-primary/10" />
      <Container className="relative">
        {/* En-tête */}
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <span className="badge-ai mb-4 inline-flex">
              <Sparkles className="h-3.5 w-3.5" /> Reste motivé
            </span>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-5xl">
              Apprendre devient un jeu.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Gagne de l’XP, garde ta série quotidienne et débloque des badges.
              Ta progression, visible en un coup d’œil.
            </p>
          </motion.div>
        </div>

        {/* Carte de progression */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-14 max-w-4xl rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8"
        >
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Progression + série */}
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(160_84%_39%)] text-white shadow-glow">
                    <span className="font-heading text-lg font-extrabold">7</span>
                  </span>
                  <div>
                    <p className="font-heading font-bold">Niveau 7 — Explorateur</p>
                    <p className="text-xs text-muted-foreground">2 480 / 3 000 XP</p>
                  </div>
                </div>
                <span className="badge-ai">
                  <Zap className="h-3 w-3" /> +50 XP
                </span>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '83%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(160_84%_39%)]"
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Plus que <span className="font-semibold text-foreground">520 XP</span> avant le niveau 8 🎯
              </p>

              {/* Série */}
              <div className="mt-6 flex items-center gap-4 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white shadow-lg">
                  <Flame className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-heading text-xl font-extrabold">12 jours 🔥</p>
                  <p className="text-xs text-muted-foreground">Série en cours — ne la brise pas !</p>
                </div>
              </div>
            </div>

            {/* Calendrier + badges */}
            <div className="lg:border-l lg:border-border lg:pl-8">
              <p className="text-sm font-semibold">Cette semaine</p>
              <div className="mt-3 flex justify-between">
                {jours.map((j, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        'grid h-9 w-9 place-items-center rounded-xl text-sm font-semibold',
                        j.done
                          ? 'bg-primary text-primary-foreground shadow-soft'
                          : 'border border-border bg-card text-muted-foreground'
                      )}
                    >
                      {j.done ? <CheckCircle2 className="h-4 w-4" /> : j.d}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{j.d}</span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm font-semibold">Badges</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {badges.map((b) => (
                  <div key={b.label} className="flex flex-col items-center gap-1.5">
                    <span
                      className={cn(
                        'grid h-11 w-11 place-items-center rounded-2xl',
                        b.unlocked
                          ? cn('bg-gradient-to-br text-white shadow-lg', b.color)
                          : 'border border-dashed border-border bg-secondary text-muted-foreground'
                      )}
                    >
                      {b.unlocked ? <b.icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                    </span>
                    <span
                      className={cn(
                        'text-[11px]',
                        b.unlocked ? 'font-medium text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {b.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Fonctionnalités */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={rise}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-300 ease-premium hover:-translate-y-1 hover:shadow-card"
            >
              <span className={cn('grid h-11 w-11 place-items-center rounded-xl', f.tint)}>
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-heading font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <div className="mt-12 flex justify-center">
          <Link
            href="/register"
            className={cn(buttonVariants({ variant: 'primary', size: 'lg', shape: 'pill' }), 'group')}
          >
            Commencer mon parcours
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </Container>
    </Section>
  );
}
