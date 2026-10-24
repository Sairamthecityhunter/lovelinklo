'use client';
import Link from 'next/link';
import {BrandLogo} from './brand-logo';

export default function ErrorPage({reset}:{error:Error;reset:()=>void}) {
  return (
    <div className="legal-shell">
      <header className="legal-nav">
        <Link href="/" aria-label="LoveLink home"><BrandLogo variant="wordmark"/></Link>
      </header>
      <article className="legal-article error-article">
        <p className="eyebrow">SOMETHING WENT WRONG</p>
        <h1>We couldn’t open that just now.</h1>
        <p>Please try again. If it keeps happening, sign in from the home page.</p>
        <div className="button-row">
          <button className="primary-button" onClick={()=>reset()}>Try again</button>
          <Link className="outline-button" href="/">Go home</Link>
        </div>
      </article>
    </div>
  );
}
