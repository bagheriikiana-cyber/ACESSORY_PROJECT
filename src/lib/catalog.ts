import { db } from './db';
export const productInclude = { images: { orderBy: { position: 'asc' as const } }, category: true, brand: true, variants: true, reviews: { where: { approved: true }, include: { user: { select: { name: true } } } } };
export const money = (value: number) => new Intl.NumberFormat('fa-IR').format(value) + ' تومان';
export async function catalog() { return db.product.findMany({ where: { active: true, category: { active: true } }, include: productInclude, orderBy: { createdAt: 'desc' } }); }
