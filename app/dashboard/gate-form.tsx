'use client';

import {useState} from 'react';
import {unlockDashboard} from './actions';

export function DashboardGateForm({
  message,
  secretConfigured,
  signedIn,
}:{
  message: string;
  secretConfigured: boolean;
  signedIn: boolean;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!secretConfigured) {
    return (
      <div className="ops-gate-card card">
        <p className="help-text">{message}</p>
        {!signedIn && <a className="primary-button" href="/login?next=/dashboard">Sign in</a>}
      </div>
    );
  }

  return (
    <form
      className="ops-gate-card card love-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        const form = new FormData(event.currentTarget);
        const result = await unlockDashboard(form);
        if (result?.error) setError(result.error);
        setBusy(false);
      }}
    >
      <p className="help-text">{message}</p>
      <label>
        Operations password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={8}
          maxLength={128}
          required
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="button-row">
        <button className="primary-button" disabled={busy}>{busy ? 'Checking…' : 'Unlock dashboard'}</button>
        {!signedIn && <a className="outline-button" href="/login?next=/dashboard">Sign in instead</a>}
      </div>
    </form>
  );
}
