/**
 * Génère directement le contenu de "Fonctions linéaires et affines"
 * Utilise l'API Anthropic en direct + réparation JSON robuste
 */

import Anthropic from '@anthropic-ai/sdk';

const CHAPITRE_ID = 'c3-maths-fonctions';
const API = 'http://localhost:3001/api/v1';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || 'REDACTED';

// ─── Réparation JSON robuste ──────────────────────────────────────────────────
function repairJSON(raw) {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Aucun objet JSON trouvé');
  let s = raw.slice(start, end + 1);

  // 1. Remplacer TOUS les retours à la ligne par des espaces
  //    (safe : les \n dans les strings JSON doivent être \n encodé, pas un vrai newline)
  s = s.replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ');

  // 2. Supprimer virgules trailing
  s = s.replace(/,\s*([}\]])/g, '$1');

  // 3. Les backslashes non-échappés (formules math : \frac, \pi, etc.)
  s = s.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

  // 4. Retirer les caractères de contrôle restants
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return JSON.parse(s);
}

async function main() {
  console.log('\n🔧 Génération directe — Fonctions linéaires et affines\n');

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  // 1. Login pour obtenir le token
  const authRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'noorulfirdaws@gmail.com', password: 'Instructor123!' }),
  });
  const auth = await authRes.json();
  const token = auth.data?.accessToken;
  console.log('✅ Connecté à l\'API\n');

  const prompt = `Tu es un professeur expert du programme de 3ème (collège de Djibouti).
Génère le contenu pédagogique complet du chapitre "Fonctions linéaires et affines" pour des élèves de 3ème.

RÈGLES JSON STRICTES :
- Retourne UNIQUEMENT un objet JSON, sans aucun texte avant ou après
- Utilise des guillemets droits " uniquement
- PAS de retour à la ligne dans les valeurs string
- Les apostrophes dans le texte (l'axe, d'une droite...) sont autorisées
- Pour les formules math, écris en texte simple : "f(x) = ax + b" pas de LaTeX
- Pas de virgule après le dernier élément d'un tableau ou objet

{
  "contenuCours": {
    "introduction": "Résumé en 2 phrases simples sur les fonctions linéaires et affines",
    "points_cles": [
      {"titre": "Définition d'une fonction linéaire", "explication": "f(x) = ax. Chaque valeur de x donne une valeur f(x). Le nombre a s'appelle le coefficient directeur.", "formule": "f(x) = ax"},
      {"titre": "Définition d'une fonction affine", "explication": "f(x) = ax + b. Avec a le coefficient directeur et b l'ordonnée à l'origine.", "formule": "f(x) = ax + b"},
      {"titre": "Représentation graphique", "explication": "La représentation d'une fonction affine est une droite. Pour la tracer, on calcule deux points et on les relie.", "formule": null},
      {"titre": "Sens de variation", "explication": "Si a > 0, la fonction est croissante. Si a < 0, la fonction est décroissante. Si a = 0, la fonction est constante.", "formule": null},
      {"titre": "Tableau de valeurs", "explication": "On choisit des valeurs de x, on calcule f(x) pour chaque, et on complète le tableau.", "formule": null}
    ]
  },
  "exemples": [
    {
      "situation": "Tracer la droite d'équation f(x) = 2x + 1",
      "resolution_pas_a_pas": "Étape 1 : Identifier a=2 et b=1. Étape 2 : Calculer deux points. Pour x=0 : f(0) = 2*0+1 = 1 donc le point A(0,1). Pour x=2 : f(2) = 2*2+1 = 5 donc le point B(2,5). Étape 3 : Tracer la droite passant par A et B."
    },
    {
      "situation": "Un taxi facture 2 euros par kilomètre plus 3 euros de prise en charge. Quelle est la formule du coût total ?",
      "resolution_pas_a_pas": "Étape 1 : La prise en charge est fixe : 3 euros. Étape 2 : Le coût kilométrique est 2 * x où x est le nombre de km. Étape 3 : Le coût total est f(x) = 2x + 3. C'est une fonction affine avec a=2 et b=3."
    }
  ],
  "exercices": [
    {
      "enonce": "Soit f(x) = 3x - 2. Calculer f(0), f(1) et f(4). Puis dire si la fonction est croissante ou décroissante.",
      "corrige_detaille": "Calcul des images : f(0) = 3*0 - 2 = -2. f(1) = 3*1 - 2 = 1. f(4) = 3*4 - 2 = 10. Sens de variation : le coefficient directeur a = 3 > 0, donc la fonction est croissante."
    },
    {
      "enonce": "Une fonction affine passe par les points A(0, -1) et B(3, 5). Trouver l'expression de f(x).",
      "corrige_detaille": "L'ordonnée à l'origine b = f(0) = -1 (d'après le point A). Le coefficient directeur a = (5 - (-1)) / (3 - 0) = 6/3 = 2. Donc f(x) = 2x - 1."
    }
  ],
  "quiz": [
    {
      "question": "Quelle est l'image de x=3 par la fonction f(x) = 4x - 1 ?",
      "options": ["11", "10", "13", "7"],
      "reponse_correcte": "11",
      "explication_pedagogique": "f(3) = 4 * 3 - 1 = 12 - 1 = 11. Il faut bien appliquer la priorité des opérations : la multiplication avant la soustraction."
    },
    {
      "question": "La fonction f(x) = -3x + 5 est-elle croissante ou décroissante ?",
      "options": ["Croissante car a = -3", "Décroissante car a = -3 < 0", "Croissante car b = 5 > 0", "Constante"],
      "reponse_correcte": "Décroissante car a = -3 < 0",
      "explication_pedagogique": "Le signe du coefficient directeur a détermine le sens de variation. Ici a = -3 est négatif, donc la fonction est décroissante : quand x augmente, f(x) diminue."
    },
    {
      "question": "Quelle est l'ordonnée à l'origine de f(x) = 7x + 2 ?",
      "options": ["7", "x", "2", "0"],
      "reponse_correcte": "2",
      "explication_pedagogique": "L'ordonnée à l'origine est la valeur b dans f(x) = ax + b. Elle correspond au point où la droite coupe l'axe des ordonnées, c'est-à-dire f(0) = 2."
    },
    {
      "question": "Une fonction linéaire f(x) = ax a forcément son graphe qui passe par quel point ?",
      "options": ["(1, a)", "(0, 1)", "(0, 0)", "(a, 0)"],
      "reponse_correcte": "(0, 0)",
      "explication_pedagogique": "Pour une fonction linéaire f(x) = ax, quand x = 0 : f(0) = a*0 = 0. La droite passe toujours par l'origine du repère, le point (0, 0)."
    }
  ],
  "youtubeMotsCles": "fonctions linéaires affines 3ème mathématiques collège",
  "khanAcademyUrl": null
}

Génère maintenant un contenu similaire mais ORIGINAL et plus développé pour ce chapitre. Respecte strictement le format JSON ci-dessus.`;

  console.log('🤖 Appel Anthropic (claude-opus-4-5)...');
  const start = Date.now();

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  console.log(`   Réponse reçue en ${((Date.now() - start) / 1000).toFixed(1)}s (${text.length} chars)`);

  // Tenter la réparation
  let parsed;
  try {
    parsed = repairJSON(text);
    console.log('✅ JSON parsé avec succès');
  } catch (e) {
    console.error('❌ Échec du parsing JSON:', e.message);
    // Afficher le contexte autour de l'erreur
    const pos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
    console.log('Contexte autour de l\'erreur:');
    console.log(text.slice(Math.max(0, pos - 100), pos + 100));
    process.exit(1);
  }

  // PATCH du chapitre via l'API
  console.log('💾 Sauvegarde dans la base de données...');
  const patchRes = await fetch(`${API}/chapitres/${CHAPITRE_ID}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      contenuCours:    parsed.contenuCours,
      exemples:        parsed.exemples || [],
      exercices:       parsed.exercices || [],
      quiz:            parsed.quiz || [],
      youtubeMotsCles: parsed.youtubeMotsCles || null,
      khanAcademyUrl:  parsed.khanAcademyUrl || null,
      isPublished:     true,
    }),
  });

  if (!patchRes.ok) {
    const err = await patchRes.json();
    throw new Error(`PATCH échoué: ${JSON.stringify(err)}`);
  }

  console.log('✅ Chapitre "Fonctions linéaires et affines" publié avec succès !');
  console.log('\n🔗 http://localhost:3000/apprendre/C3/mathematiques/c3-maths-fonctions\n');
}

main().catch(e => { console.error('💥', e.message); process.exit(1); });
