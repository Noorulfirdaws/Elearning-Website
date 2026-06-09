import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://lms:lmspassword@localhost:5432/lmsdb?schema=public' } },
});

const OWNERS = ['noorulfirdaws@gmail.com', 'cabdikarimcaligeydh@gmail.com'];

async function main() {
  // 1. Mettre les 2 propriétaires en SUPER_ADMIN
  const result = await prisma.user.updateMany({
    where: { email: { in: OWNERS } },
    data: { role: 'SUPER_ADMIN' },
  });
  console.log(`✅ ${result.count} compte(s) mis à jour → SUPER_ADMIN`);

  // 2. Vérifier
  const users = await prisma.user.findMany({
    where: { email: { in: OWNERS } },
    select: { email: true, role: true, firstName: true, lastName: true },
  });

  console.log('\n── Propriétaires de la plateforme ──────────────────');
  for (const u of users) {
    console.log(`  ${u.role.padEnd(12)} │ ${u.email} │ ${u.firstName ?? ''} ${u.lastName ?? ''}`);
  }

  // 3. Résumé de tous les rôles
  const allRoles = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true },
    where: { deletedAt: null },
  });
  console.log('\n── Répartition des rôles ───────────────────────────');
  for (const r of allRoles) {
    console.log(`  ${r.role.padEnd(12)} │ ${r._count.id} utilisateur(s)`);
  }
}

main()
  .catch((e) => { console.error('❌ Erreur:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
