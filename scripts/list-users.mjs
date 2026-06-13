import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';
const prisma = new PrismaClient();
const users = await prisma.user.findMany({
  select: { email: true, role: true, firstName: true, lastName: true, emailVerified: true, createdAt: true },
  orderBy: { createdAt: 'asc' },
});
console.log(`TOTAL: ${users.length} comptes`);
for (const u of users) console.log(`  ${u.role.padEnd(12)} | ${u.email} | ${u.firstName||''} ${u.lastName||''} | verif=${u.emailVerified?'oui':'non'}`);
await prisma.$disconnect();
