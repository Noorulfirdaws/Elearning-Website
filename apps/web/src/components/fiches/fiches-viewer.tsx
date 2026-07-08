'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  ExternalLink,
  ChevronRight,
  Sigma,
  BookMarked,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export interface Fiche {
  titre: string;
  file: string;
}
export interface Chapitre {
  n: number;
  titre: string;
  fiches: Fiche[];
}

const BASE = '/fiches/maths-6eme';

export function FichesViewer({ chapitres }: { chapitres: Chapitre[] }) {
  const first = { ch: chapitres[0], fiche: chapitres[0].fiches[0] };
  const [active, setActive] = React.useState<{ ch: Chapitre; fiche: Fiche }>(first);

  const url = `${BASE}/${active.fiche.file}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Sidebar — sommaire */}
      <aside className="rounded-2xl border border-border bg-card p-3 shadow-soft lg:max-h-[80vh] lg:overflow-y-auto">
        <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sommaire · 6 chapitres
        </p>
        <div className="space-y-4">
          {chapitres.map((ch) => (
            <div key={ch.n}>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {ch.n}
                </span>
                <span className="text-sm font-semibold">{ch.titre}</span>
              </div>
              <div className="mt-1 space-y-1">
                {ch.fiches.map((f) => {
                  const isActive = active.fiche.file === f.file;
                  return (
                    <button
                      key={f.file}
                      onClick={() => setActive({ ch, fiche: f })}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      <FileText
                        className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-red-500/80')}
                      />
                      <span className="line-clamp-1 flex-1">{f.titre}</span>
                      {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Viewer */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <Sigma className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-heading font-semibold">{active.fiche.titre}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookMarked className="h-3.5 w-3.5" /> Chapitre {active.ch.n} — {active.ch.titre}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <ExternalLink className="h-4 w-4" /> Plein écran
            </a>
            <a href={url} download className={buttonVariants({ variant: 'primary', size: 'sm' })}>
              <Download className="h-4 w-4" /> Télécharger
            </a>
          </div>
        </div>

        {/* Lecteur PDF intégré (visionneuse native du navigateur : zoom, recherche, plein écran) */}
        <motion.div
          key={active.fiche.file}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-secondary/40"
        >
          <iframe
            src={`${url}#view=FitH&toolbar=1`}
            title={active.fiche.titre}
            className="h-[74vh] w-full"
          />
        </motion.div>
      </div>
    </div>
  );
}
