import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

const base=process.env.APP_URL||'http://localhost:3000';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Use a local QA database/application.');
const db=new PrismaClient();
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL||'msedge',headless:true});
const admin=await browser.newPage({viewport:{width:1440,height:1000}});
const customer=await browser.newPage({viewport:{width:1440,height:1000}});
customer.on('pageerror',e=>console.log('BROWSER ERROR',e.message));
const suffix=Date.now(),slug='browser-qa-'+suffix,email=`browser-${suffix}@example.com`;
const name='زیور آزمون مرورگر '+suffix;
let productId,orderId,settings;
await mkdir('.data/qa',{recursive:true});
async function go(page,path){await page.goto(base+path);}
async function save(){const response=admin.waitForResponse(r=>r.url().includes('/api/admin/')&&['POST','PUT'].includes(r.request().method()));await admin.getByRole('button',{name:'ذخیره تغییرات',exact:true}).click();expect((await response).status()).toBe(200);await expect(admin.getByText('تغییرات ذخیره شد و اکنون در فروشگاه قابل مشاهده است.',{exact:true}).first()).toBeVisible();}
try {
  await go(admin,'/admin');await admin.waitForURL('**/admin/login');
  await admin.getByLabel('ایمیل',{exact:true}).fill(process.env.SEED_ADMIN_EMAIL||'admin@mahneshan.local');
  await admin.getByLabel('گذرواژه').fill(process.env.SEED_ADMIN_PASSWORD);
  await admin.getByRole('button',{name:'ورود',exact:true}).click();await admin.waitForURL('**/admin');
  await admin.getByRole('button',{name:'محصولات',exact:true}).click();
  await admin.getByRole('button',{name:'افزودن مورد جدید'}).click();
  for(const [label,value] of [['نام محصول',name],['آدرس محصول (slug)',slug],['کد SKU','BQA-'+suffix],['توضیحات','محصول اختصاصی آزمون مرورگر ماه‌نشان'],['قیمت (تومان)','2000000'],['موجودی کل','4'],['رنگ، اندازه و موجودی (JSON)',JSON.stringify([{color:'طلایی',size:'استاندارد',stock:4}])]])await admin.getByLabel(label,{exact:!label.includes('JSON')}).fill(value);
  await save();productId=(await db.product.findUniqueOrThrow({where:{slug}})).id;
  const row=admin.locator('.admin-row').filter({hasText:name});await row.getByRole('button',{name:'ویرایش',exact:true}).click();
  await admin.getByLabel('قیمت (تومان)',{exact:true}).fill('2400000');await save();
  await go(customer,'/account');await customer.getByRole('button',{name:'حساب ندارید؟ ثبت‌نام'}).click();
  await customer.getByLabel('نام و نام خانوادگی',{exact:true}).fill('کاربر آزمون مرورگر');
  await customer.getByLabel('ایمیل',{exact:true}).fill(email);
  await customer.getByLabel('گذرواژه').fill(randomBytes(20).toString('hex'));
  await customer.getByRole('button',{name:'ساخت حساب',exact:true}).click();await expect(customer.getByRole('button',{name:'خروج از حساب'})).toBeVisible();
  await go(customer,'/admin');await customer.waitForURL('**/admin/login');
  await go(customer,'/');await customer.getByRole('link',{name:'مشاهده کالکشن',exact:true}).click();
  await customer.getByLabel('جستجوی محصولات').fill(name);
  await customer.getByLabel('مرتب‌سازی').selectOption('asc');
  await expect(customer.locator('.product-card')).toHaveCount(1);
  await customer.locator('.product-card a').first().click();
  await expect(customer.getByRole('heading',{name:name,exact:true})).toBeVisible();
  await expect(customer.locator('.detail-copy h2')).toContainText('۲٬۴۰۰٬۰۰۰');
  await customer.getByLabel('رنگ و اندازه').selectOption('طلایی / استاندارد');
  await customer.getByRole('button',{name:'افزودن به علاقه‌مندی‌ها',exact:true}).click();
  await customer.getByRole('button',{name:'افزودن به سبد خرید',exact:true}).click();
  await expect(customer.locator('.detail-copy .feedback')).toContainText('به سبد خرید اضافه شد');
  await customer.getByRole('link',{name:'سبد خرید',exact:true}).click();await customer.waitForURL('**/cart');await expect(customer.locator('.cart-row')).toBeVisible();
  const changed=customer.waitForResponse(r=>r.url().endsWith('/api/cart')&&r.request().method()==='POST');
  await customer.getByRole('button',{name:'افزایش تعداد',exact:true}).click();
  const changedResponse=await changed;expect(changedResponse.status(),await changedResponse.text()).toBe(200);
  await expect(customer.locator('.cart-row .quantity')).toContainText('۲');
  await customer.getByRole('link',{name:'ادامه و تکمیل سفارش'}).click();await customer.waitForURL('**/checkout');await expect(customer.locator('#checkout')).toBeVisible();
  await customer.getByLabel('کد تخفیف',{exact:true}).fill('WELCOME10');await customer.getByRole('button',{name:'اعمال',exact:true}).click();
  await expect(customer.locator('.checkout-page>.feedback')).toContainText('کد تخفیف اعمال شد');
  const address={name:'کاربر مرورگر',mobile:'09121234567',email,province:'تهران',city:'تهران',postalCode:'1234567890',address:'خیابان آزمایشی مرورگر پلاک دوازده'};
  for(const [key,value] of Object.entries(address))await customer.locator(`#checkout input[name="${key}"]`).fill(value);
  await customer.getByRole('button',{name:'ثبت سفارش',exact:true}).click();
  await expect(customer.getByRole('heading',{name:'سفارش شما ثبت شد'})).toBeVisible();
  const order=await db.order.findFirstOrThrow({where:{email},orderBy:{createdAt:'desc'}});orderId=order.id;
  expect(order.paymentStatus).toBe('UNPAID');expect(order.total).toBe(4320000);
  expect((await db.product.findUniqueOrThrow({where:{id:productId}})).stock).toBe(2);
  await admin.getByRole('button',{name:'سفارش‌ها',exact:true}).click();
  await admin.locator('.admin-search').fill(orderId);
  await admin.locator('.admin-row').getByText('جزئیات',{exact:true}).click();
  await expect(admin.locator('.row-detail')).toContainText(name);
  await admin.getByLabel('وضعیت سفارش').selectOption('Processing');
  await expect.poll(async()=> (await db.order.findUniqueOrThrow({where:{id:orderId}})).status).toBe('Processing');
  await admin.getByLabel('وضعیت سفارش').selectOption('Cancelled');
  await expect.poll(async()=> (await db.product.findUniqueOrThrow({where:{id:productId}})).stock).toBe(4);
  expect((await db.productVariant.findFirstOrThrow({where:{productId}})).stock).toBe(4);
  console.log('PASS browser: CMS create/edit, customer authorization, search/sort, variant, wishlist, cart quantity, coupon, checkout, admin status and inventory');
  settings=await db.siteSettings.findUniqueOrThrow({where:{id:'main'}});
  await admin.getByRole('button',{name:'محتوای سایت',exact:true}).click();await admin.getByLabel('عنوان اصلی',{exact:true}).fill('محتوای آزمون مرورگر');await save();
  await go(customer,'/');await expect(customer.getByRole('heading',{name:'محتوای آزمون مرورگر',exact:true})).toBeVisible();
  await admin.getByLabel('عنوان اصلی',{exact:true}).fill(settings.heroTitle);await save();
  await admin.getByRole('button',{name:'محصولات',exact:true}).click();await admin.locator('.admin-search').fill(slug);
  admin.once('dialog',d=>d.accept());await admin.getByRole('button',{name:'غیرفعال‌سازی',exact:true}).click();
  await expect.poll(async()=> (await db.product.findUniqueOrThrow({where:{id:productId}})).active).toBe(false);
  await go(customer,'/shop?q='+encodeURIComponent(name));await expect(customer.locator('.product-card')).toHaveCount(0);
  await go(customer,'/product/'+slug);await expect(customer.getByText('این صفحه پیدا نشد',{exact:true})).toBeVisible();
  console.log('PASS browser: CMS disable and hero persistence');
  await go(customer,'/product/jewel-1');
  await customer.getByRole('button',{name:'بزرگ‌نمایی تصویر',exact:true}).click();await expect(customer.getByRole('dialog')).toBeVisible();await customer.keyboard.press('Escape');await expect(customer.getByRole('dialog')).not.toBeVisible();
  await customer.getByRole('button',{name:'افزودن به سبد خرید',exact:true}).click();await expect(customer.locator('.detail-copy .feedback')).toContainText('به سبد خرید اضافه شد');
  for(const width of [375,768,1024,1440]){
    for(const [page,routes] of [[customer,['/','/shop','/product/jewel-1','/cart','/checkout','/account']],[admin,['/admin']]]){
      await page.setViewportSize({width,height:900});
      for(const route of routes){await go(page,route);await page.waitForTimeout(400);const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+2,rtl:document.documentElement.dir,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth).length}));expect(result,{width,route}).toEqual({overflow:false,rtl:'rtl',broken:0});await page.screenshot({path:`.data/qa/${width}-${route.replaceAll('/','-')}.png`});}
    }
  }
  await go(customer,'/');await customer.getByRole('button',{name:'فهرست',exact:true}).click();await expect(customer.getByRole('dialog')).toBeVisible();await customer.keyboard.press('Escape');await expect(customer.getByRole('dialog')).not.toBeVisible();
  await go(customer,'/cart');await customer.getByRole('button',{name:'حذف محصول',exact:true}).click();await expect(customer.locator('.cart-row')).toHaveCount(0);
  await admin.getByRole('button',{name:'خروج',exact:true}).click();await admin.waitForURL('**/admin/login');await go(admin,'/admin');await admin.waitForURL('**/admin/login');
  console.log('PASS browser: responsive 375/768/1024/1440, images, RTL, mobile drawer and logout');
} finally {
  if(settings)await db.siteSettings.update({where:{id:'main'},data:{heroTitle:settings.heroTitle}});
  if(orderId){const order=await db.order.findUnique({where:{id:orderId}});await db.order.delete({where:{id:orderId}});if(order?.couponCode)await db.coupon.update({where:{code:order.couponCode},data:{used:{decrement:1}}});}
  if(productId){await db.cartItem.deleteMany({where:{productId}});await db.product.delete({where:{id:productId}});}
  await db.user.deleteMany({where:{email}});await browser.close();await db.$disconnect();
}
