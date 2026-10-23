import type {ReactNode} from 'react';
import Link from 'next/link';
import {BrandLogo} from './brand-logo';
import {SiteFooter} from './site-footer';

export function LegalPage({title, updated, children}:{title:string;updated:string;children:ReactNode}) {
  return (
    <div className="legal-shell">
      <header className="legal-nav">
        <Link href="/" aria-label="LoveLink home"><BrandLogo variant="wordmark"/></Link>
        <Link className="landing-nav-link legal-nav-signin" href="/login">Sign in</Link>
      </header>
      <article className="legal-article">
        <p className="eyebrow">LOVELINK</p>
        <h1>{title}</h1>
        <p className="legal-updated">Last updated {updated}</p>
        {children}
      </article>
      <SiteFooter/>
    </div>
  );
}
