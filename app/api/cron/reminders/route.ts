import {runSpecialReminders} from '@/lib/special-reminders';
import {failure,response} from '@/lib/server';

export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = (process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const alt = request.headers.get('x-cron-secret') || '';
  return bearer === secret || alt === secret;
}

export async function GET(request: Request) {
  if (!authorized(request)) return response({error: 'Unauthorized'}, 401);
  try {
    const sent = await runSpecialReminders();
    return response({ok: true, sent});
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return response({error: 'Unauthorized'}, 401);
  try {
    let at: Date | undefined;
    try {
      const body = await request.json() as {at?: string};
      if (body?.at) {
        const parsed = new Date(body.at);
        if (!Number.isNaN(parsed.getTime())) at = parsed;
      }
    } catch { /* use now */ }
    const sent = await runSpecialReminders(at || new Date());
    return response({ok: true, sent});
  } catch (e) {
    return failure(e);
  }
}
