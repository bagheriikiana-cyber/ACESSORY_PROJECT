import Link from 'next/link';
import { db } from '@/lib/db';
import { Header, Newsletter, Benefits } from '@/components/store';
import './storefront.css';
export const dynamic='force-dynamic';
export default async function Layout({children}:{children:React.ReactNode}) {
 const [categories,s]=await Promise.all([db.category.findMany({where:{active:true}}),db.siteSettings.findUniqueOrThrow({where:{id:'main'}})]);
 return <div className="storefront"><Header categories={categories} brand={s.brandName} announcement={s.announcement}/>{children}<Benefits/><Newsletter/>
 <footer><div className="footer-brand"><Link className="brand" href="/"><small>MAHNESHAN</small><span>{s.brandName}</span></Link><p>{s.footer}</p><span className="footer-tagline">A LITTLE LUXURY. A LOT OF YOU.</span></div>
 <div><h3>خدمات مشتریان</h3><Link href="/account">حساب کاربری</Link><Link href="/account">پیگیری سفارش</Link><Link href="/account?tab=wishlist">علاقه‌مندی‌ها</Link><a href={'mailto:'+s.email}>ارتباط با ما</a></div>
 <div><h3>راهنمای خرید</h3><Link href="/shop">انتخاب زیور</Link><details><summary>ارسال و مرجوعی</summary><p>ارسال عادی ۳ تا ۵ روز کاری. برای بررسی مرجوعی، با پشتیبانی فروشگاه تماس بگیرید.</p></details><details><summary>نگهداری از زیورها</summary><p>زیورها را دور از عطر و مواد شوینده، در جعبه‌ای خشک نگهداری کنید.</p></details><Link href="/#about">درباره ماه‌نشان</Link></div>
 <div><h3>همراه ماه‌نشان باشید</h3><a href="#newsletter">عضویت در خبرنامه</a><p>{s.contact}</p><a className="footer-email" href={'mailto:'+s.email}>{s.email}</a><div className="social-links">{Object.entries(s.socialLinks as Record<string,string>).map(([name,url])=><a key={name} href={url} rel="noreferrer">{name}</a>)}</div></div>
 <div className="footer-bottom"><span>© {new Date().getFullYear()} ماه‌نشان. تمام حقوق محفوظ است.</span><span>با عشق، برای لحظه‌های شما</span></div>
 </footer></div>;
}
