import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.resolve('wrangler'));
const {Miniflare}=require('miniflare');
const files=await fs.readdir('dist/server',{recursive:true});
const mf=new Miniflare({modules:[{type:'ESModule',path:'dist/server/index.js'},...files.filter(f=>f.endsWith('.js')&&f!=='index.js').map(f=>({type:'ESModule',path:'dist/server/'+f}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],cf:false});
const avatar={shirt:'#8b5cf6',skin:'#dba77d',hair:'#30232a'};
async function request(user,body,path='/api/world'){const headers={'Content-Type':'application/json',Origin:'http://world.test'};if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=user+'@example.test';}const r=await mf.dispatchFetch('http://world.test'+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
const join=(user,mode='discover',interests=['Gaming'])=>request(user,{op:'join',mode,nickname:user,avatar,interests,adultConfirmed:true});
const sync=(user,s,other={})=>request(user,{op:'sync',session:s.session,x:9,z:10,direction:0,...other});
try{
 const database=await mf.getD1Database('DB');for(const f of (await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){for(const q of (await fs.readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint'))if(q.trim())await database.prepare(q).run();}
 assert.equal((await request(null,{op:'join',mode:'couple',nickname:'test',avatar})).status,401);
 assert.equal((await request('age-test',{op:'join',mode:'discover',nickname:'test',avatar,interests:['Gaming'],adultConfirmed:false})).status,400);
 assert.equal((await request('bad-input',{op:'join',mode:'discover',nickname:'test',avatar,interests:['invented'],adultConfirmed:true})).status,400);
 const a=await join('couple-a','couple');assert.equal(a.status,200,JSON.stringify(a.data));
 const invitation=await request('couple-a',{op:'create'},'/api/invite');assert.equal(invitation.status,200);
 assert.equal((await request('couple-b',{op:'accept',token:invitation.data.token},'/api/invite')).status,200);
 const b=await join('couple-b','couple');assert.equal(b.status,200,JSON.stringify(b.data));assert.equal(b.data.roomId,a.data.roomId);assert.equal(b.data.players.length,2);assert.notEqual(b.data.players[0].x,b.data.players[1].x);
 const stranger=await join('outsider','couple');assert.notEqual(stranger.data.roomId,a.data.roomId);
 assert.equal((await sync('outsider',a.data)).status,409);
 const movement=await sync('couple-a',a.data,{x:6,z:7,direction:1.5});assert.equal(movement.status,200);
 const seen=(await sync('couple-b',b.data)).data.players.find(p=>p.id==='couple-a');assert.equal(seen.x,6);assert.equal(seen.z,7);
 const build={op:'build',session:a.data.session,x:3,y:1,z:3,material:'rose',remove:false};assert.equal((await request('couple-a',build)).status,200);
 assert.equal((await sync('couple-b',b.data)).data.blocks[0].material,'rose');
 assert.equal((await request('couple-a',{...build,y:3})).status,409);assert.equal((await request('couple-a',{...build,x:9,z:10})).status,400);
 assert.equal((await request('couple-a',{...build,x:144})).status,400);
 assert.equal((await sync('couple-a',a.data,{x:39,z:39})).status,200);
 assert.equal((await sync('couple-b',b.data)).data.players.find(p=>p.id==='couple-a').x,39);
 assert.equal((await sync('couple-a',a.data,{x:144,z:39})).status,400);
 assert.equal((await sync('couple-a',a.data,{x:23,z:19})).status,400);
 assert.equal((await request('couple-a',{...build,x:23,z:19})).status,400);
 assert.equal((await request('couple-a',{...build,x:29,z:9})).status,400);
 const expanded=await request('couple-a',{...build,x:39,z:39});assert.equal(expanded.status,200);
 assert.ok((await sync('couple-b',b.data)).data.blocks.some(b=>b.x===39&&b.z===39));
 assert.equal((await request('couple-a',{...build,x:39,z:39,remove:true})).status,200);
 for(const [x,z] of [[46,9],[46,27],[47,47],[28,47],[9,46]]){assert.equal((await sync('couple-a',a.data,{x,z})).status,200);assert.equal((await request('couple-a',{...build,x,z})).status,400);}
 assert.equal((await sync('couple-a',a.data,{x:9,z:51})).status,400);
 assert.equal((await sync('couple-a',a.data,{x:55,z:55})).status,200);
 for(const [x,z] of [[39,64],[14,64],[63,65],[39,76],[70,32],[79,79]]){
  assert.equal((await sync('couple-a',a.data,{x,z})).status,200);
  const visitor=(await sync('couple-b',b.data)).data.players.find(p=>p.id==='couple-a');
  assert.equal(visitor.x,x);assert.equal(visitor.z,z);
 }
 assert.equal((await sync('couple-a',a.data,{x:36,z:58})).status,400);
 const messageId=crypto.randomUUID();assert.equal((await request('couple-a',{op:'message',session:a.data.session,id:messageId,text:'Hello from a real test client'})).status,200);
 assert.equal((await request('couple-a',{op:'message',session:a.data.session,id:messageId,text:'Hello from a real test client'})).status,200);
 const shared=(await sync('couple-b',b.data)).data;assert.equal(shared.messages.length,1);assert.equal(shared.messages[0].text,'Hello from a real test client');assert.equal((await sync('outsider',stranger.data)).data.messages.length,0);
 assert.equal((await request('couple-a',{op:'message',session:a.data.session,id:crypto.randomUUID(),text:'x'.repeat(301)})).status,400);
 assert.equal((await request('couple-a',{op:'message',session:a.data.session,id:crypto.randomUUID(),text:'Too soon'})).status,429);

 const callRequest=(user,body)=>request(user,body,'/api/world/call');
 const callId=crypto.randomUUID(),sdp='v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\ns=Test only\r\nt=0 0\r\n';
 assert.equal((await callRequest(null,{op:'poll',session:a.data.session})).status,401);
 assert.equal((await callRequest('couple-a',{op:'config',session:a.data.session})).data.relay,false);
 assert.equal((await callRequest('couple-a',{op:'offer',session:a.data.session,id:callId,sdp})).status,200);
 assert.equal((await callRequest('couple-b',{op:'offer',session:b.data.session,id:crypto.randomUUID(),sdp})).status,409);
 const incoming=await callRequest('couple-b',{op:'poll',session:b.data.session});assert.equal(incoming.data.call.id,callId);assert.equal(incoming.data.call.role,'callee');assert.equal(incoming.data.call.offer,sdp);assert.ok(!JSON.stringify(incoming.data).includes(a.data.session));
 assert.equal((await callRequest('outsider',{op:'poll',session:stranger.data.session})).data.call,null);
 assert.equal((await callRequest('outsider',{op:'poll',session:a.data.session})).status,409);
 assert.equal((await callRequest('couple-a',{op:'answer',session:a.data.session,id:callId,sdp})).status,409);
 assert.equal((await callRequest('couple-b',{op:'answer',session:b.data.session,id:crypto.randomUUID(),sdp})).status,409);
 assert.equal((await callRequest('couple-b',{op:'answer',session:b.data.session,id:callId,sdp})).data.call.state,'active');
 assert.equal((await callRequest('couple-a',{op:'poll',session:a.data.session})).data.call.answer,sdp);
 assert.equal((await callRequest('couple-b',{op:'poll',session:b.data.session})).data.call.offer,undefined);
 assert.equal((await callRequest('couple-b',{op:'end',session:b.data.session,id:callId})).data.call.state,'ended');
 assert.equal((await callRequest('couple-a',{op:'poll',session:a.data.session})).data.call.state,'ended');
 assert.equal((await database.prepare('SELECT offer FROM world_calls WHERE room_id=?').bind(a.data.roomId).first()).offer,'');
 // A stale or replaced world session cannot continue signaling a call.
 await database.prepare('UPDATE world_calls SET created_at=? WHERE room_id=?').bind(Date.now()-4000,a.data.roomId).run();
 const staleCallId=crypto.randomUUID();assert.equal((await callRequest('couple-a',{op:'offer',session:a.data.session,id:staleCallId,sdp})).status,200);
 await database.prepare('UPDATE world_calls SET created_at=? WHERE room_id=?').bind(Date.now()-91000,a.data.roomId).run();
 assert.equal((await callRequest('couple-b',{op:'poll',session:b.data.session})).data.call.state,'ended');
 assert.equal((await callRequest('couple-a',{op:'offer',session:a.data.session,id:crypto.randomUUID(),sdp:'x'.repeat(49000)})).status,400);
 const replaced=await join('couple-a','couple');assert.equal((await sync('couple-a',a.data)).status,409);assert.equal(replaced.data.blocks.length,1);
 await request('couple-a',{op:'disconnect'},'/api/state');assert.equal((await sync('couple-a',replaced.data)).status,409);
 const waiting=await join('meet-a');assert.equal(waiting.data.status,'waiting');
 const different=await join('meet-b','discover',['Books']);assert.equal(different.data.status,'waiting');
 const match=await join('meet-c','discover',['Gaming','Travel']);assert.equal(match.status,200,JSON.stringify(match.data));assert.equal(match.data.status,'active');assert.equal(match.data.players.length,2);assert.deepEqual(match.data.sharedInterests,['Gaming']);
 const paired=await sync('meet-a',waiting.data);assert.equal(paired.data.roomId,match.data.roomId);assert.equal(paired.data.status,'active');
 assert.equal((await sync('meet-b',different.data)).data.status,'waiting');
 assert.equal((await request('meet-c',{op:'message',session:match.data.session,id:crypto.randomUUID(),text:'A shared interest!'})).status,200);
 assert.equal((await sync('meet-a',waiting.data)).data.messages[0].text,'A shared interest!');
 const matchCall=crypto.randomUUID();assert.equal((await callRequest('meet-c',{op:'offer',session:match.data.session,id:matchCall,sdp})).status,200);
 await request('meet-a',{op:'block',session:waiting.data.session});assert.equal((await sync('meet-c',match.data)).data.status,'ended');assert.equal((await callRequest('meet-c',{op:'poll',session:match.data.session})).status,409);assert.equal((await database.prepare('SELECT offer FROM world_calls WHERE room_id=?').bind(match.data.roomId).first()).offer,'');
 await join('meet-a');const blocked=await join('meet-c');assert.equal(blocked.data.status,'waiting');
 await request('meet-a',{op:'leave',session:(await database.prepare('SELECT token FROM world_sessions WHERE user_id = ?').bind('meet-a').first()).token});await request('meet-c',{op:'leave',session:blocked.data.session});await request('meet-b',{op:'leave',session:different.data.session});
 const expired=await join('expired');await database.prepare('UPDATE world_sessions SET updated_at = ? WHERE user_id = ?').bind(Date.now()-30000,'expired').run();const fresh=await join('fresh');assert.equal(fresh.data.status,'waiting');await request('fresh',{op:'leave',session:fresh.data.session});
 // Concurrent arrivals can form pairs but cannot claim a third person into a room.
 const concurrent=await Promise.all(['race-a','race-b','race-c'].map(u=>join(u,'discover',['Art'])));for(const r of concurrent)assert.equal(r.status,200,JSON.stringify(r.data));
 const rooms=await database.prepare("SELECT room_id,COUNT(*) AS n FROM world_sessions WHERE user_id LIKE 'race-%' AND room_id IS NOT NULL GROUP BY room_id").all();assert.equal(rooms.results.length,1);assert.equal(rooms.results[0].n,2);
 const cityA=await join('city-a','city',[]);assert.equal(cityA.status,200);assert.equal(cityA.data.mode,'city');assert.equal(cityA.data.status,'active');
 const cityB=await join('city-b','city',[]);assert.equal(cityB.status,200);assert.equal(cityB.data.mode,'city');assert.equal(cityB.data.players.length,2);
 const cityPeer=cityB.data.players.find(p=>p.id==='city-b');assert.ok(cityPeer);
 assert.equal((await request('city-a',{op:'city-invite',session:cityA.data.session,peerId:'city-b'})).status,200);
 const cityWaiting=await sync('city-b',cityB.data);assert.equal(cityWaiting.data.invitations.length,1);
 const privateCity=await request('city-b',{op:'city-accept',session:cityB.data.session,id:cityWaiting.data.invitations[0].id});assert.equal(privateCity.status,200);assert.equal(privateCity.data.mode,'discover');assert.equal(privateCity.data.players.length,2);
 assert.equal((await request('city-a',{op:'sync',session:cityA.data.session,x:110,z:86,direction:0,vehicle:true})).data.players.find(p=>p.id==='city-a').vehicle,true);
 const cross=await mf.dispatchFetch('http://world.test/api/world',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json','oai-authenticated-user-id':'meet-a','oai-authenticated-user-email':'a@test'},body:JSON.stringify({op:'join',mode:'couple',nickname:'A',avatar})});assert.equal(cross.status,403);
 console.log('PASS: video-call offer/answer isolation, simultaneous invitations, decline/end, invitation timeout, session enforcement, SDP clearing, input limits, block termination; authenticated rooms, adult opt-in, validation, couple isolation, distinct avatars, live movement, shared building, supported stacks, protected spawn, synchronized chat, duplicate/rate handling, stale sessions, disconnect revocation, interest matching, mismatched interests, blocking, leave propagation, expired presence, concurrent pair claims, and cross-site rejection.');
}finally{await mf.dispose();}
