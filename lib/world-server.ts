import {cityInvitations} from './world-city-server';
import {PREMIUM_SHIRTS} from './shop-catalog';
import {entitlements,worldTheme} from './shop-server';
import {reservedTile,sceneryBlocked} from './world-landscape';
import {z} from 'zod';
import {ApiError,db} from './server';
import {HAIRS,SHIRTS,SKINS,INTERESTS,MATERIALS,WORLD_SIZE,interestMask,isSpawn,type WorldSnapshot} from './world-types';

export const avatarSchema=z.object({shirt:z.enum([...SHIRTS,...PREMIUM_SHIRTS]),skin:z.enum(SKINS),hair:z.enum(HAIRS)}).strict();
export const joinSchema=z.object({op:z.literal('join'),mode:z.enum(['couple','discover','city']),nickname:z.string().trim().min(1).max(24),avatar:avatarSchema,interests:z.array(z.enum(INTERESTS)).max(5).default([]),adultConfirmed:z.boolean().default(false)}).strict();
export type WorldSession={user_id:string;token:string;room_id:string|null;mode:'couple'|'discover'|'city';vehicle:number;nickname:string;avatar_json:string;interests:number;x:number;z:number;direction:number;emote:string;emote_at:number;updated_at:number};
type Context={userId:string;coupleId:string};
const LEASE=20000;
export async function sessionFor(ctx:Context,token:string){const s=await db().prepare('SELECT * FROM world_sessions WHERE user_id = ? AND token = ?').bind(ctx.userId,token).first<WorldSession>();if(!s)throw new ApiError(409,'This world session has ended or opened on another device. Join again to continue.');if(s.mode==='couple'){const r=await db().prepare('SELECT id FROM world_rooms WHERE id = ? AND couple_id = ?').bind(s.room_id,ctx.coupleId).first();if(!r)throw new ApiError(403,'You no longer belong to this couple world.');}return s;}
export async function closeSession(s:WorldSession){const database=db();await database.batch([database.prepare("UPDATE world_calls SET state='ended',offer='',answer='' WHERE room_id=?").bind(s.room_id),database.prepare("UPDATE world_rooms SET closed = 1 WHERE id = ? AND kind = 'discover'").bind(s.room_id),database.prepare('DELETE FROM world_sessions WHERE user_id = ? AND token = ?').bind(s.user_id,s.token)]);}
export async function tryMatch(s:WorldSession){if(s.mode!=='discover'||s.room_id)return;const database=db(),now=Date.now();
 const candidate=await database.prepare(`SELECT user_id FROM world_sessions c WHERE c.mode = 'discover' AND c.room_id IS NULL AND c.updated_at > ? AND c.user_id != ? AND (c.interests & ?) != 0 AND NOT EXISTS (SELECT 1 FROM world_people_blocks b WHERE (b.user_id = ? AND b.blocked_id = c.user_id) OR (b.blocked_id = ? AND b.user_id = c.user_id)) ORDER BY random() LIMIT 1`).bind(now-LEASE,s.user_id,s.interests,s.user_id,s.user_id).first<{user_id:string}>();if(!candidate)return;
 const room=crypto.randomUUID();
 // Materialize both eligible participants before the atomic claim; a concurrent match cannot split the pair.
 await database.batch([
  database.prepare("INSERT INTO world_rooms (id,kind,created_at,closed) VALUES (?,'discover',?,0)").bind(room,now),
  database.prepare(`WITH eligible AS MATERIALIZED (SELECT user_id FROM world_sessions WHERE mode = 'discover' AND room_id IS NULL AND updated_at > ? AND (interests & ?) != 0 AND ((user_id = ? AND token = ?) OR user_id = ?) AND NOT EXISTS (SELECT 1 FROM world_people_blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?))) UPDATE world_sessions SET room_id = ?, x = CASE WHEN user_id = ? THEN 9 ELSE 11 END, z = 10, updated_at = ? WHERE user_id IN (SELECT user_id FROM eligible) AND (SELECT COUNT(*) FROM eligible) = 2`).bind(now-LEASE,s.interests,s.user_id,s.token,candidate.user_id,s.user_id,candidate.user_id,candidate.user_id,s.user_id,room,s.user_id,now),
  database.prepare('DELETE FROM world_rooms WHERE id = ? AND (SELECT COUNT(*) FROM world_sessions WHERE room_id = ?) != 2').bind(room,room)
 ]);
}
export async function snapshot(s:WorldSession):Promise<WorldSnapshot>{const database=db(),now=Date.now();const empty:WorldSnapshot={session:s.token,roomId:s.room_id,mode:s.mode,status:s.room_id?'active':'waiting',selfId:s.user_id,players:[],blocks:[],messages:[],sharedInterests:[],serverTime:now};if(!s.room_id)return empty;
 const room=await database.prepare('SELECT closed,couple_id FROM world_rooms WHERE id = ?').bind(s.room_id).first<{closed:number;couple_id:string|null}>();if(!room||room.closed)return {...empty,status:'ended'};
 const members=await database.prepare('SELECT * FROM world_sessions p WHERE room_id = ? AND updated_at > ? AND NOT EXISTS (SELECT 1 FROM world_people_blocks b WHERE (b.user_id=? AND b.blocked_id=p.user_id) OR (b.blocked_id=? AND b.user_id=p.user_id)) ORDER BY user_id').bind(s.room_id,now-LEASE,s.user_id,s.user_id).all<WorldSession>();
 if(s.mode==='discover'&&members.results.length!==2){await database.prepare('UPDATE world_rooms SET closed = 1 WHERE id = ?').bind(s.room_id).run();return {...empty,status:'ended'};}
 const results=await database.batch([
  database.prepare('SELECT x,y,z,material FROM world_blocks WHERE room_id = ? ORDER BY y,x,z LIMIT 1600').bind(s.room_id),
  database.prepare('SELECT id,user_id AS playerId,nickname,message AS text,created_at AS createdAt FROM world_messages WHERE room_id = ? ORDER BY created_at DESC,id DESC LIMIT 60').bind(s.room_id)
 ]);
 const mask=members.results.reduce((mask,p)=>mask&p.interests,s.interests);
 return {...empty,theme:room.couple_id?await worldTheme(room.couple_id):'classic',players:members.results.map(p=>({vehicle:!!p.vehicle,id:p.user_id,nickname:p.nickname,avatar:JSON.parse(p.avatar_json),x:p.x,z:p.z,direction:p.direction,emote:p.emote,emoteAt:p.emote_at,updatedAt:p.updated_at})),blocks:results[0].results as any,invitations:s.mode==='city'?await cityInvitations(s) as any:[],messages:[...results[1].results].reverse().filter((m:any)=>s.mode!=='city'||members.results.some(p=>p.user_id===m.playerId)) as any,sharedInterests:INTERESTS.filter((_,i)=>!!(mask&(1<<i)))};
}
export async function joinWorld(ctx:Context,input:unknown){const v=joinSchema.parse(input);if((PREMIUM_SHIRTS as readonly string[]).includes(v.avatar.shirt)&&!(await entitlements(ctx.coupleId)).premium)throw new ApiError(403,'This avatar color is a Premium extra. Choose a free color or join Premium.');if((v.mode==='city'&&!v.adultConfirmed)||(v.mode==='discover'&&(!v.adultConfirmed||!v.interests.length)))throw new ApiError(400,'Meeting new people is for adults 18+. Confirm your age and choose at least one interest.');const database=db(),now=Date.now(),token=crypto.randomUUID();
 const old=await database.prepare('SELECT * FROM world_sessions WHERE user_id = ?').bind(ctx.userId).first<WorldSession>();if(old)await closeSession(old);
 let room:string|null=null;if(v.mode==='couple'){room='couple-'+ctx.coupleId;await database.prepare("INSERT INTO world_rooms (id,kind,couple_id,created_at,closed) VALUES (?,'couple',?,?,0) ON CONFLICT(id) DO NOTHING").bind(room,ctx.coupleId,now).run();}
 if(v.mode==='city'){
 for(let shard=1;shard<=8;shard++){
 const city='public-city-'+shard;
 await database.prepare("INSERT INTO world_rooms(id,kind,created_at,closed) VALUES(?,'city',?,0) ON CONFLICT DO NOTHING").bind(city,now).run();
 const added=await database.prepare("INSERT INTO world_sessions(user_id,token,room_id,mode,nickname,avatar_json,interests,x,z,direction,emote,emote_at,updated_at) SELECT ?,?,?,'city',?,?,?,110,86,0,'',0,? WHERE (SELECT COUNT(*) FROM world_sessions WHERE room_id=? AND updated_at>?)<16").bind(ctx.userId,token,city,v.nickname,JSON.stringify(v.avatar),interestMask(v.interests),now,city,now-LEASE).run();
 if(added.meta.changes)return snapshot(await sessionFor(ctx,token));
 }
 throw new ApiError(409,'The city districts are full. Try again shortly.');
 }
 const startX=room&&await database.prepare('SELECT user_id FROM world_sessions WHERE room_id = ? AND user_id != ?').bind(room,ctx.userId).first()?11:9;
 await database.batch([
  database.prepare('INSERT INTO world_sessions (user_id,token,room_id,mode,nickname,avatar_json,interests,x,z,direction,emote,emote_at,updated_at) VALUES (?,?,?,?,?,?,?,?,10,0,\'\',0,?) ON CONFLICT(user_id) DO UPDATE SET token=excluded.token,room_id=excluded.room_id,mode=excluded.mode,nickname=excluded.nickname,avatar_json=excluded.avatar_json,interests=excluded.interests,x=excluded.x,z=10,direction=0,emote=\'\',emote_at=0,updated_at=excluded.updated_at').bind(ctx.userId,token,room,v.mode,v.nickname,JSON.stringify(v.avatar),interestMask(v.interests),startX,now),
  database.prepare("DELETE FROM world_rooms WHERE kind = 'discover' AND created_at < ?").bind(now-86400000)
 ]);
 const s=await sessionFor(ctx,token);await tryMatch(s);return snapshot(await sessionFor(ctx,token));
}
export const syncSchema=z.object({op:z.literal('sync'),session:z.string().uuid(),x:z.number().finite().min(0).max(WORLD_SIZE-1),z:z.number().finite().min(0).max(WORLD_SIZE-1),direction:z.number().finite().min(-7).max(7),vehicle:z.boolean().default(false)}).strict().refine(v=>!sceneryBlocked(v.x,v.z),'Choose an open path.');
export const blockSchema=z.object({op:z.literal('build'),session:z.string().uuid(),x:z.number().int().min(0).max(WORLD_SIZE-1),y:z.number().int().min(1).max(4),z:z.number().int().min(0).max(WORLD_SIZE-1),material:z.enum(MATERIALS.map(m=>m.id) as [string,...string[]]),remove:z.boolean()}).strict();
export async function buildBlock(s:WorldSession,input:unknown){const v=blockSchema.parse(input);if(s.mode==='city')throw new ApiError(403,'Building is available in private rooms and solo mode, not the public city.');if(isSpawn(v.x,v.z)||reservedTile(v.x,v.z))throw new ApiError(400,'Keep meeting spots and scenery clear. Choose an open tile.');const database=db();let result;
 if(v.remove)result=await database.prepare('DELETE FROM world_blocks WHERE room_id = ? AND x = ? AND y = ? AND z = ? AND y = (SELECT MAX(y) FROM world_blocks WHERE room_id = ? AND x = ? AND z = ?)').bind(s.room_id,v.x,v.y,v.z,s.room_id,v.x,v.z).run();
 else result=await database.prepare('INSERT INTO world_blocks (room_id,x,y,z,material,owner_id) SELECT ?,?,?,?,?,? WHERE ? = (SELECT COALESCE(MAX(y),0)+1 FROM world_blocks WHERE room_id = ? AND x = ? AND z = ?) ON CONFLICT DO NOTHING').bind(s.room_id,v.x,v.y,v.z,v.material,s.user_id,v.y,s.room_id,v.x,v.z).run();
 if(!result.meta.changes)throw new ApiError(409,'That tile changed. Choose it again.');
}
