import {cookies} from 'next/headers';
import {ApiError} from '@/lib/server';
import {DASHBOARD_COOKIE, dashboardSecretConfigured, siteHomeHref} from '@/lib/ops-dashboard';
import {dashboardEnvFromProcess, resolveDashboardAccess} from '@/lib/ops-dashboard-access';
import {loadOpsSnapshot} from '@/lib/ops-dashboard-data';
import {DashboardGateForm} from './gate-form';
import {DashboardLocked, DashboardView} from './dashboard-view';
import './ops-dashboard.css';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Operations dashboard',
  robots: {index: false, follow: false},
};

export default async function DashboardPage() {
  const homeHref = siteHomeHref();
  const jar = await cookies();
  const access = await resolveDashboardAccess({presentedSecret: jar.get(DASHBOARD_COOKIE)?.value || ''});
  if (!access.ok) {
    return (
      <DashboardLocked homeHref={homeHref}>
        <DashboardGateForm
          message={access.message}
          secretConfigured={dashboardSecretConfigured(dashboardEnvFromProcess().secret || '')}
          signedIn={!!access.actor}
        />
      </DashboardLocked>
    );
  }

  try {
    const snapshot = await loadOpsSnapshot();
    return <DashboardView snapshot={snapshot} via={access.via || 'unknown'} homeHref={homeHref}/>;
  } catch (error) {
    const message = error instanceof ApiError
      ? error.message
      : 'The database is unavailable. Set DATABASE_URL locally and run pnpm db:migrate.';
    return (
      <DashboardLocked homeHref={homeHref}>
        <div className="ops-gate-card card">
          <p className="form-error" role="alert">{message}</p>
          <a className="outline-button" href={homeHref}>Back to LoveLink</a>
        </div>
      </DashboardLocked>
    );
  }
}
