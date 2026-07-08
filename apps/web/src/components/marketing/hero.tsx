'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Sigma,
  FlaskConical,
  Atom,
  BookOpen,
  MessageSquare,
  Check,
} from 'lucide-react';
import { Container } from '@/components/ui/container';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ── Compteur animé ── */
function Counter({ to, duration = 1.6 }: { to: number; duration?: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [val, setVal] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return <span ref={ref}>{val.toLocaleString('fr-FR')}</span>;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stats = [
  { value: <>+<Counter to={25000} /></>, label: 'exercices' },
  { value: <><Counter to={500} />+</>, label: 'cours' },
  { value: 'Quiz IA', label: 'générés' },
  { value: 'Assistant', label: 'Noor IA 24/7' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden gradient-hero">
      {/* Décor : grille + halos */}
      <div className="pointer-events-none absolute inset-0 bg-grid-slate [background-size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_50%,transparent_100%)]" />
      <div className="glow-orb -left-24 top-[-6rem] h-[26rem] w-[26rem] bg-primary/25" />
      <div className="glow-orb -right-24 top-24 h-[24rem] w-[24rem] bg-[hsl(var(--brand-blue)/0.20)]" />

      <Container className="relative grid items-center gap-16 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
        {/* ── Colonne texte ── */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <span className="badge-ai">
              <Sparkles className="h-3.5 w-3.5" /> Nouveau · Assistant Noor IA
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="mt-6 font-heading text-[2.6rem] font-extrabold leading-[1.04] tracking-tight sm:text-6xl lg:text-[4.4rem]"
          >
            Apprends avec <span className="text-gradient-mix">l&apos;IA.</span>
            <br />
            Réussis au collège
            <br className="hidden sm:block" /> et au lycée.
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            Une plateforme intelligente qui s&apos;adapte à ton rythme — cours clairs,
            exercices corrigés, quiz générés par l&apos;IA et un assistant disponible
            24/7 pour t&apos;expliquer chaque notion.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className={cn(buttonVariants({ variant: 'primary', size: 'xl', shape: 'pill' }), 'group')}
            >
              Commencer gratuitement
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/apprendre"
              className={buttonVariants({ variant: 'outline', size: 'xl', shape: 'pill' })}
            >
              Découvrir les matières
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.dl
            variants={item}
            className="mt-12 grid max-w-lg grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4"
          >
            {stats.map((s, i) => (
              <div key={i} className={cn(i !== 0 && 'sm:border-l sm:border-border sm:pl-6')}>
                <dt className="font-heading text-2xl font-extrabold tracking-tight sm:text-[1.65rem]">
                  {s.value}
                </dt>
                <dd className="mt-0.5 text-sm text-muted-foreground">{s.label}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        {/* ── Colonne visuelle (IA First) ── */}
        <HeroVisual />
      </Container>
    </section>
  );
}

/* ── Aperçu flottant premium ── */
function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="relative mx-auto w-full max-w-md lg:max-w-none"
    >
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        {/* Carte leçon principale */}
        <div className="glass rounded-3xl p-5 shadow-lift">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(160_84%_39%)] text-white shadow-glow">
              <Sigma className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Mathématiques · 4ème</p>
              <p className="truncate font-heading font-semibold">Théorème de Pythagore</p>
            </div>
            <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
              72%
            </span>
          </div>

          {/* Progression */}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '72%' }}
              transition={{ duration: 1.3, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-[hsl(160_84%_39%)]"
            />
          </div>

          <div className="mt-5 space-y-2.5">
            {['Cours & vidéo', 'Exercices corrigés', 'Quiz généré par l’IA'].map((t, i) => (
              <div key={t} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    'grid h-5 w-5 place-items-center rounded-full',
                    i < 2 ? 'bg-primary text-white' : 'border border-border text-muted-foreground'
                  )}
                >
                  {i < 2 ? <Check className="h-3 w-3" /> : <span className="text-[10px]">3</span>}
                </span>
                <span className={cn(i < 2 ? 'text-foreground' : 'text-muted-foreground')}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bulle Assistant IA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="glass mt-4 flex items-start gap-3 rounded-2xl p-4 shadow-card"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--brand-blue))] to-primary text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold">Noor IA</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Voici un résumé simple du chapitre + 3 exercices pour t&apos;entraîner 👇
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Chips flottants */}
      <FloatingChip
        className="-left-4 top-10 sm:-left-8"
        icon={<FlaskConical className="h-4 w-4" />}
        label="SVT"
        color="bg-[hsl(var(--brand-blue))]"
        delay={0.4}
      />
      <FloatingChip
        className="-right-3 bottom-24 sm:-right-6"
        icon={<Atom className="h-4 w-4" />}
        label="Physique"
        color="bg-primary"
        delay={0.7}
      />
      <FloatingChip
        className="right-6 top-2"
        icon={<BookOpen className="h-4 w-4" />}
        label="Français"
        color="bg-gradient-to-br from-primary to-[hsl(var(--brand-blue))]"
        delay={1}
      />
    </motion.div>
  );
}

function FloatingChip({
  className,
  icon,
  label,
  color,
  delay = 0,
}: {
  className?: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: { duration: 5 + delay, repeat: Infinity, ease: 'easeInOut' },
      }}
      className={cn(
        'absolute z-10 flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3.5 py-2 text-sm font-semibold shadow-card backdrop-blur-md dark:border-white/10 dark:bg-white/10',
        className
      )}
    >
      <span className={cn('grid h-6 w-6 place-items-center rounded-full text-white', color)}>
        {icon}
      </span>
      {label}
    </motion.div>
  );
}
