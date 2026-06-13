import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';
const prisma = new PrismaClient();
const users = await prisma.user.findMany({
  where: { email: { in: ['noorulfirdaws@gmail.com','cabdikarimcaligeydh@gmail.com'] } },
  select: { email: true, role: true, isEmailVerified: true, passwordHash: true },
});
for (const u of users) console.log(`${u.email} | ${u.role} | verified=${u.isEmailVerified} | hashLen=${u.passwordHash?.length}`);
console.log(`Total users in DB: ${await prisma.user.count()}`);
await prisma.$disconnect();
