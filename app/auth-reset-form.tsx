'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState,type FormEvent} from 'react';
import {BrandLogo} from './brand-logo';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      });
      const data: {error?: string; resetUrl?: string} = await r.json();
      if (!r.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      setResetUrl(data.resetUrl || '');
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-split">
      <aside className="auth-visual" aria-hidden="true">
        <img src="/images/couple-sunset.jpg" alt=""/>
        <div className="auth-visual-shade"/>
        <div className="auth-visual-copy">
          <BrandLogo variant="wordmark" className="auth-visual-logo"/>
          <p>We’ll help you back into your private couple space.</p>
        </div>
      </aside>
      <main className="auth-panel">
        <form className="auth-card" onSubmit={onSubmit}>
          <Link href="/" className="auth-brand" aria-label="LoveLink home">
            <BrandLogo variant="wordmark"/>
          </Link>
          <p className="eyebrow">Password help</p>
          <h1>Forgot your password?</h1>
          {done ? (
            <>
              <p className="auth-lead">If that email has a LoveLink account, we sent a reset link. It expires in one hour. Check spam if you don’t see it—password email needs the site’s email provider to be connected.</p>
              {resetUrl && (
                <p className="auth-lead">Email isn’t connected on this local site, so you can open this one-hour link now: <a href={resetUrl}>Reset your password</a></p>
              )}
            </>
          ) : (
            <>
              <p className="auth-lead">Enter the email you used to register. We’ll send a reset link if an account exists.</p>
              <label>Email<input required type="email" maxLength={254} value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email"/></label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="primary-button" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
            </>
          )}
          <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
        </form>
      </main>
    </div>
  );
}

export function ResetForm({token}:{token:string}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token, password}),
      });
      const data: {error?: string} = await r.json();
      if (!r.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-split">
      <aside className="auth-visual" aria-hidden="true">
        <img src="/images/couple-sunset.jpg" alt=""/>
        <div className="auth-visual-shade"/>
        <div className="auth-visual-copy">
          <BrandLogo variant="wordmark" className="auth-visual-logo"/>
          <p>Choose a new password for your shared space.</p>
        </div>
      </aside>
      <main className="auth-panel">
        <form className="auth-card" onSubmit={onSubmit}>
          <Link href="/" className="auth-brand" aria-label="LoveLink home">
            <BrandLogo variant="wordmark"/>
          </Link>
          <p className="eyebrow">Password help</p>
          <h1>Choose a new password</h1>
          {!token ? (
            <p className="auth-lead">This reset link is missing. Request a new one from the sign-in page.</p>
          ) : (
            <>
              <p className="auth-lead">Use at least 8 characters. You’ll be signed in after saving.</p>
              <label>New password<input required type="password" minLength={8} maxLength={128} value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete="new-password"/></label>
              <label>Confirm password<input required type="password" minLength={8} maxLength={128} value={confirm} onChange={(e)=>setConfirm(e.target.value)} autoComplete="new-password"/></label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
            </>
          )}
          <p className="auth-switch"><Link href="/forgot">Request a new link</Link></p>
        </form>
      </main>
    </div>
  );
}
