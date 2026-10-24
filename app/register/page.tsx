import {redirect} from 'next/navigation';
import {AuthForm} from '../auth-form';
import {currentSessionUser} from '@/lib/session-auth';

export const dynamic='force-dynamic';

export default async function RegisterPage(){
 const user=await currentSessionUser();
 if(user)redirect('/');
 return <AuthForm mode="register"/>;
}
