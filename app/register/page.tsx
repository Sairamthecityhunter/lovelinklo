import {redirect} from 'next/navigation';
import {AuthForm} from '../auth-form';
import {currentUser} from '@/lib/server';

export const dynamic='force-dynamic';

export default async function RegisterPage(){
 const user=await currentUser();
 if(user)redirect('/');
 return <AuthForm mode="register"/>;
}