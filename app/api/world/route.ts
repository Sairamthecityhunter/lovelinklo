import {z} from 'zod';
import {cityAction} from '@/lib/world-city-server';
import {ensureUser,db,guard,jsonBody,response,failure,ApiError} from '@/lib/server';
import {joinWorld,sessionFor,closeSession,snapshot,tryMatch,syncSchema,buildBlock} from '@/lib/world-server';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{guard(request);const ctx=await ensureUser(),body=await jsonBody(request,4000),database=db();if(body.op==='join')return response(await joinWorld(ctx,body));
 const token=z.string().uuid().parse(body.session);let s=await sessionFor(ctx,token);
 if(typeof body.op==='string'&&body.op.startsWith('city-')){await cityAction(s,body);return response(await snapshot(await sessionFor(ctx,token)));}
 if(body.op==='leave'){await closeSession(s);return response({left:true});}
 if(body.op==='block'){if(s.mode!=='discover'||!s.room_id)throw new ApiError(400,'No current match to block.');const peer=await database.prepare('SELECT user_id FROM world_sessions WHERE room_id = ? AND user_id != ? LIMIT 1').bind(s.room_id,ctx.userId).first<{user_id:string}>();if(peer)await database.prepare('INSERT INTO world_people_blocks (user_id,blocked_id,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING').bind(ctx.userId,peer.user_id,Date.now()).run();await closeSession(s);return response({left:true,blocked:!!peer});}
 if(body.op==='sync'){
  const v=syncSchema.parse(body);
  if(s.mode==='discover'&&s.room_id&&s.updated_at<Date.now()-20000){await database.prepare('UPDATE world_rooms SET closed = 1 WHERE id = ?').bind(s.room_id).run();return response({...await snapshot(s),status:'ended'});}
  await database.prepare('UPDATE world_sessions SET x=?,z=?,direction=?,vehicle=?,updated_at=? WHERE user_id=? AND token=?').bind(v.x,v.z,v.direction,v.vehicle?1:0,Date.now(),ctx.userId,token).run();s=await sessionFor(ctx,token);await tryMatch(s);return response(await snapshot(await sessionFor(ctx,token)));
 }
 const current=await snapshot(s);if(!s.room_id||current.status!=='active')throw new ApiError(409,'This room has ended. Join a new world to continue.');
 if(body.op==='message'){
  const text=z.string().trim().min(1).max(300).parse(body.text);const id=z.string().uuid().parse(body.id);const now=Date.now();
  const result=await database.prepare('INSERT INTO world_messages (id,room_id,user_id,nickname,message,created_at) SELECT ?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM world_messages WHERE user_id = ? AND created_at > ?) ON CONFLICT(id) DO NOTHING').bind(id,s.room_id,ctx.userId,s.nickname,text,now,ctx.userId,now-900).run();
  if(!result.meta.changes){const existing=await database.prepare('SELECT id FROM world_messages WHERE id = ? AND user_id = ? AND room_id = ?').bind(id,ctx.userId,s.room_id).first();if(!existing)throw new ApiError(429,'Give your last message a moment before sending another.');}
  await database.prepare('DELETE FROM world_messages WHERE room_id = ? AND id NOT IN (SELECT id FROM world_messages WHERE room_id = ? ORDER BY created_at DESC,id DESC LIMIT 100)').bind(s.room_id,s.room_id).run();
 }else if(body.op==='build'){await buildBlock(s,body);}
 else if(body.op==='emote'){const emote=z.enum(['wave','heart','dance']).parse(body.emote);await database.prepare('UPDATE world_sessions SET emote=?,emote_at=? WHERE user_id=? AND token=?').bind(emote,Date.now(),ctx.userId,token).run();}
 else throw new ApiError(400,'That world action is unavailable.');
 return response(await snapshot(await sessionFor(ctx,token)));
 }catch(e){return failure(e);}}
