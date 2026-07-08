'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  MessageSquare,
  FileText,
  ListChecks,
  PenLine,
  Send,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Container, Section } from '@/components/ui/container';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const capacites: { icon: LucideIcon; titre: string; desc: string }[] = [
  {
    icon: MessageSquare,
    titre: 'Explications claires',
    desc: 'Pose n’importe quelle question — Noor IA t’explique simplement, à ton niveau.',
  },
  {
    icon: FileText,
    titre: 'Résumés automatiques',
    desc: 'Un résumé clair de chaque chapitre, généré en un clic.',
  },
  {
    icon: ListChecks,
    titre: 'Quiz générés',
    desc: 'Des quiz personnalisés créés à partir de ton propre cours.',
  },
  {
    icon: PenLine,
    titre: 'Correction intelligente',
    desc: 'Corrige tes exercices et t’explique tes erreurs, étape par étape.',
  },
];

const messages = [
  { from: 'user' as const, text: 'Je ne comprends pas les fractions équivalentes 😅' },
  {
    from: 'ia' as const,
    text: 'Pas de souci ! Deux fractions sont équivalentes si elles valent la même chose. Exemple : 1/2 = 2/4 = 3/6. On multiplie (ou divise) le numérateur ET le dénominateur par le même nombre.',
  },
  { from: 'ia' as const, text: 'Je te prépare 3 exercices pour t’entraîner ?', chips: ['Oui, un quiz 🎯', 'Fais-moi un résumé'] },
];

const bubble = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function AssistantSection() {
  return (
    <Section id="assistant-ia" className="relative overflow-hidden">
      <div className="glow-orb left-0 top-10 h-80 w-80 bg-[hsl(var(--brand-blue)/0.18)]" />
      <div className="glow-orb right-0 bottom-10 h-72 w-72 bg-primary/20" />

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
              <Sparkles className="h-3.5 w-3.5" /> IA First
            </span>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-5xl">
              Rencontre{' '}
              <span className="text-gradient-mix">Noor IA</span>.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Ton assistant personnel, disponible 24/7. Il explique, résume,
              génère des quiz et corrige tes exercices — comme un prof particulier
              dans ta poche.
            </p>
          </motion.div>
        </div>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
          {/* Capacités */}
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09 } } }}
            className="order-2 space-y-3 lg:order-1"
          >
            {capacites.map((c) => (
              <motion.div
                key={c.titre}
                variants={bubble}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-300 ease-premium hover:-translate-y-0.5 hover:shadow-card"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--brand-blue))] text-white shadow-glow">
                  <c.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-heading font-semibold">{c.titre}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{c.desc}</p>
                </div>
              </motion.div>
            ))}

            <div className="pt-3">
              <Link
                href="/register"
                className={cn(buttonVariants({ variant: 'primary', size: 'lg', shape: 'pill' }), 'group')}
              >
                Discuter avec Noor IA
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>

          {/* Chat mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 lg:order-2"
          >
            <div className="mx-auto max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
              {/* En-tête du chat */}
              <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/5 to-[hsl(var(--brand-blue)/0.06)] p-4">
                <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[hsl(var(--brand-blue))] to-primary text-white">
                  <Sparkles className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                </span>
                <div>
                  <p className="font-heading text-sm font-bold">Noor IA</p>
                  <p className="text-[11px] text-emerald-600">● En ligne</p>
                </div>
              </div>

              {/* Messages */}
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.5, delayChildren: 0.3 } } }}
                className="space-y-3 bg-secondary/30 p-4"
              >
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    variants={bubble}
                    className={cn('flex', m.from === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-soft',
                        m.from === 'user'
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md border border-border bg-card'
                      )}
                    >
                      {m.text}
                      {m.chips && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.chips.map((chip) => (
                            <span
                              key={chip}
                              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Indicateur de saisie */}
                <motion.div variants={bubble} className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{ duration: 1, repeat: Infinity, delay: d * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              {/* Champ de saisie (décoratif) */}
              <div className="flex items-center gap-2 border-t border-border p-3">
                <div className="flex-1 rounded-full border border-border bg-secondary/50 px-4 py-2.5 text-sm text-muted-foreground">
                  Pose ta question à Noor IA…
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow">
                  <Send className="h-4 w-4" />
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
