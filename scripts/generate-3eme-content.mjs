/**
 * 🎓 LearnHub Djibouti — AI Course Builder
 * Génère le contenu pédagogique des 5 chapitres clés de 3ème
 * Mathématiques + Physique-Chimie (les matières qui font le plus peur)
 *
 * Usage : node scripts/generate-3eme-content.mjs
 */

const API = 'http://localhost:3001/api/v1';

// ─── IDs récupérés depuis la DB ──────────────────────────────────────────────
const MATIERES = {
  maths:   'cmq6x24pa000v14gc01e6au24',   // Mathématiques C3
  physique: 'cmq6x24pf000x14gcj9clfsfg',   // Physique-Chimie C3
};

// ─── Les 5 chapitres clés à générer ─────────────────────────────────────────
const CHAPITRES = [
  {
    id:       'c3-maths-pythagore',
    matiereId: MATIERES.maths,
    titre:    'Théorème de Pythagore',
    ordre:    1,
    niveau:   '3ème',
    matiere:  'Mathématiques',
  },
  {
    id:       'c3-maths-equations',
    matiereId: MATIERES.maths,
    titre:    'Équations du premier degré à une inconnue',
    ordre:    2,
    niveau:   '3ème',
    matiere:  'Mathématiques',
  },
  {
    id:       'c3-maths-fonctions',
    matiereId: MATIERES.maths,
    titre:    'Fonctions linéaires et affines',
    ordre:    3,
    niveau:   '3ème',
    matiere:  'Mathématiques',
  },
  {
    id:       'c3-physique-forces',
    matiereId: MATIERES.physique,
    titre:    'Les forces et l\'équilibre des solides',
    ordre:    1,
    niveau:   '3ème',
    matiere:  'Physique-Chimie',
  },
  {
    id:       'c3-physique-ohm',
    matiereId: MATIERES.physique,
    titre:    'Loi d\'Ohm et circuits électriques',
    ordre:    2,
    niveau:   '3ème',
    matiere:  'Physique-Chimie',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 LearnHub Djibouti — AI Course Builder');
  console.log('═══════════════════════════════════════════\n');

  // 1. Login
  console.log('🔐 Connexion en tant qu\'instructeur...');
  const auth = await request('POST', '/auth/login', {
    email:    'noorulfirdaws@gmail.com',
    password: 'Instructor123!',
  });
  const token = auth.data?.accessToken;
  if (!token) throw new Error('Token non reçu: ' + JSON.stringify(auth));
  console.log('✅ Connecté\n');

  // 2. Pour chaque chapitre : créer + générer
  for (const ch of CHAPITRES) {
    const emoji = ch.matiere === 'Mathématiques' ? '📐' : '⚗️';
    console.log(`${emoji} ${ch.matiere} — ${ch.titre}`);
    console.log('   Création du chapitre...');

    // Créer (ignore 409 si existe déjà)
    try {
      await request('POST', '/chapitres', {
        id:        ch.id,
        matiereId: ch.matiereId,
        titre:     ch.titre,
        ordre:     ch.ordre,
      }, token);
      console.log('   ✅ Chapitre créé');
    } catch (e) {
      if (e.message?.includes('409') || e.message?.includes('Unique')) {
        console.log('   ℹ️  Chapitre existe déjà');
      } else {
        console.log(`   ⚠️  Création: ${e.message}`);
      }
    }

    // Générer le contenu AI
    console.log('   🤖 Génération AI en cours (30-60s)...');
    const start = Date.now();
    try {
      await request('POST', `/chapitres/${ch.id}/generer`, {
        niveau:  ch.niveau,
        matiere: ch.matiere,
        titre:   ch.titre,
      }, token);
      const secs = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`   ✅ Contenu généré en ${secs}s`);
    } catch (e) {
      console.log(`   ❌ Génération échouée: ${e.message}`);
    }

    // Pause entre chapitres pour respecter les rate limits Anthropic
    if (ch !== CHAPITRES[CHAPITRES.length - 1]) {
      console.log('   ⏳ Pause 5s avant le chapitre suivant...\n');
      await sleep(5000);
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('🏁 Génération terminée !');
  console.log('\n📊 Récap :');
  console.log(`   • ${CHAPITRES.filter(c => c.matiere === 'Mathématiques').length} chapitres Mathématiques`);
  console.log(`   • ${CHAPITRES.filter(c => c.matiere === 'Physique-Chimie').length} chapitres Physique-Chimie`);
  console.log('\n🔗 Voir les résultats :');
  for (const ch of CHAPITRES) {
    const slug = ch.matiere === 'Mathématiques' ? 'mathematiques' : 'physique-chimie';
    console.log(`   http://localhost:3000/apprendre/C3/${slug}/${ch.id}`);
  }
  console.log('');
}

main().catch((e) => {
  console.error('\n💥 Erreur fatale:', e.message);
  process.exit(1);
});
