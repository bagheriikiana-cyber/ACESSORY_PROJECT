import { catalog } from '@/lib/catalog';
import { db } from '@/lib/db';
import { Shop, Product } from '@/components/store';
export const metadata={title:'فروشگاه زیورها',alternates:{canonical:'/shop'},openGraph:{title:'فروشگاه زیورهای ماه‌نشان',url:'/shop',images:['/images/rose-campaign.jpg']}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){const [products,categories,initial]=await Promise.all([catalog(),db.category.findMany({where:{active:true}}),searchParams]);return <Shop products={products as unknown as Product[]} categories={categories} initial={initial}/>;}
