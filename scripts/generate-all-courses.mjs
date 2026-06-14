/**
 * generate-all-courses.mjs
 * ========================
 * Générateur de masse — LearnHub Djibouti
 * Utilise Gemini 2.0 Flash pour générer tout le contenu éducatif
 * (cours, exemples, exercices, quiz) pour tous les niveaux et matières.
 *
 * Usage :
 *   node scripts/generate-all-courses.mjs                     # Tout générer
 *   node scripts/generate-all-courses.mjs --niveau C3         # Un seul niveau
 *   node scripts/generate-all-courses.mjs --matiere Maths     # Une seule matière
 *   node scripts/generate-all-courses.mjs --dry-run           # Voir sans appeler l'API
 *   node scripts/generate-all-courses.mjs --resume            # Reprendre depuis le dernier arrêt
 *   node scripts/generate-all-courses.mjs --force             # Régénérer même si déjà fait
 *
 * Variables d'environnement requises (dans apps/api/.env) :
 *   GOOGLE_API_KEY=AIza...   (Google AI Studio → https://aistudio.google.com/apikey)
 *   DATABASE_URL=postgresql://...
 *
 * Rate limits Gemini 2.0 Flash (tier gratuit) :
 *   - 15 requêtes / minute → pause de 5s entre chaque chapitre
 *   - 1 500 requêtes / jour
 *   - 1M tokens / minute
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { EXPANSION } from './curriculum-expansion.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

// ─── Config ──────────────────────────────────────────────────────────────────

// Charger les variables d'environnement depuis apps/api/.env
function loadEnv() {
  const envPath = join(ROOT, 'apps', 'api', '.env');
  if (!existsSync(envPath)) {
    console.error('❌  apps/api/.env introuvable');
    process.exit(1);
  }
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    }
  }
}

loadEnv();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_BASE          = process.env.GEN_API_BASE || 'https://elearning-website-production.up.railway.app/api/v1';
const CLAUDE_MODEL      = 'claude-sonnet-4-5';
const ANTHROPIC_URL     = 'https://api.anthropic.com/v1/messages';

// Fichier de progression (permet --resume)
const PROGRESS_DIR  = join(ROOT, 'scripts', '.progress');
const PROGRESS_FILE = join(PROGRESS_DIR, 'generation-progress.json');

// Délai entre requêtes Claude (ms) — 3s entre chapitres
const DELAY_BETWEEN_CHAPTERS = 3000;
const MAX_RETRIES             = 3;
const RETRY_DELAY             = 8000;

// ─── Arguments CLI ───────────────────────────────────────────────────────────

const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const RESUME     = args.includes('--resume');
const FORCE      = args.includes('--force');
const NIVEAU_ARG = args.includes('--niveau')  ? args[args.indexOf('--niveau')  + 1] : null;
const MAT_ARG    = args.includes('--matiere') ? args[args.indexOf('--matiere') + 1] : null;

// ─── Curriculum complet ───────────────────────────────────────────────────────
// 7 niveaux × 5 matières × 5 chapitres = 175 chapitres au total

const CURRICULUM = [
  // ═══════════════════════════════════════════════════════════════════════════
  // COLLÈGE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    niveauId: 'C6', niveauNom: '6ème', cycle: 'college',
    matieres: [
      {
        nomMatiere: 'Mathématiques',
        chapitres: [
          { ordre: 1, titre: 'Les nombres entiers et la numération décimale', slug: 'nombres-entiers' },
          { ordre: 2, titre: 'Les fractions : lecture et représentation',      slug: 'fractions-intro' },
          { ordre: 3, titre: 'La géométrie plane : angles et triangles',        slug: 'geometrie-plane' },
          { ordre: 4, titre: 'Périmètres, aires et volumes',                    slug: 'perimetres-aires' },
          { ordre: 5, titre: 'La proportionnalité et les pourcentages',         slug: 'proportionnalite' },
        ],
      },
      {
        nomMatiere: 'Physique-Chimie',
        chapitres: [
          { ordre: 1, titre: 'Les états de la matière : solide, liquide, gaz', slug: 'etats-matiere' },
          { ordre: 2, titre: 'Les mélanges et les solutions',                   slug: 'melanges-solutions' },
          { ordre: 3, titre: "L'air : composition et propriétés",               slug: 'air-composition' },
          { ordre: 4, titre: "L'eau dans la nature",                            slug: 'eau-nature' },
          { ordre: 5, titre: 'La lumière et les sources lumineuses',            slug: 'lumiere-sources' },
        ],
      },
      {
        nomMatiere: 'SVT',
        chapitres: [
          { ordre: 1, titre: 'La cellule : unité du vivant',                   slug: 'cellule-unite' },
          { ordre: 2, titre: 'Nutrition et digestion chez les animaux',        slug: 'nutrition-digestion' },
          { ordre: 3, titre: 'La photosynthèse et la nutrition des plantes',   slug: 'photosynthese' },
          { ordre: 4, titre: 'Les grands groupes du vivant',                   slug: 'groupes-vivants' },
          { ordre: 5, titre: 'Les écosystèmes de Djibouti',                    slug: 'ecosystemes-djibouti' },
        ],
      },
      {
        nomMatiere: 'Français',
        chapitres: [
          { ordre: 1, titre: 'La phrase : types et formes',                    slug: 'phrase-types' },
          { ordre: 2, titre: 'Les classes grammaticales (nom, verbe, adjectif)', slug: 'classes-grammaticales' },
          { ordre: 3, titre: 'Le récit : narrateur et personnages',            slug: 'recit-narrateur' },
          { ordre: 4, titre: 'La description : écrire ce que l\'on voit',      slug: 'description' },
          { ordre: 5, titre: 'La lettre : écrire à quelqu\'un',                slug: 'lettre-correspondance' },
        ],
      },
      {
        nomMatiere: 'Histoire-Géographie',
        chapitres: [
          { ordre: 1, titre: 'La Préhistoire : des origines à l\'écriture',   slug: 'prehistoire' },
          { ordre: 2, titre: 'L\'Antiquité : Mésopotamie et Égypte',           slug: 'antiquite' },
          { ordre: 3, titre: 'La Grèce et Rome antiques',                      slug: 'grece-rome' },
          { ordre: 4, titre: 'La géographie de Djibouti',                      slug: 'geographie-djibouti' },
          { ordre: 5, titre: 'Les continents et les océans',                   slug: 'continents-oceans' },
        ],
      },
    ],
  },

  {
    niveauId: 'C5', niveauNom: '5ème', cycle: 'college',
    matieres: [
      {
        nomMatiere: 'Mathématiques',
        chapitres: [
          { ordre: 1, titre: 'Les nombres relatifs : addition et soustraction', slug: 'nombres-relatifs' },
          { ordre: 2, titre: 'Fractions et nombres décimaux',                   slug: 'fractions-decimaux' },
          { ordre: 3, titre: 'Les triangles : construction et propriétés',      slug: 'triangles' },
          { ordre: 4, titre: 'Symétrie axiale et centrale',                     slug: 'symetrie' },
          { ordre: 5, titre: 'Statistiques et représentations graphiques',      slug: 'statistiques-graphiques' },
        ],
      },
      {
        nomMatiere: 'Physique-Chimie',
        chapitres: [
          { ordre: 1, titre: 'Atomes, molécules et corps purs',                 slug: 'atomes-molecules' },
          { ordre: 2, titre: 'Réactions chimiques et conservation de la masse', slug: 'reactions-chimiques' },
          { ordre: 3, titre: 'L\'électricité : circuits et courant électrique', slug: 'electricite-circuits' },
          { ordre: 4, titre: 'Les propriétés de la lumière',                    slug: 'proprietes-lumiere' },
          { ordre: 5, titre: 'L\'énergie : formes et transferts',               slug: 'energie-formes' },
        ],
      },
      {
        nomMatiere: 'SVT',
        chapitres: [
          { ordre: 1, titre: 'La respiration chez les êtres vivants',          slug: 'respiration' },
          { ordre: 2, titre: 'La reproduction sexuée et asexuée',              slug: 'reproduction' },
          { ordre: 3, titre: 'Les écosystèmes et les relations alimentaires',  slug: 'ecosystemes-relations' },
          { ordre: 4, titre: 'Le sol et les roches',                           slug: 'sol-roches' },
          { ordre: 5, titre: 'L\'évolution et la classification du vivant',    slug: 'evolution-classification' },
        ],
      },
      {
        nomMatiere: 'Français',
        chapitres: [
          { ordre: 1, titre: 'Lire et comprendre un roman de jeunesse',        slug: 'roman-jeunesse' },
          { ordre: 2, titre: 'La poésie : rimes, rythme et figures de style',  slug: 'poesie-rythme' },
          { ordre: 3, titre: 'Le théâtre : texte et mise en scène',            slug: 'theatre-texte' },
          { ordre: 4, titre: 'Donner son avis : l\'argumentation simple',      slug: 'argumentation-simple' },
          { ordre: 5, titre: 'Les temps du passé : imparfait et passé simple', slug: 'temps-passe' },
        ],
      },
      {
        nomMatiere: 'Histoire-Géographie',
        chapitres: [
          { ordre: 1, titre: 'Le Moyen Âge : seigneurs, paysans et église',    slug: 'moyen-age' },
          { ordre: 2, titre: 'L\'Islam : naissance et expansion',               slug: 'islam-naissance' },
          { ordre: 3, titre: 'L\'Afrique médiévale : empires et échanges',      slug: 'afrique-medievale' },
          { ordre: 4, titre: 'Les grandes découvertes et leurs conséquences',   slug: 'grandes-decouvertes' },
          { ordre: 5, titre: 'La corne de l\'Afrique : histoire et géographie', slug: 'corne-afrique' },
        ],
      },
    ],
  },

  {
    niveauId: 'C4', niveauNom: '4ème', cycle: 'college',
    matieres: [
      {
        nomMatiere: 'Mathématiques',
        chapitres: [
          { ordre: 1, titre: 'Les équations du premier degré',                  slug: 'equations-premier-degre' },
          { ordre: 2, titre: 'La géométrie dans l\'espace : solides',           slug: 'geometrie-espace' },
          { ordre: 3, titre: 'Les puissances et la notation scientifique',      slug: 'puissances-notation' },
          { ordre: 4, titre: 'Trigonométrie dans le triangle rectangle',        slug: 'trigonometrie' },
          { ordre: 5, titre: 'Probabilités et dénombrement',                    slug: 'probabilites' },
        ],
      },
      {
        nomMatiere: 'Physique-Chimie',
        chapitres: [
          { ordre: 1, titre: 'Les lois de Newton : inertie et action-réaction', slug: 'lois-newton' },
          { ordre: 2, titre: 'L\'énergie électrique : tension et intensité',    slug: 'energie-electrique' },
          { ordre: 3, titre: 'La chimie des solutions : acides et bases',       slug: 'chimie-solutions' },
          { ordre: 4, titre: 'L\'optique géométrique et les lentilles',         slug: 'optique-geometrique' },
          { ordre: 5, titre: 'Le son : propagation et caractéristiques',        slug: 'son-propagation' },
        ],
      },
      {
        nomMatiere: 'SVT',
        chapitres: [
          { ordre: 1, titre: 'La génétique : ADN, chromosomes et gènes',        slug: 'genetique-intro' },
          { ordre: 2, titre: 'Le système nerveux et les réflexes',              slug: 'systeme-nerveux' },
          { ordre: 3, titre: 'Le système immunitaire et les défenses du corps', slug: 'systeme-immunitaire' },
          { ordre: 4, titre: 'La reproduction humaine et puberté',              slug: 'reproduction-humaine' },
          { ordre: 5, titre: 'La tectonique des plaques et les séismes',        slug: 'tectonique-plaques' },
        ],
      },
      {
        nomMatiere: 'Français',
        chapitres: [
          { ordre: 1, titre: 'Le roman réaliste : Balzac et Zola',             slug: 'roman-realiste' },
          { ordre: 2, titre: 'La comédie classique : Molière',                 slug: 'comedie-classique' },
          { ordre: 3, titre: 'L\'argumentation écrite : thèse et arguments',   slug: 'argumentation-ecrite' },
          { ordre: 4, titre: 'Le discours direct et indirect',                  slug: 'discours-direct-indirect' },
          { ordre: 5, titre: 'Écrire une nouvelle : structure narrative',       slug: 'ecrire-nouvelle' },
        ],
      },
      {
        nomMatiere: 'Histoire-Géographie',
        chapitres: [
          { ordre: 1, titre: 'L\'Europe au XVIIIe siècle : Lumières',          slug: 'europe-lumieres' },
          { ordre: 2, titre: 'La Révolution française (1789)',                  slug: 'revolution-francaise' },
          { ordre: 3, titre: 'Napoléon et l\'Empire',                           slug: 'napoleon-empire' },
          { ordre: 4, titre: 'La colonisation et la décolonisation de l\'Afrique', slug: 'colonisation-afrique' },
          { ordre: 5, titre: 'L\'industrialisation au XIXe siècle',             slug: 'industrialisation' },
        ],
      },
    ],
  },

  {
    niveauId: 'C3', niveauNom: '3ème', cycle: 'college',
    matieres: [
      {
        nomMatiere: 'Mathématiques',
        chapitres: [
          { ordre: 1, titre: 'Le Théorème de Pythagore',                        slug: 'pythagore' },
          { ordre: 2, titre: 'Équations du premier degré à une inconnue',       slug: 'equations' },
          { ordre: 3, titre: 'Fonctions linéaires et affines',                  slug: 'fonctions' },
          { ordre: 4, titre: 'Statistiques : moyenne, médiane, étendue',        slug: 'statistiques' },
          { ordre: 5, titre: 'Théorème de Thalès et similitudes',              slug: 'thales' },
        ],
      },
      {
        nomMatiere: 'Physique-Chimie',
        chapitres: [
          { ordre: 1, titre: 'Forces et équilibre des solides',                  slug: 'forces-equilibre' },
          { ordre: 2, titre: 'Loi d\'Ohm et circuits électriques',              slug: 'loi-ohm' },
          { ordre: 3, titre: 'Chimie des solutions : concentration et pH',       slug: 'chimie-concentration' },
          { ordre: 4, titre: 'Énergie et puissance électrique',                  slug: 'energie-puissance' },
          { ordre: 5, titre: 'Radioactivité et réactions nucléaires',           slug: 'radioactivite' },
        ],
      },
      {
        nomMatiere: 'SVT',
        chapitres: [
          { ordre: 1, titre: 'L\'ADN : structure et rôle dans l\'hérédité',      slug: 'adn-heredite' },
          { ordre: 2, titre: 'La transmission des caractères héréditaires',     slug: 'heredite-transmission' },
          { ordre: 3, titre: 'L\'évolution de l\'espèce humaine',               slug: 'evolution-humaine' },
          { ordre: 4, titre: 'Le corps humain et la santé',                     slug: 'corps-sante' },
          { ordre: 5, titre: 'L\'environnement et le développement durable',    slug: 'developpement-durable' },
        ],
      },
      {
        nomMatiere: 'Français',
        chapitres: [
          { ordre: 1, titre: 'L\'autobiographie et les mémoires',               slug: 'autobiographie' },
          { ordre: 2, titre: 'La poésie engagée du XXe siècle',                 slug: 'poesie-engagee' },
          { ordre: 3, titre: 'Le roman et la nouvelle du XXe siècle',           slug: 'roman-xxe-siecle' },
          { ordre: 4, titre: 'L\'argumentation : convaincre et persuader',      slug: 'argumentation-convaincre' },
          { ordre: 5, titre: 'Révision Brevet : expression écrite et orale',    slug: 'revision-brevet' },
        ],
      },
      {
        nomMatiere: 'Histoire-Géographie',
        chapitres: [
          { ordre: 1, titre: 'La Première Guerre mondiale',                     slug: 'premiere-guerre-mondiale' },
          { ordre: 2, titre: 'La Seconde Guerre mondiale et la Shoah',          slug: 'seconde-guerre-mondiale' },
          { ordre: 3, titre: 'La décolonisation et Djibouti',                   slug: 'decolonisation-djibouti' },
          { ordre: 4, titre: 'Le monde depuis 1991 : crises et mondialisation', slug: 'monde-contemporain' },
          { ordre: 5, titre: 'La géographie des pays en développement',         slug: 'pays-developpement' },
        ],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LYCÉE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    niveauId: 'LS', niveauNom: 'Seconde', cycle: 'lycee',
    matieres: [
      {
        nomMatiere: 'Mathématiques',
        chapitres: [
          { ordre: 1, titre: 'Les fonctions : généralités et représentations',  slug: 'fonctions-generalites' },
          { ordre: 2, titre: 'Géométrie analytique dans le plan',               slug: 'geometrie-analytique' },
          { ordre: 3, titre: 'Probabilités et statistiques descriptives',       slug: 'probabilites-stats' },
          { ordre: 4, titre: 'Arithmétique : entiers et PGCD',                  slug: 'arithmetique' },
          { ordre: 5, titre: 'Algèbre : équations et inéquations',              slug: 'algebre-equations' },
        ],
      },
      {
        nomMatiere: 'Physique-Chimie',
        chapitres: [
          { ordre: 1, titre: 'Mécanique : description du mouvement',            slug: 'mecanique-mouvement' },
          { ordre: 2, titre: 'Optique : réflexion et réfraction',               slug: 'optique-refraction' },
          { ordre: 3, titre: 'Chimie des solutions et équilibres',               slug: 'chimie-equilibres' },
          { ordre: 4, titre: 'L\'électricité en courant continu',               slug: 'electricite-continu' },
          { ordre: 5, titre: 'Thermodynamique : chaleur et température',        slug: 'thermodynamique' },
        ],
      },
      {
        nomMatiere: 'SVT',
        chapitres: [
          { ordre: 1, titre: 'La cellule et l\'ADN : base de la vie',           slug: 'cellule-adn' },
          { ordre: 2, titre: 'La Terre : structure et dynamique interne',       slug: 'terre-structure' },
          { ordre: 3, titre: 'L\'évolution de la biodiversité',                 slug: 'evolution-biodiversite' },
          { ordre: 4, titre: 'Écologie et développement durable',              slug: 'ecologie-durable' },
          { ordre: 5, titre: 'Corps humain : nutrition et santé',              slug: 'corps-nutrition' },
        ],
      },
      {
        nomMatiere: 'Français',
        chapitres: [
          { ordre: 1, titre: 'Le roman : de la narration à la réflexion',       slug: 'roman-reflexion' },
          { ordre: 2, titre: 'La poésie : du Romantisme au Symbolisme',        slug: 'poesie-romantisme' },
          { ordre: 3, titre: 'L\'argumentation : essai et article critique',   slug: 'essai-critique' },
          { ordre: 4, titre: 'Le théâtre classique : Corneille et Racine',     slug: 'theatre-classique' },
          { ordre: 5, titre: 'Méthode du commentaire de texte',                slug: 'commentaire-texte' },
        ],
      },
      {
        nomMatiere: 'Histoire-Géographie',
        chapitres: [
          { ordre: 1, titre: 'Le monde en 1945 : l\'après-guerre',              slug: 'monde-1945' },
          { ordre: 2, titre: 'La Guerre froide : deux blocs face à face',       slug: 'guerre-froide' },
          { ordre: 3, titre: 'La décolonisation en Afrique et en Asie',         slug: 'decolonisation' },
          { ordre: 4, titre: 'La mondialisation : flux et acteurs',             slug: 'mondialisation' },
          { ordre: 5, titre: 'La géopolitique de la Corne de l\'Afrique',       slug: 'corne-afrique-geo' },
        ],
      },
    ],
  },

  {
    niveauId: 'LP', niveauNom: 'Première', cycle: 'lycee',
    matieres: [
      {
        nomMatiere: 'Mathématiques',
        chapitres: [
          { ordre: 1, titre: 'La dérivation : calcul et applications',          slug: 'derivation' },
          { ordre: 2, titre: 'Les suites numériques : arithmétiques et géométriques', slug: 'suites-numeriques' },
          { ordre: 3, titre: 'Géométrie dans l\'espace : vecteurs et plans',    slug: 'vecteurs-plans' },
          { ordre: 4, titre: 'Probabilités conditionnelles et indépendance',    slug: 'probabilites-conditionnelles' },
          { ordre: 5, titre: 'Trigonométrie : cercle trigonométrique et formules', slug: 'trigonometrie-avancee' },
        ],
      },
      {
        nomMatiere: 'Physique-Chimie',
        chapitres: [
          { ordre: 1, titre: 'Cinématique : vitesse et accélération',           slug: 'cinematique' },
          { ordre: 2, titre: 'Dynamique : lois de Newton appliquées',           slug: 'dynamique-newton' },
          { ordre: 3, titre: 'Électrocinétique : lois de Kirchhoff',            slug: 'electrocinetique' },
          { ordre: 4, titre: 'Optique ondulatoire : interférences et diffraction', slug: 'optique-ondulatoire' },
          { ordre: 5, titre: 'Chimie organique : structures et nomenclature',   slug: 'chimie-organique' },
        ],
      },
      {
        nomMatiere: 'SVT',
        chapitres: [
          { ordre: 1, titre: 'Neurones et système nerveux : transmission du signal', slug: 'neurones-signal' },
          { ordre: 2, titre: 'Génétique et hérédité : lois de Mendel',         slug: 'genetique-mendel' },
          { ordre: 3, titre: 'L\'immunologie : réponse immunitaire spécifique', slug: 'immunologie' },
          { ordre: 4, titre: 'L\'évolution des espèces : mécanismes et preuves', slug: 'evolution-mecanismes' },
          { ordre: 5, titre: 'Géologie : formation des roches et des reliefs',  slug: 'geologie-roches' },
        ],
      },
      {
        nomMatiere: 'Français',
        chapitres: [
          { ordre: 1, titre: 'La littérature de l\'absurde : Camus, Sartre',    slug: 'litterature-absurde' },
          { ordre: 2, titre: 'Méthode de la dissertation littéraire',          slug: 'dissertation-methode' },
          { ordre: 3, titre: 'Méthode du commentaire composé',                 slug: 'commentaire-compose' },
          { ordre: 4, titre: 'La question de l\'homme dans l\'argumentation',   slug: 'question-homme' },
          { ordre: 5, titre: 'Préparation à l\'oral du Baccalauréat',          slug: 'oral-bac-prep' },
        ],
      },
      {
        nomMatiere: 'Histoire-Géographie',
        chapitres: [
          { ordre: 1, titre: 'Les régimes totalitaires : nazisme et stalinisme', slug: 'regimes-totalitaires' },
          { ordre: 2, titre: 'La France de la IIIe à la Ve République',         slug: 'france-republiques' },
          { ordre: 3, titre: 'La construction européenne',                      slug: 'construction-europeenne' },
          { ordre: 4, titre: 'Le monde arabe et l\'islam politique',            slug: 'monde-arabe-islam' },
          { ordre: 5, titre: 'Géopolitique de l\'Afrique subsaharienne',        slug: 'geopolitique-afrique' },
        ],
      },
    ],
  },

  {
    niveauId: 'LT', niveauNom: 'Terminale', cycle: 'lycee',
    matieres: [
      {
        nomMatiere: 'Mathématiques',
        chapitres: [
          { ordre: 1, titre: 'L\'intégrale : définition et applications',       slug: 'integrale' },
          { ordre: 2, titre: 'Limites de suites et de fonctions',               slug: 'limites' },
          { ordre: 3, titre: 'Probabilités : loi normale et loi de Bernoulli',  slug: 'probabilites-loi-normale' },
          { ordre: 4, titre: 'Les nombres complexes',                           slug: 'nombres-complexes' },
          { ordre: 5, titre: 'Révision Baccalauréat : exercices types',         slug: 'revision-bac-maths' },
        ],
      },
      {
        nomMatiere: 'Physique-Chimie',
        chapitres: [
          { ordre: 1, titre: 'Mécanique avancée : énergie et travail',         slug: 'mecanique-energie' },
          { ordre: 2, titre: 'Thermodynamique : premier et second principes',   slug: 'thermodynamique-principes' },
          { ordre: 3, titre: 'Électromagnétisme : induction et courants alternatifs', slug: 'electromagnetisme' },
          { ordre: 4, titre: 'Chimie organique avancée : réactions',           slug: 'chimie-organique-avancee' },
          { ordre: 5, titre: 'Révision Baccalauréat : Physique-Chimie',        slug: 'revision-bac-phys' },
        ],
      },
      {
        nomMatiere: 'SVT',
        chapitres: [
          { ordre: 1, titre: 'Génétique moléculaire : expression des gènes',   slug: 'genetique-moleculaire' },
          { ordre: 2, titre: 'Le système immunitaire et les vaccins',           slug: 'systeme-immunitaire-vaccins' },
          { ordre: 3, titre: 'Neurosciences : mémoire et comportement',         slug: 'neurosciences-memoire' },
          { ordre: 4, titre: 'L\'évolution humaine : des hominidés à Homo sapiens', slug: 'evolution-humaine-lycee' },
          { ordre: 5, titre: 'Révision Baccalauréat : SVT',                    slug: 'revision-bac-svt' },
        ],
      },
      {
        nomMatiere: 'Français',
        chapitres: [
          { ordre: 1, titre: 'La dissertation philosophique et littéraire',     slug: 'dissertation-philo' },
          { ordre: 2, titre: 'L\'analyse de texte argumentatif',               slug: 'analyse-argumentatif' },
          { ordre: 3, titre: 'Les œuvres du programme Bac : étude approfondie', slug: 'oeuvres-programme-bac' },
          { ordre: 4, titre: 'Oral du Baccalauréat : techniques et entraînement', slug: 'oral-bac-technique' },
          { ordre: 5, titre: 'Révision Baccalauréat : Français',               slug: 'revision-bac-francais' },
        ],
      },
      {
        nomMatiere: 'Histoire-Géographie',
        chapitres: [
          { ordre: 1, titre: 'Le monde contemporain depuis 1989',               slug: 'monde-depuis-1989' },
          { ordre: 2, titre: 'La géopolitique des ressources : eau, pétrole',   slug: 'geopolitique-ressources' },
          { ordre: 3, titre: 'La France dans la mondialisation',               slug: 'france-mondialisation' },
          { ordre: 4, titre: 'Les enjeux environnementaux mondiaux',            slug: 'enjeux-environnementaux' },
          { ordre: 5, titre: 'Révision Baccalauréat : Histoire-Géo',           slug: 'revision-bac-histgeo' },
        ],
      },
    ],
  },
];

// Ajoute l'expansion (Anglais + chapitres supplémentaires) au programme
CURRICULUM.push(...EXPANSION);

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const COLORS = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  magenta:'\x1b[35m',
  white:  '\x1b[37m',
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;
const log = {
  info:    (msg) => console.log(`${c('cyan', 'ℹ')}  ${msg}`),
  success: (msg) => console.log(`${c('green', '✅')} ${msg}`),
  warn:    (msg) => console.log(`${c('yellow', '⚠')}  ${msg}`),
  error:   (msg) => console.log(`${c('red', '❌')} ${msg}`),
  skip:    (msg) => console.log(`${c('dim', '⏭')}  ${c('dim', msg)}`),
  title:   (msg) => console.log(`\n${c('bold', c('blue', '══'))} ${c('bold', msg)} ${c('blue', '══')}`),
  step:    (msg) => console.log(`  ${c('yellow', '→')} ${msg}`),
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function makeChapitreId(niveauId, nomMatiere, slug) {
  const matSlug = slugify(nomMatiere).replace('physique-chimie', 'physique').replace('mathematiques', 'maths').replace('histoire-geographie', 'histgeo');
  return `${niveauId.toLowerCase()}-${matSlug}-${slug}`;
}

// ─── Progression (fichier JSON) ───────────────────────────────────────────────

function loadProgress() {
  if (!existsSync(PROGRESS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  if (!existsSync(PROGRESS_DIR)) mkdirSync(PROGRESS_DIR, { recursive: true });
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// ─── Réparation JSON ──────────────────────────────────────────────────────────

function repairJSON(raw) {
  // 1. Extraire le JSON si entouré de markdown ```json ... ```
  const md = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  let s = md ? md[1] : raw.trim();

  // 2. Supprimer les vrais sauts de ligne DANS les valeurs de chaîne
  //    (on les remplace par \n littéral)
  s = s.replace(/("(?:[^"\\]|\\.)*")/g, (match) =>
    match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  );

  // 3. Supprimer les virgules traînes
  s = s.replace(/,\s*([}\]])/g, '$1');

  // 4. Supprimer les caractères de contrôle
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 5. Corriger les guillemets non-ASCII
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  return s;
}

// ─── API Anthropic Claude (REST direct) ──────────────────────────────────────

async function callClaude(prompt, retryCount = 0) {
  const body = {
    model:      CLAUDE_MODEL,
    max_tokens: 4096,
    messages:   [{ role: 'user', content: prompt }],
  };

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      // Rate limit → attendre 60s et réessayer
      if (res.status === 429 && retryCount < MAX_RETRIES) {
        log.warn(`Rate limit Claude (429). Pause 60s... (tentative ${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(60000);
        return callClaude(prompt, retryCount + 1);
      }
      throw new Error(`Claude HTTP ${res.status}: ${err.slice(0, 200)}`);
    }

    const data = await res.json();
    const raw  = data?.content?.[0]?.text;

    if (!raw) throw new Error('Réponse Claude vide ou malformée');

    const repaired = repairJSON(raw);
    const parsed   = JSON.parse(repaired);

    // Validation minimale de la structure
    if (!parsed.contenuCours || !parsed.quiz || !Array.isArray(parsed.quiz)) {
      throw new Error('Structure JSON invalide : champs manquants (contenuCours, quiz)');
    }

    return parsed;
  } catch (err) {
    if (retryCount < MAX_RETRIES - 1) {
      log.warn(`Erreur Claude, retry dans ${RETRY_DELAY / 1000}s... (${err.message})`);
      await sleep(RETRY_DELAY);
      return callClaude(prompt, retryCount + 1);
    }
    throw err;
  }
}

// ─── Prompt pédagogique ───────────────────────────────────────────────────────

function buildPrompt(niveauNom, nomMatiere, titreChapitre, cycle) {
  const contexte = cycle === 'lycee'
    ? 'lycée (niveau avancé, vocabulaire scientifique précis, concepts approfondis)'
    : 'collège (niveau accessible, exemples concrets, langage clair)';

  return `Tu es un professeur expert du système éducatif français enseignant à Djibouti.
Génère le contenu pédagogique pour le chapitre suivant :

NIVEAU   : ${niveauNom} (${contexte})
MATIÈRE  : ${nomMatiere}
CHAPITRE : ${titreChapitre}

CONSIGNES STRICTES :
- Adapte le contenu au contexte djiboutien quand c'est pertinent (exemples locaux, références à la Corne de l'Afrique)
- Respecte strictement le programme français officiel
- Utilise un français académique correct
- Génère exactement 3 points clés dans le cours
- Génère exactement 3 exemples résolus
- Génère exactement 5 questions de quiz (4 options chacune, 1 bonne réponse)
- NE génère PAS d'exercices (les professeurs les fourniront en PDF)

RÉPONDS UNIQUEMENT AVEC CE JSON (PAS de commentaires, PAS de markdown, PAS de texte avant/après) :
{
  "contenuCours": {
    "introduction": "Paragraphe d'introduction motivant (3-4 phrases, contextualise le chapitre)",
    "points_cles": [
      {
        "titre": "Titre du point clé 1",
        "explication": "Explication claire et détaillée (4-6 phrases)",
        "formule": "Formule ou règle clé si applicable, sinon null"
      },
      {
        "titre": "Titre du point clé 2",
        "explication": "Explication claire et détaillée (4-6 phrases)",
        "formule": "Formule ou règle clé si applicable, sinon null"
      },
      {
        "titre": "Titre du point clé 3",
        "explication": "Explication claire et détaillée (4-6 phrases)",
        "formule": "Formule ou règle clé si applicable, sinon null"
      }
    ]
  },
  "exemples": [
    {
      "situation": "Énoncé clair et contextualisé de l'exemple 1",
      "resolution_pas_a_pas": "Étape 1 : ... Étape 2 : ... Étape 3 : ... Conclusion : ..."
    },
    {
      "situation": "Énoncé clair et contextualisé de l'exemple 2",
      "resolution_pas_a_pas": "Étape 1 : ... Étape 2 : ... Étape 3 : ... Conclusion : ..."
    },
    {
      "situation": "Énoncé clair et contextualisé de l'exemple 3",
      "resolution_pas_a_pas": "Étape 1 : ... Étape 2 : ... Étape 3 : ... Conclusion : ..."
    }
  ],
  "exercices": [],
  "quiz": [
    {
      "question": "Question précise et sans ambiguïté",
      "options": ["A. Réponse A", "B. Réponse B", "C. Réponse C", "D. Réponse D"],
      "reponse_correcte": "A. Réponse A",
      "explication_pedagogique": "Explication courte (1-2 phrases) pourquoi c'est la bonne réponse"
    },
    {
      "question": "Question 2",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "reponse_correcte": "B. ...",
      "explication_pedagogique": "..."
    },
    {
      "question": "Question 3",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "reponse_correcte": "C. ...",
      "explication_pedagogique": "..."
    },
    {
      "question": "Question 4",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "reponse_correcte": "D. ...",
      "explication_pedagogique": "..."
    },
    {
      "question": "Question 5",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "reponse_correcte": "A. ...",
      "explication_pedagogique": "..."
    }
  ]
}`;
}

// ─── API LearnHub (créer + mettre à jour les chapitres) ───────────────────────

let authToken    = null;
let lastLoginAt  = 0;
const TOKEN_TTL  = 12 * 60 * 1000; // re-login toutes les 12 min (JWT expire à 15m)

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      email:    process.env.GEN_EMAIL || 'noorulfirdaws@gmail.com',
      password: process.env.GEN_PASSWORD,
    }),
  });

  if (!res.ok) throw new Error(`Login échoué: HTTP ${res.status}`);
  const data = await res.json();
  authToken   = data.data?.accessToken || data.data?.tokens?.accessToken;
  lastLoginAt = Date.now();
  if (!authToken) throw new Error('Token JWT non trouvé dans la réponse login');
  log.success(`Connecté à l'API LearnHub (JWT obtenu)`);
}

async function ensureFreshToken() {
  if (Date.now() - lastLoginAt > TOKEN_TTL) {
    log.info('🔄 Renouvellement du token JWT...');
    await login();
  }
}

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization:  `Bearer ${authToken}`,
  };
}

async function getMatiereId(niveauId, nomMatiere) {
  const res = await fetch(`${API_BASE}/matieres/niveau/${niveauId}`);
  const data = await res.json();
  const matieres = data.data || [];
  const mat = matieres.find(m => m.nom === nomMatiere);
  return mat?.id || null;
}

async function creerOuMettreAJourChapitre(chapitreId, matiereId, titre, ordre, contenu) {
  // 1. Essayer de récupérer le chapitre existant
  const getRes = await fetch(`${API_BASE}/chapitres/${chapitreId}`);

  if (getRes.ok) {
    // Chapitre existe → PATCH pour mettre à jour le contenu
    const patchRes = await fetch(`${API_BASE}/chapitres/${chapitreId}`, {
      method:  'PATCH',
      headers: getAuthHeaders(),
      body:    JSON.stringify({
        contenuCours: contenu.contenuCours,
        exemples:     contenu.exemples,
        exercices:    contenu.exercices,
        quiz:         contenu.quiz,
        isPublished:  true,
      }),
    });
    if (!patchRes.ok) {
      const err = await patchRes.text();
      throw new Error(`PATCH chapitre échoué: ${err.slice(0, 200)}`);
    }
    return 'updated';
  } else {
    // Chapitre n'existe pas → POST pour créer
    const postRes = await fetch(`${API_BASE}/chapitres`, {
      method:  'POST',
      headers: getAuthHeaders(),
      body:    JSON.stringify({
        id:       chapitreId,
        matiereId,
        titre,
        ordre,
      }),
    });

    if (!postRes.ok) {
      const err = await postRes.text();
      throw new Error(`POST chapitre échoué: ${err.slice(0, 200)}`);
    }

    // Puis PATCH pour injecter le contenu
    const patchRes = await fetch(`${API_BASE}/chapitres/${chapitreId}`, {
      method:  'PATCH',
      headers: getAuthHeaders(),
      body:    JSON.stringify({
        contenuCours: contenu.contenuCours,
        exemples:     contenu.exemples,
        exercices:    contenu.exercices,
        quiz:         contenu.quiz,
        isPublished:  true,
      }),
    });

    if (!patchRes.ok) {
      const err = await patchRes.text();
      throw new Error(`PATCH contenu échoué après création: ${err.slice(0, 200)}`);
    }
    return 'created';
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.clear();
  console.log(c('bold', c('blue', `
╔═══════════════════════════════════════════════════════════╗
║         LearnHub Djibouti — Générateur de masse           ║
║         Powered by Anthropic Claude (claude-sonnet-4-5)    ║
╚═══════════════════════════════════════════════════════════╝`)));
  console.log('');

  // Vérifications préalables
  if (!ANTHROPIC_API_KEY) {
    log.error('ANTHROPIC_API_KEY manquante dans apps/api/.env');
    log.info('La clé est déjà configurée — vérifiez apps/api/.env');
    process.exit(1);
  }

  if (DRY_RUN) {
    log.warn('MODE DRY-RUN — Aucun appel API ne sera effectué\n');
  }

  // Charger la progression
  const progress = RESUME ? loadProgress() : {};

  // Construire la liste de tout ce qui doit être généré
  const tasks = [];

  for (const niveau of CURRICULUM) {
    // Filtre --niveau
    if (NIVEAU_ARG && niveau.niveauId !== NIVEAU_ARG.toUpperCase()) continue;

    for (const matiere of niveau.matieres) {
      // Filtre --matiere (partiel)
      if (MAT_ARG && !matiere.nomMatiere.toLowerCase().includes(MAT_ARG.toLowerCase())) continue;

      for (const ch of matiere.chapitres) {
        const chapitreId = makeChapitreId(niveau.niveauId, matiere.nomMatiere, ch.slug);
        tasks.push({
          niveauId:   niveau.niveauId,
          niveauNom:  niveau.niveauNom,
          cycle:      niveau.cycle,
          nomMatiere: matiere.nomMatiere,
          titreChapitre: ch.titre,
          slug:       ch.slug,
          ordre:      ch.ordre,
          chapitreId,
        });
      }
    }
  }

  // Stats initiales
  const total    = tasks.length;
  const deja     = RESUME ? tasks.filter(t => progress[t.chapitreId]?.done).length : 0;
  const aFaire   = total - (FORCE ? 0 : deja);

  console.log(`${c('bold', 'Curriculum')} : ${c('cyan', total)} chapitres au total`);
  console.log(`${c('bold', 'Déjà fait')} : ${c('green', deja)} chapitres`);
  console.log(`${c('bold', 'À générer')} : ${c('yellow', aFaire)} chapitres`);
  if (NIVEAU_ARG) console.log(`${c('bold', 'Filtre')}    : niveau ${c('cyan', NIVEAU_ARG)}`);
  if (MAT_ARG)    console.log(`${c('bold', 'Filtre')}    : matière ${c('cyan', MAT_ARG)}`);

  if (aFaire === 0) {
    log.success('Tout est déjà généré ! Utilisez --force pour régénérer.');
    return;
  }

  // Estimation du temps
  const estimMin = Math.ceil((aFaire * DELAY_BETWEEN_CHAPTERS) / 60000);
  console.log(`\n${c('dim', `Durée estimée : ~${estimMin} min (${DELAY_BETWEEN_CHAPTERS/1000}s/chapitre + temps Gemini)`)} `);

  if (!DRY_RUN) {
    console.log('');
    // Confirmation si gros volume
    if (aFaire > 20 && !args.includes('--yes')) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      await new Promise(resolve => {
        rl.question(`${c('yellow', '⚠')}  Générer ${aFaire} chapitres ? (o/n) : `, ans => {
          rl.close();
          if (ans.toLowerCase() !== 'o' && ans !== 'y') {
            log.info('Annulé. Relancez avec --niveau C3 pour tester un seul niveau.');
            process.exit(0);
          }
          resolve();
        });
      });
    }

    // Connexion à l'API
    await login();
  }

  // Compteurs
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
  let current = 0;

  // ─── Boucle principale ───────────────────────────────────────────────────

  for (const task of tasks) {
    current++;

    // Sauter si déjà fait (sauf --force)
    if (!FORCE && progress[task.chapitreId]?.done) {
      log.skip(`[${current}/${total}] ${task.niveauId} / ${task.nomMatiere} / ${task.titreChapitre}`);
      stats.skipped++;
      continue;
    }

    const prefix = `[${c('dim', `${current}/${total}`)}] ${c('cyan', task.niveauId)} / ${c('magenta', task.nomMatiere)}`;
    console.log(`\n${prefix}`);
    log.step(`${c('bold', task.titreChapitre)}`);

    if (DRY_RUN) {
      log.info(`  ID: ${task.chapitreId}`);
      log.info(`  Prompt: ${buildPrompt(task.niveauNom, task.nomMatiere, task.titreChapitre, task.cycle).slice(0, 120)}...`);
      stats.created++;
      continue;
    }

    try {
      // 0. S'assurer que le token JWT est encore valide
      await ensureFreshToken();

      // 1. Récupérer l'ID de la matière en DB
      const matiereId = await getMatiereId(task.niveauId, task.nomMatiere);
      if (!matiereId) {
        log.warn(`  Matière "${task.nomMatiere}" non trouvée pour ${task.niveauId} — vérifiez le seeder`);
        stats.failed++;
        stats.errors.push({ chapitreId: task.chapitreId, error: 'Matière non trouvée en DB' });
        continue;
      }

      // 2. Appel Claude
      log.step(`Appel Claude (${CLAUDE_MODEL})...`);
      const prompt  = buildPrompt(task.niveauNom, task.nomMatiere, task.titreChapitre, task.cycle);
      const contenu = await callClaude(prompt);

      log.step(`Contenu reçu — ${contenu.quiz.length} questions, ${contenu.exemples.length} exemples`);

      // 3. Sauvegarder en DB
      const action = await creerOuMettreAJourChapitre(
        task.chapitreId, matiereId, task.titreChapitre, task.ordre, contenu
      );

      if (action === 'created') {
        log.success(`  Créé : ${task.chapitreId}`);
        stats.created++;
      } else {
        log.success(`  Mis à jour : ${task.chapitreId}`);
        stats.updated++;
      }

      // 4. Marquer comme fait
      progress[task.chapitreId] = { done: true, ts: new Date().toISOString() };
      saveProgress(progress);

    } catch (err) {
      log.error(`  ÉCHEC — ${task.chapitreId}`);
      log.error(`  ${err.message}`);
      stats.failed++;
      stats.errors.push({ chapitreId: task.chapitreId, titre: task.titreChapitre, error: err.message });

      // Marquer comme échoué (pour --resume)
      progress[task.chapitreId] = { done: false, error: err.message, ts: new Date().toISOString() };
      saveProgress(progress);

      // Continuer au prochain chapitre (ne pas s'arrêter)
    }

    // Pause respectueuse entre les requêtes (rate limiting Gemini)
    if (current < tasks.length) {
      process.stdout.write(c('dim', `  Pause ${DELAY_BETWEEN_CHAPTERS / 1000}s...`));
      await sleep(DELAY_BETWEEN_CHAPTERS);
      process.stdout.write('\r' + ' '.repeat(40) + '\r');
    }
  }

  // ─── Rapport final ───────────────────────────────────────────────────────

  console.log('\n');
  console.log(c('bold', c('blue', '═'.repeat(50))));
  console.log(c('bold', '  RAPPORT FINAL'));
  console.log(c('blue', '═'.repeat(50)));
  console.log(`  ${c('green',  '✅ Créés    :')} ${stats.created}`);
  console.log(`  ${c('cyan',   '🔄 Mis à jour:')} ${stats.updated}`);
  console.log(`  ${c('dim',    '⏭ Ignorés  :')} ${stats.skipped}`);
  console.log(`  ${c('red',    '❌ Échecs   :')} ${stats.failed}`);
  console.log(`  ${c('bold',   '   TOTAL    :')} ${current}/${total}`);
  console.log(c('blue', '═'.repeat(50)));

  if (stats.errors.length > 0) {
    console.log(`\n${c('yellow', '  Chapitres échoués (relancez avec --resume) :')}`);
    for (const e of stats.errors) {
      console.log(`  ${c('dim', '•')} ${e.chapitreId} — ${c('red', e.error?.slice(0, 80))}`);
    }
    console.log(`\n${c('dim', '  Pour reprendre : node scripts/generate-all-courses.mjs --resume')}`);
  }

  if (stats.failed === 0) {
    console.log(`\n  ${c('green', '🎉 Génération terminée avec succès !')}`);
    console.log(c('dim', '  Le contenu est maintenant disponible sur http://localhost:3000/apprendre'));
  }

  console.log('');
}

// ─── Exécution ────────────────────────────────────────────────────────────────

main().catch(err => {
  log.error(`Erreur fatale : ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
