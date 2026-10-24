import {publicAppUrl} from '@/lib/app-url';

export async function sendPasswordResetEmail(to: string, token: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  const url = `${publicAppUrl()}/reset?token=${encodeURIComponent(token)}`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      from,
      to,
      subject: 'Reset your LoveLink password',
      text: `Reset your LoveLink password with this link (expires in 1 hour):\n\n${url}\n\nIf you did not ask for this, you can ignore this email.`,
    }),
  });
  if (!response.ok) {
    console.error('Password reset email failed', response.status);
    return false;
  }
  return true;
}
