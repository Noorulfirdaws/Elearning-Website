// Fiches PDF complémentaires servies en statique (public/fiches/...).
// Rattachées à l'onglet « Ressources » d'un chapitre SANS dépendre du backend.
//
// On associe par **ID de chapitre** (exact et fiable) — et NON par « ordre »,
// car en base l'ordre des chapitres ne suit pas la numérotation des PDF
// (ex. Maths 6ème a deux chapitres « ordre 1 »). Les IDs, eux, sont uniques
// et correspondent 1:1 au contenu.

export interface FicheExtra {
  titre: string;
  file: string;
  url: string;
}

// Un chapitre = 2 fiches : Cours (cours1) + Approfondissement (cours2).
function paire(folder: string, n: number): FicheExtra[] {
  return [
    {
      titre: 'Cours — Notions essentielles',
      file: `chapitre${n}-cours1.pdf`,
      url: `/api/fiches/${folder}/chapitre${n}-cours1.pdf`,
    },
    {
      titre: 'Approfondissement — Notions avancées',
      file: `chapitre${n}-cours2.pdf`,
      url: `/api/fiches/${folder}/chapitre${n}-cours2.pdf`,
    },
  ];
}

// ID de chapitre (segment d'URL / champ `id` de l'API) → fiches PDF.
// Pour ajouter un chapitre : déposer les PDF dans public/fiches/<dossier>/
// et ajouter une ligne ici avec l'ID réel du chapitre.
const PAR_CHAPITRE: Record<string, FicheExtra[]> = {
  // ── Mathématiques 6ème ──
  C6_math_fractions: paire('maths-6eme', 1), // Les Fractions
  'c6-maths-nombres-entiers': paire('maths-6eme', 2), // Nombres entiers & numération décimale
  'c6-maths-fractions-intro': paire('maths-6eme', 3), // Fractions : lecture et représentation
  'c6-maths-geometrie-plane': paire('maths-6eme', 4), // Géométrie plane : angles et triangles
  'c6-maths-perimetres-aires': paire('maths-6eme', 5), // Périmètres, aires et volumes
  'c6-maths-proportionnalite': paire('maths-6eme', 6), // Proportionnalité et pourcentages

  // ── Mathématiques 5ème ──
  'c5-maths-nombres-relatifs': paire('maths-5eme', 1), // Nombres relatifs
  'c5-maths-fractions-decimaux': paire('maths-5eme', 2), // Fractions et nombres décimaux
  'c5-maths-triangles': paire('maths-5eme', 3), // Triangles : construction et propriétés
  'c5-maths-symetrie': paire('maths-5eme', 4), // Symétrie axiale et centrale
  'c5-maths-statistiques-graphiques': paire('maths-5eme', 5), // Statistiques et graphiques
};

/** Renvoie les fiches complémentaires d'un chapitre (par son ID), ou []. */
export function fichesExtraPourChapitre(opts: {
  chapitreId?: string | null;
}): FicheExtra[] {
  const id = opts.chapitreId ?? '';
  return PAR_CHAPITRE[id] ?? [];
}
