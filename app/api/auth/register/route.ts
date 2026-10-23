import {z} from 'zod';
import {seedState} from '@/lib/love-data';
import type {Collection,Pin,Profile} from '@/lib/love-types';
import {ensureAuthTables} from '@/lib/migrate-local';
import {ApiError,db,failure,guard,insertRecord,jsonBody,tables} from '@/lib/server';
import {createSession,hashPassword,isValidEmail,isValidPassword,normalizeEmail,withSessionCookie} from '@/lib/session-auth';

export const dynamic='force-dynamic';

const bodySchema=z.object({
 name:z.string().trim().min(1).max(60),
 email:z.string().trim().min(3).max(254),
 password:z.string().min(8).max(128),
}).strict();

export async function POST(request:Request){
 try{
  guard(request);
  await ensureAuthTables();
  const body=bodySchema.parse(await jsonBody(request,4000));
  const email=normalizeEmail(body.email);
  if(!isValidEmail(email))throw new ApiError(400,'Please enter a valid email address.');
  if(!isValidPassword(body.password))throw new ApiError(400,'Password must be at least 8 characters.');
  const database=db();
  const existing=await database.prepare('SELECT user_id FROM auth_accounts WHERE email = ?').bind(email).first();
  if(existing)throw new ApiError(409,'An account with this email already exists. Please sign in.');
  const passwordHash=await hashPassword(body.password);
  const userId=crypto.randomUUID();
  const coupleId=crypto.randomUUID();
  const now=new Date().toISOString();
  const seed=seedState();
  const profile:Profile={...seed.profile,myName:body.name.trim(),partnerName:'Your partner',sample:true};
  const statements=[
   database.prepare('INSERT INTO couples (id, owner_id, created_at) VALUES (?, ?, ?)').bind(coupleId,userId,now),
   database.prepare('INSERT INTO users (id, couple_id, profile_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(userId,coupleId,JSON.stringify(profile),now,now),
   database.prepare('INSERT INTO auth_accounts (user_id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').bind(userId,email,passwordHash,now),
  ];
  for(const c of Object.keys(tables) as Collection[]){
   for(const v of seed[c]){
    const value={...v,id:coupleId+'--'+v.id,...(c==='pins'?{eventId:(v as Pin).eventId?coupleId+'--'+(v as Pin).eventId:''}:{})};
    statements.push(insertRecord(c,value,userId,coupleId));
   }
  }
  try{await database.batch(statements);}
  catch(e){
   const again=await database.prepare('SELECT user_id FROM auth_accounts WHERE email = ?').bind(email).first();
   if(again)throw new ApiError(409,'An account with this email already exists. Please sign in.');
   throw e;
  }
  const token=await createSession(userId);
  return withSessionCookie({ok:true},token,request);
 }catch(e){return failure(e);}
}
