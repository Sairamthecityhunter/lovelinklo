import {accountExportResponse, exportAccountData} from '@/lib/account-actions';
import {ensureUser, failure} from '@/lib/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const ctx = await ensureUser(request);
    return accountExportResponse(await exportAccountData(ctx));
  } catch (e) {
    return failure(e);
  }
}
