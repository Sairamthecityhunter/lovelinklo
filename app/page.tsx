import LoveLink from './lovelink';
import {WelcomePage} from './welcome';
import {currentUser} from '@/lib/server';

export const dynamic='force-dynamic';

export default async function Home(){
 const user=await currentUser();
 if(!user)return <WelcomePage/>;
 return <LoveLink initialNow={Date.now()} signedIn initialView="home"/>;
}
