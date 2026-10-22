import {notFound,redirect} from 'next/navigation';
import LoveLink from '../lovelink';
import {currentUser} from '@/lib/server';
import type {View} from '@/lib/love-types';

export const dynamic='force-dynamic';

const views=['home','pins','calendar','gifts','wishlist','memories','letters','plans','surprises','settings','about','games','world','shop','concierge','together'] as const;

export default async function Page({params}:{params:Promise<{view:string}>}){
 const {view}=await params;
 if(!(views as readonly string[]).includes(view))notFound();
 const user=await currentUser();
 if(!user){
  if(view==='about')redirect('/login');
  redirect('/login?next=/'+view);
 }
 return <LoveLink initialNow={Date.now()} signedIn initialView={view as View}/>;
}
