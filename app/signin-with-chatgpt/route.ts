import {emailSignInPath,isAuthPrefetch,safeAuthReturnPath} from '@/lib/session-auth';

export const dynamic='force-dynamic';

export function GET(request:Request){
 if(isAuthPrefetch(request)){
  return new Response(null,{status:204,headers:{'Cache-Control':'private, no-store'}});
 }
 const url=new URL(request.url);
 const next=safeAuthReturnPath(url.searchParams.get('return_to')||url.searchParams.get('next'),'/');
 return new Response(null,{
  status:302,
  headers:{
   Location:emailSignInPath(next),
   'Cache-Control':'private, no-store',
  },
 });
}
