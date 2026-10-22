import {z} from 'zod';
import {ensureAuthTables} from '@/lib/migrate-local';
import {failure,guard,jsonBody} from '@/lib/server';
import {loginAccount,withSessionCookie} from '@/lib/session-auth';

export const dynamic='force-dynamic';

const bodySchema=z.object({
 email:z.string().trim().min(3).max(254),
 password:z.string().min(8).max(128),
}).strict();

export async function POST(request:Request){
 try{
  guard(request);
  await ensureAuthTables();
  const body=bodySchema.parse(await jsonBody(request,2000));
  const result=await loginAccount(body);
  return withSessionCookie({ok:true},result.token,request);
 }catch(e){return failure(e);}
}
