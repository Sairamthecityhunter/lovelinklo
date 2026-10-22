import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.resolve('wrangler'));const {Miniflare}=require('miniflare');
const files=await fs.readdir('dist/server',{recursive:true});
const mf=new Miniflare({modules:[{type:'ESModule',path:'dist/server/index.js'},...files.filter(f=>f.endsWith('.js')&&f!=='index.js').map(f=>({type:'ESModule',path:'dist/server/'+f}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],cf:false});
async function raw(user,body,path='/api/together',origin='http://test.local'){return mf.dispatchFetch('http://test.local'+path,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',...(user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
async function req(user,body,path){const r=await raw(user,body,path);return {status:r.status,data:await r.json()};}
const wall=new Date(Date.now()+7*86400000).toISOString().slice(0,10)+'T18:00';
try{
 const database=await mf.getD1Database('DB');for(const f of (await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const q of (await fs.readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint'))if(q.trim())await database.prepare(q).run();
 assert.equal((await req(null)).status,401);const alice=await req('alice');await req('bob');await req('eve');
 const passport=alice.data.mine;passport.interests={value:'Cooking and music',shared:true};passport.sizes={value:'PRIVATE-SIZE',shared:false};passport.favorites={value:'PRIVATE-FAVORITES',shared:false};passport.planning={shared:true,style:'food',budget:50,minutes:90,day:5,time:'19:00'};
 assert.equal((await req('alice',{op:'passport',value:passport,revision:0})).status,200);
 assert.equal((await req('alice',{op:'passport',value:passport,revision:0})).status,409);
 assert.deepEqual((await req('bob')).data.partner,{});
 const invite=await req('alice',{op:'create'},'/api/invite');assert.equal((await req('bob',{op:'accept',token:invite.data.token},'/api/invite')).status,200);
 const shared=(await req('bob')).data.partner;assert.equal(shared.interests,'Cooking and music');assert.equal(shared.sizes,undefined);assert.equal(shared.favorites,undefined);
 const partner=(await req('bob')).data.mine;partner.planning={shared:true,style:'distance',budget:10,minutes:30,day:6,time:'20:00'};partner.wishlist={value:'A handwritten note',shared:true};
 assert.equal((await req('bob',{op:'passport',value:partner,revision:0})).status,200);
 assert.equal((await req('alice',{op:'create',wall:'2020-01-01T12:00'})).status,400);
 const created=await req('alice',{op:'create',wall});assert.equal(created.status,200,JSON.stringify(created.data));const id=created.data.id;
 assert.equal((await req('bob',{op:'create',wall})).data.id,id);
 const plan=(await req('bob')).data.plans[0];assert.equal(plan.style,'distance');assert.equal(plan.budget,10);assert.equal(plan.minutes,30);assert.ok(!JSON.stringify(plan).includes('PRIVATE-'));assert.equal((await req('eve')).data.plans.length,0);
 assert.equal((await req('eve',{op:'task',id,index:0,done:true})).status,404);assert.equal((await req('bob',{op:'task',id,index:0,done:true})).status,200);assert.equal((await req('alice')).data.plans[0].tasks[0].done,true);
 assert.equal((await req('bob',{op:'calendar',id})).status,403);assert.equal((await req('alice',{op:'calendar',id})).status,200);assert.equal((await req('alice',{op:'calendar',id})).status,200);
 const state=(await req('bob',undefined,'/api/state')).data;assert.equal(state.events.filter(e=>e.id==='together-'+id).length,1);assert.equal(state.pins.filter(p=>p.eventId==='together-'+id).length,3);assert.equal((await req('alice')).data.plans[0].tasks[0].done,true);
 assert.equal((await req('bob',{op:'complete',id,done:true})).status,200);assert.equal((await req('alice')).data.plans[0].completed,true);
 passport.interests.shared=false;assert.equal((await req('alice',{op:'passport',value:passport,revision:1})).status,200);assert.equal((await req('bob')).data.partner.interests,undefined);
 // Simulate an older saved week to exercise the subsequent-week subscription gate.
 await database.prepare("UPDATE together_plans SET week='2000-01-03' WHERE id=?").bind(id).run();assert.equal((await req('bob',{op:'create',wall})).status,403);
 await database.prepare("INSERT INTO shop_memberships(owner_id,subscription_id,customer_id,status,expires_at,cancel_at_end,payment_mode) VALUES('alice','sub_together','cus_together','active',?,0,'live')").bind(Date.now()+86400000).run();assert.equal((await req('bob')).data.premium,true);assert.equal((await req('bob',{op:'create',wall})).status,200);
 assert.equal((await raw('alice',{op:'complete',id,done:false},'/api/together','https://outsider.test')).status,403);
 const month=new Date().toISOString().slice(0,7),memory={id:'monthly-test',title:'<script>alert(1)</script>',date:month+'-15',place:'Our home',note:'A & B <3',image:'/images/coast.jpg',mediaKind:'image',secret:true};
 assert.equal((await req('alice',{op:'upsert',collection:'memories',value:memory},'/api/state')).status,200);
 const book=await raw('alice',{month,ids:[memory.id]},'/api/together/book');assert.equal(book.status,200);const html=await book.text();assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('A &amp; B &lt;3'));
 assert.equal((await req('bob',{month,ids:[memory.id]},'/api/together/book')).status,404);assert.equal((await req('eve',{month,ids:[memory.id]},'/api/together/book')).status,403);
 await database.prepare("UPDATE shop_memberships SET status='canceled' WHERE owner_id='alice'").run();assert.equal((await req('alice',{month,ids:[memory.id]},'/api/together/book')).status,403);
 assert.equal((await req('bob',{op:'disconnect'},'/api/state')).status,200);assert.deepEqual((await req('bob')).data.partner,{});assert.equal((await req('bob')).data.mine.planning.shared,false);assert.equal((await req('bob',{op:'task',id,index:0,done:false})).status,404);
 assert.equal((await req('alice',{op:'clear'},'/api/state')).status,200);assert.equal((await database.prepare("SELECT COUNT(*) n FROM together_passports WHERE owner_id='alice'").first()).n,0);assert.equal((await database.prepare("SELECT COUNT(*) n FROM together_plans WHERE owner_id='alice'").first()).n,0);
 console.log('PASS: Passport persistence, per-field privacy, current-partner access, revision conflicts, shared-budget planning, date validation, one plan per couple/week, shared checklist, calendar idempotence, subscription gates, private escaped memory books, cancellation, disconnect privacy, CSRF, and data clearing. Memberships were test fixtures; no payment was made.');
}finally{await mf.dispose();}
