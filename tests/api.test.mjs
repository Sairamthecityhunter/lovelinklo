import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.resolve('wrangler'));
const {Miniflare}=require('miniflare');
const all=await fs.readdir('dist/server',{recursive:true});const modules=[{type:'ESModule',path:'dist/server/index.js'},...all.filter(f=>f.endsWith('.js')&&f!=='index.js').map(f=>({type:'ESModule',path:'dist/server/'+f}))];
const mf=new Miniflare({modules,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],cf:false});
async function request(path,user,body){const headers={'Content-Type':'application/json',Origin:'http://lovelink.test'};if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=user+'@example.test';}const r=await mf.dispatchFetch('http://lovelink.test'+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();return {status:r.status,data};}
try{
 const database=await mf.getD1Database('DB');for(const f of (await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=await fs.readFile('drizzle/'+f,'utf8');for(const statement of sql.split('--> statement-breakpoint'))if(statement.trim())await database.prepare(statement).run();}
 assert.equal((await request('/api/state',null)).status,401);
 const a=await request('/api/state','test-alex');assert.equal(a.status,200,JSON.stringify(a.data));assert.equal(a.data.pins.length,5);assert.equal(a.data.profile.myName,'Alex');
 const b=await request('/api/state','test-maya');assert.equal(b.status,200);assert.notEqual(a.data.pins[0].id,b.data.pins[0].id);
 const pin={id:'qa-pin',title:'Chocolate surprise',message:'Remember the favorite chocolate',type:'Gift',dueAt:'2026-10-20T19:00:00.000Z',timezone:'Europe/London',reminderMinutes:3150,repeat:'yearly',eventId:'',secret:true,done:false,createdAt:new Date().toISOString()};
 assert.equal((await request('/api/state','test-alex',{op:'upsert',collection:'pins',value:pin})).status,200);
 assert.equal((await request('/api/state','test-alex')).data.pins.find(p=>p.id==='qa-pin').reminderMinutes,3150);
 assert.equal((await request('/api/state','test-maya',{op:'upsert',collection:'pins',value:{...pin,title:'Tampered'}})).status,403);
 assert.equal((await request('/api/state','test-alex',{op:'upsert',collection:'pins',value:{...pin,id:'invalid',timezone:'Not/AZone'}})).status,400);
 const invite=await request('/api/invite','test-alex',{op:'create'});assert.equal(invite.status,200);
 const accepted=await request('/api/invite','test-maya',{op:'accept',token:invite.data.token});assert.equal(accepted.status,200,JSON.stringify(accepted.data));
 const paired=await request('/api/state','test-maya');assert.equal(paired.data.connected,true);assert.equal(paired.data.pins.some(p=>p.id==='qa-pin'),false);
 assert.equal((await request('/api/state','test-alex',{op:'upsert',collection:'pins',value:{...pin,secret:false}})).status,200);
 assert.equal((await request('/api/state','test-maya')).data.pins.some(p=>p.id==='qa-pin'),true);
 assert.equal((await request('/api/state','test-maya',{op:'delete',collection:'pins',id:'qa-pin'})).status,404);
 const letter={id:'future-letter',title:'For tomorrow',body:'Private until tomorrow',date:new Date(Date.now()+86400000).toISOString(),openWhen:'you miss me',secret:false};
 assert.equal((await request('/api/state','test-alex',{op:'upsert',collection:'letters',value:letter})).status,200);
 assert.equal((await request('/api/state','test-maya')).data.letters.some(l=>l.id==='future-letter'),false);
 const linkedLetterPin={...pin,id:'letter-pin',letterId:letter.id,secret:false};const linkedResult=await request('/api/state','test-alex',{op:'upsert',collection:'pins',value:linkedLetterPin});assert.equal(linkedResult.status,200);assert.equal(linkedResult.data.pins.find(p=>p.id==='letter-pin').secret,true);
 assert.equal((await request('/api/invite','test-maya',{op:'accept',token:invite.data.token})).status,404);
 assert.equal((await request('/api/state','test-alex',{op:'snooze',id:'qa-pin'})).status,200);
 const snoozed=(await request('/api/state','test-alex')).data.pins.find(p=>p.id==='qa-pin');assert.ok(Math.abs(Date.parse(snoozed.snoozedUntil)-Date.now()-600000)<5000);
 const due={...pin,id:'due-pin',dueAt:new Date(Date.now()-1000).toISOString(),reminderMinutes:0,repeat:'none'};await request('/api/state','test-alex',{op:'upsert',collection:'pins',value:due});await request('/api/state','test-alex',{op:'notify',id:'due-pin'});await request('/api/state','test-alex',{op:'notify',id:'due-pin'});assert.equal((await request('/api/state','test-alex')).data.notifications.filter(n=>n.pinId==='due-pin').length,1);
 assert.equal((await request('/api/ai','test-alex',{prompt:'Coffee and photography',budget:100,mode:'concierge',consent:true})).status,503);
 const rejection=await mf.dispatchFetch('http://lovelink.test/api/state',{method:'POST',headers:{Origin:'https://untrusted.test','Content-Type':'application/json','oai-authenticated-user-id':'test-alex','oai-authenticated-user-email':'alex@example.test'},body:JSON.stringify({op:'clear'})});assert.equal(rejection.status,403);
 const uploadBody=new FormData();uploadBody.append('file',new File([await fs.readFile('public/icon-192.png')],'test.png',{type:'image/png'}));const encodedUpload=new Request('http://lovelink.test/api/media',{method:'POST',body:uploadBody});const upload=await mf.dispatchFetch('http://lovelink.test/api/media',{method:'POST',headers:{Origin:'http://lovelink.test','Content-Type':encodedUpload.headers.get('content-type'),'oai-authenticated-user-id':'test-alex','oai-authenticated-user-email':'alex@example.test'},body:await encodedUpload.arrayBuffer()});const uploaded=await upload.json();assert.equal(upload.status,200,JSON.stringify(uploaded));
 assert.equal((await request(uploaded.url,'test-maya')).status,404);
 const memory={id:'photo-memory',title:'A synthetic test photo',date:'2026-09-20',place:'Test',note:'Test only',image:uploaded.url,secret:false};assert.equal((await request('/api/state','test-alex',{op:'upsert',collection:'memories',value:memory})).status,200);
 const sharedPhoto=await mf.dispatchFetch('http://lovelink.test'+uploaded.url,{headers:{'oai-authenticated-user-id':'test-maya','oai-authenticated-user-email':'maya@example.test'}});assert.equal(sharedPhoto.status,200);assert.equal(sharedPhoto.headers.get('content-type'),'image/png');
 // A scheduled multimedia box must protect both its JSON and its media bytes.
 const wav=Buffer.alloc(64);wav.write('RIFF');wav.writeUInt32LE(56,4);wav.write('WAVE',8);wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(20,40);
 const audioForm=new FormData();audioForm.append('file',new File([wav],'voice.wav',{type:'audio/wav'}));const audioRequest=new Request('http://lovelink.test/api/media',{method:'POST',body:audioForm});const audioUpload=await mf.dispatchFetch('http://lovelink.test/api/media',{method:'POST',headers:{Origin:'http://lovelink.test','Content-Type':audioRequest.headers.get('content-type'),'oai-authenticated-user-id':'test-alex','oai-authenticated-user-email':'alex@example.test'},body:await audioRequest.arrayBuffer()});assert.equal(audioUpload.status,200);const audio=await audioUpload.json();assert.equal(audio.kind,'audio');
 const surprise={id:'locked-box',title:'A secret voice note',message:'Only after opening time',date:new Date(Date.now()+86400000).toISOString(),timezone:'UTC',assets:[{url:audio.url,kind:'audio',caption:'For you'}],playlist:'',secret:false};
 assert.equal((await request('/api/state','test-alex',{op:'upsert',collection:'surprises',value:surprise})).status,200);
 assert.equal((await request('/api/state','test-maya')).data.surprises.some(s=>s.id===surprise.id),false);assert.equal((await request(audio.url,'test-maya')).status,404);
 assert.equal((await request('/api/state','test-maya',{op:'upsert',collection:'surprises',value:{...surprise,id:'stolen-media'}})).status,400);
 assert.equal((await request('/api/state','test-alex',{op:'upsert',collection:'surprises',value:{...surprise,id:'unsafe-link',playlist:'javascript:alert(1)'}})).status,400);
 assert.equal((await request('/api/state','test-alex',{op:'upsert',collection:'surprises',value:{...surprise,id:'wrong-kind',assets:[{url:audio.url,kind:'image',caption:''}]}})).status,400);
 await request('/api/state','test-alex',{op:'upsert',collection:'surprises',value:{...surprise,date:new Date(Date.now()-1000).toISOString()}});assert.equal((await request('/api/state','test-maya')).data.surprises.some(s=>s.id===surprise.id),true);
 const range=await mf.dispatchFetch('http://lovelink.test'+audio.url,{headers:{'oai-authenticated-user-id':'test-maya','oai-authenticated-user-email':'maya@example.test',Range:'bytes=0-11'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),'bytes 0-11/64');assert.equal(Buffer.from(await range.arrayBuffer()).toString(),'RIFF8\x00\x00\x00WAVE');
 await request('/api/state','test-alex',{op:'upsert',collection:'surprises',value:{...surprise,secret:true,date:new Date(Date.now()-1000).toISOString()}});assert.equal((await request(audio.url,'test-maya')).status,404);
 assert.equal((await request('/api/state','test-alex',{op:'deleteAccount'})).status,200);assert.equal(await database.prepare('SELECT id FROM users WHERE id = ?').bind('test-alex').first(),null);assert.equal((await request('/api/state','test-maya')).data.connected,false);
 console.log('PASS: authentication, durable CRUD, input validation, account isolation, private/shared pins, invitation acceptance and reuse protection, scheduled-letter privacy, snooze, deduplicated reminders, missing-provider state, cross-site request rejection, media access control, scheduled surprise privacy, ownership checks, safe playlists, audio streaming ranges, privacy revocation, and account deletion.');
}finally{await mf.dispose();}
