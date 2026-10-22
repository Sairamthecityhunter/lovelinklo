// Local-only browser harness: synthetic canvas video, in-memory signaling, no camera or microphone access.
import React,{useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {WorldCall} from '../app/world-call';
const OriginalPeer=window.RTCPeerConnection;
window.RTCPeerConnection=class extends OriginalPeer{constructor(config?:RTCConfiguration){super(config);this.addEventListener('icegatheringstatechange',()=>console.info('Test ICE',this.iceGatheringState,'candidate count',this.localDescription?.sdp.match(/a=candidate:/g)?.length||0));this.addEventListener('connectionstatechange',()=>console.info('Test peer',this.connectionState,this.iceConnectionState));}};
let call:any=null,feed=0;
const streams:MediaStream[]=[];
const mediaDevices=navigator.mediaDevices||{};
Object.defineProperty(mediaDevices,'getUserMedia',{configurable:true,value:async()=>{const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;const ctx=canvas.getContext('2d')!;const number=++feed;let t=0;const draw=()=>{ctx.fillStyle=number%2?'#7655b9':'#1f8f83';ctx.fillRect(0,0,320,240);ctx.fillStyle='white';ctx.font='24px sans-serif';ctx.fillText('Synthetic feed '+number,30,100);ctx.fillText(String(++t),30,140);};draw();const stream=canvas.captureStream(12);streams.push(stream);const timer=setInterval(()=>{if(stream.getTracks().every(t=>t.readyState==='ended'))clearInterval(timer);else draw();},100);return stream;}});
if(!navigator.mediaDevices)Object.defineProperty(navigator,'mediaDevices',{value:mediaDevices});
const original=window.fetch;
window.fetch=async(input,init)=>{if(input!=='/api/world/call')return original(input,init);const body=JSON.parse(String(init?.body));const session=body.session;
 if(body.op==='config')return Response.json({relay:false,iceServers:[]});
 if(body.op==='offer'){call={id:body.id,state:'ringing',caller:session,offer:body.sdp};}
 if(body.op==='answer'){call={...call,state:'active',answer:body.sdp};}
 if(body.op==='end'&&call?.id===body.id){call={...call,state:'ended'};}
 return Response.json({call:call?{...call,role:call.caller===session?'caller':'callee',peerName:call.caller===session?'Test B':'Test A',offer:call.caller!==session?call.offer:undefined,answer:call.caller===session?call.answer:undefined}:null});
};
// randomUUID is normally provided by the production HTTPS origin. No IDs here leave this test page.
if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=> '10000000-1000-4000-8000-'+String(Date.now()).slice(-12)});
function Fixture(){const a=useRef<(()=>void)|null>(null),b=useRef<(()=>void)|null>(null);return <><h1>Synthetic video-call test</h1><p>No camera or microphone is used. This tests two copies of the production call component.</p><button onClick={()=>{a.current?.();b.current?.();document.querySelector('#tracks')!.textContent=streams.map(s=>s.getTracks().map(t=>t.readyState).join(',')).join(' / ');}}>Stop both and inspect tracks</button><output id="tracks"/><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:20}}><div aria-label="Test caller"><WorldCall session="test-a" peerName="Test B" stopRef={a}/></div><div aria-label="Test receiver"><WorldCall session="test-b" peerName="Test A" stopRef={b}/></div></div></>};
createRoot(document.getElementById('root')!).render(<Fixture/>);
