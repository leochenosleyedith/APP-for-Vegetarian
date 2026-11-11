const CACHE='sprout-shell-v1';
const SHELL=['/','/index.html','/styles.css','/app.js','/core.js','/foods.json','/manifest.webmanifest','/assets/icon.svg','/assets/icon-192.png','/assets/icon-512.png','/assets/harvest-bowl.jpg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sprout-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);
  // Never cache account data, auth redirects, photo models, or other origins.
  if(event.request.method!=='GET'||u.origin!==self.location.origin||!SHELL.includes(u.pathname))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request)));
});
