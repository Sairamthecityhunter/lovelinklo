import {ApiError, failure, response} from '@/lib/server';
import {resolveDashboardAccess} from '@/lib/ops-dashboard-access';
import {loadOpsSnapshot} from '@/lib/ops-dashboard-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const access = await resolveDashboardAccess({request});
    if (!access.ok) throw new ApiError(401, access.message);
    const snapshot = await loadOpsSnapshot();
    return response({...snapshot, via: access.via});
  } catch (error) {
    return failure(error);
  }
}
