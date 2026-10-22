export type MediaKind = 'image' | 'video' | 'audio';
export const MEDIA_ACCEPT='image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/x-wav,audio/mp4';
export function detectMedia(b:Uint8Array,declared:string):{mime:string;kind:MediaKind}|null {
 const text=(a:number,z:number)=>String.fromCharCode(...b.slice(a,z));
 if(b.length<12)return null;
 if(b[0]===255&&b[1]===216&&b[2]===255)return {mime:'image/jpeg',kind:'image'};
 if(text(1,4)==='PNG'&&b[0]===137)return {mime:'image/png',kind:'image'};
 if(text(0,4)==='RIFF'&&text(8,12)==='WEBP')return {mime:'image/webp',kind:'image'};
 if(['GIF87a','GIF89a'].includes(text(0,6)))return {mime:'image/gif',kind:'image'};
 if(text(0,4)==='RIFF'&&text(8,12)==='WAVE')return {mime:'audio/wav',kind:'audio'};
 if(text(0,3)==='ID3'||(b[0]===255&&(b[1]&0xe0)===0xe0))return {mime:'audio/mpeg',kind:'audio'};
 if(text(4,8)==='ftyp'){const audio=declared==='audio/mp4';return {mime:audio?'audio/mp4':'video/mp4',kind:audio?'audio':'video'};}
 if(b[0]===0x1a&&b[1]===0x45&&b[2]===0xdf&&b[3]===0xa3&&text(0,64).includes('webm'))return {mime:'video/webm',kind:'video'};
 return null;
}
export function byteRange(header:string|null,size:number):{offset:number;length:number}|null {
 if(!header)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match||(!match[1]&&!match[2]))throw Error('Invalid range');
 const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]?(match[2]?Math.min(size-1,Number(match[2])):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)throw Error('Invalid range');
 return {offset:start,length:end-start+1};
}
