import {db} from '@/lib/db';
export const dynamic='force-dynamic';
export default async function sitemap(){const base=process.env.APP_URL||'http://localhost:3000';const [products,categories]=await Promise.all([db.product.findMany({where:{active:true,category:{active:true}},select:{slug:true,updatedAt:true}}),db.category.findMany({where:{active:true},select:{id:true}})]);return [{url:base},{url:base+'/shop'},...categories.map(c=>({url:base+'/shop?category='+c.id})),...products.map(p=>({url:base+'/product/'+p.slug,lastModified:p.updatedAt}))];}
