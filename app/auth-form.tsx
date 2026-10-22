'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState,type FormEvent} from 'react';
import {BrandLogo} from './brand-logo';

export function AuthForm({mode,nextPath='/'}:{mode:'login'|'register';nextPath?:string}){
 const router=useRouter();
 const [name,setName]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const title=mode==='login'?'Welcome back':'Create your LoveLink';
 const subtitle=mode==='login'?'Sign in to open your private couple space.':'Save wishes, memories, and plans behind your own email and password.';

 async function onSubmit(e:FormEvent){
  e.preventDefault();
  setError('');
  setBusy(true);
  try{
   const body=mode==='register'?{name,email,password}:{email,password};
   const r=await fetch(mode==='register'?'/api/auth/register':'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const data:any=await r.json();
   if(!r.ok)throw new Error(data.error||'Something went wrong. Please try again.');
   router.replace(nextPath.startsWith('/')&&!nextPath.startsWith('//')?nextPath:'/');
   router.refresh();
  }catch(err){setError((err as Error).message);}
  finally{setBusy(false);}
 }

 return (
  <div className="auth-split">
   <aside className="auth-visual" aria-hidden="true">
    <img src="/images/couple-sunset.jpg" alt=""/>
    <div className="auth-visual-shade"/>
    <div className="auth-visual-copy">
     <BrandLogo variant="wordmark" className="auth-visual-logo"/>
     <p>Your private couple space—pins, letters, memories, and plans.</p>
    </div>
   </aside>
   <main className="auth-panel">
    <form className="auth-card" onSubmit={onSubmit}>
     <Link href="/" className="auth-brand" aria-label="LoveLink home">
      <BrandLogo variant="wordmark"/>
     </Link>
     <p className="eyebrow">{mode==='login'?'Sign in':'Create account'}</p>
     <h1>{title}</h1>
     <p className="auth-lead">{subtitle}</p>
     {mode==='register'&&<label>Your name<input required maxLength={60} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Alex"/></label>}
     <label>Email<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com"/></label>
     <label>Password<input required type="password" minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'} placeholder="At least 8 characters"/></label>
     {error&&<p className="auth-error" role="alert">{error}</p>}
     <button className="primary-button" disabled={busy}>{busy?(mode==='login'?'Signing in…':'Creating account…'):(mode==='login'?'Sign in':'Create account')}</button>
     <p className="auth-switch">{mode==='login'?<>New here? <Link href="/register">Create an account</Link></>:<>Already have an account? <Link href="/login">Sign in</Link></>}</p>
    </form>
   </main>
  </div>
 );
}
