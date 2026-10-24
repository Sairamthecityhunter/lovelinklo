import {redirect} from 'next/navigation';
import {AuthForm} from '../auth-form';
import {currentSessionUser,safeAuthReturnPath} from '@/lib/session-auth';

export const dynamic='force-dynamic';

export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}){
 const user=await currentSessionUser();
 const params=await searchParams;
 const nextPath=safeAuthReturnPath(Array.isArray(params.next)?params.next[0]:params.next,'/');
 if(user)redirect(nextPath);
 return <AuthForm mode="login" nextPath={nextPath}/>;
}
