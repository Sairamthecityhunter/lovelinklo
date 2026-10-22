import {ApiError,db,storage,ensureUser,failure} from '@/lib/server';
import {byteRange} from '@/lib/media';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const ctx=await ensureUser();const {id}=await params;
 const row=await db().prepare('SELECT * FROM media WHERE id = ? AND couple_id = ?').bind(id,ctx.coupleId).first<{owner_id:string;object_key:string;mime:string;size:number}>();
 if(!row)throw new ApiError(404,'This media is private or unavailable.');
 if(row.owner_id!==ctx.userId){
  const visible=await db().prepare("SELECT id FROM memories WHERE couple_id = ? AND secret = 0 AND json_extract(data_json, '$.image') = ? LIMIT 1").bind(ctx.coupleId,'/api/media/'+id).first();
  if(!visible){const surprise=await db().prepare("SELECT s.id FROM surprises s, json_each(s.data_json, '$.assets') a WHERE s.couple_id = ? AND s.secret = 0 AND s.due_at <= ? AND json_extract(a.value, '$.url') = ? LIMIT 1").bind(ctx.coupleId,new Date().toISOString(),'/api/media/'+id).first();if(!surprise)throw new ApiError(404,'This media is private or unavailable.');}
 }
 let range;try{range=byteRange(request.headers.get('range'),row.size);}catch{return new Response(null,{status:416,headers:{'Content-Range':`bytes */${row.size}`,'Cache-Control':'private, no-store'}});}
 const file=await storage().get(row.object_key,range?{range}:undefined);if(!file)throw new ApiError(404,'This media is unavailable.');
 return new Response(file.body,{status:range?206:200,headers:{'Content-Type':row.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline','Accept-Ranges':'bytes','Content-Length':String(range?.length??row.size),...(range?{'Content-Range':`bytes ${range.offset}-${range.offset+range.length-1}/${row.size}`}:{})}});
}catch(e){return failure(e);}}
