import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://lms:lmspassword@localhost:5432/lmsdb?schema=public' } } });
const chapitres = await prisma.chapitre.findMany({ select: { id: true, titre: true, ordre: true }, orderBy: { createdAt: 'asc' } });
console.log(`✅ ${chapitres.length} chapitres en DB :`);
chapitres.forEach(c => console.log(`  [${c.ordre}] ${c.titre}`));
await prisma.$disconnect();
