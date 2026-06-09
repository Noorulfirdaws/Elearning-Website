/**
 * Seeder éducation Djibouti — niveaux, matières, chapitres de démo
 * Exécuter : npx ts-node --transpile-only apps/api/src/modules/education/education.seed.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NIVEAUX = [
  { id: 'C6', nom: '6ème',      cycle: 'college', ordre: 1 },
  { id: 'C5', nom: '5ème',      cycle: 'college', ordre: 2 },
  { id: 'C4', nom: '4ème',      cycle: 'college', ordre: 3 },
  { id: 'C3', nom: '3ème',      cycle: 'college', ordre: 4 },
  { id: 'LS', nom: 'Seconde',   cycle: 'lycee',   ordre: 5 },
  { id: 'LP', nom: 'Première',  cycle: 'lycee',   ordre: 6 },
  { id: 'LT', nom: 'Terminale', cycle: 'lycee',   ordre: 7 },
];

const MATIERES_PAR_NIVEAU: Record<string, Array<{ nom: string; icone: string; couleur: string }>> = {
  C6: [
    { nom: 'Mathématiques',     icone: '📐', couleur: '#3B82F6' },
    { nom: 'Physique-Chimie',   icone: '⚗️', couleur: '#8B5CF6' },
    { nom: 'SVT',               icone: '🌿', couleur: '#10B981' },
    { nom: 'Français',          icone: '📖', couleur: '#F59E0B' },
    { nom: 'Histoire-Géographie', icone: '🌍', couleur: '#EF4444' },
  ],
  C5: [
    { nom: 'Mathématiques',     icone: '📐', couleur: '#3B82F6' },
    { nom: 'Physique-Chimie',   icone: '⚗️', couleur: '#8B5CF6' },
    { nom: 'SVT',               icone: '🌿', couleur: '#10B981' },
    { nom: 'Français',          icone: '📖', couleur: '#F59E0B' },
    { nom: 'Histoire-Géographie', icone: '🌍', couleur: '#EF4444' },
  ],
  C4: [
    { nom: 'Mathématiques',     icone: '📐', couleur: '#3B82F6' },
    { nom: 'Physique-Chimie',   icone: '⚗️', couleur: '#8B5CF6' },
    { nom: 'SVT',               icone: '🌿', couleur: '#10B981' },
    { nom: 'Français',          icone: '📖', couleur: '#F59E0B' },
    { nom: 'Histoire-Géographie', icone: '🌍', couleur: '#EF4444' },
  ],
  C3: [
    { nom: 'Mathématiques',     icone: '📐', couleur: '#3B82F6' },
    { nom: 'Physique-Chimie',   icone: '⚗️', couleur: '#8B5CF6' },
    { nom: 'SVT',               icone: '🌿', couleur: '#10B981' },
    { nom: 'Français',          icone: '📖', couleur: '#F59E0B' },
    { nom: 'Histoire-Géographie', icone: '🌍', couleur: '#EF4444' },
  ],
  LS: [
    { nom: 'Mathématiques',     icone: '📐', couleur: '#3B82F6' },
    { nom: 'Physique',          icone: '⚡', couleur: '#8B5CF6' },
    { nom: 'Chimie',            icone: '⚗️', couleur: '#EC4899' },
    { nom: 'SVT',               icone: '🌿', couleur: '#10B981' },
    { nom: 'Français',          icone: '📖', couleur: '#F59E0B' },
    { nom: 'Histoire-Géographie', icone: '🌍', couleur: '#EF4444' },
  ],
  LP: [
    { nom: 'Mathématiques',     icone: '📐', couleur: '#3B82F6' },
    { nom: 'Physique',          icone: '⚡', couleur: '#8B5CF6' },
    { nom: 'Chimie',            icone: '⚗️', couleur: '#EC4899' },
    { nom: 'SVT',               icone: '🌿', couleur: '#10B981' },
    { nom: 'Français',          icone: '📖', couleur: '#F59E0B' },
    { nom: 'Histoire-Géographie', icone: '🌍', couleur: '#EF4444' },
  ],
  LT: [
    { nom: 'Mathématiques',     icone: '📐', couleur: '#3B82F6' },
    { nom: 'Physique',          icone: '⚡', couleur: '#8B5CF6' },
    { nom: 'Chimie',            icone: '⚗️', couleur: '#EC4899' },
    { nom: 'SVT',               icone: '🌿', couleur: '#10B981' },
    { nom: 'Français',          icone: '📖', couleur: '#F59E0B' },
    { nom: 'Histoire-Géographie', icone: '🌍', couleur: '#EF4444' },
  ],
};

// Chapitre de démo complet — Pythagore 3ème
const CHAPITRE_PYTHAGORE = {
  id: 'C3_math_pythagore',
  titre: 'Le Théorème de Pythagore',
  ordre: 1,
  contenuCours: {
    introduction: 'Le théorème de Pythagore est une relation fondamentale entre les côtés d\'un triangle rectangle. Il est l\'un des théorèmes les plus utilisés en géométrie.',
    points_cles: [
      {
        titre: 'Définition du triangle rectangle',
        explication: 'Un triangle rectangle possède un angle droit (90°). Le côté opposé à l\'angle droit s\'appelle l\'hypoténuse — c\'est toujours le côté le plus long.',
        formule: null,
      },
      {
        titre: 'La formule de Pythagore',
        explication: 'Dans un triangle ABC rectangle en A, le carré de l\'hypoténuse est égal à la somme des carrés des deux autres côtés.',
        formule: 'BC² = AB² + AC²',
      },
      {
        titre: 'Réciproque du théorème',
        explication: 'Si BC² = AB² + AC², alors le triangle est rectangle en A. On peut ainsi vérifier si un triangle est rectangle.',
        formule: 'Si a² = b² + c², alors angle droit en face de a',
      },
    ],
  },
  exemples: [
    {
      situation: 'Un triangle ABC est rectangle en A avec AB = 3 cm et AC = 4 cm. Calcule BC.',
      resolution_pas_a_pas: 'Étape 1 : On identifie l\'hypoténuse → BC (côté opposé à l\'angle droit en A)\nÉtape 2 : On applique Pythagore → BC² = AB² + AC²\nÉtape 3 : On calcule → BC² = 3² + 4² = 9 + 16 = 25\nÉtape 4 : On extrait la racine → BC = √25 = 5 cm\n✅ Réponse : BC = 5 cm',
    },
    {
      situation: 'Une échelle de 10 m est appuyée contre un mur. Son pied est à 6 m du mur. À quelle hauteur touche-t-elle le mur ?',
      resolution_pas_a_pas: 'Étape 1 : On dessine le triangle → hypoténuse = échelle = 10 m, base = 6 m, hauteur = h\nÉtape 2 : Pythagore → 10² = 6² + h²\nÉtape 3 : Calcul → 100 = 36 + h² → h² = 64\nÉtape 4 : h = √64 = 8 m\n✅ Réponse : L\'échelle touche le mur à 8 m de hauteur',
    },
  ],
  exercices: [
    {
      enonce: 'Un triangle DEF est rectangle en D. DE = 6 cm et DF = 8 cm. Calcule EF.',
      corrige_detaille: 'EF est l\'hypoténuse (opposée à l\'angle droit en D)\nEF² = DE² + DF² = 6² + 8² = 36 + 64 = 100\nEF = √100 = 10 cm',
    },
    {
      enonce: 'Vérifie si le triangle avec les côtés 5 cm, 12 cm et 13 cm est rectangle.',
      corrige_detaille: 'On teste la réciproque avec le plus grand côté (13) comme hypoténuse potentielle.\n13² = 169\n5² + 12² = 25 + 144 = 169\nComme 13² = 5² + 12², le triangle EST bien rectangle.',
    },
  ],
  quiz: [
    {
      question: 'Le théorème de Pythagore s\'applique uniquement dans quel type de triangle ?',
      options: ['Triangle isocèle', 'Triangle rectangle', 'Triangle équilatéral'],
      reponse_correcte: 'Triangle rectangle',
      explication_pedagogique: 'Le théorème de Pythagore ne fonctionne QUE dans un triangle rectangle. L\'angle droit est indispensable pour que la relation BC² = AB² + AC² soit vraie.',
    },
    {
      question: 'Dans un triangle rectangle, comment s\'appelle le côté opposé à l\'angle droit ?',
      options: ['La médiane', 'L\'hypoténuse', 'La hauteur'],
      reponse_correcte: 'L\'hypoténuse',
      explication_pedagogique: 'L\'hypoténuse est toujours le côté opposé à l\'angle droit. C\'est aussi le côté le plus long du triangle rectangle.',
    },
    {
      question: 'Si AB = 5 et AC = 12 dans un triangle rectangle en A, quelle est la valeur de BC ?',
      options: ['13', '17', '7'],
      reponse_correcte: '13',
      explication_pedagogique: 'BC² = 5² + 12² = 25 + 144 = 169. Donc BC = √169 = 13. C\'est un célèbre triplet pythagoricien : (5, 12, 13).',
    },
  ],
  youtubeUrl: 'https://www.youtube.com/results?search_query=théorème+de+pythagore+3ème+cours',
  youtubeMotsCles: 'théorème de pythagore 3ème cours exercices corrigés',
  khanAcademyUrl: 'https://fr.khanacademy.org/math/geometry/pythagorean-theorem',
  isPublished: true,
};

// Chapitre de démo — Fractions 6ème
const CHAPITRE_FRACTIONS = {
  id: 'C6_math_fractions',
  titre: 'Les Fractions',
  ordre: 1,
  contenuCours: {
    introduction: 'Une fraction représente une partie d\'un tout. Elle est composée d\'un numérateur (en haut) et d\'un dénominateur (en bas).',
    points_cles: [
      {
        titre: 'Lecture d\'une fraction',
        explication: 'La fraction 3/4 se lit "trois quarts". Le numérateur 3 indique 3 parties prises, le dénominateur 4 indique que le tout est divisé en 4 parties égales.',
        formule: 'fraction = numérateur / dénominateur',
      },
      {
        titre: 'Fractions équivalentes',
        explication: 'On peut multiplier ou diviser le numérateur et le dénominateur par le même nombre sans changer la valeur de la fraction.',
        formule: '1/2 = 2/4 = 3/6 = 50/100',
      },
      {
        titre: 'Simplifier une fraction',
        explication: 'Pour simplifier, on divise le numérateur et le dénominateur par leur PGCD (Plus Grand Commun Diviseur).',
        formule: '6/9 = 2/3 (divisé par 3)',
      },
    ],
  },
  exemples: [
    {
      situation: 'Une pizza est coupée en 8 parts égales. Tu en manges 3. Quelle fraction représente ce que tu as mangé ?',
      resolution_pas_a_pas: 'Tu as mangé 3 parts sur 8 au total.\nLa fraction est 3/8 (trois huitièmes).\n✅ Réponse : 3/8 de la pizza',
    },
  ],
  exercices: [
    {
      enonce: 'Simplifie la fraction 12/16.',
      corrige_detaille: 'PGCD(12, 16) = 4\n12 ÷ 4 = 3\n16 ÷ 4 = 4\n12/16 = 3/4',
    },
  ],
  quiz: [
    {
      question: 'Quelle est la fraction simplifiée de 6/8 ?',
      options: ['1/2', '3/4', '2/3'],
      reponse_correcte: '3/4',
      explication_pedagogique: 'Le PGCD de 6 et 8 est 2. 6÷2=3 et 8÷2=4. Donc 6/8 = 3/4.',
    },
  ],
  youtubeUrl: 'https://www.youtube.com/results?search_query=les+fractions+6ème+cours+exercices',
  youtubeMotsCles: 'fractions 6ème simplification cours exercices',
  khanAcademyUrl: 'https://fr.khanacademy.org/math/arithmetic/fraction-arithmetic',
  isPublished: true,
};

async function main() {
  console.log('🌱 Seeder éducation Djibouti — début...');

  // 1. Niveaux
  console.log('📚 Insertion des niveaux...');
  for (const niveau of NIVEAUX) {
    await prisma.niveau.upsert({
      where: { id: niveau.id },
      update: niveau,
      create: niveau,
    });
  }
  console.log(`   ✅ ${NIVEAUX.length} niveaux insérés`);

  // 2. Matières par niveau
  console.log('📋 Insertion des matières...');
  let totalMatieres = 0;
  const matiereIds: Record<string, string> = {};

  for (const [niveauId, matieres] of Object.entries(MATIERES_PAR_NIVEAU)) {
    for (const matiere of matieres) {
      const created = await prisma.matiere.upsert({
        where: { niveauId_nom: { niveauId, nom: matiere.nom } },
        update: { icone: matiere.icone, couleur: matiere.couleur },
        create: { niveauId, ...matiere },
      });
      matiereIds[`${niveauId}_${matiere.nom}`] = created.id;
      totalMatieres++;
    }
  }
  console.log(`   ✅ ${totalMatieres} matières insérées`);

  // 3. Chapitres de démo
  console.log('📖 Insertion des chapitres de démo...');

  const mathC3Id = matiereIds['C3_Mathématiques'];
  const mathC6Id = matiereIds['C6_Mathématiques'];

  if (mathC3Id) {
    await prisma.chapitre.upsert({
      where: { id: CHAPITRE_PYTHAGORE.id },
      update: { ...CHAPITRE_PYTHAGORE, matiereId: mathC3Id },
      create: { ...CHAPITRE_PYTHAGORE, matiereId: mathC3Id },
    });
    console.log('   ✅ Chapitre Pythagore (3ème Maths)');
  }

  if (mathC6Id) {
    await prisma.chapitre.upsert({
      where: { id: CHAPITRE_FRACTIONS.id },
      update: { ...CHAPITRE_FRACTIONS, matiereId: mathC6Id },
      create: { ...CHAPITRE_FRACTIONS, matiereId: mathC6Id },
    });
    console.log('   ✅ Chapitre Fractions (6ème Maths)');
  }

  console.log('\n🎉 Seeder terminé avec succès !');
  console.log('   → 7 niveaux (6ème → Terminale)');
  console.log(`   → ${totalMatieres} matières`);
  console.log('   → 2 chapitres de démo avec contenu complet');
}

main()
  .catch((e) => { console.error('❌ Erreur:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
