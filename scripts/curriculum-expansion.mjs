// curriculum-expansion.mjs
// Expansion du programme : Anglais (tous niveaux) + chapitres supplémentaires
// dans les matières existantes. Importé et concaténé dans generate-all-courses.mjs.
// Les slugs sont uniques par matière/niveau ; --resume ne génère que les nouveaux.

// ─── ANGLAIS — 6 chapitres par niveau (progressif collège → lycée) ────────────
const ANGLAIS = {
  C6: [
    'The alphabet and greetings', 'Numbers, colours and days',
    'The verb "to be" and personal pronouns', 'Classroom language and instructions',
    'Family and basic vocabulary', 'Reading: short simple texts',
  ],
  C5: [
    'Present simple and daily routines', 'Present continuous',
    'Describing people and places', 'Food, drinks and shopping',
    'Prepositions of place and time', 'Reading and short dialogues',
  ],
  C4: [
    'Past simple: regular and irregular verbs', 'Telling a story in the past',
    'The future: will and going to', 'Comparatives and superlatives',
    'Asking and answering questions', 'Reading comprehension',
  ],
  C3: [
    'Present perfect', 'Modal verbs (can, must, should)',
    'Conditionals: zero and first', 'Expressing opinions and feelings',
    'Writing a structured paragraph', 'Brevet exam preparation',
  ],
  LS: [
    'Review of tenses', 'Building and expanding vocabulary',
    'Reading literary extracts', 'Listening strategies',
    'Speaking: introducing and describing', 'Writing a short essay',
  ],
  LP: [
    'Advanced grammar and sentence structure', 'Argumentative writing',
    'Text and document analysis', 'Idioms, register and connectors',
    'Oral presentations', 'Exam techniques',
  ],
  LT: [
    'Complex tenses and nuance', 'Essay writing for the Baccalauréat',
    'Literary and cultural analysis', 'Debate and discussion',
    'Translation (English ⇄ French)', 'Bac oral preparation',
  ],
};

// ─── Chapitres supplémentaires par matière existante (par cycle) ──────────────
// 3 chapitres en plus, ordre 6→8. Le contenu s'adapte au niveau (prompt inclut le niveau).
const EXTRA_COLLEGE = {
  'Mathématiques': ['Calcul littéral et expressions', 'Symétrie et transformations', 'Statistiques et probabilités simples'],
  'Physique-Chimie': ['Les circuits électriques', 'Les forces et le mouvement', "L'énergie et ses formes"],
  'SVT': ['Le corps humain et la santé', 'Reproduction et hérédité', "Environnement et développement durable"],
  'Français': ['La poésie et les figures de style', 'Le théâtre : lire et jouer', "L'argumentation : convaincre et persuader"],
  'Histoire-Géographie': ['Le monde contemporain', 'Géographie : populations et territoires', "Éducation civique : droits et devoirs"],
};
const EXTRA_LYCEE = {
  'Mathématiques': ['Suites numériques', 'Dérivation et applications', 'Probabilités et lois'],
  'SVT': ['Génétique et évolution', 'Le fonctionnement du corps humain', 'Écologie et climat'],
  'Français': ['Le roman et ses personnages', 'La dissertation littéraire', "L'oral : commentaire et entretien"],
  'Histoire-Géographie': ['Les grandes guerres mondiales', 'La mondialisation', 'Géopolitique contemporaine'],
};

// Physique et Chimie au lycée = matières séparées et VIDES → programme complet (5 chapitres, ordre 1→5)
const LYCEE_PC = {
  LS: {
    'Physique': ['Mouvements et forces', 'La lumière et les ondes', "L'électricité : tension et intensité", 'La pression et les fluides', 'Signaux et information'],
    'Chimie': ['La matière : atomes et éléments', 'Le tableau périodique', 'Les solutions et la concentration', 'Les transformations chimiques', 'Molécules et liaisons'],
  },
  LP: {
    'Physique': ['Forces et énergie mécanique', 'Ondes mécaniques et lumineuses', 'Circuits électriques et puissance', "Énergie : conversions et rendement", 'Mouvement et interactions'],
    'Chimie': ['Structure de la matière et modèles', 'Quantité de matière : la mole', 'Réactions acide-base', "Oxydoréduction", 'Introduction à la chimie organique'],
  },
  LT: {
    'Physique': ['Mécanique de Newton et mouvement', 'Ondes et signaux', 'Énergie et transferts thermiques', 'Électromagnétisme', 'Physique nucléaire et radioactivité'],
    'Chimie': ['Cinétique chimique', 'Équilibres chimiques', 'Acides, bases et pH', 'Chimie organique et synthèse', 'Piles, électrolyse et oxydoréduction'],
  },
};

const NIVEAUX = [
  { niveauId: 'C6', niveauNom: '6ème',      cycle: 'college' },
  { niveauId: 'C5', niveauNom: '5ème',      cycle: 'college' },
  { niveauId: 'C4', niveauNom: '4ème',      cycle: 'college' },
  { niveauId: 'C3', niveauNom: '3ème',      cycle: 'college' },
  { niveauId: 'LS', niveauNom: 'Seconde',   cycle: 'lycee' },
  { niveauId: 'LP', niveauNom: 'Première',  cycle: 'lycee' },
  { niveauId: 'LT', niveauNom: 'Terminale', cycle: 'lycee' },
];

function slugify(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export const EXPANSION = NIVEAUX.map(n => {
  const matieres = [];

  // Anglais — nouvelle matière remplie (ordre 1→6)
  matieres.push({
    nomMatiere: 'Anglais',
    chapitres: (ANGLAIS[n.niveauId] || []).map((titre, i) => ({
      ordre: i + 1, titre, slug: 'ang-' + slugify(titre),
    })),
  });

  // Physique & Chimie au lycée — programme complet (matières vides, ordre 1→5)
  if (n.cycle === 'lycee' && LYCEE_PC[n.niveauId]) {
    for (const [nomMatiere, titres] of Object.entries(LYCEE_PC[n.niveauId])) {
      matieres.push({
        nomMatiere,
        chapitres: titres.map((titre, i) => ({ ordre: i + 1, titre, slug: 'pc-' + slugify(titre) })),
      });
    }
  }

  // Chapitres supplémentaires dans les matières existantes (ordre 6→8)
  const extra = n.cycle === 'college' ? EXTRA_COLLEGE : EXTRA_LYCEE;
  for (const [nomMatiere, titres] of Object.entries(extra)) {
    matieres.push({
      nomMatiere,
      chapitres: titres.map((titre, i) => ({
        ordre: 6 + i, titre, slug: 'x-' + slugify(titre),
      })),
    });
  }

  return { niveauId: n.niveauId, niveauNom: n.niveauNom, cycle: n.cycle, matieres };
});
