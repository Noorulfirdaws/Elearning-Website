import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';
const prisma = new PrismaClient();
const NIVEAUX = ['C6','C5','C4','C3','LS','LP','LT'];
let n = 0;
for (const niveauId of NIVEAUX) {
  const m = await prisma.matiere.upsert({
    where: { niveauId_nom: { niveauId, nom: 'Anglais' } },
    update: { icone: '🇬🇧', couleur: '#0EA5E9' },
    create: { niveauId, nom: 'Anglais', icone: '🇬🇧', couleur: '#0EA5E9' },
  });
  console.log(`OK ${niveauId} -> Anglais (${m.id.slice(0,8)})`);
  n++;
}
console.log(`\nTOTAL: Anglais ajouté à ${n} niveaux`);
await prisma.$disconnect();
