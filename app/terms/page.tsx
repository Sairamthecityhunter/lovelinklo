import type {Metadata} from 'next';
import {LegalPage} from '../legal-page';

export const metadata: Metadata = {
  title: 'Terms of use — LoveLink',
  description: 'The terms for using LoveLink as a private couple website.',
  robots: {index: true, follow: true},
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="23 October 2026">
      <p>By creating a LoveLink account you agree to use the site as a private space for you and, if you invite them, one partner.</p>
      <h2>The service</h2>
      <p>LoveLink lets you save wishes, memories, letters, plans, and a shared couple timeline. Some catalog, shop, marketplace, and AI features are demos or stay off until the operator connects a provider. Those extras are not a guarantee of payment, shipping, or third-party listings.</p>
      <h2>Your account</h2>
      <p>You must be old enough to use the internet in your country. Keep your password secret. You are responsible for content you upload. Do not use LoveLink to harass anyone, share others’ private media without permission, or break the law.</p>
      <h2>Couples</h2>
      <p>A couple space holds at most two linked accounts. Invitations expire after seven days and can be cancelled. Either partner may disconnect or block the other. Blocking unlinks immediately and stops those two accounts from pairing again until the blocker unblocks. After disconnect or block, content you created moves with you; your former partner keeps theirs.</p>
      <h2>Availability</h2>
      <p>We aim to keep the site available, but hosting, database, and email outages can happen. LoveLink is provided as-is. Background reminders need a configured notification gateway.</p>
      <h2>Changes</h2>
      <p>The operator may update these terms. Continued use after an update means you accept the new terms. If you do not agree, delete your account.</p>
    </LegalPage>
  );
}
