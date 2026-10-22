import {redirect} from 'next/navigation';
import {AuthForm} from '../auth-form';
import {currentUser} from '@/lib/server';

export const dynamic='force-dynamic';

function safeNext(value:string|string[]|undefined){
 const raw=Array.isArray(value)?value[0]:value;
 if(!raw||!raw.startsWith('/')||raw.startsWith('//'))return '/';
 if(raw.startsWith('/login')||raw.startsWith('/register')||raw.startsWith('/signin')||raw.startsWith('/signout')||raw.startsWith('/callback'))return '/';
 return raw;
}

export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}){
 const user=await currentUser();
 const params=await searchParams;
 const nextPath=safeNext(params.next);
 if(user)redirect(nextPath);
 return <AuthForm mode="login" nextPath={nextPath}/>;
}
