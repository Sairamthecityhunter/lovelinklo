import type {Metadata} from 'next';
import './globals.css';
import './love-design.css';
import './auth.css';

export const metadata:Metadata={
 title:'LoveLink — Your little world, together',
 description:'Remember every moment. Pin a little love, plan thoughtful surprises, and stay close, wherever you are.',
 manifest:'/manifest.webmanifest',
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
