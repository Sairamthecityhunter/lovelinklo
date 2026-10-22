import {z} from 'zod';
import {db,ensureUser,guard,jsonBody,response,failure,ApiError,audit} from '@/lib/server';
import {CONCIERGE_OWNER} from '@/lib/concierge-operator';
import {MARKETS,sellerProfileSchema,sellerProductSchema,sellerCaseSchema} from '@/lib/seller';
import {marketplaceConfig} from '@/lib/marketplace-server';
export const dynamic='force-dynamic';
const serialize=(r:any)=>({id:r.id,ownerId:r.owner_id,kind:r.kind,status:r.status,value:JSON.parse(r.data_json),country:r.country,currency:r.currency,note:r.review_note,revision:r.revision,createdAt:r.created_at,updatedAt:r.updated_at});
export async function GET(request:Request){try{const ctx=await ensureUser(),review=new URL(request.url).searchParams.get('review')==='1';if(review&&ctx.userId!==CONCIERGE_OWNER)throw new ApiError(403,'Only the LoveLink owner can review seller submissions.');const rows=review?await db().prepare("SELECT * FROM seller_records WHERE status NOT IN ('draft','archived') ORDER BY updated_at DESC LIMIT 300").all<any>():await db().prepare('SELECT * FROM seller_records WHERE owner_id=? ORDER BY updated_at DESC LIMIT 200').bind(ctx.userId).all<any>();return response({records:rows.results.map(serialize),isOperator:ctx.userId===CONCIERGE_OWNER,marketplaceEnabled:marketplaceConfig().enabled,payoutsEnabled:marketplaceConfig().enabled,commissionProposal:10});}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 guard(request);const ctx=await ensureUser(),database=db(),body=await jsonBody(request,14000);
 if(body.op==='save'){
  const input=z.object({op:z.literal('save'),kind:z.enum(['application','product']),id:z.string().uuid().optional(),revision:z.number().int().min(0),value:z.unknown()}).strict().parse(body);
  const id=input.kind==='application'?'seller-app-'+ctx.userId:input.id;if(!id)throw new ApiError(400,'Choose a product ID.');
  const previous=await database.prepare('SELECT * FROM seller_records WHERE id=?').bind(id).first<any>();if(previous&&previous.owner_id!==ctx.userId)throw new ApiError(403,'You can only edit your own seller records.');if(previous&&previous.kind!==input.kind)throw new ApiError(400,'This record has a different type.');
  if(previous&&previous.revision!==input.revision||!previous&&input.revision!==0)throw new ApiError(409,'This draft changed on another device. Refresh before editing.');
  let value:any,country:'IN'|'US';
  if(input.kind==='application'){
   value=sellerProfileSchema.parse(input.value);country=value.country;
   if(previous&&previous.country!==country&&await database.prepare("SELECT id FROM seller_records WHERE owner_id=? AND kind='product' AND status!='archived' LIMIT 1").bind(ctx.userId).first())throw new ApiError(409,'Archive existing products before changing your seller country. This pilot supports one domestic market per seller.');
  }else{
   const application=await database.prepare("SELECT country FROM seller_records WHERE owner_id=? AND kind='application' LIMIT 1").bind(ctx.userId).first<any>();if(!application)throw new ApiError(400,'Save your seller application before adding a product.');country=application.country;
   value=sellerProductSchema.parse(input.value);value.price=Math.round(value.price*100)/100;value.shipping=Math.round(value.shipping*100)/100;
   if(value.image){const image=await database.prepare('SELECT mime FROM media WHERE id=? AND owner_id=?').bind(value.image.split('/').pop(),ctx.userId).first<any>();if(!image?.mime.startsWith('image/'))throw new ApiError(400,'Use a product photo uploaded by your own account.');}
  }
  if(!previous){const count=await database.prepare('SELECT COUNT(*) n FROM seller_records WHERE owner_id=?').bind(ctx.userId).first<any>();if(count.n>=200)throw new ApiError(400,'Your seller workspace has reached its 200-record limit.');}
  const now=Date.now(),currency=MARKETS[country].currency;
  const statement=previous?database.prepare("UPDATE seller_records SET country=?,currency=?,data_json=?,status='draft',review_note='',revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=?").bind(country,currency,JSON.stringify(value),now,id,ctx.userId,input.revision):database.prepare("INSERT INTO seller_records (id,owner_id,kind,country,currency,data_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,'draft',?,?) ON CONFLICT(id) DO NOTHING").bind(id,ctx.userId,input.kind,country,currency,JSON.stringify(value),now,now);
  const results=await database.batch([statement,audit(ctx.userId,'seller-save',id)]);if(!results[0].meta.changes)throw new ApiError(409,'The draft changed. Refresh and try again.');
  return response({id,revision:input.revision+1});
 }
 if(body.op==='case'){
  const input=z.object({op:z.literal('case'),id:z.string().uuid(),value:sellerCaseSchema}).strict().parse(body),app=await database.prepare("SELECT country FROM seller_records WHERE owner_id=? AND kind='application' LIMIT 1").bind(ctx.userId).first<any>();if(!app)throw new ApiError(400,'Save your seller application first.');const count=await database.prepare("SELECT COUNT(*) n FROM seller_records WHERE owner_id=? AND kind='case'").bind(ctx.userId).first<any>();if(count.n>=20)throw new ApiError(400,'Your support workspace is full. Please follow up on an existing case.');await database.prepare("INSERT INTO seller_records (id,owner_id,kind,country,currency,status,data_json,created_at,updated_at) VALUES (?,?,'case',?,?,'open',?,?,?) ON CONFLICT(id) DO NOTHING").bind(input.id,ctx.userId,app.country,MARKETS[app.country as 'IN'|'US'].currency,JSON.stringify(input.value),Date.now(),Date.now()).run();return response({saved:true});
 }
 if(body.op==='review'){
  if(ctx.userId!==CONCIERGE_OWNER)throw new ApiError(403,'Only the LoveLink owner can review submissions.');
  const input=z.object({op:z.literal('review'),id:z.string().min(1).max(200),revision:z.number().int().min(1),status:z.enum(['reviewed','needs_changes','declined','resolved']),note:z.string().trim().min(10).max(1500)}).strict().parse(body);
  const row=await database.prepare("SELECT * FROM seller_records WHERE id=? AND status NOT IN ('draft','archived')").bind(input.id).first<any>();if(!row)throw new ApiError(404,'Submitted record not found.');
  if(row.kind==='case'&&input.status!=='resolved'||row.kind!=='case'&&input.status==='resolved')throw new ApiError(400,'Choose the correct review action.');
  if(row.kind==='product'&&input.status==='reviewed'){const app=await database.prepare("SELECT status FROM seller_records WHERE owner_id=? AND kind='application'").bind(row.owner_id).first<any>();if(app?.status!=='reviewed')throw new ApiError(409,'Review the seller application before qualifying a product for the pilot.');}
  const results=await database.batch([database.prepare('UPDATE seller_records SET status=?,review_note=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?').bind(input.status,input.note,Date.now(),input.id,input.revision),audit(ctx.userId,'seller-review-'+input.status,input.id)]);if(!results[0].meta.changes)throw new ApiError(409,'This record was just updated. Refresh before reviewing.');return response({saved:true,live:false});
 }
 const input=z.object({op:z.enum(['submit','archive']),id:z.string().min(1).max(200),revision:z.number().int().min(1),ack:z.boolean().optional()}).strict().parse(body);
 const row=await database.prepare('SELECT * FROM seller_records WHERE id=? AND owner_id=?').bind(input.id,ctx.userId).first<any>();if(!row)throw new ApiError(404,'Your record was not found.');if(row.kind==='case')throw new ApiError(400,'Support cases are handled through owner review.');
 if(input.op==='submit'){
  if(input.ack!==true)throw new ApiError(400,'Confirm that submitting is for review only and you own the rights to your content.');
  if(!['draft','needs_changes','declined'].includes(row.status))throw new ApiError(409,'This record has already been submitted.');
  if(row.kind==='product'){
   const p=sellerProductSchema.parse(JSON.parse(row.data_json));if(!p.image)throw new ApiError(400,'Upload a product photo before submitting.');
   const app=await database.prepare("SELECT status,country FROM seller_records WHERE owner_id=? AND kind='application'").bind(ctx.userId).first<any>();if(!app||!['submitted','reviewed'].includes(app.status))throw new ApiError(400,'Submit your seller application before submitting products.');if(app.country!==row.country)throw new ApiError(400,'The product market does not match your seller application.');
  }else sellerProfileSchema.parse(JSON.parse(row.data_json));
 }
 const results=await database.batch([database.prepare('UPDATE seller_records SET status=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=?').bind(input.op==='submit'?'submitted':'archived',Date.now(),input.id,ctx.userId,input.revision),audit(ctx.userId,'seller-'+input.op,input.id)]);if(!results[0].meta.changes)throw new ApiError(409,'This record changed. Refresh before trying again.');return response({saved:true,live:false});
 }catch(e){return failure(e);}}
