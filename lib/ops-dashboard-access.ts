import {CONCIERGE_OWNER} from '@/lib/concierge-operator';
import {
  DASHBOARD_COOKIE,
  dashboardSecretConfigured,
  evaluateDashboardAccess,
  timingSafeEqual,
  type DashboardActor,
  type DashboardEnv,
  type DashboardVia,
} from '@/lib/ops-dashboard';
import {currentUser} from '@/lib/server';

export function dashboardEnvFromProcess(): DashboardEnv {
  return {
    secret: process.env.DASHBOARD_SECRET || '',
    adminEmails: process.env.DASHBOARD_ADMIN_EMAILS || '',
    ownerId: process.env.DASHBOARD_OWNER_ID || CONCIERGE_OWNER,
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
  };
}

export function secretFromRequest(request?: Request, cookieHeader?: string | null) {
  if (request) {
    const auth = request.headers.get('authorization') || '';
    if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
    const headerSecret = request.headers.get('x-dashboard-secret');
    if (headerSecret) return headerSecret.trim();
    return cookieSecret(request.headers.get('cookie'));
  }
  return cookieSecret(cookieHeader || null);
}

function cookieSecret(header: string | null) {
  if (!header) return '';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(DASHBOARD_COOKIE + '=')) {
      try {
        return decodeURIComponent(trimmed.slice(DASHBOARD_COOKIE.length + 1));
      } catch {
        return trimmed.slice(DASHBOARD_COOKIE.length + 1);
      }
    }
  }
  return '';
}

export function dashboardCookieHeader(secret: string, secure: boolean) {
  return `${DASHBOARD_COOKIE}=${encodeURIComponent(secret)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${14 * 86400}${secure ? '; Secure' : ''}`;
}

export function clearDashboardCookieHeader(secure: boolean) {
  return `${DASHBOARD_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

export async function resolveDashboardAccess(input: {
  request?: Request;
  cookieHeader?: string | null;
  presentedSecret?: string | null;
  actor?: DashboardActor;
} = {}): Promise<{ok: boolean; via: DashboardVia | null; message: string; actor: DashboardActor}> {
  const env = dashboardEnvFromProcess();
  const actor = input.actor === undefined ? await currentUser(input.request) : input.actor;
  const presented = input.presentedSecret
    ?? secretFromRequest(input.request, input.cookieHeader)
    ?? '';
  const result = evaluateDashboardAccess({actor, presentedSecret: presented, env});
  if (result.ok) return {...result, actor};
  if (dashboardSecretConfigured(env.secret || '') && presented && !timingSafeEqual(presented, env.secret || '')) {
    return {ok: false, via: null, message: 'That operations password is incorrect.', actor};
  }
  return {...result, actor};
}
