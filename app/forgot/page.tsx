import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {currentSessionUser} from '@/lib/session-auth';
import {ForgotForm} from '../auth-reset-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Reset your password — LoveLink',
  robots: {index: false, follow: false},
};

export default async function ForgotPage() {
  const user = await currentSessionUser();
  if (user) redirect('/');
  return <ForgotForm/>;
}
