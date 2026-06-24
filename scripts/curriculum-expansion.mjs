// curriculum-expansion.mjs
// Objectif : chaque matière atteint 10 chapitres complets (cours + exemples + exercices corrigés + quiz).
// Original = 5 chapitres/matière ; cette expansion ajoute le reste. Anglais et Physique/Chimie lycée
// (matières vides) reçoivent 10 chapitres complets ici. Importé dans generate-all-courses.mjs.

// ─── ANGLAIS — 10 chapitres par niveau (matière vide → ordre 1→10) ────────────
const ANGLAIS = {
  C6: ['The alphabet and greetings', 'Numbers, colours and days', 'The verb "to be" and pronouns', 'Classroom language', 'Family and home vocabulary', 'Telling the time', 'My school and subjects', 'Food and drinks', 'Simple questions (what, where, who)', 'Reading: short simple texts'],
  C5: ['Present simple and daily routines', 'Present continuous', 'Describing people and places', 'Shopping and money', 'Prepositions of place and time', 'Hobbies and free time', 'The weather and seasons', 'Giving directions', 'Can / can\'t for ability', 'Reading and short dialogues'],
  C4: ['Past simple: regular verbs', 'Past simple: irregular verbs', 'Telling a story in the past', 'The future: will and going to', 'Comparatives and superlatives', 'Countable and uncountable nouns', 'Asking and answering questions', 'Adverbs of frequency', 'Writing an email', 'Reading comprehension'],
  C3: ['Present perfect', 'Modal verbs (can, must, should)', 'Conditionals: zero and first', 'The passive voice (intro)', 'Reported speech (intro)', 'Expressing opinions', 'Writing a structured paragraph', 'Phrasal verbs', 'Connectors and linking words', 'Brevet exam preparation'],
  LS: ['Review of tenses', 'Building vocabulary', 'Reading literary extracts', 'Listening strategies', 'Speaking: describing and narrating', 'Writing a short essay', 'Relative clauses', 'Modals of deduction', 'The passive voice', 'Summary and note-taking'],
  LP: ['Advanced grammar and structure', 'Argumentative writing', 'Text and document analysis', 'Idioms and register', 'Oral presentations', 'Conditionals (all types)', 'Reported speech (full)', 'Connectors and cohesion', 'Vocabulary: media and society', 'Exam techniques'],
  LT: ['Complex tenses and nuance', 'Essay writing for the Bac', 'Literary and cultural analysis', 'Debate and discussion', 'Translation (EN ⇄ FR)', 'Advanced reading comprehension', 'Idiomatic and formal English', 'Argumentation and rebuttal', 'Vocabulary: science and politics', 'Bac oral preparation'],
};

// ─── Chapitres supplémentaires (ordre 6→10) pour matières existantes (original = 1→5) ──
const EXTRA_COLLEGE = {
  'Mathématiques': ['Calcul littéral et expressions', 'Symétrie et transformations', 'Statistiques et moyennes', 'Les nombres relatifs', 'Équations et inéquations'],
  'Physique-Chimie': ['Les circuits électriques', 'Les forces et le mouvement', "L'énergie et ses formes", 'La matière et ses transformations', 'Lumière et couleurs'],
  'SVT': ['Le corps humain et la santé', 'Reproduction et hérédité', 'Environnement et développement durable', 'La nutrition et la digestion', 'Le système nerveux'],
  'Français': ['La poésie et les figures de style', 'Le théâtre : lire et jouer', "L'argumentation : convaincre", 'Conjugaison : les temps', "Vocabulaire et expression écrite"],
  'Histoire-Géographie': ['Le monde contemporain', 'Géographie : populations et territoires', 'Éducation civique : droits et devoirs', "L'Afrique et Djibouti", 'Les grandes civilisations'],
};
const EXTRA_LYCEE = {
  'Mathématiques': ['Suites numériques', 'Dérivation et applications', 'Probabilités et lois', 'Fonctions de référence', "Géométrie dans l'espace"],
  'SVT': ['Génétique et évolution', 'Le fonctionnement du corps humain', 'Écologie et climat', 'Immunologie', 'Géologie et tectonique'],
  'Français': ['Le roman et ses personnages', 'La dissertation littéraire', "L'oral : commentaire et entretien", 'La poésie engagée', 'Le théâtre classique et moderne'],
  'Histoire-Géographie': ['Les grandes guerres mondiales', 'La mondialisation', 'Géopolitique contemporaine', 'La décolonisation', 'Développement et inégalités'],
};

