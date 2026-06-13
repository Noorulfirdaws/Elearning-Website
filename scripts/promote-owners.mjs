import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';
const prisma = new PrismaClient();
const OWNERS = ['noorulfirdaws@gmail.com','cabdikarimcaligeydh@gmail.com'];
const r = await prisma.user.updateMany({
  where: { email: { in: OWNERS } },
  data: { role: 'SUPER_ADMIN', emailVerified: new Date() },
});
console.log(`UPDATED ${r.count} owners -> SUPER_ADMIN + verified`);
const users = await prisma.user.findMany({ where: { email: { in: OWNERS } }, select: { email: true, role: true, emailVerified: true } });
for (const u of users) console.log(`RESULT ${u.email} | ${u.role} | verified=${u.emailVerified ? 'YES' : 'NO'}`);
await prisma.$disconnect();
