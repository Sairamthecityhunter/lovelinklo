import {ensureLocalSchema} from '@/lib/migrate-local';
import {failure,response} from '@/lib/server';

export const dynamic='force-dynamic';

export async function POST(request:Request){
 try{
  const host=new URL(request.url).hostname;
  if(host!=='localhost'&&host!=='127.0.0.1')return response({error:'Not available.'},403);
  await ensureLocalSchema();
  return response({ok:true});
 }catch(e){return failure(e);}
}
