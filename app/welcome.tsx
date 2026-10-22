import Link from 'next/link';
import {BrandLogo} from './brand-logo';

export function WelcomePage(){
 return (
  <div className="site-landing">
   <section className="landing-hero" aria-label="LoveLink">
    <img className="landing-hero-media" src="/images/couple-sunset.jpg" alt="A couple together by the sea at sunset"/>
    <div className="landing-hero-shade"/>
    <header className="landing-nav">
     <BrandLogo variant="wordmark" className="landing-logo"/>
     <Link className="landing-nav-link" href="/login">Sign in</Link>
    </header>
    <div className="landing-hero-copy">
     <p className="landing-brand-line">lovelink.io</p>
     <h1 className="landing-title">Stay close, wherever you are.</h1>
     <p className="landing-lead">A private space for your wishes, memories, and the little things that keep you two connected.</p>
     <div className="landing-cta">
      <Link className="primary-button landing-primary" href="/register">Create your space</Link>
      <Link className="landing-secondary" href="/login">I already have an account</Link>
     </div>
    </div>
   </section>

   <section className="landing-section landing-promise">
    <h2>Your little world, together.</h2>
    <p>Pin what matters. Plan the next surprise. Keep letters and memories in one place—just for the two of you.</p>
   </section>

   <section className="landing-moments" aria-label="Moments">
    <figure className="landing-moment">
     <img src="/images/coast.jpg" alt="Soft coastal light"/>
     <figcaption>Remember every moment</figcaption>
    </figure>
    <figure className="landing-moment">
     <img src="/images/roses.jpg" alt="Fresh roses"/>
     <figcaption>Plan thoughtful surprises</figcaption>
    </figure>
    <figure className="landing-moment">
     <img src="/images/coffee.jpg" alt="Shared coffee"/>
     <figcaption>Stay close across distance</figcaption>
    </figure>
   </section>

   <section className="landing-section landing-close">
    <BrandLogo variant="mark" className="landing-close-mark"/>
    <h2>Ready when you are.</h2>
    <p>Create an account and start your shared space in a minute.</p>
    <Link className="primary-button" href="/register">Get started</Link>
   </section>

   <footer className="landing-footer">
    <span>lovelink.io</span>
    <Link href="/seller">Sellers</Link>
   </footer>
  </div>
 );
}
