import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';
const prisma = new PrismaClient();
const EMAILS = ['noorulfirdaws@gmail.com', 'cabdikarimcaligeydh@gmail.com'];
const r = await prisma.user.deleteMany({ where: { email: { in: EMAILS } } });
console.log(`DELETED ${r.count} comptes`);
const left = await prisma.user.count();
console.log(`Comptes restants: ${left}`);
await prisma.$disconnect();
