import {env} from 'cloudflare:workers';
import {cookies,headers} from 'next/headers';
import type {ChatGPTUser} from '@/app/chatgpt-auth';
import type {Profile} from './love-types';

export class AuthError extends Error{constructor(public status:number,message:string){super(message);}}
export const SESSION_COOKIE='__lovelink_session';
const SESSION_DAYS=30;
const PBKDF2_ITERATIONS=210000;
const loginAttempts=new Map<string,{count:number;lockedUntil:number}>();

function authDb(){if(!env.DB)throw new AuthError(503,'Your saved space is temporarily unavailable. Please try again.');return env.DB;}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');}
function hexToBytes(hex:string){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out;}
async function sha256Hex(value:string){return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));}
function timingSafeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}

export function normalizeEmail(email:string){return email.trim().toLowerCase();}
export function isValidEmail(email:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&email.length<=254;}
export function isValidPassword(password:string){return typeof password==='string'&&password.length>=8&&password.length<=128;}

export async function hashPassword(password:string){
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:PBKDF2_ITERATIONS},key,256);
 return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password:string,stored:string){
 const [algo,iterText,saltHex,hashHex]=stored.split('$');
 if(algo!=='pbkdf2'||!iterText||!saltHex||!hashHex)return false;
 const iterations=Number(iterText);if(!Number.isInteger(iterations)||iterations<100000)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:hexToBytes(saltHex),iterations},key,256);
 return timingSafeEqual(bytesToHex(new Uint8Array(bits)),hashHex);
}

export function assertLoginAllowed(email:string){
 const row=loginAttempts.get(email);if(!row)return;
 if(row.lockedUntil>Date.now())throw new AuthError(429,'Too many sign-in attempts. Please wait a few minutes and try again.');
 if(row.lockedUntil&&row.lockedUntil<=Date.now())loginAttempts.delete(email);
}

export function recordLoginFailure(email:string){
 const row=loginAttempts.get(email)||{count:0,lockedUntil:0};
 row.count+=1;
 if(row.count>=8){row.lockedUntil=Date.now()+15*60*1000;row.count=0;}
 loginAttempts.set(email,row);
}

export function clearLoginFailures(email:string){loginAttempts.delete(email);}

function sessionExpiry(){return new Date(Date.now()+SESSION_DAYS*86400000).toISOString();}

export function sessionCookieHeader(token:string,secure:boolean){
 return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS*86400}${secure?'; Secure':''}`;
}

export function clearSessionCookieHeader(secure:boolean){
 return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`;
}

export async function createSession(userId:string){
 const token=bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
 const tokenHash=await sha256Hex(token);
 await authDb().prepare('INSERT INTO auth_sessions (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),userId,tokenHash,sessionExpiry(),new Date().toISOString()).run();
 return token;
}

export async function destroySession(token:string|undefined|null){
 if(!token)return;
 await authDb().prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
}

function cookieValue(header:string|null,name:string){
 if(!header)return null;
 for(const part of header.split(';')){
  const trimmed=part.trim();
  if(trimmed.startsWith(name+'='))return decodeURIComponent(trimmed.slice(name.length+1));
 }
 return null;
}

export async function readSessionTokenFromRequest(request?:Request){
 if(request)return cookieValue(request.headers.get('cookie'),SESSION_COOKIE);
 try{
  const jar=await cookies();
  return jar.get(SESSION_COOKIE)?.value||null;
 }catch{
  const requestHeaders=await headers();
  return cookieValue(requestHeaders.get('cookie'),SESSION_COOKIE);
 }
}

export async function userFromSessionToken(token:string|null|undefined):Promise<ChatGPTUser|null>{
 if(!token||token.length<32||token.length>128||!env.DB)return null;
 const tokenHash=await sha256Hex(token);
 const row=await env.DB.prepare(`SELECT s.user_id AS userId, a.email AS email, u.profile_json AS profile
  FROM auth_sessions s
  JOIN auth_accounts a ON a.user_id = s.user_id
  JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = ? AND s.expires_at > ?`).bind(tokenHash,new Date().toISOString()).first<{userId:string;email:string;profile:string}>();
 if(!row)return null;
 let name=row.email;
 try{const profile=JSON.parse(row.profile) as Profile;if(profile.myName?.trim())name=profile.myName.trim();}catch{/* keep email */}
 return {userId:row.userId,email:row.email,displayName:name,fullName:name};
}

export async function loginAccount(input:{email:string;password:string}){
 const email=normalizeEmail(input.email);
 if(!isValidEmail(email)||!isValidPassword(input.password))throw new AuthError(400,'Email or password is incorrect.');
 assertLoginAllowed(email);
 const row=await authDb().prepare('SELECT user_id, password_hash FROM auth_accounts WHERE email = ?').bind(email).first<{user_id:string;password_hash:string}>();
 if(!row||!(await verifyPassword(input.password,row.password_hash))){
  recordLoginFailure(email);
  throw new AuthError(401,'Email or password is incorrect.');
 }
 clearLoginFailures(email);
 const token=await createSession(row.user_id);
 return {userId:row.user_id,email,token};
}

export async function changePassword(userId:string,currentPassword:string,nextPassword:string){
 if(!isValidPassword(nextPassword))throw new AuthError(400,'New password must be at least 8 characters.');
 const database=authDb();
 const row=await database.prepare('SELECT password_hash FROM auth_accounts WHERE user_id = ?').bind(userId).first<{password_hash:string}>();
 if(!row)throw new AuthError(404,'Password sign-in is not set up for this account.');
 if(!(await verifyPassword(currentPassword,row.password_hash)))throw new AuthError(401,'Current password is incorrect.');
 const passwordHash=await hashPassword(nextPassword);
 await database.batch([
  database.prepare('UPDATE auth_accounts SET password_hash = ? WHERE user_id = ?').bind(passwordHash,userId),
  database.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(userId),
 ]);
 return createSession(userId);
}

export function withSessionCookie(data:unknown,token:string,request:Request,status=200){
 const secure=new URL(request.url).protocol==='https:';
 return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Set-Cookie':sessionCookieHeader(token,secure)}});
}

export function withClearedSessionCookie(data:unknown,request:Request,status=200){
 const secure=new URL(request.url).protocol==='https:';
 return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Set-Cookie':clearSessionCookieHeader(secure)}});
}
