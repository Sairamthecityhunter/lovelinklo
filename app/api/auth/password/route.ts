import {z} from 'zod';
import {ensureUser,failure,guard,jsonBody} from '@/lib/server';
import {changePassword,withSessionCookie} from '@/lib/session-auth';

export const dynamic='force-dynamic';

const bodySchema=z.object({
 currentPassword:z.string().min(1).max(128),
 newPassword:z.string().min(8).max(128),
}).strict();

export async function POST(request:Request){
 try{
  guard(request);
  const ctx=await ensureUser();
  const body=bodySchema.parse(await jsonBody(request,2000));
  const token=await changePassword(ctx.userId,body.currentPassword,body.newPassword);
  return withSessionCookie({ok:true},token,request);
 }catch(e){return failure(e);}
}