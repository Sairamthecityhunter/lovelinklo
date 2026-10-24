import {deleteLoveLinkAccount} from '@/lib/account-actions';
import {DELETE_CONFIRMATION, isValidDeleteConfirmation} from '@/lib/account-lifecycle';
import {assertRateLimit} from '@/lib/rate-limit';
import {ApiError, ensureUser, failure, guard, jsonBody} from '@/lib/server';
import {destroySession, readSessionTokenFromRequest, withClearedSessionCookie} from '@/lib/session-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    guard(request);
    const ctx = await ensureUser(request);
    await assertRateLimit('account:delete:' + ctx.userId, 5, 60 * 60 * 1000);
    const body = await jsonBody(request, 2000);
    if (!isValidDeleteConfirmation(body.confirm)) {
      throw new ApiError(400, `Type ${DELETE_CONFIRMATION} to permanently delete your account.`);
    }
    await deleteLoveLinkAccount(ctx);
    await destroySession(await readSessionTokenFromRequest(request));
    return withClearedSessionCookie({deleted: true}, request);
  } catch (e) {
    return failure(e);
  }
}
