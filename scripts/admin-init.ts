import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const db = new PrismaClient();
async function main() {
  const email = z.string().email().parse(process.env.ADMIN_EMAIL).toLowerCase();
  const password = z.string().min(16).max(72).refine(v => !/CHANGE_THIS|PASSWORD|placeholder/i.test(v)).parse(process.env.ADMIN_PASSWORD);
  await db.$transaction(async tx => {
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing && existing.role !== 'ADMIN') throw new Error('Account exists without admin role; refusing to elevate or overwrite it.');
    if (!existing) await tx.user.create({ data: { email, password: await hash(password, 12), name: 'مدیر ماه‌نشان', role: 'ADMIN' } });
    await tx.siteSettings.upsert({ where: { id: 'main' }, create: { id: 'main' }, update: {} });
  });
  console.log('Admin and site settings initialized. Existing credentials were preserved.');
}
main().catch(() => { console.error('Admin initialization failed. Check ADMIN_EMAIL, a unique 16–72 character ADMIN_PASSWORD, and database access. No accounts were overwritten.'); process.exitCode = 1; }).finally(() => db.$disconnect());
