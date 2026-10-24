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
export const SESSION_DAYS=30;
export const PBKDF2_ITERATIONS=210000;

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

export function bytesToHex(bytes:Uint8Array){return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');}
export function hexToBytes(hex:string){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out;}
export function timingSafeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}

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

export function sessionCookieHeader(token:string,secure:boolean){
 return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS*86400}${secure?'; Secure':''}`;
}

export function clearSessionCookieHeader(secure:boolean){
 return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`;
}

export function cookieValue(header:string|null,name:string){
 if(!header)return null;
 for(const part of header.split(';')){
  const trimmed=part.trim();
  if(trimmed.startsWith(name+'='))return decodeURIComponent(trimmed.slice(name.length+1));
 }
 return null;
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

export function signOutRedirect(request:Request,fallback='/login'){
 if(isAuthPrefetch(request)){
  return {status:204,headers:{'Cache-Control':'private, no-store'} as Record<string,string>};
 }
 const url=new URL(request.url);
 const next=safeAuthReturnPath(url.searchParams.get('next')||url.searchParams.get('return_to'),fallback);
 const secure=url.protocol==='https:';
 return {
  status:request.method==='POST'?303:302,
  headers:{
   Location:next,
   'Cache-Control':'private, no-store',
   'Set-Cookie':clearSessionCookieHeader(secure),
  },
 };
}
