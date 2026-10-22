import {db,ApiError} from './server';
import type {WorldSession} from './world-server';
const alive=()=>Date.now()-20000;
export async function cityInvitations(s:WorldSession){
 const rows=await db().prepare(`SELECT i.id,i.sender AS fromId,p.nickname FROM world_city_invites i JOIN world_sessions p ON p.user_id=i.sender AND p.token=i.sender_token WHERE i.recipient=? AND i.recipient_token=? AND i.room_id=? AND p.room_id=i.room_id AND p.updated_at>? AND i.created_at>? AND NOT EXISTS (SELECT 1 FROM world_people_blocks b WHERE (b.user_id=? AND b.blocked_id=i.sender) OR (b.blocked_id=? AND b.user_id=i.sender)) ORDER BY i.created_at DESC LIMIT 12`).bind(s.user_id,s.token,s.room_id,alive(),Date.now()-60000,s.user_id,s.user_id).all();return rows.results;
}
export async function cityAction(s:WorldSession,body:Record<string,unknown>){
 if(s.mode!=='city'||!s.room_id||s.updated_at<alive())throw new ApiError(409,'Join the public city first.');
 const database=db(),now=Date.now();
 if(body.op==='city-invite'||body.op==='city-block'||body.op==='city-report'){
  if(typeof body.peerId!=='string'||body.peerId===s.user_id)throw new ApiError(400,'Choose another online person.');
  const peer=await database.prepare('SELECT * FROM world_sessions WHERE user_id=? AND room_id=? AND mode=\'city\' AND updated_at>?').bind(body.peerId,s.room_id,alive()).first<WorldSession>();
  if(!peer)throw new ApiError(409,'This person left the city.');
  if(body.op==='city-block'||body.op==='city-report'){
   if(body.op==='city-report'){
    const reasons=['Harassment','Sexual content','Spam','Other'];if(!reasons.includes(String(body.reason)))throw new ApiError(400,'Choose a report reason.');
    const recent=await database.prepare('SELECT id FROM world_city_reports WHERE reporter=? AND created_at>?').bind(s.user_id,now-10000).first();if(recent)throw new ApiError(429,'Wait a moment before another report.');
    await database.prepare('INSERT INTO world_city_reports(id,reporter,reported,reason,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),s.user_id,peer.user_id,body.reason,now).run();
   }
   await database.batch([database.prepare('INSERT INTO world_people_blocks(user_id,blocked_id,created_at) VALUES(?,?,?) ON CONFLICT DO NOTHING').bind(s.user_id,peer.user_id,now),database.prepare('DELETE FROM world_city_invites WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)').bind(s.user_id,peer.user_id,peer.user_id,s.user_id)]);return;
  }
  const blocked=await database.prepare('SELECT user_id FROM world_people_blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?)').bind(s.user_id,peer.user_id,peer.user_id,s.user_id).first();if(blocked)throw new ApiError(403,'This person is unavailable.');
  const result=await database.prepare('INSERT INTO world_city_invites(id,sender,recipient,sender_token,recipient_token,room_id,created_at) SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM world_city_invites WHERE sender=? AND created_at>?)').bind(crypto.randomUUID(),s.user_id,peer.user_id,s.token,peer.token,s.room_id,now,s.user_id,now-10000).run();if(!result.meta.changes)throw new ApiError(429,'Invitation sent recently. Give them a moment to respond.');return;
 }
 if(typeof body.id!=='string')throw new ApiError(400,'Choose an invitation.');
 const invitation=await database.prepare('SELECT * FROM world_city_invites WHERE id=? AND recipient=? AND recipient_token=? AND room_id=? AND created_at>?').bind(body.id,s.user_id,s.token,s.room_id,now-60000).first<{sender:string;sender_token:string}>();if(!invitation)throw new ApiError(409,'This invitation expired.');
 if(body.op==='city-decline'){await database.prepare('DELETE FROM world_city_invites WHERE id=? AND recipient=?').bind(body.id,s.user_id).run();return;}
 if(body.op!=='city-accept')throw new ApiError(400,'Unknown city action.');
 const room=crypto.randomUUID();
 await database.batch([
  database.prepare("INSERT INTO world_rooms(id,kind,created_at,closed) VALUES(?,'discover',?,0)").bind(room,now),
  database.prepare(`WITH eligible AS MATERIALIZED (SELECT user_id FROM world_sessions WHERE mode='city' AND room_id=? AND updated_at>? AND ((user_id=? AND token=?) OR (user_id=? AND token=?)) AND NOT EXISTS (SELECT 1 FROM world_people_blocks WHERE (user_id=? AND blocked_id=?) OR (user_id=? AND blocked_id=?))) UPDATE world_sessions SET room_id=?,mode='discover',updated_at=? WHERE user_id IN (SELECT user_id FROM eligible) AND (SELECT COUNT(*) FROM eligible)=2`).bind(s.room_id,alive(),s.user_id,s.token,invitation.sender,invitation.sender_token,s.user_id,invitation.sender,invitation.sender,s.user_id,room,now),
  database.prepare('DELETE FROM world_rooms WHERE id=? AND (SELECT COUNT(*) FROM world_sessions WHERE room_id=?)!=2').bind(room,room),
  database.prepare('DELETE FROM world_city_invites WHERE id=?').bind(body.id)
 ]);
 const joined=await database.prepare('SELECT id FROM world_rooms WHERE id=?').bind(room).first();if(!joined)throw new ApiError(409,'This person is already talking or has left.');
}
