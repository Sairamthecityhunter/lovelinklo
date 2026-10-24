import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="landing-footer">
      <span>LoveLink</span>
      <nav className="landing-footer-nav" aria-label="Legal">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/seller">Sellers</Link>
      </nav>
    </footer>
  );
}
