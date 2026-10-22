import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.resolve('wrangler'));const {Miniflare,Response:MFResponse}=require('miniflare');
const files=await fs.readdir('dist/server',{recursive:true});const sessions=new Map(),subscriptions=new Map();let seq=0;
const webhookSecret='whsec_local_test_only';
const mf=new Miniflare({modules:[{type:'ESModule',path:'dist/server/index.js'},...files.filter(f=>f.endsWith('.js')&&f!=='index.js').map(f=>({type:'ESModule',path:'dist/server/'+f}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],cf:false,bindings:{SHOP_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_local_only',STRIPE_WEBHOOK_SECRET:webhookSecret},outboundService:async req=>{
 const u=new URL(req.url);assert.equal(u.hostname,'api.stripe.com');let data;
 if(u.pathname==='/v1/checkout/sessions'&&req.method==='POST'){const p=new URLSearchParams(await req.text());const id='cs_test_'+(++seq);data={id,url:'https://checkout.stripe.com/c/pay/'+id,metadata:{orderId:p.get('metadata[orderId]'),sku:p.get('metadata[sku]')},client_reference_id:p.get('client_reference_id'),amount_total:Number(p.get('line_items[0][price_data][unit_amount]')),currency:'usd',payment_status:'unpaid',status:'open',livemode:false,payment_intent:'pi_'+seq};if(p.get('mode')==='subscription'){data.subscription='sub_'+seq;subscriptions.set(data.subscription,{id:data.subscription,metadata:{orderId:data.metadata.orderId},customer:'cus_'+seq,status:'active',items:{data:[{current_period_end:Math.floor(Date.now()/1000)+2592000}]},cancel_at_period_end:false});}sessions.set(id,data);}
 else if(u.pathname.startsWith('/v1/checkout/sessions/'))data=sessions.get(u.pathname.split('/').at(-1));
 else if(u.pathname.startsWith('/v1/subscriptions/'))data=subscriptions.get(u.pathname.split('/').at(-1));
 else if(u.pathname==='/v1/billing_portal/sessions')data={url:'https://billing.stripe.com/p/session/test'};
 else throw new Error('Unexpected Stripe request '+u.pathname);
 return new MFResponse(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
}});
async function request(user,path='/api/shop',body){const headers={Origin:'http://shop.test','Content-Type':'application/json'};if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=user+'@example.test';}const r=await mf.dispatchFetch('http://shop.test'+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
async function webhook(type,object,id='evt_'+crypto.randomUUID(),age=0){const raw=JSON.stringify({id,type,livemode:false,data:{object}}),t=String(Math.floor(Date.now()/1000)-age),signature=createHmac('sha256',webhookSecret).update(t+'.'+raw).digest('hex');const r=await mf.dispatchFetch('http://shop.test/api/shop/webhook',{method:'POST',headers:{'stripe-signature':`t=${t},v1=${signature}`},body:raw});return {status:r.status,data:await r.json()};}
async function purchase(user,sku,details){const requestId=crypto.randomUUID();const r=await request(user,'/api/shop/checkout',{sku,requestId,...(details?{details}:{})});assert.equal(r.status,200,JSON.stringify(r.data));const s=[...sessions.values()].find(s=>s.metadata.orderId===requestId);return s;}
try{
 const database=await mf.getD1Database('DB');for(const f of (await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const q of (await fs.readFile('drizzle/'+f,'utf8')).split('--> statement-breakpoint'))if(q.trim())await database.prepare(q).run();
 assert.equal((await request(null)).status,401);assert.equal((await request(null,'/api/shop?catalog=1')).data.mode,'test');
 await request('buyer');await request('partner');await request('outsider');const invite=await request('buyer','/api/invite',{op:'create'});await request('partner','/api/invite',{op:'accept',token:invite.data.token});
 assert.equal((await request('buyer','/api/shop',{op:'theme',theme:'winter'})).status,403);
 assert.equal((await request('buyer','/api/shop/checkout',{sku:'winter',requestId:crypto.randomUUID(),price:1})).status,400);
 const pack=await purchase('buyer','winter');assert.equal(pack.amount_total,599);
 assert.equal((await request('buyer','/api/shop',{op:'confirm',session:pack.id})).data.paid,false);
 assert.equal((await request('outsider','/api/shop',{op:'confirm',session:pack.id})).status,404);
 const forged=await mf.dispatchFetch('http://shop.test/api/shop/webhook',{method:'POST',body:JSON.stringify({type:'checkout.session.completed',data:{object:pack}})});assert.equal(forged.status,400);
 pack.payment_status='paid';pack.status='complete';assert.equal((await webhook('checkout.session.completed',pack,'evt_pack')).status,200);assert.equal((await webhook('checkout.session.completed',pack,'evt_pack')).status,200);
 assert.ok((await request('partner')).data.themes.includes('winter'));assert.ok(!(await request('outsider')).data.themes.includes('winter'));assert.equal((await request('partner','/api/shop',{op:'theme',theme:'winter'})).status,200);
 assert.equal((await webhook('checkout.session.completed',pack,'evt_old',600)).status,400);
 const bookDetails={yourName:'<script>alert(1)</script>',partnerName:'Maya',occasion:'Our anniversary',memory:'A lovely memory together.',admire:'Your thoughtful kindness.',promise:'More adventures together.'};const book=await purchase('buyer','book',bookDetails);book.payment_status='paid';book.status='complete';await webhook('checkout.session.completed',book);
 const download=await mf.dispatchFetch('http://shop.test/api/shop/book?id='+book.metadata.orderId,{headers:{'oai-authenticated-user-id':'buyer','oai-authenticated-user-email':'buyer@example.test'}});assert.equal(download.status,200);const html=await download.text();assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.equal((await request('partner','/api/shop/book?id='+book.metadata.orderId)).status,404);
 const gift=await purchase('buyer','hearts');gift.payment_status='paid';gift.status='complete';await webhook('checkout.session.completed',gift);assert.equal((await request('buyer','/api/shop',{op:'gift',orderId:gift.metadata.orderId,message:'For you ❤️'})).status,200);assert.equal((await request('buyer','/api/shop',{op:'gift',orderId:gift.metadata.orderId,message:'Again'})).status,409);assert.equal((await request('partner')).data.gifts.length,1);assert.equal((await request('outsider')).data.gifts.length,0);
 const premium=await purchase('buyer','premium');assert.equal(premium.amount_total,499);premium.payment_status='paid';premium.status='complete';await webhook('checkout.session.completed',premium);assert.equal((await request('partner')).data.premium,true);assert.equal((await request('partner')).data.decks.length,2);assert.equal((await request('outsider')).data.decks.length,0);
 assert.equal((await request('buyer','/api/shop/checkout',{sku:'premium',requestId:crypto.randomUUID()})).status,409);assert.equal((await request('buyer','/api/state',{op:'deleteAccount'})).status,409);
 subscriptions.get(premium.subscription).status='canceled';await webhook('customer.subscription.deleted',{id:premium.subscription});assert.equal((await request('partner')).data.premium,false);assert.ok((await request('partner')).data.themes.includes('winter'));
 await webhook('charge.refunded',{payment_intent:pack.payment_intent});assert.ok(!(await request('buyer')).data.themes.includes('winter'));assert.equal((await request('buyer')).data.theme,'classic');
 await webhook('charge.refunded',{payment_intent:gift.payment_intent});assert.equal((await request('partner')).data.gifts.length,0);
 const cancel=await purchase('outsider','flowers');await webhook('checkout.session.expired',cancel);assert.equal((await request('outsider')).data.orders[0].status,'expired');
 const datepack=await purchase('outsider','starlight');assert.equal(datepack.amount_total,599);datepack.payment_status='paid';datepack.status='complete';await webhook('checkout.session.completed',datepack);assert.equal((await request('outsider','/api/concierge')).data.packs.find(p=>p.id==='starlight').unlocked,true);
 console.log('PASS: server prices, checkout isolation, signed/replayed/stale webhooks, unpaid denial, theme fulfillment, couple entitlements, private and escaped book export, single-use gifts, Premium decks, duplicate subscription prevention, cancel-before-delete, cancellation, refund revocation, and expired checkout. All Stripe calls were mocked; no real payment was made.');
}finally{await mf.dispose();}
