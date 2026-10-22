'use client';
import {newId} from '@/lib/id';
import {useState,useEffect,useRef,useCallback} from 'react';
import {toast} from 'sonner';
import {clearDeviceState,loadDeviceState,saveDeviceState} from './device-storage';
import {seedState} from './love-data';
import type {LoveState,Collection,Pin} from './love-types';
import {advanceOccurrence,reminderAt} from './love-time';

function persist(state:LoveState){
 if(!state.viewerId)return;
 void saveDeviceState(state).catch(()=>{});
}

export function useLoveState(signedIn:boolean,initialNow:number){
 const [state,setState]=useState<LoveState>(()=>seedState(initialNow));
 const [loading,setLoading]=useState(signedIn);
 const [error,setError]=useState('');
 const [saving,setSaving]=useState(false);
 const [fromDevice,setFromDevice]=useState(false);
 const ref=useRef(state);ref.current=state;
 const processing=useRef(new Set<string>());

 const applyState=(next:LoveState,options?:{device?:boolean;skipPersist?:boolean})=>{
  ref.current=next;
  setState(next);
  setFromDevice(!!options?.device);
  if(!options?.skipPersist)persist(next);
 };

 const reload=useCallback(async()=>{
  if(!signedIn)return;
  try{
   const r=await fetch('/api/state',{cache:'no-store'});
   const d=await r.json() as LoveState & {error?:string;deleted?:boolean};
   if(!r.ok)throw Error(d.error||'Your space could not load.');
   applyState(d);
   setError('');
  }catch(e){
   const cached=await loadDeviceState().catch(()=>null);
   if(cached){
    applyState(cached,{device:true,skipPersist:true});
    setError('');
    toast('Showing the copy saved on this device. Some changes may wait until you are back online.');
   }else{
    setError((e as Error).message);
   }
  }finally{
   setLoading(false);
  }
 },[signedIn]);

 useEffect(()=>{
  void reload();
  if(!signedIn)return;
  const tick=setInterval(()=>void reload(),30000);
  return()=>clearInterval(tick);
 },[reload,signedIn]);

 async function action(body:Record<string,unknown>){
  if(signedIn){
   if(error||loading)throw Error('Reconnect to your space before saving.');
   setSaving(true);
   try{
    const r=await fetch('/api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json() as LoveState & {error?:string;deleted?:boolean};
    if(!r.ok)throw Error(d.error||'Could not save. Please try again.');
    if(d.deleted){
     await clearDeviceState(ref.current.viewerId);
     location.assign('/login');
     return ref.current;
    }
    if(body.op==='clear')await clearDeviceState(ref.current.viewerId);
    applyState(d);
    return d;
   }catch(e){
    // Keep working offline from the device copy for local-only ops after a failed network write.
    throw e;
   }finally{
    setSaving(false);
   }
  }

  const s=ref.current;let next={...s};const collection=body.collection as Collection;
  if(body.op==='profile')next.profile={...s.profile,...body.value as object};
  else if(body.op==='delete')next={...s,[collection]:s[collection].filter(x=>x.id!==body.id)};
  else if(body.op==='upsert'){const v=body.value as {id:string};next={...s,[collection]:[v,...s[collection].filter(x=>x.id!==v.id)]};}
  else if(body.op==='complete'){const pin=s.pins.find(x=>x.id===body.id);if(pin)next.pins=s.pins.map(x=>x.id===body.id?advanceOccurrence(pin):x);}
  else if(body.op==='snooze')next.pins=s.pins.map(x=>x.id===body.id?{...x,snoozedUntil:new Date(Date.now()+600000).toISOString(),notifiedAt:undefined}:x);
  else if(body.op==='notify'){const p=s.pins.find(x=>x.id===body.id);if(p){next.pins=s.pins.map(x=>x.id===p.id?{...x,notifiedAt:new Date().toISOString()}:x);next.notifications=[{id:newId(),title:'❤️ It’s time',body:p.title,pinId:p.id,createdAt:new Date().toISOString(),read:false},...s.notifications];}}
  else if(body.op==='deleteAccount'){next={...seedState(),profile:{...seedState().profile,myName:'You',partnerName:'Your partner',sample:false},surprises:[],pins:[],events:[],memories:[],letters:[],goals:[],wishlist:[],orders:[],notifications:[]};}
  else if(body.op==='clear')next={...seedState(),profile:{...s.profile,sample:false},surprises:[],pins:[],events:[],memories:[],letters:[],goals:[],wishlist:[],orders:[],notifications:[]};
  else if(body.op==='think')next.notifications=[{id:newId(),title:'A little love, saved',body:String(body.message),pinId:'',createdAt:new Date().toISOString(),read:false},...s.notifications];
  next.revision++;
  applyState(next);
  return next;
 }

 const actionRef=useRef(action);actionRef.current=action;
 useEffect(()=>{
  const t=setInterval(()=>{
   if(loading||error)return;
   const s=ref.current;
   const due=s.pins.filter(p=>(!s.viewerId||!p.ownerId||p.ownerId===s.viewerId)&&!p.done&&!p.notifiedAt&&new Date(reminderAt(p)).getTime()<=Date.now());
   for(const p of due){
    if(processing.current.has(p.id))continue;
    processing.current.add(p.id);
    void actionRef.current({op:'notify',id:p.id}).then(()=>{
     toast('❤️ It’s time',{description:p.title,duration:10000});
     if(s.profile.browserNotifications&&'Notification'in window&&Notification.permission==='granted'){
      new Notification('❤️ A LoveLink reminder',{body:s.profile.notificationPrivacy?'A little love is waiting. Open LoveLink.':p.title,icon:'/icon-192.png',tag:p.id});
     }
    }).catch(()=>{}).finally(()=>processing.current.delete(p.id));
   }
  },10000);
  return()=>clearInterval(t);
 },[loading,error]);

 return {
  state,
  loading,
  error,
  saving,
  fromDevice,
  reload,
  action,
  put:async(collection:Collection,value:unknown)=>action({op:'upsert',collection,value}),
  remove:async(collection:Collection,id:string)=>action({op:'delete',collection,id}),
  complete:async(pin:Pin)=>action({op:'complete',id:pin.id}),
  snooze:async(pin:Pin)=>action({op:'snooze',id:pin.id}),
 };
}
