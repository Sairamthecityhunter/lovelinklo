import Link from 'next/link';
import {BrandLogo} from './brand-logo';
import {SiteFooter} from './site-footer';

export default function NotFound() {
  return (
    <div className="legal-shell">
      <header className="legal-nav">
        <Link href="/" aria-label="LoveLink home"><BrandLogo variant="wordmark"/></Link>
        <Link className="landing-nav-link legal-nav-signin" href="/login">Sign in</Link>
      </header>
      <article className="legal-article error-article">
        <p className="eyebrow">404</p>
        <h1>That page isn’t here.</h1>
        <p>The link may be mistyped, or the moment has moved. Your couple space is still just a sign-in away.</p>
        <div className="button-row">
          <Link className="primary-button" href="/">Go home</Link>
          <Link className="outline-button" href="/login">Sign in</Link>
        </div>
      </article>
      <SiteFooter/>
    </div>
  );
}
