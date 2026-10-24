import {z} from 'zod';
import {ensureUser,readState,guard,jsonBody,failure,ApiError} from '@/lib/server';
import {entitlements} from '@/lib/shop-server';
import {localInput} from '@/lib/love-time';
export const dynamic='force-dynamic';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function POST(request:Request){try{
 guard(request);const ctx=await ensureUser(request);
 if(!(await entitlements(ctx.coupleId)).premium)throw new ApiError(403,'Monthly memory-book downloads are included with Together membership. Your original memories stay free.');
 const input=z.object({month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),ids:z.array(z.string().min(1).max(200)).min(1).max(20)}).strict().parse(await jsonBody(request,6000));
 const state=await readState(ctx);const memories=[...new Set(input.ids)].map(id=>state.memories.find(m=>m.id===id));
 if(memories.some(m=>!m||m.date.slice(0,7)!==input.month))throw new ApiError(404,'A selected memory is unavailable or belongs to another month.');
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Our month together</title><style>body{margin:0;background:#f5f5f7;color:#1d1d1f;font:18px/1.7 system-ui,sans-serif}.page{box-sizing:border-box;max-width:800px;min-height:850px;padding:70px;margin:30px auto;background:white;border-radius:20px;break-after:page}h1{font-size:52px;line-height:1.1;letter-spacing:-2px}h2{font-size:36px;line-height:1.2}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#65656a}.note{text-align:center;padding:18px}@media print{body{background:white}.page{margin:0;min-height:95vh;border-radius:0;max-width:none}.note{display:none}}@media(max-width:600px){.page{padding:30px;min-height:600px}h1{font-size:38px}}</style></head><body><p class="note">Digital keepsake · Use your browser’s Print → Save as PDF. Nothing is shipped.</p><section class="page"><small>LOVELINK TOGETHER · ${escape(input.month)}</small><h1>Our month,<br>remembered.</h1><p>${escape(ctx.profile.myName)} &amp; ${escape(ctx.profile.partnerName)}</p><p>${memories.length} moments, chosen by you.</p></section>${memories.map(m=>`<section class="page"><small>${escape(m!.date.slice(0,10))} · ${escape(m!.place)}</small><h2>${escape(m!.title)}</h2><p>${escape(m!.note||'A moment worth keeping.')}</p></section>`).join('')}</body></html>`;
 return new Response(html,{headers:{'Content-Type':'text/html;charset=utf-8','Content-Disposition':`attachment; filename="our-month-${input.month}.html"`,'Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"}});
 }catch(e){return failure(e);}}
