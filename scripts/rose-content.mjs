import { PrismaClient } from '@prisma/client';
import { existsSync, writeFileSync } from 'node:fs';
const db = new PrismaClient();
const images = { necklaces: 'necklace', earrings: 'earrings', rings: 'ring', bracelets: 'bracelet', accessories: 'necklace' };
const backup = '.data/rose-content-backup.json';
try {
  if (existsSync(backup)) { console.log('Campaign content already applied; preserving CMS edits.'); }
  else {
    const categories = await db.category.findMany();
    const products = await db.product.findMany({ include: { images: true, category: true } });
    const banners = await db.banner.findMany();
    const settings = await db.siteSettings.findUniqueOrThrow({ where: { id: 'main' } });
    writeFileSync(backup, JSON.stringify({ categories, products, banners, settings }, null, 2));
    await db.$transaction(async tx => {
      for (const c of categories) if (images[c.slug]) await tx.category.update({ where: { id: c.id }, data: { image: `/images/rose-${images[c.slug]}.png` } });
      for (const p of products) if (/^jewel-\d+$/.test(p.slug)) for (const img of p.images) await tx.productImage.update({ where: { id: img.id }, data: { url: img.position === 0 ? `/images/rose-${images[p.category.slug] || 'necklace'}.png` : '/images/rose-' + (p.category.slug === 'earrings' ? 'campaign' : 'hero') + '.png' } });
      for (const b of banners) await tx.banner.update({ where: { id: b.id }, data: b.placement === 'collection' ? { title: 'لطافتی که می‌درخشد', subtitle: 'کالکشن رز؛ روایتی از نور، رنگ و ظرافت', image: '/images/rose-campaign.jpg', button: 'کشف کالکشن' } : { title: 'زیبایی در جزئیات است', subtitle: 'قطعه‌هایی برای همراهی با لحظه‌های ساده و عزیز زندگی', image: '/images/rose-ring.jpg', button: 'زیور خود را پیدا کنید' } });
      await tx.siteSettings.update({ where: { id: 'main' }, data: { heroImage: '/images/rose-hero.jpg', heroTitle: 'درخشش، به سبک تو', heroSubtitle: 'ظرافتی برای لحظه‌هایی که ماندگار می‌شوند.', heroButton: 'مشاهده کالکشن' } });
    });
    console.log('Campaign images and editable CMS content updated.');
  }
} finally { await db.$disconnect(); }
