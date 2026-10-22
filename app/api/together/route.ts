import {z} from 'zod';
import {db,ensureUser,guard,jsonBody,response,failure,ApiError,insertRecord} from '@/lib/server';
import {entitlements,checkoutMode} from '@/lib/shop-server';
import {emptyPassport,passportSchema,sharedPassport,weekKey,makeWeeklyPlan,type WeeklyPlan} from '@/lib/together';
import {pinSchema,eventSchema} from '@/lib/love-validation';
export const dynamic='force-dynamic';
type Context=Awaited<ReturnType<typeof ensureUser>>;
async function passports(ctx:Context){
 const own=await db().prepare('SELECT data_json,revision,couple_id FROM together_passports WHERE owner_id=?').bind(ctx.userId).first<any>();
 const mine=own?passportSchema.parse(JSON.parse(own.data_json)):emptyPassport();
 // Changing partners never silently re-shares a passport.
 if(own&&own.couple_id!==ctx.coupleId){for(const field of Object.values(mine))field.shared=false;}
 const other=await db().prepare('SELECT p.data_json FROM together_passports p JOIN users u ON u.id=p.owner_id AND u.couple_id=p.couple_id WHERE p.couple_id=? AND p.owner_id!=? LIMIT 1').bind(ctx.coupleId,ctx.userId).first<any>();
 return {mine,revision:own?.revision||0,partner:other?sharedPassport(passportSchema.parse(JSON.parse(other.data_json))):{}};
}
async function plans(ctx:Context){const rows=await db().prepare('SELECT p.* FROM together_plans p JOIN users u ON u.id=p.owner_id AND u.couple_id=p.couple_id WHERE p.couple_id=? ORDER BY p.created_at DESC LIMIT 104').bind(ctx.coupleId).all<any>();return rows.results.map(r=>({...JSON.parse(r.data_json),ownerId:r.owner_id})) as WeeklyPlan[];}
export async function GET(){try{const ctx=await ensureUser();const [p,items,access]=await Promise.all([passports(ctx),plans(ctx),entitlements(ctx.coupleId)]);return response({...p,plans:items,premium:access.premium,mode:checkoutMode(),week:weekKey(Date.now(),'UTC')});}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 guard(request);const ctx=await ensureUser(),body=await jsonBody(request,12000),database=db();
 if(body.op==='passport'){
  const value=passportSchema.parse(body.value),revision=z.number().int().min(0).parse(body.revision);
  const result=revision===0?await database.prepare('INSERT INTO together_passports (owner_id,couple_id,data_json,revision) VALUES (?,?,?,1) ON CONFLICT(owner_id) DO NOTHING').bind(ctx.userId,ctx.coupleId,JSON.stringify(value)).run():await database.prepare('UPDATE together_passports SET data_json=?,couple_id=?,revision=revision+1 WHERE owner_id=? AND revision=?').bind(JSON.stringify(value),ctx.coupleId,ctx.userId,revision).run();
  if(!result.meta.changes)throw new ApiError(409,'Your passport changed on another device. Refresh before saving again.');
  return response({saved:true,revision:revision+1});
 }
 if(body.op==='create'){
  const input=z.object({op:z.literal('create'),wall:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)}).strict().parse(body);
  const week=weekKey(Date.now(),'UTC'),existing=await database.prepare('SELECT id FROM together_plans WHERE couple_id=? AND week=?').bind(ctx.coupleId,week).first<any>();
  if(existing)return response({id:existing.id,existing:true});
  const premium=(await entitlements(ctx.coupleId)).premium;
  if(!premium&&(await database.prepare('SELECT id FROM together_plans WHERE couple_id=? LIMIT 1').bind(ctx.coupleId).first()))throw new ApiError(403,'Your free weekly plan has been used. Together membership includes a new plan each week. Your saved plan stays available.');
  const p=await passports(ctx),id=crypto.randomUUID();let plan:WeeklyPlan;
  try{plan=makeWeeklyPlan({id,wall:input.wall,timezone:ctx.profile.myTimezone,mine:sharedPassport(p.mine),partner:p.partner});}catch(e){throw new ApiError(400,(e as Error).message);}
  plan.week=week;
  const result=await database.prepare('INSERT INTO together_plans (id,couple_id,owner_id,week,data_json,created_at) SELECT ?,?,?,?,?,? WHERE (?=1 OR NOT EXISTS (SELECT 1 FROM together_plans WHERE couple_id=?)) ON CONFLICT(couple_id,week) DO NOTHING').bind(id,ctx.coupleId,ctx.userId,week,JSON.stringify(plan),Date.now(),premium?1:0,ctx.coupleId).run();
  if(!result.meta.changes){const current=await database.prepare('SELECT id FROM together_plans WHERE couple_id=? AND week=?').bind(ctx.coupleId,week).first<any>();if(current)return response({id:current.id,existing:true});throw new ApiError(409,'Your couple already created a plan. Refresh to see it.');}
  return response({id});
 }
 const id=z.string().uuid().parse(body.id),row=await database.prepare('SELECT p.* FROM together_plans p JOIN users u ON u.id=p.owner_id AND u.couple_id=p.couple_id WHERE p.id=? AND p.couple_id=?').bind(id,ctx.coupleId).first<any>();
 if(!row)throw new ApiError(404,'That plan is not in your current couple space.');
 const plan=JSON.parse(row.data_json) as WeeklyPlan;
 if(body.op==='task'){const index=z.number().int().min(0).max(2).parse(body.index);plan.tasks[index].done=z.boolean().parse(body.done);}
 else if(body.op==='complete')plan.completed=z.boolean().parse(body.done);
 else if(body.op==='calendar'){
  if(plan.calendarAdded)return response({added:true});
  if(row.owner_id!==ctx.userId)throw new ApiError(403,'The person who created this plan can add its shared event and reminders.');
  if(Date.parse(plan.dueAt)<=Date.now())throw new ApiError(400,'This date has passed. Your next weekly plan can be scheduled instead.');
  const eventId='together-'+id;
  const event=eventSchema.parse({id:eventId,title:plan.title,date:plan.dueAt,timezone:plan.timezone,type:'Date',annual:false,secret:false});
  const tasks=[{title:'Prepare: '+plan.title,type:'Date',days:1},{title:'A little gesture for us',type:'Wish',days:0},{title:plan.title,type:'Date',days:0}];
  const pins=tasks.map((t,i)=>pinSchema.parse({id:eventId+'-'+i,title:t.title,type:t.type,message:i===1?plan.gesture:plan.steps.join('\n'),dueAt:new Date(Math.max(Date.now()+60000,Date.parse(plan.dueAt)-t.days*86400000)).toISOString(),timezone:plan.timezone,reminderMinutes:0,repeat:'none',eventId,secret:false,done:false,createdAt:new Date().toISOString()}));
  plan.calendarAdded=true;
  try{await database.batch([insertRecord('events',event,ctx.userId,ctx.coupleId),...pins.map(p=>insertRecord('pins',p,ctx.userId,ctx.coupleId)),database.prepare("UPDATE together_plans SET data_json=json_set(data_json,'$.calendarAdded',json('true')) WHERE id=? AND couple_id=?").bind(id,ctx.coupleId)]);}catch{throw new ApiError(409,'The plan may have just changed. Refresh before trying again.');}
  return response({added:true});
 }else throw new ApiError(400,'Choose a valid Together action.');
 const changed=await database.prepare('UPDATE together_plans SET data_json=? WHERE id=? AND couple_id=? AND data_json=?').bind(JSON.stringify(plan),id,ctx.coupleId,row.data_json).run();
 if(!changed.meta.changes)throw new ApiError(409,'Your partner just updated this plan. Refresh and try again.');
 return response({saved:true});
 }catch(e){return failure(e);}}
