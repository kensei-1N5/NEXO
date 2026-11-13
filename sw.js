/* NEXO service worker — réseau d'abord (timeout 4 s), cache en secours hors-ligne */
const CACHE='nexo-v2.8.98';
const ASSETS=['./','./index.html','./style.css','./qrcode.js','./app.js','./carte-gps.js','./extras.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k.startsWith('nexo-')&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  e.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),4000);
      const res=await fetch(req,{signal:ctrl.signal});
      clearTimeout(t);
      if(res.ok)cache.put(req,res.clone()).catch(()=>{});
      return res;
    }catch(err){
      const hit=await cache.match(req,{ignoreSearch:true});
      if(hit)return hit;
      if(req.mode==='navigate'){const home=await cache.match('./index.html');if(home)return home}
      return Response.error();
    }
  })());
});
