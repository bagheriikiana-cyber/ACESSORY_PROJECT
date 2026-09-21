import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/auth';
import {Admin} from '@/components/admin';
export const dynamic='force-dynamic';
export const metadata={title:'مدیریت ماه‌نشان',robots:{index:false,follow:false}};
export default async function Page(){const user=await currentUser();if(user?.role!=='ADMIN')redirect('/admin/login');return <Admin name={user.name}/>;}
