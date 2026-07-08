import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, Sigma, FileText } from 'lucide-react';
import { SiteNav } from '@/components/marketing/site-nav';
import { Footer } from '@/components/layout/footer';
import { Container } from '@/components/ui/container';
import { Badge } from '@/components/ui/badge';
import { FichesViewer, type Chapitre } from '@/components/fiches/fiches-viewer';

export const metadata: Metadata = {
  title: 'Fiches PDF — Mathématiques 6ème',
  description:
    'Fiches de cours PDF pour les Mathématiques en classe de 6ème : fractions, numération, géométrie, aires et volumes, proportionnalité.',
};

const chapitres: Chapitre[] = [
  {
    n: 1,
    titre: 'Les Fractions',
    fiches: [
      { titre: 'Cours — Notions essentielles', file: 'chapitre1-cours1.pdf' },
      { titre: 'Approfondissement — Notions avancées', file: 'chapitre1-cours2.pdf' },
    ],
  },
  {
    n: 2,
    titre: 'Les nombres entiers et la numération décimale',
    fiches: [
      { titre: 'Cours — Notions essentielles', file: 'chapitre2-cours1.pdf' },
      { titre: 'Approfondissement — Notions avancées', file: 'chapitre2-cours2.pdf' },
    ],
  },
  {
    n: 3,
    titre: 'Les fractions : lecture et représentation',
    fiches: [
      { titre: 'Cours — Notions essentielles', file: 'chapitre3-cours1.pdf' },
      { titre: 'Approfondissement — Notions avancées', file: 'chapitre3-cours2.pdf' },
    ],
  },
  {
    n: 4,
    titre: 'La géométrie plane : angles et triangles',
    fiches: [
      { titre: 'Cours — Notions essentielles', file: 'chapitre4-cours1.pdf' },
      { titre: 'Approfondissement — Notions avancées', file: 'chapitre4-cours2.pdf' },
    ],
  },
  {
    n: 5,
    titre: 'Périmètres, aires et volumes',
    fiches: [
      { titre: 'Cours — Notions essentielles', file: 'chapitre5-cours1.pdf' },
      { titre: 'Approfondissement — Notions avancées', file: 'chapitre5-cours2.pdf' },
    ],
  },
  {
    n: 6,
    titre: 'La proportionnalité et les pourcentages',
    fiches: [
      { titre: 'Cours — Notions essentielles', file: 'chapitre6-cours1.pdf' },
      { titre: 'Approfondissement — Notions avancées', file: 'chapitre6-cours2.pdf' },
    ],
  },
];

export default function FichesMaths6emePage() {
  const total = chapitres.reduce((s, c) => s + c.fiches.length, 0);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      {/* En-tête */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <Container className="py-12">
          <Link
            href="/apprendre/C6"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Classe de 6ème
          </Link>
          <div className="mt-4 flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
              <Sigma className="h-7 w-7" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="blue">Mathématiques · 6ème</Badge>
                <Badge variant="muted">
                  <FileText className="h-3 w-3" /> {total} fiches PDF
                </Badge>
              </div>
              <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                Fiches PDF — Mathématiques 6ème
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Les fiches de cours à consulter en ligne ou à télécharger, classées
                par chapitre. Sélectionne une fiche dans le sommaire pour l’ouvrir.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <main className="flex-1">
        <Container className="py-8">
          <FichesViewer chapitres={chapitres} />
        </Container>
      </main>

      <Footer />
    </div>
  );
}
