import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {currentUser} from '@/lib/server';
import {ResetForm} from '../auth-reset-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Choose a new password — LoveLink',
  robots: {index: false, follow: false},
};

export default async function ResetPage({searchParams}:{searchParams:Promise<{token?:string}>}) {
  const user = await currentUser();
  if (user) redirect('/');
  const {token} = await searchParams;
  return <ResetForm token={token || ''}/>;
}
