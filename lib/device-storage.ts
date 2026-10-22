'use client';
import type {LoveState} from './love-types';

const DB_NAME='lovelink-device';
const DB_VERSION=1;
const STORE='couple_state';
const META_KEY='lovelink-device-user';

type StoredBundle={viewerId:string;savedAt:string;state:LoveState};

function openDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(new Error('Device storage is unavailable.'));return;}
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'viewerId'});
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('Could not open device storage.'));
 });
}

function runStore<T>(mode:IDBTransactionMode,fn:(store:IDBObjectStore)=>IDBRequest<T>|void):Promise<T|undefined>{
 return openDb().then(db=>new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode);
  const store=tx.objectStore(STORE);
  let request:IDBRequest<T>|undefined;
  try{request=fn(store) as IDBRequest<T>|undefined;}catch(e){reject(e);db.close();return;}
  tx.oncomplete=()=>{db.close();resolve(request?request.result:undefined);}
  tx.onerror=()=>{db.close();reject(tx.error||new Error('Device storage failed.'));};
  if(request)request.onerror=()=>reject(request!.error||new Error('Device storage failed.'));
 }));
}

export function rememberDeviceUser(viewerId:string){
 try{if(viewerId)localStorage.setItem(META_KEY,viewerId);}catch{/* private mode */}
}

export function rememberedDeviceUser(){
 try{return localStorage.getItem(META_KEY)||'';}catch{return '';}
}

export async function saveDeviceState(state:LoveState){
 if(typeof window==='undefined'||!state.viewerId)return;
 const bundle:StoredBundle={viewerId:state.viewerId,savedAt:new Date().toISOString(),state};
 rememberDeviceUser(state.viewerId);
 await runStore('readwrite',store=>{store.put(bundle);});
}

export async function loadDeviceState(viewerId?:string):Promise<LoveState|null>{
 if(typeof window==='undefined')return null;
 const id=viewerId||rememberedDeviceUser();
 if(!id)return null;
 const bundle=await runStore<StoredBundle>('readonly',store=>store.get(id));
 if(!bundle?.state||bundle.viewerId!==id)return null;
 return bundle.state;
}

export async function clearDeviceState(viewerId?:string){
 if(typeof window==='undefined')return;
 const id=viewerId||rememberedDeviceUser();
 try{localStorage.removeItem(META_KEY);}catch{/* private mode */}
 if(!id){
  await runStore('readwrite',store=>{store.clear();});
  return;
 }
 await runStore('readwrite',store=>{store.delete(id);});
}
