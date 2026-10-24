import {env} from '@/lib/cf-env';
import {z} from 'zod';
import {ensureUser,db,guard,jsonBody,response,failure,ApiError} from '@/lib/server';
import {sessionFor,snapshot,type WorldSession} from '@/lib/world-server';
export const dynamic='force-dynamic';
type Call={room_id:string;id:string;caller_id:string;callee_id:string;caller_token:string;callee_token:string;state:string;offer:string;answer:string;created_at:number;caller_seen:number;callee_seen:number};
const input=z.object({op:z.enum(['poll','config','offer','answer','end']),session:z.string().uuid(),id:z.string().uuid().optional(),sdp:z.string().min(10).max(48000).optional()}).strict();
async function config(userId:string){
 const vars=env as unknown as Record<string,string|undefined>;
 const urls=(vars.TURN_URLS||'').split(',').map(x=>x.trim()).filter(x=>/^turns?:[^\s]+$/.test(x));
 if(urls.length&&vars.TURN_SHARED_SECRET){const username=`${Math.floor(Date.now()/1000)+3600}:${userId}`;const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(vars.TURN_SHARED_SECRET),{name:'HMAC',hash:'SHA-1'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(username)));const credential=btoa(String.fromCharCode(...bytes));return {iceServers:[{urls,username,credential}],relay:true};}
 return {iceServers:[{urls:'stun:stun.cloudflare.com:3478'}],relay:false};
}
export async function POST(request:Request){try{
 guard(request);const ctx=await ensureUser(),body=input.parse(await jsonBody(request,52000)),database=db();const s=await sessionFor(ctx,body.session);const current=await snapshot(s);
 if(s.mode==='city')throw new ApiError(409,'Invite someone to a private conversation before starting a call.');
 if(!s.room_id||current.status!=='active'||s.updated_at<Date.now()-20000)throw new ApiError(409,'Join an active room before calling.');
 const peers=await database.prepare('SELECT * FROM world_sessions WHERE room_id = ? AND user_id != ? AND updated_at > ?').bind(s.room_id,ctx.userId,Date.now()-20000).all<WorldSession>();
 if(peers.results.length!==1){await database.prepare("UPDATE world_calls SET state='ended',offer='',answer='' WHERE room_id=?").bind(s.room_id).run();if(body.op==='poll'||body.op==='end')return response({call:null});throw new ApiError(409,'Wait for another person to join before calling.');}
 const peer=peers.results[0],now=Date.now();
 await database.prepare("UPDATE world_calls SET state='ended',offer='',answer='' WHERE room_id=? AND state != 'ended' AND ((state='ringing' AND created_at < ?) OR (state='active' AND (caller_seen < ? OR callee_seen < ?)) OR NOT EXISTS (SELECT 1 FROM world_sessions WHERE user_id=world_calls.caller_id AND token=world_calls.caller_token AND room_id=world_calls.room_id) OR NOT EXISTS (SELECT 1 FROM world_sessions WHERE user_id=world_calls.callee_id AND token=world_calls.callee_token AND room_id=world_calls.room_id))").bind(s.room_id,now-90000,now-20000,now-20000).run();
 if(body.op==='config')return response(await config(ctx.userId));
 if(body.op==='offer'){
  if(!body.id||!body.sdp)throw new ApiError(400,'A call offer is required.');
  const result=await database.prepare("INSERT INTO world_calls (room_id,id,caller_id,callee_id,caller_token,callee_token,state,offer,answer,created_at,caller_seen,callee_seen) VALUES (?,?,?,?,?,?,'ringing',?,'',?,?,?) ON CONFLICT(room_id) DO UPDATE SET id=excluded.id,caller_id=excluded.caller_id,callee_id=excluded.callee_id,caller_token=excluded.caller_token,callee_token=excluded.callee_token,state='ringing',offer=excluded.offer,answer='',created_at=excluded.created_at,caller_seen=excluded.caller_seen,callee_seen=excluded.callee_seen WHERE world_calls.state='ended' AND world_calls.created_at < ?").bind(s.room_id,body.id,ctx.userId,peer.user_id,s.token,peer.token,body.sdp,now,now,now,now-3000).run();
  if(!result.meta.changes)throw new ApiError(409,'A call is already open, or just ended. Wait a moment and try again.');
 }
 let call=await database.prepare('SELECT * FROM world_calls WHERE room_id=?').bind(s.room_id).first<Call>();
 if(!call)return response({call:null});
 const caller=call.caller_id===ctx.userId&&call.caller_token===s.token,callee=call.callee_id===ctx.userId&&call.callee_token===s.token;
 if(!caller&&!callee)return response({call:null});
 if(body.op==='answer'){
  if(!callee||body.id!==call.id||!body.sdp||call.state!=='ringing')throw new ApiError(409,'This invitation is no longer available.');
  const result=await database.prepare("UPDATE world_calls SET answer=?,state='active',callee_seen=? WHERE room_id=? AND id=? AND state='ringing'").bind(body.sdp,now,s.room_id,body.id).run();if(!result.meta.changes)throw new ApiError(409,'This call has ended.');
 }else if(body.op==='end'){
  if(body.id!==call.id)throw new ApiError(409,'This call has already changed.');
  await database.prepare("UPDATE world_calls SET state='ended',offer='',answer='' WHERE room_id=? AND id=?").bind(s.room_id,body.id).run();
 }
 if(body.op==='poll')await database.prepare(`UPDATE world_calls SET ${caller?'caller_seen':'callee_seen'}=? WHERE room_id=? AND id=?`).bind(now,s.room_id,call.id).run();
 call=(await database.prepare('SELECT * FROM world_calls WHERE room_id=?').bind(s.room_id).first<Call>())!;
 return response({call:{id:call.id,state:call.state,role:caller?'caller':'callee',peerName:peer.nickname,offer:callee&&call.state==='ringing'?call.offer:undefined,answer:caller&&call.state==='active'?call.answer:undefined}});
 }catch(e){return failure(e);}}
