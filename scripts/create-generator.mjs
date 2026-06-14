import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';
import bcrypt from '../node_modules/.pnpm/bcryptjs@2.4.3/node_modules/bcryptjs/index.js';
const prisma = new PrismaClient();
const pw = process.env.GEN_PW; if(!pw){console.error('no GEN_PW');process.exit(1);}
const hash = await bcrypt.hash(pw, 12);
const u = await prisma.user.upsert({
  where: { email: 'generator@nooracademie.local' },
  update: { passwordHash: hash, role: 'INSTRUCTOR', emailVerified: new Date(), isActive: true },
  create: { email: 'generator@nooracademie.local', passwordHash: hash, firstName: 'Content', lastName: 'Generator', role: 'INSTRUCTOR', emailVerified: new Date() },
});
console.log('OK generator account: ' + u.email + ' -> ' + u.role);
await prisma.$disconnect();
