/**
 * Régénère les 2 chapitres qui ont échoué lors du premier run
 */

const API = 'http://localhost:3001/api/v1';

const FAILED = [
  {
    id:      'c3-maths-fonctions',
    titre:   'Fonctions linéaires et affines',
    niveau:  '3ème',
    matiere: 'Mathématiques',
  },
  {
    id:      'c3-physique-ohm',
    titre:   'Loi d\'Ohm et circuits électriques',
    niveau:  '3ème',
    matiere: 'Physique-Chimie',
  },
];

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data?.error || data)}`);
  return data;
}

async function main() {
  console.log('\n🔄 Régénération des chapitres échoués\n');

  const auth = await request('POST', '/auth/login', {
    email: 'noorulfirdaws@gmail.com',
    password: 'Instructor123!',
  });
  const token = auth.data?.accessToken;
  console.log('✅ Connecté\n');

  for (const ch of FAILED) {
    const emoji = ch.matiere === 'Mathématiques' ? '📐' : '⚗️';
    console.log(`${emoji} ${ch.matiere} — ${ch.titre}`);
    console.log('   🤖 Génération AI (30-60s)...');
    const start = Date.now();
    try {
      await request('POST', `/chapitres/${ch.id}/generer`, {
        niveau:  ch.niveau,
        matiere: ch.matiere,
        titre:   ch.titre,
      }, token);
      console.log(`   ✅ Succès en ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
    } catch (e) {
      console.log(`   ❌ Échoué: ${e.message}\n`);
    }
    if (ch !== FAILED[FAILED.length - 1]) await new Promise(r => setTimeout(r, 5000));
  }

  console.log('🏁 Terminé');
}

main().catch(e => { console.error('💥', e.message); process.exit(1); });
