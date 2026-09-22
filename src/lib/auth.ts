import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'node:crypto';
import { db } from './db';
import { PublicError } from './validation';
const secureCookie = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export async function currentUser() {
  const token = (await cookies()).get('session')?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: digest(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}
export async function login(userId: string) {
  const token = randomBytes(32).toString('hex');
  await db.session.create({ data: { id: digest(token), userId, expiresAt: new Date(Date.now() + 7 * 86400000) } });
  (await cookies()).set('session', token, { httpOnly: true, secure: secureCookie, sameSite: 'lax', path: '/', maxAge: 604800 });
}
export async function getCart() {
  const jar = await cookies();
  let id = jar.get('cart')?.value;
  let cart = id ? await db.cart.findUnique({ where: { id } }) : null;
  if (!cart) { cart = await db.cart.create({ data: {} }); id = cart.id; jar.set('cart', id, { httpOnly: true, sameSite: 'lax', secure: secureCookie, path: '/', maxAge: 2592000 }); }
  return cart;
}
export async function rateLimit(key: string, max = 10) {
  const existing = await db.rateLimit.findUnique({ where: { key } });
  if (!existing || existing.expiresAt < new Date()) { await db.rateLimit.upsert({ where: { key }, create: { key, count: 1, expiresAt: new Date(Date.now() + 900000) }, update: { count: 1, expiresAt: new Date(Date.now() + 900000) } }); return; }
  const updated = await db.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
  if (updated.count > max) throw new PublicError('تلاش‌های بیش از حد؛ ۱۵ دقیقه دیگر امتحان کنید.');
}
