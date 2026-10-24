'use server';

import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {DASHBOARD_COOKIE, dashboardSecretConfigured, timingSafeEqual} from '@/lib/ops-dashboard';
import {dashboardEnvFromProcess} from '@/lib/ops-dashboard-access';

export async function unlockDashboard(formData: FormData) {
  const env = dashboardEnvFromProcess();
  const password = String(formData.get('password') || '');
  if (!dashboardSecretConfigured(env.secret || '')) {
    return {error: 'DASHBOARD_SECRET is not configured.'};
  }
  if (!timingSafeEqual(password, env.secret || '')) {
    return {error: 'That operations password is incorrect.'};
  }
  const jar = await cookies();
  jar.set(DASHBOARD_COOKIE, password, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 14 * 86400,
    secure: process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview',
  });
  redirect('/dashboard');
}
