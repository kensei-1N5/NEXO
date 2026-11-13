/* NEXO Carte GPS v2.8.100. Les anciens roadtrips restent intacts dans le stockage. */
'use strict';
const nxMap={db:null,live:false,offline:null,selection:false,watch:null,fix:null,canvas:null,view:null,pointers:new Map(),lastTouch:null};
function nxMapDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('nexo_offline_maps_v1',1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('zones'))req.result.createObjectStore('zones',{keyPath:'id'})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function nxMapZones(){const db=await nxMapDB();return new Promise((resolve,reject)=>{const t=db.transaction('zones','readonly'),r=t.objectStore('zones').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function nxMapPut(zone){const db=await nxMapDB();return new Promise((resolve,reject)=>{const t=db.transaction('zones','readwrite');t.objectStore('zones').put(zone);t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}
async function nxMapDelete(id){const db=await nxMapDB();return new Promise((resolve,reject)=>{const t=db.transaction('zones','readwrite');t.objectStore('zones').delete(id);t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}
function nxMapEsc(s){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))}
function nxMapStatus(s){const e=document.querySelector('#nx-map-status');if(e)e.textContent=s}
function nxMapLeave(){nxMapStop();document.body.classList.remove('moto-gps-fullscreen','nx-map-screen-on');try{motoGPSNavStop();motoGLDestroy();motoGPSMap?.remove()}catch(_){}motoGPSMap=null;nxMap.live=false;nxMap.offline=null;gen2Home()}
function nxMapStop(){if(nxMap.watch!==null){navigator.geolocation.clearWatch(nxMap.watch);nxMap.watch=null}try{motoGPSNavStop()}catch(_){} }
async function nxMapOpen(){try{motoGPSNavStop();motoGLDestroy()}catch(_){}nxMapStop();document.body.classList.add('moto-gps-fullscreen','nx-map-screen-on');setHead('Carte GPS','');content(`<div class="nx-map-shell"><div id="moto-gps-map" class="nx-map-base">Chargement de la carte…</div><div class="nx-map-top"><div class="nx-map-toolbar"><button type="button" onclick="nxMapLeave()" aria-label="Retour">←</button><input id="moto-gps-destination" type="search" placeholder="Rechercher une destination" onkeydown="if(event.key==='Enter')nxMapSearch()"><button type="button" onclick="nxMapSearch()" aria-label="Rechercher">⌕</button><button type="button" onclick="nxMapSelect()" aria-label="Télécharger une zone">⇩</button></div><div id="moto-gps-search-results" class="moto-gps-search-results" hidden></div><div id="moto-gps-route-summary" class="nx-map-route" hidden></div></div><div id="nx-map-select-overlay" class="nx-map-select" hidden><div class="nx-map-select-rect"><span>Zone à télécharger</span></div><div class="nx-map-select-bottom"><p>Déplace la carte et zoome pour cadrer la zone (maximum 25 km²).</p><div class="nx-map-buttons"><button onclick="nxMapCancelSelect()">Annuler</button><button class="nx-primary" onclick="nxMapSelectConfirm()">Continuer</button></div></div></div><div class="nx-map-floating"><button onclick="nxMapPosition()" aria-label="Ma position">◎</button><button onclick="nxMapNorth()" aria-label="Orientation Nord">N↑</button><button onclick="nxMapList()" aria-label="Mes zones hors ligne" title="Mes zones hors ligne">▤</button></div><div class="nx-map-foot" id="nx-map-status">Carte en ligne · téléchargement hors ligne disponible</div></div><div id="nx-map-modal" class="nx-map-modal-back" hidden></div>`);nxMap.live=true;
 if(!navigator.onLine){const zones=await nxMapZones().catch(()=>[]);if(zones.length){await nxMapOpenZone(zones[0].id);return}nxMapStatus('Aucune carte hors ligne enregistrée');return}
 try{await motoGPSInitMap();nxMapStatus('Carte en ligne · © OpenStreetMap / OpenFreeMap');nxMapStartPosition()}catch(e){nxMapStatus('Carte indisponible : vérifie la connexion')}}
function nxMapStartPosition(){if(!navigator.geolocation)return;nxMapStop();nxMap.watch=navigator.geolocation.watchPosition(p=>{nxMap.fix={lat:p.coords.latitude,lng:p.coords.longitude};if(nxMap.offline)nxMapDraw();else try{motoMapMarker([nxMap.fix.lat,nxMap.fix.lng])}catch(_){}},()=>{}, {enableHighAccuracy:true,maximumAge:5000,timeout:18000})}
function nxMapPosition(){if(nxMap.offline){if(nxMap.fix){nxMap.view.center=[nxMap.fix.lng,nxMap.fix.lat];nxMapDraw()}else nxMapStatus('Position GPS indisponible');return}if(nxMap.fix){motoMapView([nxMap.fix.lat,nxMap.fix.lng],15);return}nxMapStatus('Recherche GPS en cours…');navigator.geolocation?.getCurrentPosition(p=>{nxMap.fix={lat:p.coords.latitude,lng:p.coords.longitude};motoMapView([nxMap.fix.lat,nxMap.fix.lng],15)},()=>nxMapStatus('Autorise la localisation dans iOS'),{enableHighAccuracy:true,timeout:12000})}
function nxMapNorth(){if(nxMap.offline){nxMapStatus('Carte hors ligne orientée au nord');return}try{motoGL?.easeTo({bearing:0,pitch:0,duration:300});if(motoGPSMap)motoGPSMap.getPane('mapPane').style.rotate='0deg'}catch(_){}}
function nxMapBounds(){
 const rectEl=document.querySelector('.nx-map-select-rect'),host=document.getElementById('moto-gps-map');
 if(rectEl&&host){
   const r=rectEl.getBoundingClientRect(),h=host.getBoundingClientRect();
   if(r.width>20&&r.height>20){
     const pts=[[r.left-h.left,r.top-h.top],[r.right-h.left,r.top-h.top],[r.right-h.left,r.bottom-h.top],[r.left-h.left,r.bottom-h.top]];
     try{
       let ll;
       if(motoGL)ll=pts.map(p=>{const c=motoGL.unproject(p);return [c.lat,c.lng]});
       else if(motoGPSMap)ll=pts.map(p=>{const c=motoGPSMap.containerPointToLatLng(p);return [c.lat,c.lng]});
       if(ll){const la=ll.map(x=>x[0]),lo=ll.map(x=>x[1]);return [Math.min(...la),Math.min(...lo),Math.max(...la),Math.max(...lo)]}
     }catch(_){}
   }
 }
 if(motoGL){const b=motoGL.getBounds(),c=motoGL.getCenter(),ratio=.55;const w=(b.getEast()-b.getWest())*ratio/2,h=(b.getNorth()-b.getSouth())*ratio/2;return [c.lat-h,c.lng-w,c.lat+h,c.lng+w]}
 if(motoGPSMap){const b=motoGPSMap.getBounds(),c=motoGPSMap.getCenter(),r=.55;return [c.lat-(b.getNorth()-b.getSouth())*r/2,c.lng-(b.getEast()-b.getWest())*r/2,c.lat+(b.getNorth()-b.getSouth())*r/2,c.lng+(b.getEast()-b.getWest())*r/2]}
 return null}
function nxMapArea(b){return (b[2]-b[0])*111.2*(b[3]-b[1])*111.2*Math.cos((b[0]+b[2])/2*Math.PI/180)}
function nxMapSelect(){if(nxMap.offline){nxMapStatus('Ouvre la carte en ligne pour sélectionner une nouvelle zone');return}if(!motoGL&&!motoGPSMap){nxMapStatus('Charge la carte avant de sélectionner une zone');return}document.querySelector('#nx-map-select-overlay').hidden=false;nxMap.selection=true}
function nxMapCancelSelect(){nxMap.selection=false;const e=document.querySelector('#nx-map-select-overlay');if(e)e.hidden=true}
function nxMapModal(html){const node=document.querySelector('#nx-map-modal');if(!node)return;node.style.zIndex="110";node.innerHTML=`<div class="nx-map-dialog" role="dialog" aria-modal="true">${html}</div>`;node.hidden=false}
function nxMapCancelDownload(){if(nxMap.abort){nxMap.abort.abort();nxMap.abort=null}nxMapClose()}
function nxMapClose(){const node=document.querySelector('#nx-map-modal');if(node){node.hidden=true;node.innerHTML=''}}
function nxMapSelectConfirm(){const b=nxMapBounds();if(!b)return;if(nxMapArea(b)>25)return nxMapStatus('Zone trop grande : zoome davantage (maximum 25 km²)');if(nxMapArea(b)<.005)return nxMapStatus('Zone trop petite : dézoome légèrement');nxMap.bounds=b;nxMapCancelSelect();nxMapModal(`<h3>Télécharger une zone</h3><label>Nom</label><input id="nx-map-name" value="Ma zone" maxlength="60"><p>Mode détaillé : rues, routes, bâtiments, chemins et espaces naturels disponibles dans OpenStreetMap.</p><label class="nx-map-wifi"><input id="nx-map-wifi" type="checkbox" checked> Préférence Wi-Fi (confirmation manuelle sur iPhone)</label><p>Surface : ${nxMapArea(b).toFixed(2)} km² · téléchargement limité à 25 km². Taille exacte inconnue avant réception.</p><div class="nx-map-progress" id="nx-map-progress"></div><div class="nx-map-buttons"><button onclick="nxMapCancelDownload()">Annuler</button><button class="nx-primary" id="nx-map-download-button" onclick="nxMapDownload()">Télécharger</button></div>`)}
/* Téléchargement progressif : requêtes modérées, sans parallélisme sur Overpass. */
function nxMapOverpassQuery(b,light=false){
 const bbox=b.map(x=>Number(x.toFixed(6))).join(',');
 const base=`way[highway](${bbox});way[waterway](${bbox});`;
 const detail=light?'':`way[building](${bbox});way[natural=water](${bbox});way[landuse](${bbox});way[leisure=park](${bbox});way[railway](${bbox});`;
 return `[out:json][timeout:25];(${base}${detail});out geom;`;
}
function nxMapSplitBounds(b,parts){
 const result=[];
 for(let row=0;row<parts;row++)for(let col=0;col<parts;col++){
   result.push([b[0]+(b[2]-b[0])*row/parts,b[1]+(b[3]-b[1])*col/parts,b[0]+(b[2]-b[0])*(row+1)/parts,b[1]+(b[3]-b[1])*(col+1)/parts]);
 }
 return result;
}
function nxMapDelay(ms,signal){return new Promise((resolve,reject)=>{
 if(signal.aborted)return reject(new DOMException('Annulé','AbortError'));
 const t=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve()},ms);
 const cancel=()=>{clearTimeout(t);reject(new DOMException('Annulé','AbortError'))};
 signal.addEventListener('abort',cancel,{once:true});
})}
const NX_OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter'];
let nxOverpassPref=0;
async function nxMapFetchOne(url,bounds,signal,light){
 const request=new AbortController();const onCancel=()=>request.abort();
 signal.addEventListener('abort',onCancel,{once:true});
 let timedOut=false;const timer=setTimeout(()=>{timedOut=true;request.abort()},40000);
 try{
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:nxMapOverpassQuery(bounds,light)}),signal:request.signal,cache:'no-store'});
   if(!response.ok){const err=new Error(response.status===429?'Service saturé (429)':`Serveur de cartes : erreur ${response.status}`);err.status=response.status;throw err}
   let raw;try{raw=await response.json()}catch(_){const err=new Error('Réponse illisible du serveur');err.overpass=true;throw err}
   if(!Array.isArray(raw.elements)||(raw.remark&&/timed out|out of memory|runtime error|too busy/i.test(raw.remark)&&!raw.elements.length)){const err=new Error('Serveur Overpass : '+(raw.remark||'réponse invalide'));err.overpass=true;throw err}
   return raw.elements;
 }catch(e){
   if(signal.aborted)throw new DOMException('Annulé','AbortError');
   if(timedOut||e.name==='AbortError'){const err=new Error('Délai serveur dépassé');err.overpass=true;throw err}
   if(e instanceof TypeError){const err=new Error('Serveur injoignable');err.network=true;throw err}
   throw e;
 }finally{clearTimeout(timer);signal.removeEventListener('abort',onCancel)}
}
async function nxMapFetchPart(bounds,signal,light=false){
 // Essaie chaque serveur Overpass public à tour de rôle ; mémorise celui qui répond.
 let lastErr=null;
 for(let i=0;i<NX_OVERPASS.length;i++){
   const idx=(nxOverpassPref+i)%NX_OVERPASS.length;
   try{const els=await nxMapFetchOne(NX_OVERPASS[idx],bounds,signal,light);nxOverpassPref=idx;return els}
   catch(e){
     if(signal.aborted||e.name==='AbortError')throw e;
     lastErr=e;
     if(e.status===429)await nxMapDelay(1500,signal);
   }
 }
 const err=new Error(lastErr?.network?'Aucun serveur de cartes joignable (vérifie ta connexion)':(lastErr?.message||'Serveurs de cartes indisponibles'));
 err.overpass=true;err.network=!!lastErr?.network;err.status=lastErr?.status;throw err;
}
async function nxMapDownload(){
 const name=document.getElementById('nx-map-name')?.value.trim()||'Ma zone';
 const wifi=document.getElementById('nx-map-wifi')?.checked;
 if(wifi&&!confirm('Vérifie que ton iPhone est connecté au Wi-Fi. Continuer le téléchargement ?'))return;
 if(nxMap.abort)return;
 const bounds=nxMap.bounds?.slice();if(!bounds)return nxMapStatus('Sélectionne une zone');
 const btn=document.getElementById('nx-map-download-button');if(btn)btn.disabled=true;
 const prog=document.getElementById('nx-map-progress');
 const ctrl=new AbortController();nxMap.abort=ctrl;
 const totalArea=nxMapArea(bounds);const parts=Math.max(1,Math.ceil(Math.sqrt(totalArea/2.5)));
 let queue=nxMapSplitBounds(bounds,parts).map(b=>({bounds:b,depth:0}));let skipped=0;
 let completed=0;const featureMap=new Map();let estimatedSize=0;
 try{
   if(prog)prog.textContent=`Préparation : ${queue.length} portions…`;
   while(queue.length){
     if(ctrl.signal.aborted)throw new DOMException('Annulé','AbortError');
     const part=queue.shift();
     if(prog)prog.textContent=`Portion ${completed+1}/${completed+queue.length+1} · ${Math.round(100*completed/(completed+queue.length+1))}% · ${featureMap.size} éléments`;
     let elements;
     try{elements=await nxMapFetchPart(part.bounds,ctrl.signal,part.depth>=1)}
     catch(e){
       if(ctrl.signal.aborted||e.network)throw e;
       // Portion refusée par tous les serveurs : la redécouper (2 niveaux max, requête allégée dès le niveau 1).
       if(part.depth<2){
         const smaller=nxMapSplitBounds(part.bounds,2).map(b=>({bounds:b,depth:part.depth+1}));
         queue.unshift(...smaller);
         if(prog)prog.textContent='Serveur occupé : portion découpée en plus petites…';
         await nxMapDelay(1200,ctrl.signal);continue;
       }
       skipped++;completed++;continue;
     }
     for(const el of elements){
       if(!Array.isArray(el.geometry)||el.geometry.length<2)continue;
       const id=el.type+':'+el.id;
       if(featureMap.has(id))continue;
       const feat={id:el.id,props:el.tags||{},coords:el.geometry.map(p=>[p.lon,p.lat])};
       featureMap.set(id,feat);
       estimatedSize+=JSON.stringify(feat).length*2; // estimation haute (UTF-16 en mémoire)
       if(estimatedSize>35*1024*1024)throw Error('Données trop volumineuses (35 Mo). Sélectionne une zone plus petite.');
     }
     completed++;
     if(queue.length)await nxMapDelay(650,ctrl.signal); // limiter la charge de l'API publique
   }
   if(!featureMap.size)throw Error(skipped?'Les serveurs de cartes sont indisponibles pour le moment':'Aucune route ou bâtiment trouvé dans cette zone');
   if(skipped&&!confirm(skipped+' petite(s) portion(s) n’ont pas pu être téléchargées (carte incomplète). Enregistrer quand même ?'))throw Error('Téléchargement incomplet, non enregistré');
   if(prog)prog.textContent='Enregistrement local…';
   const features=[...featureMap.values()];
   const bytes=new Blob([JSON.stringify(features)]).size;
   if(bytes>35*1024*1024)throw Error('Carte trop volumineuse (35 Mo). Réduis la sélection.');
   const zone={id:'nx'+Date.now(),name,mode:'detail',bounds,date:new Date().toISOString(),size:bytes,features};
   await nxMapPut(zone);
   nxMapClose();nxMapStatus('Carte « '+name+' » enregistrée · '+(bytes/1024/1024).toFixed(1)+' Mo');
   await nxMapOpenZone(zone.id);
 }catch(e){
   if(prog)prog.textContent=ctrl.signal.aborted?'Téléchargement annulé':`Téléchargement impossible : ${e.message}. Essaie une zone plus petite (1 à 4 km²) ou plus tard.`;
   if(btn)btn.disabled=false;
 }finally{nxMap.abort=null}
}
function nxMapGeomColor(tags){if(tags.building)return {fill:'#c7c5bf',line:'#b1afa9',width:.6};if(tags.natural==='water'||tags.waterway)return {fill:'#add6ee',line:'#93c6e3',width:2};if(tags.landuse||tags.leisure)return {fill:'#cfe4bf',line:'#aed29a',width:.7};if(tags.railway)return {line:'#777a82',width:1.5};if(tags.highway){const kind=tags.highway;const major=['motorway','trunk','primary','secondary'].includes(kind);return {line:major?'#efa75f':['tertiary','residential','unclassified'].includes(kind)?'#fdfcf8':'#ded6c9',edge:major?'#ffffff':'#c7c8c7',width:major?4.4:['tertiary','residential','unclassified'].includes(kind)?3:1.6}}return {line:'#a8b3ad',width:1}}
function nxMapDraw(){const can=nxMap.canvas,z=nxMap.offline;if(!can||!z)return;const dpr=Math.min(devicePixelRatio||1,2),r=can.getBoundingClientRect();if(!r.width||!r.height)return;can.width=Math.round(r.width*dpr);can.height=Math.round(r.height*dpr);const ctx=can.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);const w=r.width,h=r.height,v=nxMap.view,b=z.bounds;ctx.fillStyle='#f1f1ec';ctx.fillRect(0,0,w,h);const cos=Math.cos(v.center[1]*Math.PI/180),scale=v.scale;const p=([lng,lat])=>[w/2+(lng-v.center[0])*111200*cos*scale,h/2-(lat-v.center[1])*111200*scale];
 const ordered=[...z.features].sort((a,b)=>Number(!!a.props.highway)-Number(!!b.props.highway));for(const f of ordered){const style=nxMapGeomColor(f.props),coords=f.coords;if(!coords.length)continue;ctx.beginPath();coords.forEach((coord,i)=>{const [x,y]=p(coord);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});const closed=coords.length>3&&Math.abs(coords[0][0]-coords.at(-1)[0])<1e-6&&Math.abs(coords[0][1]-coords.at(-1)[1])<1e-6;if(closed&&style.fill){ctx.fillStyle=style.fill;ctx.fill()}if(style.edge){ctx.strokeStyle=style.edge;ctx.lineWidth=style.width+2.5;ctx.stroke()}ctx.strokeStyle=style.line||style.fill||'#bbb';ctx.lineWidth=style.width||1;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke()}
 ctx.fillStyle='#566474';ctx.font='11px system-ui';let labels=0;const seen=new Set();for(const f of z.features){if(labels>=85)break;const n=f.props.name;if(!n||seen.has(n)||!f.props.highway||f.coords.length<2)continue;const mid=f.coords[Math.floor(f.coords.length/2)],[x,y]=p(mid);if(x<20||x>w-70||y<20||y>h-20)continue;seen.add(n);ctx.save();ctx.lineWidth=3;ctx.strokeStyle='#f1f1ec';ctx.strokeText(n,x,y);ctx.fillStyle='#4c5866';ctx.fillText(n,x,y);ctx.restore();labels++}
 if(nxMap.fix){const [x,y]=p([nxMap.fix.lng,nxMap.fix.lat]);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#237fff';ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill()}
 ctx.fillStyle='#39485a';ctx.font='11px system-ui';ctx.fillText('© OpenStreetMap contributors · données hors ligne',8,h-12)}
