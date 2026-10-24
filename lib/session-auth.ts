import {cookies,headers} from 'next/headers';
import type {ChatGPTIdentity} from './chatgpt-identity';
import {env} from './cf-env';
import type {Profile} from './love-types';

export class AuthError extends Error{
 status:number;
 constructor(status:number,message:string){
  super(message);
  this.name='AuthError';
  this.status=status;
 }
}
export const SESSION_COOKIE='__lovelink_session';
export const SIGN_IN_PATH='/login';
export const SIGN_OUT_PATH='/signout';
export const SIGN_OUT_ALIAS_PATH='/signout-with-chatgpt';
export const REGISTER_PATH='/register';
const SESSION_DAYS=30;
const PBKDF2_ITERATIONS=210000;
const loginAttempts=new Map<string,{count:number;lockedUntil:number}>();
const RESERVED_AUTH_PATHS=new Set([
 SIGN_IN_PATH,
 REGISTER_PATH,
 '/forgot',
 '/reset',
 '/signin-with-chatgpt',
 SIGN_OUT_PATH,
 SIGN_OUT_ALIAS_PATH,
 '/callback',
]);

function authDb(){if(!env.DB)throw new AuthError(503,'Your saved space is temporarily unavailable. Please try again.');return env.DB;}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');}
function hexToBytes(hex:string){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out;}
function sessionSecret(){return process.env.AUTH_SECRET||process.env.SESSION_SECRET||'';}
async function sha256Hex(value:string){return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sessionSecret()+value))));}
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
 if((process.env.VERCEL || process.env.NODE_ENV==='production') && !sessionSecret()){
  throw new AuthError(503,'AUTH_SECRET is not configured.');
 }
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

export async function currentSessionUser(request?:Request){
 return userFromSessionToken(await readSessionTokenFromRequest(request));
}

export function safeAuthReturnPath(value:string|null|undefined,fallback='/login'){
 if(!value||!value.startsWith('/')||value.startsWith('//'))return fallback;
 let url:URL;
 try{url=new URL(value,'https://app.local');}catch{return fallback;}
 if(url.origin!=='https://app.local')return fallback;
 if(RESERVED_AUTH_PATHS.has(url.pathname))return fallback;
 return `${url.pathname}${url.search}${url.hash}`;
}

export function emailSignInPath(returnTo='/'){
 const next=safeAuthReturnPath(returnTo,'/');
 return next==='/'?SIGN_IN_PATH:`${SIGN_IN_PATH}?next=${encodeURIComponent(next)}`;
}

export function emailSignOutPath(returnTo='/login'){
 return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeAuthReturnPath(returnTo,'/login'))}`;
}

export function isAuthPrefetch(request:Request){
 if(request.headers.get('next-router-prefetch')!=null)return true;
 if(request.headers.get('x-middleware-prefetch')==='1')return true;
 return [request.headers.get('purpose'),request.headers.get('sec-purpose')].some((value)=>typeof value==='string'&&value.split(/[;,]/).some((part)=>part.trim().toLowerCase()==='prefetch'));
}

export async function signOutResponse(request:Request,fallback='/login'){
 if(isAuthPrefetch(request)){
  return new Response(null,{status:204,headers:{'Cache-Control':'private, no-store'}});
 }
 const token=await readSessionTokenFromRequest(request);
 try{await destroySession(token);}catch{/* still clear the cookie so the browser is signed out */}
 const url=new URL(request.url);
 const next=safeAuthReturnPath(url.searchParams.get('next')||url.searchParams.get('return_to'),fallback);
 const secure=url.protocol==='https:';
 return new Response(null,{
  status:request.method==='POST'?303:302,
  headers:{
   Location:next,
   'Cache-Control':'private, no-store',
   'Set-Cookie':clearSessionCookieHeader(secure),
  },
 });
}

export async function userFromSessionToken(token:string|null|undefined):Promise<ChatGPTIdentity|null>{
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

export async function requestPasswordReset(email:string){
 const normalized=normalizeEmail(email);
 if(!isValidEmail(normalized))return null;
 const database=authDb();
 const row=await database.prepare('SELECT user_id FROM auth_accounts WHERE email = ?').bind(normalized).first<{user_id:string}>();
 if(!row)return null;
 const token=bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
 const now=new Date().toISOString();
 await database.batch([
  database.prepare('DELETE FROM auth_password_resets WHERE user_id = ? AND used_at IS NULL').bind(row.user_id),
  database.prepare('INSERT INTO auth_password_resets (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),row.user_id,await sha256Hex(token),new Date(Date.now()+60*60*1000).toISOString(),now),
 ]);
 return {token,userId:row.user_id,email:normalized};
}

export async function completePasswordReset(token:string,nextPassword:string){
 if(!token||token.length<32||token.length>128)throw new AuthError(400,'This reset link is invalid.');
 if(!isValidPassword(nextPassword))throw new AuthError(400,'Password must be at least 8 characters.');
 const database=authDb();
 const tokenHash=await sha256Hex(token);
 const row=await database.prepare('SELECT id, user_id FROM auth_password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?').bind(tokenHash,new Date().toISOString()).first<{id:string;user_id:string}>();
 if(!row)throw new AuthError(400,'This reset link has expired or was already used. Request a new one.');
 const passwordHash=await hashPassword(nextPassword);
 const usedAt=new Date().toISOString();
 const claimed=await database.prepare('UPDATE auth_password_resets SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ?').bind(usedAt,row.id,usedAt).run();
 if(!claimed.meta.changes)throw new AuthError(400,'This reset link has expired or was already used. Request a new one.');
 await database.batch([
  database.prepare('UPDATE auth_accounts SET password_hash = ? WHERE user_id = ?').bind(passwordHash,row.user_id),
  database.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(row.user_id),
  database.prepare('DELETE FROM auth_password_resets WHERE user_id = ? AND id != ?').bind(row.user_id,row.id),
 ]);
 const session=await createSession(row.user_id);
 return {userId:row.user_id,token:session};
}

export function withSessionCookie(data:unknown,token:string,request:Request,status=200){
 const secure=new URL(request.url).protocol==='https:';
 return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Set-Cookie':sessionCookieHeader(token,secure)}});
}

export function withClearedSessionCookie(data:unknown,request:Request,status=200){
 const secure=new URL(request.url).protocol==='https:';
 return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Set-Cookie':clearSessionCookieHeader(secure)}});
}
