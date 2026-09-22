import { z } from 'zod';

export const imageHosts = ['images.unsplash.com', ...(process.env.IMAGE_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean)];
export const internalLink = z.string().max(2000).refine(value => /^\/(?!\/)/.test(value) && !/[\\\s]/.test(value), 'پیوند داخلی معتبر نیست');
export const imageUrl = z.string().max(2000).refine(value => {
  if (/^\/images\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..')) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && imageHosts.includes(url.hostname); } catch { return false; }
}, 'نشانی تصویر باید از میزبان مجاز یا پوشه تصاویر باشد');
export class PublicError extends Error {}
