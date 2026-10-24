import type {Metadata} from 'next';
import {publicAppUrl} from '@/lib/app-url';
import './globals.css';
import './love-design.css';
import './auth.css';

const site=publicAppUrl();
const description='A private couple website: pin little loves, keep memories, share a timeline, and stay close wherever you are.';

export const metadata:Metadata={
 metadataBase:new URL(site),
 title:{default:'LoveLink — Your little world, together',template:'%s — LoveLink'},
 description,
 applicationName:'LoveLink',
 manifest:'/manifest.webmanifest',
 openGraph:{
  type:'website',
  locale:'en_US',
  url:site,
  siteName:'LoveLink',
  title:'LoveLink — Your little world, together',
  description,
  images:[{url:'/images/couple-sunset.jpg',width:1600,height:900,alt:'A couple together by the sea at sunset'}]
 },
 twitter:{card:'summary_large_image',title:'LoveLink — Your little world, together',description},
 icons:{
  icon:[
   {url:'/favicon.png',sizes:'64x64',type:'image/png'},
   {url:'/icon-192.png',sizes:'192x192',type:'image/png'},
   {url:'/icon-512.png',sizes:'512x512',type:'image/png'}
  ],
  apple:'/icon-192.png'
 },
 appleWebApp:{capable:true,statusBarStyle:'default',title:'LoveLink'}
};

export const viewport={width:'device-width',initialScale:1,themeColor:'#f6f1ec'};

export default function Layout({children}:{children:React.ReactNode}){
 return (
  <html lang="en" suppressHydrationWarning>
   <head>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
    <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet"/>
   </head>
   <body>{children}</body>
  </html>
 );
}
