'use client';

export default function GlobalError({reset}:{error:Error;reset:()=>void}) {
  return (
    <html lang="en">
      <body>
        <main style={{fontFamily:'Figtree,sans-serif',maxWidth:520,margin:'12vh auto',padding:'24px 16px',width:'100%',boxSizing:'border-box'}}>
          <p style={{letterSpacing:'.08em',fontSize:12}}>LOVELINK</p>
          <h1 style={{fontFamily:'Syne,sans-serif',fontSize:'clamp(1.8rem,8vw,2.4rem)',lineHeight:1.15}}>We hit a snag.</h1>
          <p>The page couldn’t load. Try again, or come back in a moment.</p>
          <button onClick={()=>reset()} style={{minHeight:44,padding:'11px 16px',fontSize:16,width:'100%'}}>Try again</button>
        </main>
      </body>
    </html>
  );
}
