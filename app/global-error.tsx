'use client';

export default function GlobalError({reset}:{error:Error;reset:()=>void}) {
  return (
    <html lang="en">
      <body>
        <main style={{fontFamily:'Figtree,sans-serif',maxWidth:520,margin:'12vh auto',padding:24}}>
          <p style={{letterSpacing:'.08em',fontSize:12}}>LOVELINK</p>
          <h1 style={{fontFamily:'Syne,sans-serif'}}>We hit a snag.</h1>
          <p>The page couldn’t load. Try again, or come back in a moment.</p>
          <button onClick={()=>reset()}>Try again</button>
        </main>
      </body>
    </html>
  );
}
