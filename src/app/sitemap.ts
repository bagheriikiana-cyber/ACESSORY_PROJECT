import {db} from '@/lib/db';
export const dynamic='force-dynamic';
export default async function sitemap(){const base=process.env.APP_URL||'http://localhost:3000';const products=await db.product.findMany({where:{active:true,category:{active:true}},select:{slug:true,updatedAt:true}});return [{url:base},{url:base+'/shop'},...products.map(p=>({url:base+'/product/'+p.slug,lastModified:p.updatedAt}))];}
