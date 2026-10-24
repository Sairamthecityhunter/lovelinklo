import type {ChatGPTIdentity} from './chatgpt-identity';
import {env} from './cf-env';
import type {Profile} from './love-types';
import {
 AuthError,
 SESSION_COOKIE,
 SESSION_DAYS,
 assertLoginAllowed,
 bytesToHex,
 clearLoginFailures,
 clearSessionCookieHeader,
 cookieValue,
 hashPassword,
 isValidEmail,
 isValidPassword,
 normalizeEmail,
 recordLoginFailure,
 sessionCookieHeader,
 signOutRedirect,
 verifyPassword,
} from './session-auth-core';

export {
 AuthError,
 REGISTER_PATH,
 SESSION_COOKIE,
 SIGN_IN_PATH,
 SIGN_OUT_ALIAS_PATH,
 SIGN_OUT_PATH,
 assertLoginAllowed,
 clearLoginFailures,
 clearSessionCookieHeader,
 cookieValue,
 emailSignInPath,
 emailSignOutPath,
 hashPassword,
 isAuthPrefetch,
 isValidEmail,
 isValidPassword,
 normalizeEmail,
 recordLoginFailure,
 safeAuthReturnPath,
 sessionCookieHeader,
 signOutRedirect,
 verifyPassword,
} from './session-auth-core';

function authDb(){if(!env.DB)throw new AuthError(503,'Your saved space is temporarily unavailable. Please try again.');return env.DB;}
function sessionSecret(){return process.env.AUTH_SECRET||process.env.SESSION_SECRET||'';}
async function sha256Hex(value:string){return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sessionSecret()+value))));}
function sessionExpiry(){return new Date(Date.now()+SESSION_DAYS*86400000).toISOString();}

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

async function nextRequestCookies(){
 const {cookies,headers}=await import('next/headers');
 try{
  const jar=await cookies();
  return jar.get(SESSION_COOKIE)?.value||null;
 }catch{
  return cookieValue((await headers()).get('cookie'),SESSION_COOKIE);
 }
}

export async function readSessionTokenFromRequest(request?:Request){
 if(request)return cookieValue(request.headers.get('cookie'),SESSION_COOKIE);
 try{
  return await nextRequestCookies();
 }catch{
  return null;
 }
}

export async function currentSessionUser(request?:Request){
 return userFromSessionToken(await readSessionTokenFromRequest(request));
}

export async function signOutResponse(request:Request,fallback='/login'){
 const redirect=signOutRedirect(request,fallback);
 if(redirect.status!==204){
  const token=await readSessionTokenFromRequest(request);
  try{await destroySession(token);}catch{/* still clear the cookie so the browser is signed out */}
 }
 return new Response(null,{status:redirect.status,headers:redirect.headers});
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
