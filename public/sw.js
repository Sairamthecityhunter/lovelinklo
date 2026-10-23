const CACHE='lovelink-shell-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['/offline.html','/favicon.svg','/icon-192.png','/icon-512.png'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=='GET')return;if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));});
self.addEventListener('push',event=>{
 let data={};
 try{data=event.data?event.data.json():{};}catch{try{data={body:event.data&&event.data.text()};}catch{data={};}}
 const title=String(data.title||'LoveLink');
 const body=String(data.body||'A little love is waiting. Open LoveLink.');
 const url=String(data.url||'/us');
 event.waitUntil(self.registration.showNotification(title,{body,icon:'/icon-192.png',badge:'/icon-192.png',tag:String(data.kind||'lovelink'),data:{url}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=(event.notification.data&&event.notification.data.url)||'/us';
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
  const client=clients.find(c=>new URL(c.url).origin===self.location.origin);
  if(client){client.navigate(url);return client.focus();}
  return self.clients.openWindow(url);
 }));
});
