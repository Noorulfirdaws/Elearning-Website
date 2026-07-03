'use client';

/**
 * ChapitreVideo — lecteur vidéo intégré pour les chapitres.
 *
 * CHAQUE chapitre a sa vidéo, lue DANS NoorAcademie (pas de redirection) :
 *  - URL YouTube directe (watch / youtu.be / shorts) → embed direct
 *  - URL de recherche YouTube (results?search_query=…) → playlist de recherche
 *    intégrée via listType=search (fonctionne sans clé API)
 *  - AUCUNE URL en base → recherche générée automatiquement depuis le titre
 *    du chapitre + matière + niveau (fallback universel)
 *  - Khan Academy → carte lien (leur site bloque l'iframe hors CSP)
 *
 * Respecte la CSP du site (frame-src youtube / youtube-nocookie uniquement).
 */

import { useState } from 'react';
import { Youtube, ExternalLink, PlayCircle } from 'lucide-react';

function buildAutoQuery(titre: string, matiere?: string | null, niveau?: string | null): string {
  const anglais = (matiere || '').toLowerCase().includes('anglais');
  const parts = anglais
    ? [titre, 'english lesson'] // chapitres d'anglais : titres en anglais → requête anglaise
    : [titre, matiere || '', niveau || '', 'cours'];
  return encodeURIComponent(parts.filter(Boolean).join(' '));
}

function extractYouTubeEmbed(url: string): { src: string; externe: string } | null {
  if (!url) return null;
  // Vidéo directe
  const direct = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (direct) {
    return {
      src: `https://www.youtube-nocookie.com/embed/${direct[1]}?rel=0&modestbranding=1`,
      externe: url,
    };
  }
  // Recherche → playlist de résultats intégrée
  const search = url.match(/[?&]search_query=([^&]+)/);
  if (search) {
    return {
      src: `https://www.youtube-nocookie.com/embed?listType=search&list=${search[1]}&rel=0&modestbranding=1`,
      externe: url,
    };
  }
  return null;
}

export function ChapitreVideo({
  youtubeUrl,
  khanAcademyUrl,
  motsCles,
  titre,
  matiere,
  niveau,
}: {
  youtubeUrl?: string | null;
  khanAcademyUrl?: string | null;
  motsCles?: string | null;
  titre: string;
  matiere?: string | null;
  niveau?: string | null;
}) {
  const [loaded, setLoaded] = useState(false);

  // 1. URL stockée en base ; 2. sinon recherche auto générée depuis le titre
  let embed = youtubeUrl ? extractYouTubeEmbed(youtubeUrl) : null;
  if (!embed) {
    const q = buildAutoQuery(titre, matiere, niveau);
    embed = {
      src: `https://www.youtube-nocookie.com/embed?listType=search&list=${q}&rel=0&modestbranding=1`,
      externe: `https://www.youtube.com/results?search_query=${q}`,
    };
  }

  return (
    <div className="mb-8 space-y-4">
      {/* Lecteur intégré */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black shadow-md">
        <div className="flex items-center gap-2 bg-gray-900 px-4 py-2.5">
          <Youtube className="h-4 w-4 text-red-500" />
          <p className="text-xs font-semibold text-white flex-1 truncate">
            Vidéo — {motsCles || titre}
          </p>
          <a
            href={embed.externe}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="h-3 w-3" /> YouTube
          </a>
        </div>
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <PlayCircle className="h-12 w-12 text-gray-600 animate-pulse" />
            </div>
          )}
          <iframe
            src={embed.src}
            title={`Vidéo : ${titre}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>

      {/* Khan Academy (lien — non embeddable) */}
      {khanAcademyUrl && (
        <a
          href={khanAcademyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 p-4 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
            KA
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">Leçon Khan Academy</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">Cours vidéo + exercices interactifs gratuits</p>
          </div>
          <ExternalLink className="h-4 w-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
        </a>
      )}
    </div>
  );
}
