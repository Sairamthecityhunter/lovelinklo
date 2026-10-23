import {ApiError,db,storage,ensureUser,guard,response,failure} from '@/lib/server';
import {detectMedia} from '@/lib/media';
import {assertRateLimit} from '@/lib/rate-limit';
export async function POST(request:Request){try{
 guard(request);const ctx=await ensureUser();await assertRateLimit('media:upload:'+ctx.userId,30,60*60*1000);const max=31*1024*1024;
 if(Number(request.headers.get('content-length'))>max)throw new ApiError(413,'Choose a file up to 30 MB.');
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'Choose a file.');
 const chunks:Uint8Array[]=[];let length=0;
 for(;;){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>max){await reader.cancel();throw new ApiError(413,'Choose a file up to 30 MB.');}chunks.push(value);}
 const bytesIn=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytesIn.set(chunk,offset);offset+=chunk.length;}
 const form=await new Response(bytesIn,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();const file=form.get('file');
 if(!(file instanceof File)||!file.size)throw new ApiError(400,'Choose a photo, video, or audio file.');
 const bytes=await file.arrayBuffer();const info=detectMedia(new Uint8Array(bytes),file.type);
 if(!info)throw new ApiError(400,'Use JPG, PNG, WebP, GIF, MP4, WebM, MP3, M4A, or WAV.');
 const limit=(info.kind==='image'?10:info.kind==='audio'?20:30)*1024*1024;
 if(file.size>limit)throw new ApiError(413,`Choose ${info.kind==='image'?'an image':info.kind==='audio'?'audio':'a video'} smaller than ${limit/1024/1024} MB.`);
 const id=crypto.randomUUID(),key=ctx.userId+'/'+id;await storage().put(key,bytes,{httpMetadata:{contentType:info.mime}});
 try{await db().prepare('INSERT INTO media (id,couple_id,owner_id,object_key,mime,size,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,ctx.coupleId,ctx.userId,key,info.mime,file.size,new Date().toISOString()).run();}catch(e){await storage().delete(key);throw e;}
 return response({id,url:'/api/media/'+id,kind:info.kind});
}catch(e){return failure(e);}}
