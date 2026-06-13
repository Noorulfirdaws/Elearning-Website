import { PrismaClient } from '../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client/default.js';
import bcrypt from '../node_modules/.pnpm/bcryptjs@2.4.3/node_modules/bcryptjs/index.js';
const prisma = new PrismaClient();
const ACCOUNTS = [
  { email: 'noorulfirdaws@gmail.com', role: 'SUPER_ADMIN', pw: process.env.PW_SUPER },
  { email: 'cabdikarimcaligeydh@gmail.com', role: 'ADMIN', pw: process.env.PW_ADMIN },
];
for (const a of ACCOUNTS) {
  if (!a.pw) { console.error('Missing pw for ' + a.email); process.exit(1); }
  const hash = await bcrypt.hash(a.pw, 12);
  const u = await prisma.user.update({
    where: { email: a.email },
    data: { passwordHash: hash, role: a.role, emailVerified: new Date(), failedLoginAttempts: 0 },
  });
  console.log(`OK ${u.email} -> ${u.role} (password reset)`);
}
await prisma.$disconnect();
