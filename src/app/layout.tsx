import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { metadataBase:new URL(process.env.APP_URL||'http://localhost:3000'),title:{default:'ماه‌نشان | زیورهایی برای درخشیدن',template:'%s | ماه‌نشان'},description:'زیورآلات و اکسسوری‌های ماه‌نشان؛ زیبایی در جزئیات ماندگار. خرید گردنبند، گوشواره، دستبند و انگشتر.',openGraph:{title:'ماه‌نشان',description:'درخشش، به زبان تو',locale:'fa_IR',type:'website'},icons:{icon:'/icon.svg'} };
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="fa" dir="rtl"><body>{children}</body></html>;}