function nxMapTouchSetup(can){can.style.touchAction='none';can.addEventListener('pointerdown',e=>{can.setPointerCapture(e.pointerId);nxMap.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})});can.addEventListener('pointermove',e=>{if(!nxMap.pointers.has(e.pointerId))return;const old=nxMap.pointers.get(e.pointerId),v=nxMap.view,cos=Math.cos(v.center[1]*Math.PI/180),previous=[...nxMap.pointers.values()];nxMap.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(nxMap.pointers.size===1){v.center[0]-=(e.clientX-old.x)/(111200*cos*v.scale);v.center[1]+=(e.clientY-old.y)/(111200*v.scale)}else if(previous.length===2){const now=[...nxMap.pointers.values()],dist=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),prevDist=dist(previous),nextDist=dist(now);if(prevDist>10)v.scale=Math.max(.15,Math.min(20,v.scale*nextDist/prevDist))}nxMapDraw()});const end=e=>nxMap.pointers.delete(e.pointerId);can.addEventListener('pointerup',end);can.addEventListener('pointercancel',end);can.addEventListener('wheel',e=>{e.preventDefault();nxMap.view.scale=Math.max(.15,Math.min(20,nxMap.view.scale*(e.deltaY>0?.85:1.15)));nxMapDraw()},{passive:false})}
async function nxMapOpenZone(id){const z=(await nxMapZones()).find(x=>x.id===id);if(!z)return nxMapStatus('Zone introuvable');nxMap.offline=z;try{motoGLDestroy();motoGPSNavStop();motoGPSMap?.remove()}catch(_){}motoGPSMap=null;const host=document.getElementById('moto-gps-map');if(!host)return;host.innerHTML='<canvas id="nx-map-canvas" aria-label="Carte hors ligne"></canvas>';nxMap.canvas=document.getElementById('nx-map-canvas');const b=z.bounds,lat=(b[0]+b[2])/2,lng=(b[1]+b[3])/2;const rect=host.getBoundingClientRect(),widthKm=(b[3]-b[1])*111.2*Math.cos(lat*Math.PI/180),heightKm=(b[2]-b[0])*111.2;nxMap.view={center:[lng,lat],scale:Math.min((rect.width*.8)/(widthKm*1000),(rect.height*.8)/(heightKm*1000))};nxMapTouchSetup(nxMap.canvas);nxMapDraw();nxMapStatus('Hors ligne : '+z.name+' · routes et bâtiments enregistrés');nxMapStartPosition()}
async function nxMapList(){let zones=[];try{zones=await nxMapZones()}catch(e){nxMapStatus('Stockage local indisponible');return}nxMapModal(`<h3>Mes zones hors ligne</h3>${zones.length?zones.map(z=>`<div class="nx-map-zone"><div><strong>${nxMapEsc(z.name)}</strong><small>${new Date(z.date).toLocaleDateString('fr-FR')} · ${(z.size/1024/1024).toFixed(1)} Mo</small></div><button onclick="nxMapClose();nxMapOpenZone('${z.id}')">Ouvrir</button><button onclick="nxMapRemove('${z.id}')" aria-label="Supprimer">✕</button></div>`).join(''):'<p>Aucune zone téléchargée.</p>'}<p>Les zones hors ligne sont stockées localement sur cet appareil. iOS peut les effacer avec les données du site.</p><div class="nx-map-buttons"><button onclick="nxMapClose()">Fermer</button>${navigator.onLine?'<button class="nx-primary" onclick="nxMapBackOnline()">Carte en ligne</button>':''}</div>`)}
async function nxMapRemove(id){if(!confirm('Supprimer cette zone téléchargée ?'))return;await nxMapDelete(id);if(nxMap.offline?.id===id)nxMap.offline=null;nxMapList()}
async function nxMapBackOnline(){nxMapClose();nxMap.offline=null;nxMap.canvas=null;const e=document.getElementById('moto-gps-map');if(e)e.textContent='Chargement de la carte…';await motoGPSInitMap();nxMapStatus('Carte en ligne')}
async function nxMapSearch(){if(nxMap.offline){nxMapStatus('Recherche d’adresse disponible uniquement en ligne');return}return motoGPSFindDestination()}
window.addEventListener('resize',()=>{if(nxMap.offline)nxMapDraw()});
