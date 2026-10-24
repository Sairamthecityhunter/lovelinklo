import {closenessToward,unlocksLoveNotePush} from '@/lib/closeness';
import {currentPartner} from '@/lib/partner-safety';
import {deliverPush} from '@/lib/web-push';

export async function notifyNoteRecipients(ctx: {userId: string; coupleId: string}, authorName: string) {
  const partner = await currentPartner(ctx);
  if (!partner) return;
  const level = await closenessToward(partner.userId, ctx.userId);
  if (!unlocksLoveNotePush(level)) return;
  await deliverPush(partner.userId, {
    kind: 'love-note',
    title: 'A new love note',
    body: `${authorName || 'Your partner'} left you a love note.`,
    url: '/us',
  });
}
