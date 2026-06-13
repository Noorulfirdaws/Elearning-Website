import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';
import bcrypt from '../node_modules/.pnpm/bcryptjs@2.4.3/node_modules/bcryptjs/index.js';

const prisma = new PrismaClient();
const OWNERS = [
  { email: 'noorulfirdaws@gmail.com', firstName: 'Noorul', lastName: 'Firdaws' },
  { email: 'cabdikarimcaligeydh@gmail.com', firstName: 'Cabdikarim', lastName: 'Cali' },
];
const PASSWORD = process.env.OWNER_PASSWORD;
if (!PASSWORD) { console.error('Set OWNER_PASSWORD env var first'); process.exit(1); }

const hash = await bcrypt.hash(PASSWORD, 12);
for (const o of OWNERS) {
  const u = await prisma.user.upsert({
    where: { email: o.email },
    update: { role: 'SUPER_ADMIN', isEmailVerified: true },
    create: { email: o.email, passwordHash: hash, firstName: o.firstName, lastName: o.lastName, role: 'SUPER_ADMIN', isEmailVerified: true },
  });
  console.log(`OK ${u.email} -> ${u.role}`);
}
console.log(`\nPassword: ${PASSWORD}`);
await prisma.$disconnect();