// Physique et Chimie au lycée = matières séparées et vides → 10 chapitres complets (ordre 1→10)
const LYCEE_PC = {
  LS: {
    'Physique': ['Mouvements et forces', 'La lumière et les ondes', "L'électricité : tension et intensité", 'La pression et les fluides', 'Signaux et information', "Les lentilles et l'optique", 'La gravitation', 'Énergie cinétique et potentielle', 'Les ondes sonores', 'Mesures et incertitudes'],
    'Chimie': ['La matière : atomes et éléments', 'Le tableau périodique', 'Les solutions et la concentration', 'Les transformations chimiques', 'Molécules et liaisons', 'Les ions et la conductivité', 'La mole : introduction', 'Acides et bases : introduction', 'Les réactions de combustion', "Tests d'identification chimique"],
  },
  LP: {
    'Physique': ['Forces et énergie mécanique', 'Ondes mécaniques et lumineuses', 'Circuits électriques et puissance', 'Énergie : conversions et rendement', 'Mouvement et interactions', 'Champs et forces', 'Ondes périodiques', 'Lentilles et instruments optiques', 'Travail et puissance', 'Capteurs et électronique'],
    'Chimie': ['Structure de la matière et modèles', 'Quantité de matière : la mole', 'Réactions acide-base', 'Oxydoréduction', 'Introduction à la chimie organique', 'Concentration et dilution', 'Spectroscopie et analyse', 'Les alcanes et alcools', 'Énergie des réactions', 'Synthèse chimique'],
  },
  LT: {
    'Physique': ['Mécanique de Newton et mouvement', 'Ondes et signaux', 'Énergie et transferts thermiques', 'Électromagnétisme', 'Physique nucléaire et radioactivité', 'Mouvements dans un champ', 'Lois de Kepler', 'Circuits RC et RL', 'Effet Doppler', 'Physique quantique : introduction'],
    'Chimie': ['Cinétique chimique', 'Équilibres chimiques', 'Acides, bases et pH', 'Chimie organique et synthèse', 'Piles, électrolyse et oxydoréduction', 'Spectroscopie RMN et IR', 'Stéréochimie', 'Dosages et titrages', 'Thermodynamique chimique', 'Polymères et matériaux'],
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

  // Anglais — 10 chapitres (ordre 1→10)
  matieres.push({
    nomMatiere: 'Anglais',
    chapitres: (ANGLAIS[n.niveauId] || []).map((titre, i) => ({ ordre: i + 1, titre, slug: 'ang-' + slugify(titre) })),
  });

  // Physique & Chimie au lycée — 10 chapitres (ordre 1→10)
  if (n.cycle === 'lycee' && LYCEE_PC[n.niveauId]) {
    for (const [nomMatiere, titres] of Object.entries(LYCEE_PC[n.niveauId])) {
      matieres.push({
        nomMatiere,
        chapitres: titres.map((titre, i) => ({ ordre: i + 1, titre, slug: 'pc-' + slugify(titre) })),
      });
    }
  }

  // Matières existantes — chapitres 6→10 (l'original couvre 1→5)
  const extra = n.cycle === 'college' ? EXTRA_COLLEGE : EXTRA_LYCEE;
  for (const [nomMatiere, titres] of Object.entries(extra)) {
    matieres.push({
      nomMatiere,
      chapitres: titres.map((titre, i) => ({ ordre: 6 + i, titre, slug: 'x-' + slugify(titre) })),
    });
  }

  return { niveauId: n.niveauId, niveauNom: n.niveauNom, cycle: n.cycle, matieres };
});
