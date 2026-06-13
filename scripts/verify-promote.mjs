import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';
const prisma = new PrismaClient();
const PLAN = [
  { email: 'noorulfirdaws@gmail.com', role: 'SUPER_ADMIN' },
  { email: 'cabdikarimcaligeydh@gmail.com', role: 'ADMIN' },
];
for (const p of PLAN) {
  const u = await prisma.user.update({
    where: { email: p.email },
    data: { role: p.role, emailVerified: new Date(), isActive: true, failedLoginAttempts: 0 },
  });
  console.log(`OK ${u.email} -> ${u.role} | verif=oui`);
}
await prisma.$disconnect();
