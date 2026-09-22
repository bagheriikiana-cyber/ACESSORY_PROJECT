import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { currentUser, digest, getCart, login, rateLimit } from '@/lib/auth';
import { productInclude } from '@/lib/catalog';
import { paymentProvider } from '@/lib/payment';
import { imageUrl, internalLink, PublicError } from '@/lib/validation';

const text = z.string().trim().min(1).max(500);
const productSchema = z.object({ name: text, slug: z.string().regex(/^[a-z0-9-]+$/), sku: text, description: z.string().min(1).max(10000), price: z.coerce.number().int().positive().max(1000000000), salePrice: z.coerce.number().int().positive().nullable().optional(), stock: z.coerce.number().int().min(0), categoryId: text, brandId: z.string().nullable().optional(), material: text, specifications: z.record(z.string()).default({}), featured: z.boolean(), active: z.boolean(), seoTitle: z.string().default(''), seoDescription: z.string().default(''), collection: z.string().default('ماه و نور'), images: z.array(imageUrl).min(1).max(12), variants: z.array(z.object({ color: text, size: text, stock: z.coerce.number().int().min(0) })).max(30) }).refine(p => !p.salePrice || p.salePrice <= p.price, 'قیمت تخفیف باید کمتر از قیمت اصلی باشد');
const addressSchema = z.object({ name: text, mobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل ۱۱ رقمی وارد کنید'), province: text, city: text, address: z.string().min(10).max(1000), postalCode: z.string().regex(/^\d{10}$/, 'کد پستی ۱۰ رقمی وارد کنید') });
const couponSchema = z.object({ code: text.transform(s => s.toUpperCase()), type: z.enum(['percentage','fixed']), value: z.coerce.number().int().positive(), minimum: z.coerce.number().int().min(0), maximum: z.coerce.number().int().positive().nullable(), expiresAt: z.string().datetime().nullable(), usageLimit: z.coerce.number().int().positive(), active: z.boolean() }).refine(c => c.type !== 'percentage' || c.value <= 100);
function discountFor(c: { active:boolean; expiresAt:Date|null; used:number; usageLimit:number; minimum:number; type:string; value:number; maximum:number|null } | null, subtotal:number) {
  if (!c || !c.active || (c.expiresAt && c.expiresAt < new Date()) || c.used >= c.usageLimit || subtotal < c.minimum) throw new PublicError('کد تخفیف قابل استفاده نیست');
  return Math.min(subtotal, c.maximum ?? subtotal, c.type === 'percentage' ? Math.floor(subtotal * c.value / 100) : c.value);
}
async function handler(req:NextRequest, ctx:{ params:Promise<{path:string[]}> }) {
  try {
    const path = (await ctx.params).path; const route = path.join('/'); const method = req.method;
    if (method !== 'GET') { const origin = req.headers.get('origin'); if (origin && origin !== new URL(req.url).origin && origin !== process.env.APP_URL) return NextResponse.json({ error:'درخواست نامعتبر' },{status:403}); }
    if (['auth/logout','auth/login','auth/register','newsletter','checkout','coupon','reviews'].includes(route) && method !== 'POST') return NextResponse.json({error:'روش درخواست نامعتبر'},{status:405});
    if (method === 'GET' && ['auth/logout','auth/login','auth/register','newsletter','checkout','coupon','reviews'].includes(route)) return NextResponse.json({error:'روش درخواست نامعتبر'},{status:405});
    const user = await currentUser();
    const body = method === 'GET' || method === 'DELETE' ? {} : await req.json();
    if (route === 'auth/logout') { const jar = await cookies(); const token = jar.get('session')?.value; if(token) await db.session.deleteMany({where:{id:digest(token)}}); jar.delete('session'); return NextResponse.json({ok:true}); }
    if (route === 'auth/login' || route === 'auth/register') {
      const credentials = z.object({email:z.string().email().max(200).transform(s=>s.toLowerCase()),password:z.string().min(10).max(100).refine(v=>Buffer.byteLength(v,'utf8')<=72,'گذرواژه بیش از حد طولانی است'),name:text.optional()}).parse(body);
      await rateLimit(`auth:${credentials.email}`);
      await rateLimit(`auth-ip:${req.headers.get('x-real-ip') || 'local'}`,100);
      let account = await db.user.findUnique({where:{email:credentials.email}});
      if(route.endsWith('register')) { if(account) throw new PublicError('این ایمیل قبلاً ثبت شده است'); account = await db.user.create({data:{email:credentials.email,password:await hash(credentials.password,12),name:credentials.name || 'همراه ماه‌نشان'}}); }
      else if(!account || !await compare(credentials.password,account.password)) throw new PublicError('ایمیل یا گذرواژه نادرست است');
      await login(account!.id); return NextResponse.json({ok:true,role:account!.role});
    }
    if(route === 'me') return NextResponse.json(user ? {id:user.id,name:user.name,email:user.email,mobile:user.mobile,role:user.role} : null);
    if(route === 'newsletter') { const {email}=z.object({email:z.string().email().max(200)}).parse(body); await db.newsletter.upsert({where:{email},create:{email},update:{}}); return NextResponse.json({ok:true}); }
    if(route === 'cart') {
      const cart = await getCart();
      if(method === 'POST') {
        const item = z.object({productId:text,quantity:z.number().int().min(0).max(99),variant:z.string().max(200).default(''),replace:z.boolean().default(false)}).parse(body);
        if(item.replace && item.quantity===0) {
          await db.cartItem.deleteMany({where:{cartId:cart.id,productId:item.productId,variant:item.variant}});
          return NextResponse.json(await db.cartItem.findMany({where:{cartId:cart.id},include:{product:{include:productInclude}}}));
        }
        const product=await db.product.findUnique({where:{id:item.productId},include:{variants:true,category:true}});
        if(!product?.active || !product.category.active) throw new PublicError('محصول موجود نیست');
        const variant=product.variants.find(v=>`${v.color} / ${v.size}`===item.variant);
        if(product.variants.length && !variant) throw new PublicError('رنگ و اندازه را انتخاب کنید');
        const where={cartId_productId_variant:{cartId:cart.id,productId:item.productId,variant:item.variant}};
        const old=await db.cartItem.findUnique({where}); const quantity=item.replace ? item.quantity : (old?.quantity??0)+item.quantity;
        if(quantity>product.stock || (variant && quantity>variant.stock)) throw new PublicError('تعداد بیشتر از موجودی است');
        if(!quantity) await db.cartItem.deleteMany({where:{cartId:cart.id,productId:item.productId,variant:item.variant}});
        else await db.cartItem.upsert({where,create:{cartId:cart.id,productId:item.productId,quantity,variant:item.variant},update:{quantity}});
      }
      return NextResponse.json(await db.cartItem.findMany({where:{cartId:cart.id},include:{product:{include:productInclude}}}));
    }
    if(route === 'coupon') { const cart=await getCart(); const items=await db.cartItem.findMany({where:{cartId:cart.id},include:{product:true}}); const subtotal=items.reduce((a,i)=>a+(i.product.salePrice??i.product.price)*i.quantity,0); const c=await db.coupon.findUnique({where:{code:String(body.code).toUpperCase()}}); return NextResponse.json({discount:discountFor(c,subtotal)}); }
    if(route === 'checkout') {
      const data=z.object({address:addressSchema,email:z.string().email(),notes:z.string().max(2000).default(''),shippingMethod:z.enum(['standard','express']),coupon:z.string().max(100).default('')}).parse(body);
      const cart=await getCart();
      const order=await db.$transaction(async tx=>{
        const items=await tx.cartItem.findMany({where:{cartId:cart.id},include:{product:{include:{variants:true,category:true}}}});
        if(!items.length) throw new PublicError('سبد خرید خالی است');
        const subtotal=items.reduce((a,i)=>a+(i.product.salePrice??i.product.price)*i.quantity,0);
        const coupon=data.coupon?await tx.coupon.findUnique({where:{code:data.coupon.toUpperCase()}}):null;
        const discount=data.coupon?discountFor(coupon,subtotal):0;
        if(coupon) { const changed=await tx.coupon.updateMany({where:{id:coupon.id,used:coupon.used},data:{used:{increment:1}}}); if(!changed.count) throw new PublicError('دوباره تلاش کنید'); }
        for(const item of items) {
          if(!item.product.active || !item.product.category.active) throw new PublicError('محصول غیرفعال شده است');
          const updated=await tx.product.updateMany({where:{id:item.productId,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity},popularity:{increment:item.quantity}}});
          if(!updated.count) throw new PublicError('موجودی محصول کافی نیست');
          if(item.product.variants.length) { const v=item.product.variants.find(v=>`${v.color} / ${v.size}`===item.variant); if(!v) throw new PublicError('تنوع محصول تغییر کرده است'); const changed=await tx.productVariant.updateMany({where:{id:v.id,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}}); if(!changed.count) throw new PublicError('موجودی رنگ انتخابی کافی نیست'); }
        }
        const shipping=data.shippingMethod==='express'?150000:subtotal>=3000000?0:80000;
        const created=await tx.order.create({data:{userId:user?.id,email:data.email,address:data.address,notes:data.notes,shippingMethod:data.shippingMethod,subtotal,shipping,discount,total:subtotal+shipping-discount,couponCode:coupon?.code,items:{create:items.map(i=>({productId:i.productId,name:i.product.name,variant:i.variant,quantity:i.quantity,price:i.product.salePrice??i.product.price}))}}});
        await tx.cartItem.deleteMany({where:{cartId:cart.id}}); return created;
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
      const payment=await paymentProvider.create({orderId:order.id,amountToman:order.total});
      await db.order.update({where:{id:order.id},data:{paymentReference:payment.reference}});
      return NextResponse.json({id:order.id,total:order.total,payment});
    }
    if(route==='wishlist') { if(!user) return NextResponse.json({error:'ابتدا وارد حساب شوید'},{status:401}); if(method==='POST') { const {productId}=z.object({productId:text}).parse(body); const where={userId_productId:{userId:user.id,productId}}; const old=await db.wishlist.findUnique({where}); if(old) await db.wishlist.delete({where}); else await db.wishlist.create({data:{userId:user.id,productId}}); } return NextResponse.json(await db.wishlist.findMany({where:{userId:user.id},include:{product:{include:productInclude}}})); }
    if(route==='reviews') { if(!user) throw new PublicError('ابتدا وارد حساب شوید'); const data=z.object({productId:text,rating:z.number().int().min(1).max(5),text:z.string().min(5).max(1500)}).parse(body); await db.review.upsert({where:{userId_productId:{userId:user.id,productId:data.productId}},create:{...data,userId:user.id},update:{...data,approved:false}}); return NextResponse.json({ok:true}); }
    if(path[0]==='account') {
      if(!user) return NextResponse.json({error:'ابتدا وارد حساب شوید'},{status:401});
      if(path[1]==='profile' && method==='POST') {const data=z.object({name:text,mobile:z.string().regex(/^09\d{9}$/)}).parse(body); await db.user.update({where:{id:user.id},data});return NextResponse.json({ok:true});}
      if(path[1]==='addresses') { if(method==='POST') await db.address.create({data:{...addressSchema.parse(body),userId:user.id}}); if(method==='DELETE') await db.address.deleteMany({where:{id:path[2],userId:user.id}}); return NextResponse.json(await db.address.findMany({where:{userId:user.id}})); }
      return NextResponse.json(await db.order.findMany({where:{userId:user.id},include:{items:true},orderBy:{createdAt:'desc'}}));
    }
    if(path[0]==='admin') {
      if(user?.role!=='ADMIN') return NextResponse.json({error:'دسترسی غیرمجاز'},{status:403});
      const resource=path[1],id=path[2];
      if(resource==='products') {
        if(method==='POST' || method==='PUT') { const {images,variants,...data}=productSchema.parse(body); const nested={...data,images:{create:images.map((url,position)=>({url,position,alt:data.name}))},variants:{create:variants}}; if(id) await db.product.update({where:{id},data:{...nested,images:{deleteMany:{},...nested.images},variants:{deleteMany:{},...nested.variants}}}); else await db.product.create({data:nested}); }
        if(method==='DELETE') await db.product.update({where:{id},data:{active:false}});
        return NextResponse.json(await db.product.findMany({include:productInclude,orderBy:{createdAt:'desc'}}));
      }
      if(resource==='categories') { if(method==='POST'||method==='PUT'){const data=z.object({name:text,slug:z.string().regex(/^[a-z0-9-]+$/),image:imageUrl.or(z.literal('')),active:z.boolean(),featured:z.boolean()}).parse(body); if(id) await db.category.update({where:{id},data}); else await db.category.create({data});} if(method==='DELETE') await db.category.update({where:{id},data:{active:false}});return NextResponse.json(await db.category.findMany()); }
      if(resource==='brands') { if(method==='POST') await db.brand.create({data:{name:text.parse(body.name)}}); return NextResponse.json(await db.brand.findMany()); }
      if(resource==='coupons') { if(method==='POST'||method==='PUT'){const data=couponSchema.parse(body); if(id) await db.coupon.update({where:{id},data});else await db.coupon.create({data});} if(method==='DELETE')await db.coupon.delete({where:{id}});return NextResponse.json(await db.coupon.findMany()); }
      if(resource==='banners') {if(method==='POST'||method==='PUT'){const data=z.object({title:text,subtitle:text,image:imageUrl,button:text,href:internalLink,placement:z.enum(['promo','collection']),active:z.boolean()}).parse(body);if(id)await db.banner.update({where:{id},data});else await db.banner.create({data});}if(method==='DELETE')await db.banner.delete({where:{id}});return NextResponse.json(await db.banner.findMany());}
      if(resource==='settings') {if(method==='POST'){const data=z.object({brandName:text,announcement:text,heroTitle:text,heroSubtitle:text,heroImage:imageUrl,heroButton:text,heroLink:internalLink,contact:text,email:z.string().email(),footer:text,socialLinks:z.record(z.string().url().refine(v=>/^https:\/\//.test(v)))}).parse(body);await db.siteSettings.update({where:{id:'main'},data});}return NextResponse.json(await db.siteSettings.findUnique({where:{id:'main'}}));}
      if(resource==='orders') {if(method==='PUT'){const {status}=z.object({status:z.enum(['Pending','Processing','Shipped','Delivered','Cancelled'])}).parse(body);await db.$transaction(async tx=>{const old=await tx.order.findUniqueOrThrow({where:{id},include:{items:true}});if(old.status==='Cancelled' && status!=='Cancelled')throw new PublicError('سفارش لغوشده قابل بازگشت نیست');if(status==='Cancelled'&&old.status!=='Cancelled'){for(const item of old.items){await tx.product.update({where:{id:item.productId},data:{stock:{increment:item.quantity}}}); const [color,size]=item.variant.split(' / ');if(color&&size)await tx.productVariant.updateMany({where:{productId:item.productId,color,size},data:{stock:{increment:item.quantity}}});}}await tx.order.update({where:{id},data:{status}});},{isolationLevel:'Serializable'});}return NextResponse.json(await db.order.findMany({include:{items:true,user:{select:{name:true}}},orderBy:{createdAt:'desc'}}));}
      if(resource==='customers')return NextResponse.json(await db.user.findMany({select:{id:true,name:true,email:true,mobile:true,createdAt:true,orders:{include:{items:true}}},orderBy:{createdAt:'desc'}}));
      if(resource==='reviews'){if(method==='PUT')await db.review.update({where:{id},data:{approved:z.boolean().parse(body.approved)}});if(method==='DELETE')await db.review.delete({where:{id}});return NextResponse.json(await db.review.findMany({include:{product:{select:{name:true}},user:{select:{name:true}}}}));}
    }
    return NextResponse.json({error:'یافت نشد'},{status:404});
  } catch(error) {
    if(error instanceof z.ZodError)return NextResponse.json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('، ')},{status:400});
    if(error instanceof Prisma.PrismaClientKnownRequestError)return NextResponse.json({error:error.code==='P2002'?'این مقدار قبلاً ثبت شده است':error.code==='P2034'?'اطلاعات هم‌زمان تغییر کرد؛ دوباره تلاش کنید':'عملیات پایگاه داده انجام نشد'},{status:409});
    if(error instanceof PublicError)return NextResponse.json({error:error.message},{status:400});
    if(error instanceof SyntaxError)return NextResponse.json({error:'داده ارسالی معتبر نیست'},{status:400});
    console.error('API request failed', {type:error instanceof Error?error.name:'UnknownError'});
    return NextResponse.json({error:'خطای سرور؛ دوباره تلاش کنید'},{status:500});
  }
}
export {handler as GET,handler as POST,handler as PUT,handler as DELETE};
