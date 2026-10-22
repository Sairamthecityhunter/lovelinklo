import {failure,guard} from '@/lib/server';
import {destroySession,readSessionTokenFromRequest,withClearedSessionCookie} from '@/lib/session-auth';

export const dynamic='force-dynamic';

export async function POST(request:Request){
 try{
  guard(request);
  const token=await readSessionTokenFromRequest(request);
  await destroySession(token);
  return withClearedSessionCookie({ok:true},request);
 }catch(e){return failure(e);}
}
