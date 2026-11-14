import os,hashlib,json,sys
root=sys.argv[1]; files=[]; h=hashlib.sha256()
for d,_,fs in os.walk(root):
    for f in sorted(fs):
        p=os.path.relpath(os.path.join(d,f),root)
        if p in('sw.js',) or p.startswith('.git') or p.startswith('firebase/') or p.startswith('.github') or p.startswith('tools/') or p.endswith('.zip') or p in('README.md','CNAME','.nojekyll'): continue
        files.append(p); h.update(p.encode()); h.update(open(os.path.join(d,f),'rb').read())
files.sort(); ver=h.hexdigest()[:10]
sw=f"""// Elgravion TCG — service worker (generato automaticamente)
const VER='elg-{ver}';
const FILES={json.dumps(['./']+files)};
self.addEventListener('install',e=>{{ self.skipWaiting(); e.waitUntil(caches.open(VER).then(c=>c.addAll(FILES.map(f=>new Request(f,{{cache:'reload'}}))))); }});
self.addEventListener('activate',e=>{{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); }});
self.addEventListener('message',e=>{{ if(e.data==='skip') self.skipWaiting(); }});
self.addEventListener('fetch',e=>{{
  const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  e.respondWith(caches.match(e.request,{{ignoreSearch:true}}).then(r=>r||fetch(e.request).then(n=>{{ if(n.ok){{ const c=n.clone(); caches.open(VER).then(x=>x.put(e.request,c)); }} return n; }})));
}});
"""
open(os.path.join(root,'sw.js'),'w').write(sw); print(ver,len(files))
