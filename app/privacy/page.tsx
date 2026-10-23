import type {Metadata} from 'next';
import {LegalPage} from '../legal-page';

export const metadata: Metadata = {
  title: 'Privacy policy — LoveLink',
  description: 'How LoveLink stores, shares, and protects couple data.',
  robots: {index: true, follow: true},
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="23 October 2026">
      <p>LoveLink is a private space for two people. This policy describes the data this website actually stores and who can see it.</p>
      <h2>What we collect</h2>
      <p>When you create an account we store your name, email, password hash, timezone preferences, and the couple profile you enter. Content you add—pins, memories, letters, photos, notes, check-ins, and plans—is saved in our Postgres database. Session cookies keep you signed in.</p>
      <h2>Who can see your couple data</h2>
      <p>Only the two linked partners in a couple can read that couple’s shared records. Private pins, surprises, and unscheduled letters stay visible only to the person who created them. Daily check-in answers stay hidden from your partner until you have answered the same day’s question. A third LoveLink account cannot read another couple’s notes, media, or memories.</p>
      <h2>Photos and files</h2>
      <p>Uploads are stored as private bytes in Postgres (<code>media_blobs</code>), not on a public CDN. Access is checked on the server for couple membership and sharing rules before a file is returned.</p>
      <h2>Cookies and local copies</h2>
      <p>An HTTP-only session cookie identifies your signed-in browser. The app may also keep a copy of visible couple data in this device’s storage so the space still opens if the network drops. Sign out or clear site data to remove the local copy.</p>
      <h2>Optional services</h2>
      <p>Password-reset email is sent only if an email provider is configured. AI suggestions, payments, and closed-app reminders run only when those services are connected and you take an explicit action. We do not sell your personal information.</p>
      <h2>Retention and deletion</h2>
      <p>You can export visible JSON from Settings, clear your saved content, disconnect from a partner, or delete your account. Financial order records may be retained separately for payment reconciliation when shop features are enabled.</p>
      <h2>Contact</h2>
      <p>Questions about this policy can be sent to the site operator who hosts your LoveLink deployment.</p>
    </LegalPage>
  );
}
