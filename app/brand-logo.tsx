'use client';

type BrandLogoProps={
 variant?:'mark'|'wordmark';
 className?:string;
 alt?:string;
};

export function BrandLogo({variant='mark',className='',alt='LoveLink'}:BrandLogoProps){
 if(variant==='wordmark'){
  return <img src="/logo.png" alt={alt} className={'brand-logo brand-logo-wordmark '+className.trim()} width={340} height={170}/>;
 }
 return <img src="/logo-mark.png" alt={alt} className={'brand-logo brand-logo-mark '+className.trim()} width={72} height={72}/>;
}
