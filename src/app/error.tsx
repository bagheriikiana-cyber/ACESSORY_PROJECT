'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="empty"><h1>دریافت اطلاعات انجام نشد</h1><p>اتصال را بررسی و دوباره تلاش کنید.</p><button className="primary" onClick={reset}>تلاش دوباره</button></main>;}
