import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.resolve('wrangler'));const {Miniflare}=require('miniflare');
const files=await fs.readdir('dist/server',{recursive:true});
const mf=new Miniflare({modules:[{type:'ESModule',path:'dist/server/index.js'},...files.filter(f=>f.endsWith('.js')&&f!=='index.js').map(f=>({type:'ESModule',path:'dist/server/'+f}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],cf:false});
const owner='d7bdab77-accc-455c-8433-09361d268258';
const headers=user=>({Origin:'http://seller.test','oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@example.test'});
async function raw(user,body,path='/api/seller',origin='http://seller.test'){return mf.dispatchFetch('http://seller.test'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',Origin:origin,...(user?headers(user):{})},...(body?{body:JSON.stringify(body)}:{})});}
async function req(user,body,path){const r=await raw(user,body,path);return {status:r.status,data:await r.json()};}
async function upload(user){const f=new FormData();f.set('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1sAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'photo.png');const encoded=new Request('http://seller.test/api/media',{method:'POST',body:f});const r=await mf.dispatchFetch('http://seller.test/api/media',{method:'POST',headers:{...headers(user),'Content-Type':encoded.headers.get('content-type')},body:await encoded.arrayBuffer()});assert.equal(r.status,200);return (await r.json()).url;}
const profile={businessName:'Handmade by Maya',country:'IN',city:'Vijayawada',contactEmail:'seller@example.test',website:'https://example.test',about:'Handmade keepsakes made and shipped locally with tracked delivery.',returns:'Contact within seven days about damage; return terms confirmed before sales.',support:'Email support, proposed replies within two working days.'};
const item={title:'Personalized photo frame',description:'A handmade wooden photo frame. Includes a custom name inscription and a desk stand.',category:'Personalized keepsakes',price:1000.25,shipping:100,stock:3,processingDays:2,deliveryMin:3,deliveryMax:7,serviceArea:'Vijayawada and Hyderabad',image:'',personalization:'One name, up to 30 characters'};
try{
 const database=await mf.getD1Database('DB');for(const f of (await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const q of (await fs.readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint'))if(q.trim())await database.prepare(q).run();
 assert.equal((await req(null)).status,401);await req('maya');await req('alex');await req(owner);
 const publicPage=await raw(null,undefined,'/seller');assert.equal(publicPage.status,200);const page=await publicPage.text();assert.ok(page.includes('Sales depend on payment activation'));
 assert.equal((await req('maya',{op:'save',kind:'application',revision:0,value:{...profile,website:'https://bad space'}})).status,400);
 const app=await req('maya',{op:'save',kind:'application',revision:0,value:profile});assert.equal(app.status,200,JSON.stringify(app.data));const appId=app.data.id;
 assert.equal((await req(owner,undefined,'/api/seller?review=1')).data.records.length,0);assert.equal((await req('alex')).data.records.length,0);assert.equal((await req('alex',undefined,'/api/seller?review=1')).status,403);
 assert.equal((await req('maya',{op:'save',kind:'application',revision:0,value:profile})).status,409);
 const photo=await upload('maya'),id=crypto.randomUUID();item.image=photo;
 assert.equal((await req('alex',{op:'save',kind:'product',id:crypto.randomUUID(),revision:0,value:item})).status,400);
 assert.equal((await req('alex',{op:'save',kind:'application',revision:0,value:{...profile,businessName:'USA Gifts',country:'US',city:'Hayward'}})).status,200);
 assert.equal((await req('alex',{op:'save',kind:'product',id:crypto.randomUUID(),revision:0,value:item})).status,400);
 assert.equal((await req('maya',{op:'save',kind:'product',id,revision:0,value:{...item,price:-1}})).status,400);
 assert.equal((await req('maya',{op:'save',kind:'product',id,revision:0,value:{...item,deliveryMax:2}})).status,400);
 assert.equal((await req('maya',{op:'save',kind:'product',id,revision:0,value:item})).status,200);let saved=(await req('maya')).data.records.find(r=>r.id===id);assert.equal(saved.currency,'INR');assert.equal(saved.value.price,1000.25);
 assert.equal((await req('alex',{op:'save',kind:'product',id,revision:1,value:{...item,image:''}})).status,403);
 assert.equal((await req(owner,undefined,'/api/seller/photo?recordId='+id)).status,404);assert.equal((await req('alex',undefined,'/api/seller/photo?recordId='+id)).status,404);assert.equal((await raw('maya',undefined,'/api/seller/photo?recordId='+id)).status,200);
 assert.equal((await req('maya',{op:'save',kind:'application',revision:1,value:{...profile,country:'US'}})).status,409);
 assert.equal((await req('maya',{op:'submit',id,revision:1,ack:true})).status,400);assert.equal((await req('maya',{op:'submit',id:appId,revision:1,ack:false})).status,400);
 assert.equal((await req('maya',{op:'submit',id:appId,revision:1,ack:true})).status,200);assert.equal((await req('maya',{op:'submit',id,revision:1,ack:true})).status,200);
 assert.equal((await raw(owner,undefined,'/api/seller/photo?recordId='+id)).status,200);assert.equal((await req('alex',{op:'review',id,revision:2,status:'reviewed',note:'Ready for the domestic pilot.'})).status,403);
 assert.equal((await req(owner,{op:'review',id,revision:2,status:'reviewed',note:'Ready for the domestic pilot.'})).status,409);
 assert.equal((await req(owner,{op:'review',id:appId,revision:2,status:'reviewed',note:'Application reviewed, verification still required.'})).status,200);
 assert.equal((await req(owner,{op:'review',id,revision:2,status:'reviewed',note:'Product reviewed, live checkout remains disabled.'})).status,200);
 assert.equal((await req(null,undefined,'/api/seller/catalog?country=IN')).data.items.length,0);
 const reviewed=(await req('maya')).data;assert.equal(reviewed.marketplaceEnabled,false);assert.equal(reviewed.payoutsEnabled,false);assert.equal(reviewed.records.find(r=>r.id===id).status,'reviewed');
 assert.equal((await req('maya',{op:'save',kind:'product',id,revision:3,value:{...item,price:1100,catalogConsent:true}})).status,200);assert.equal((await req('maya')).data.records.find(r=>r.id===id).status,'draft');
 assert.equal((await req(null,undefined,'/api/seller/catalog?country=IN')).data.items.length,0);
 assert.equal((await req('maya',{op:'submit',id,revision:4,ack:true})).status,200);assert.equal((await req(owner,{op:'review',id,revision:5,status:'reviewed',note:'Seller opted in to a public catalog preview only.'})).status,200);
 const catalog=(await req(null,undefined,'/api/seller/catalog?country=IN')).data;assert.equal(catalog.items.length,1);assert.equal(catalog.checkoutEnabled,false);assert.equal(catalog.items[0].shopName,profile.businessName);assert.ok(!JSON.stringify(catalog).includes(profile.contactEmail));assert.equal((await req(null,undefined,'/api/seller/catalog?country=US')).data.items.length,0);assert.equal((await raw(null,undefined,'/api/seller/catalog/photo?recordId='+id)).status,200);
 const caseId=crypto.randomUUID();assert.equal((await req('maya',{op:'case',id:caseId,value:{subject:'Question about packaging',category:'Policy question',details:'Can I propose recycled packaging for these wooden frames?'}})).status,200);
 assert.equal((await req('alex')).data.records.some(r=>r.id===caseId),false);assert.equal((await req(owner,{op:'review',id:caseId,revision:1,status:'resolved',note:'Yes, specify suitable protective materials in the listing.'})).status,200);
 const forged=await mf.dispatchFetch('http://seller.test/api/seller',{method:'POST',headers:{...headers('maya'),Origin:'https://outsider.test','Content-Type':'application/json'},body:JSON.stringify({op:'archive',id,revision:6})});assert.equal(forged.status,403);
 assert.equal((await req('maya',{op:'archive',id,revision:6})).status,200);assert.equal((await req(owner,undefined,'/api/seller?review=1')).data.records.some(r=>r.id===id),false);assert.equal((await req(null,undefined,'/api/seller/catalog?country=IN')).data.items.length,0);assert.equal((await req(null,undefined,'/api/seller/catalog/photo?recordId='+id)).status,404);
 assert.equal((await req('maya',{op:'save',kind:'application',revision:3,value:{...profile,country:'US',city:'Hayward'}})).status,200);
 assert.equal((await req('maya',{op:'clear'},'/api/state')).status,200);assert.equal((await req('maya')).data.records.length,0);
 console.log('PASS: seller persistence, draft privacy, India/USA currency mapping, image ownership/access, invalid prices and delivery, stale edit rejection, country-change guard, submission acknowledgments, owner-only review, review prerequisites, no checkout/payout activation, edits requiring re-review, support cases, CSRF, archiving, and data clearing. No real seller verification, sales, or payouts occurred.');
}finally{await mf.dispose();}
