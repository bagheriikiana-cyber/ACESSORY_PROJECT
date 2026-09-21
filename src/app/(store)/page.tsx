import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowDown } from 'lucide-react';
import { db } from '@/lib/db';
import { catalog } from '@/lib/catalog';
import { ProductCard, Product } from '@/components/store';

export async function generateMetadata(){const s=await db.siteSettings.findUniqueOrThrow({where:{id:'main'}});return {alternates:{canonical:'/'},openGraph:{title:s.heroTitle,description:s.heroSubtitle,url:'/',images:[{url:s.heroImage,alt:s.heroTitle}]}};}

export default async function Home() {
  const [s, categories, products, banners] = await Promise.all([
    db.siteSettings.findUniqueOrThrow({ where: { id: 'main' } }),
    db.category.findMany({ where: { active: true, featured: true } }),
    catalog(), db.banner.findMany({ where: { active: true } }),
  ]);
  const cards = products as unknown as Product[];
  const order = ['necklaces', 'earrings', 'rings', 'bracelets'];
  const editorialCategories = [...categories].sort((a,b) => (order.indexOf(a.slug)<0?99:order.indexOf(a.slug))-(order.indexOf(b.slug)<0?99:order.indexOf(b.slug))).slice(0,4);
  const campaigns = banners.filter(b => b.placement === 'collection');
  const stories = banners.filter(b => b.placement !== 'collection');
  const inspiration = [...editorialCategories.map(c => ({id:c.id,image:c.image,title:c.name,href:'/shop?category='+c.id})), ...banners.slice(0,1).map(b=>({id:b.id,image:b.image,title:b.title,href:b.href}))];
  return <main>
    <section className="hero" aria-label="کالکشن جدید">
      <Image src={s.heroImage} alt={s.heroTitle + ' — کمپین ماه‌نشان'} fill priority sizes="100vw" />
      <div className="hero-copy"><p className="eyebrow">A NEW KIND OF RADIANCE</p><span className="overline">کالکشن جدید</span><h1>{s.heroTitle}</h1><p>{s.heroSubtitle}</p><Link className="primary" href={s.heroLink}>{s.heroButton}<ArrowLeft size={17}/></Link></div>
      <div className="hero-bottom"><a href="#discover">کشف دنیای ماه‌نشان <ArrowDown size={14}/></a><span dir="ltr">THE ROSE EDIT · 2026</span></div>
    </section>
    <section className="section categories" id="discover">
      <div className="section-title"><div><p className="eyebrow">01 / A LITTLE SOMETHING, JUST FOR YOU</p><h2>ظرافت، به انتخاب شما</h2></div><Link href="/shop">تمام زیورها <ArrowLeft size={16}/></Link></div>
      <div className="category-grid">{editorialCategories.map((c,i)=><Link key={c.id} href={'/shop?category='+c.id}><div className="category-image"><Image src={c.image||s.heroImage} alt={c.name} fill sizes="(max-width: 700px) 50vw, 25vw"/><span className="category-number">0{i+1}</span></div><h3>{c.name}<ArrowLeft size={18}/></h3><small>جزئیاتی برای درخشیدن</small></Link>)}</div>
    </section>
    <section className="section arrivals"><div className="section-title"><div><p className="eyebrow">02 / NEW IN</p><h2>تازه‌های دوست‌داشتنی</h2></div><Link href="/shop?sort=newest">مشاهده همه <ArrowLeft size={16}/></Link></div><div className="product-grid home-grid">{cards.slice(0,4).map(p=><ProductCard key={p.id} product={p}/>)}</div></section>
    <div id="collections">{campaigns.map(b=><section className="campaign" key={b.id}><Image src={b.image} alt={b.title} fill sizes="100vw"/><div className="campaign-copy"><p className="eyebrow">THE ROSE COLLECTION</p><h2>{b.title}</h2><p>{b.subtitle}</p><Link className="outline" href={b.href}>{b.button}<ArrowLeft size={18}/></Link></div></section>)}</div>
    <section className="section bestsellers"><div className="section-title"><div><p className="eyebrow">03 / FOREVER FAVOURITES</p><h2>زیورهایی که دوستشان دارید</h2></div><Link href="/shop?sort=popular">محبوب‌ترین‌ها <ArrowLeft size={16}/></Link></div><div className="product-grid home-grid">{[...cards].sort((a,b)=>b.popularity-a.popularity).slice(0,4).map(p=><ProductCard key={p.id} product={p}/>)}</div></section>
    {stories.map(b=><section className="editorial" key={b.id}><div className="editorial-image"><Image src={b.image} alt={b.title} fill sizes="(max-width: 700px) 100vw, 50vw"/></div><div className="editorial-copy"><p className="eyebrow">BEAUTY IN THE LITTLE THINGS</p><h2>{b.title}</h2><p>{b.subtitle}</p><Link className="outline" href={b.href}>{b.button}<ArrowLeft size={17}/></Link></div></section>)}
    <section className="section inspiration"><div className="section-title"><div><p className="eyebrow">THE MAHNESHAN JOURNAL</p><h2>دنیای ماه‌نشان</h2></div><span className="journal-note">لحظه‌های کوچک، درخشش‌های ماندگار</span></div><div className="inspiration-grid">{inspiration.map(item=><Link key={item.id} href={item.href}><Image src={item.image||s.heroImage} alt={item.title} fill sizes="(max-width: 700px) 50vw, 20vw"/><span>{item.title}<ArrowLeft size={16}/></span></Link>)}</div></section>
    <section className="brand-note" id="about"><p className="eyebrow">MAHNESHAN — MADE FOR YOUR MOMENTS</p><h2>زیبایی، وقتی خودت هستی.</h2><p>{s.footer}</p><span className="brand-signature">ماه‌نشان</span></section>
  </main>;
}
