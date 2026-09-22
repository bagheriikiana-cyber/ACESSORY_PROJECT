import { catalog } from '@/lib/catalog';
import { db } from '@/lib/db';
import { Shop, Product } from '@/components/store';
export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string>>}) {
 const query=await searchParams;
 const category=query.category?await db.category.findFirst({where:{id:query.category,active:true}}):null;
 const title=category?`${category.name} | فروشگاه زیورها`:'فروشگاه زیورها';
 const canonical=category?'/shop?category='+category.id:'/shop';
 return {title,description:category?`خرید ${category.name} از مجموعه زیورهای ماه‌نشان`:'خرید زیورهای ماه‌نشان؛ گردنبند، گوشواره، دستبند و انگشتر.',alternates:{canonical},openGraph:{title,url:canonical,images:['/images/rose-campaign.jpg']},...(query.q?{robots:{index:false,follow:true}}:{})};
}
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string>>}){const [products,categories,initial]=await Promise.all([catalog(),db.category.findMany({where:{active:true}}),searchParams]);return <Shop products={products as unknown as Product[]} categories={categories} initial={initial}/>;}
