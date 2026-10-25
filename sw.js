// Offline support: keeps the app files on the device so it opens without internet.
// Same-site files: network first (so updates show immediately), cache as fallback.
// Libraries/fonts (versioned): cache first. Firebase data calls are never touched.
const C="menu-v1";
const SHELL=["./","index.html","manifest.json","icon-192.png","icon-512.png"];
const EXT=["www.gstatic.com","fonts.googleapis.com","fonts.gstatic.com","cdnjs.cloudflare.com"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).catch(()=>{}))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
const keep=(r,res)=>{if(res&&(res.ok||res.type==="opaque")){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp)).catch(()=>{})}return res};
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;
  const u=new URL(r.url),same=u.origin===location.origin;
  if(same){
    e.respondWith(fetch(r,{cache:"no-cache"}).then(res=>keep(r,res)).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match("index.html",{ignoreSearch:true}))));
  }else if(EXT.includes(u.hostname)){
    e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>keep(r,res))));
  }
});
