/* NEXO — Carte des pays visités : planisphère hors ligne, épingles sur les pays visités. */
const PV_NUM2A2={"533":"AW","4":"AF","24":"AO","660":"AI","248":"AX","8":"AL","20":"AD","784":"AE","32":"AR","51":"AM","16":"AS","10":"AQ","260":"TF","28":"AG","36":"AU","40":"AT","31":"AZ","108":"BI","56":"BE","204":"BJ","535":"BQ","854":"BF","50":"BD","100":"BG","48":"BH","44":"BS","70":"BA","652":"BL","112":"BY","84":"BZ","60":"BM","68":"BO","76":"BR","52":"BB","96":"BN","64":"BT","74":"BV","72":"BW","140":"CF","124":"CA","166":"CC","756":"CH","152":"CL","156":"CN","384":"CI","120":"CM","180":"CD","178":"CG","184":"CK","170":"CO","174":"KM","132":"CV","188":"CR","192":"CU","531":"CW","162":"CX","136":"KY","196":"CY","203":"CZ","276":"DE","262":"DJ","212":"DM","208":"DK","214":"DO","12":"DZ","218":"EC","818":"EG","232":"ER","732":"EH","724":"ES","233":"EE","231":"ET","246":"FI","242":"FJ","238":"FK","250":"FR","234":"FO","583":"FM","266":"GA","826":"GB","268":"GE","831":"GG","288":"GH","292":"GI","324":"GN","312":"GP","270":"GM","624":"GW","226":"GQ","300":"GR","308":"GD","304":"GL","320":"GT","254":"GF","316":"GU","328":"GY","344":"HK","334":"HM","340":"HN","191":"HR","332":"HT","348":"HU","360":"ID","833":"IM","356":"IN","86":"IO","372":"IE","364":"IR","368":"IQ","352":"IS","376":"IL","380":"IT","388":"JM","832":"JE","400":"JO","392":"JP","398":"KZ","404":"KE","417":"KG","116":"KH","296":"KI","659":"KN","410":"KR","414":"KW","418":"LA","422":"LB","430":"LR","434":"LY","662":"LC","438":"LI","144":"LK","426":"LS","440":"LT","442":"LU","428":"LV","446":"MO","663":"MF","504":"MA","492":"MC","498":"MD","450":"MG","462":"MV","484":"MX","584":"MH","807":"MK","466":"ML","470":"MT","104":"MM","499":"ME","496":"MN","580":"MP","508":"MZ","478":"MR","500":"MS","474":"MQ","480":"MU","454":"MW","458":"MY","175":"YT","516":"NA","540":"NC","562":"NE","574":"NF","566":"NG","558":"NI","570":"NU","528":"NL","578":"NO","524":"NP","520":"NR","554":"NZ","512":"OM","586":"PK","591":"PA","612":"PN","604":"PE","608":"PH","585":"PW","598":"PG","616":"PL","630":"PR","408":"KP","620":"PT","600":"PY","275":"PS","258":"PF","634":"QA","638":"RE","642":"RO","643":"RU","646":"RW","682":"SA","729":"SD","686":"SN","702":"SG","239":"GS","654":"SH","744":"SJ","90":"SB","694":"SL","222":"SV","674":"SM","706":"SO","666":"PM","688":"RS","728":"SS","678":"ST","740":"SR","703":"SK","705":"SI","752":"SE","748":"SZ","534":"SX","690":"SC","760":"SY","796":"TC","148":"TD","768":"TG","764":"TH","762":"TJ","772":"TK","795":"TM","626":"TL","776":"TO","780":"TT","788":"TN","792":"TR","798":"TV","158":"TW","834":"TZ","800":"UG","804":"UA","581":"UM","858":"UY","840":"US","860":"UZ","336":"VA","670":"VC","862":"VE","92":"VG","850":"VI","704":"VN","548":"VU","876":"WF","882":"WS","887":"YE","710":"ZA","894":"ZM","716":"ZW"};
const PV_URLS=['https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json','https://unpkg.com/world-atlas@2.0.2/countries-50m.json','https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json','https://unpkg.com/world-atlas@2.0.2/countries-110m.json'];
const PV_KEY='visited_countries';
const pv={countries:null,byKey:null,visited:{},view:null,canvas:null,sel:null,pointers:new Map(),tap:null,names:null,raf:0};
function pvEsc(s){return String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]))}
function pvNorm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function pvFlag(a2){return a2&&a2.length===2?String.fromCodePoint(...[...a2.toUpperCase()].map(c=>127397+c.charCodeAt(0))):'🌍'}
/* ---- cache IndexedDB du fond de carte (pour l'usage hors ligne) ---- */
function pvDB(){return new Promise((res,rej)=>{const r=indexedDB.open('nexo_world_v1',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('kv'))r.result.createObjectStore('kv')};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function pvCacheGet(){try{const db=await pvDB();return await new Promise(res=>{const q=db.transaction('kv').objectStore('kv').get('topo');q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null)})}catch(_){return null}}
async function pvCachePut(t){try{const db=await pvDB();await new Promise(res=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(t,'topo');tx.oncomplete=res;tx.onerror=res})}catch(_){}}
async function pvFetchTopo(msg){
 for(const url of PV_URLS){
  try{msg('Téléchargement du planisphère… ('+url.split('/')[2]+')');const c=new AbortController(),t=setTimeout(()=>c.abort(),25000);
   const r=await fetch(url,{signal:c.signal});clearTimeout(t);if(!r.ok)continue;const j=await r.json();if(j&&j.arcs&&j.objects)return j}catch(_){}
 }
 throw Error('Planisphère indisponible : connecte-toi une première fois à Internet.')
}
/* ---- décodage TopoJSON ---- */
function pvM(lat){const l=Math.max(-85,Math.min(85,lat));return Math.log(Math.tan(Math.PI/4+l*Math.PI/360))*180/Math.PI}
function pvInvM(m){return (2*Math.atan(Math.exp(m*Math.PI/180))-Math.PI/2)*180/Math.PI}
function pvRingArea(r){let a=0;for(let i=0,j=r.length-1;i<r.length;j=i++)a+=(r[j][0]*r[i][1]-r[i][0]*r[j][1]);return a/2}
function pvInRing(r,x,y){let ins=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const xi=r[i][0],yi=r[i][1],xj=r[j][0],yj=r[j][1];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)ins=!ins}return ins}
function pvInPoly(p,x,y){if(x<p.box[0]||x>p.box[2]||y<p.box[1]||y>p.box[3])return false;if(!pvInRing(p.rings[0],x,y))return false;for(let i=1;i<p.rings.length;i++)if(pvInRing(p.rings[i],x,y))return false;return true}
function pvCentroid(p){
 const r=p.rings[0];let a=0,cx=0,cy=0;
 for(let i=0,j=r.length-1;i<r.length;j=i++){const f=r[j][0]*r[i][1]-r[i][0]*r[j][1];a+=f;cx+=(r[j][0]+r[i][0])*f;cy+=(r[j][1]+r[i][1])*f}
 if(Math.abs(a)>1e-9){cx/=3*a;cy/=3*a;if(pvInPoly(p,cx,cy))return [cx,cy]}
 /* centroïde hors du pays (forme concave) : milieu de la plus longue corde horizontale */
 const y=(p.box[1]+p.box[3])/2,xs=[];
 for(const rr of p.rings)for(let i=0,j=rr.length-1;i<rr.length;j=i++){const yi=rr[i][1],yj=rr[j][1];if((yi>y)!==(yj>y))xs.push(rr[i][0]+(y-yi)*(rr[j][0]-rr[i][0])/(yj-yi))}
 xs.sort((u,v)=>u-v);let best=null,bl=-1;
 for(let k=0;k+1<xs.length;k+=2){if(xs[k+1]-xs[k]>bl){bl=xs[k+1]-xs[k];best=(xs[k]+xs[k+1])/2}}
 return [best==null?(p.box[0]+p.box[2])/2:best,y];
}
function pvParse(topo){
 const tf=topo.transform,sx=tf?tf.scale[0]:1,sy=tf?tf.scale[1]:1,tx=tf?tf.translate[0]:0,ty=tf?tf.translate[1]:0;
 const arcs=topo.arcs.map(a=>{let x=0,y=0;const o=new Array(a.length);for(let i=0;i<a.length;i++){if(tf){x+=a[i][0];y+=a[i][1];o[i]=[x*sx+tx,y*sy+ty]}else o[i]=[a[i][0],a[i][1]]}return o});
 const ring0=ids=>{const out=[];for(const id of ids){if(id<0){const a=arcs[~id];for(let i=out.length?a.length-2:a.length-1;i>=0;i--)out.push(a[i])}else{const a=arcs[id];for(let i=out.length?1:0;i<a.length;i++)out.push(a[i])}}return out};
 const ring=(ids,shift)=>{const out=ring0(ids);let cross=false;for(let i=1;i<out.length;i++)if(Math.abs(out[i][0]-out[i-1][0])>180){cross=true;break}return {pts:out,cross}};
 const obj=topo.objects.countries||Object.values(topo.objects)[0];
 const list=[];
 for(const g of obj.geometries||[]){
  const name=(g.properties&&g.properties.name)||'';if(name==='Antarctica')continue;
  const rawPolys=g.type==='Polygon'?[g.arcs]:g.type==='MultiPolygon'?g.arcs:[];if(!rawPolys.length)continue;
  const polys=rawPolys.map(pa=>{const rs=pa.map(a=>ring(a));const shifted=rs[0]&&rs[0].cross;let rings=rs.map((o,i)=>{const r=o.pts;if(o.cross||(shifted&&i>0))for(const q of r)if(q[0]<0)q[0]+=360;return r}).filter(r=>r.length>2);if(!rings.length)return null;for(const r of rings)for(const q of r)q[2]=pvM(q[1]);let x0=360,y0=90,x1=-360,y1=-90;for(const q of rings[0]){if(q[0]<x0)x0=q[0];if(q[0]>x1)x1=q[0];if(q[1]<y0)y0=q[1];if(q[1]>y1)y1=q[1]}return {rings,box:[x0,y0,x1,y1],area:Math.abs(pvRingArea(rings[0]))}}).filter(Boolean);
  if(!polys.length)continue;
  const num=parseInt(g.id,10);let a2=PV_NUM2A2[num]||(name==='Kosovo'?'XK':null);
  const key=a2||('N:'+name);
  let big=polys[0];for(const p of polys)if(p.area>big.area)big=p;
  let x0=360,y0=90,x1=-360,y1=-90;for(const p of polys){x0=Math.min(x0,p.box[0]);y0=Math.min(y0,p.box[1]);x1=Math.max(x1,p.box[2]);y1=Math.max(y1,p.box[3])}
  const ex=list.find(c=>c.key===key);
  if(ex){ex.polys.push(...polys);continue}
  const pin=pvCentroid(big);if(pin[0]>180)pin[0]-=360;list.push({key,a2,name,polys,box:[x0,y0,x1,y1],main:big.box,pin});
 }
 /* Fusion d'affichage personnalisée : Israël et Palestine sont une seule entrée « Palestine ». */
 pvMergePalestine(list);
 return list;
}
function pvMergePalestine(list){
 const parts=list.filter(c=>c.key==='IL'||c.key==='PS'||c.name==='Israel'||c.name==='Palestine');
 if(!parts.length)return;
 const all=parts.flatMap(c=>c.polys);
 const target=parts.find(c=>c.key==='PS')||parts[0];
 for(const c of parts){const i=list.indexOf(c);if(i>=0)list.splice(i,1)}
 target.key='PS';target.a2='PS';target.name='Palestine';target.fr='Palestine';
 pvSetPolys(target,all);
 list.push(target);
}
/* Les territoires français restent des destinations indépendantes. Pas de marqueurs circulaires. */
const PV_TERR=[['MQ','Martinique',14.64,-61.0],['GP','Guadeloupe',16.25,-61.55],['GF','Guyane',4.0,-53.0],['RE','La Réunion',-21.12,55.53],['YT','Mayotte',-12.82,45.15],['PF','Polynésie française',-17.68,-149.45],['NC','Nouvelle-Calédonie',-21.3,165.5],['MF','Saint-Martin',18.08,-63.06],['BL','Saint-Barthélemy',17.9,-62.83],['PM','Saint-Pierre-et-Miquelon',46.83,-56.3],['WF','Wallis-et-Futuna',-13.77,-177.15]];
const PV_FR_GEO='https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions-avec-outre-mer.geojson';
const PV_FR_CODES={'01':'GP','02':'MQ','03':'GF','04':'RE','06':'YT','971':'GP','972':'MQ','973':'GF','974':'RE','976':'YT'};
function pvGeomPolys(geom){
 const groups=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];
 return groups.map(g=>{
  const rings=g.map(r=>r.map(pt=>[pt[0],pt[1],pvM(pt[1])]));if(!rings.length||!rings[0].length)return null;
  const lons=rings[0].map(p=>p[0]),lats=rings[0].map(p=>p[1]);
  const box=[Math.min(...lons),Math.min(...lats),Math.max(...lons),Math.max(...lats)];
  return {rings,box,area:Math.abs(pvRingArea(rings[0]))};
 }).filter(Boolean);
}
function pvSetPolys(c,polys){
 if(!polys.length)return;c.polys=polys;c.pt=false;
 let biggest=polys[0];for(const p of polys)if(p.area>biggest.area)biggest=p;
 c.main=biggest.box;c.pin=pvCentroid(biggest);
 c.box=[Math.min(...polys.map(p=>p.box[0])),Math.min(...polys.map(p=>p.box[1])),Math.max(...polys.map(p=>p.box[2])),Math.max(...polys.map(p=>p.box[3]))];
}
function pvAddTerritories(){
 for(const [a2,name,lat,lon] of PV_TERR){
  if(pv.byKey.has(a2))continue;
  const c={key:a2,a2,name,fr:name,polys:[],pt:false,box:[lon,lat,lon,lat],main:[lon-1.2,lat-1.2,lon+1.2,lat+1.2],pin:[lon,lat]};
  pv.countries.push(c);pv.byKey.set(a2,c);
 }
 /* Si le planisphère intègre les DOM à la France, séparer les morceaux. */
 const fr=pv.byKey.get('FR');if(fr){
  const metro=[];
  for(const p of fr.polys){
   const x=(p.box[0]+p.box[2])/2,y=(p.box[1]+p.box[3])/2;
   const terr=PV_TERR.find(t=>Math.abs(t[3]-x)<6&&Math.abs(t[2]-y)<6);
   if(terr){const c=pv.byKey.get(terr[0]);if(c)c.polys.push(p)}else metro.push(p);
  }
  if(metro.length)pvSetPolys(fr,metro);
  for(const t of PV_TERR){const c=pv.byKey.get(t[0]);if(c&&c.polys.length)pvSetPolys(c,c.polys)}
 }
}
async function pvFetchTerritoryOutlines(){
 /* Un seul téléchargement initial, conservé dans IndexedDB ensuite. */
 let data=null;
 try{const db=await pvDB();data=await new Promise(resolve=>{const q=db.transaction('kv').objectStore('kv').get('fr_outline');q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)})}catch(_){}
 if(!data){
  try{const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);
   const resp=await fetch(PV_FR_GEO,{signal:ctrl.signal});clearTimeout(timer);
   if(resp.ok){data=await resp.json();const db=await pvDB();await new Promise(resolve=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(data,'fr_outline');tx.oncomplete=resolve;tx.onerror=resolve})}
  }catch(_){}
 }
 if(!data||!data.features)return;
 for(const f of data.features){
  const prop=f.properties||{},nm=pvNorm(prop.nom||prop.name||''),code=String(prop.code||'').padStart(2,'0');
  const a2=PV_FR_CODES[code]||({'martinique':'MQ','guadeloupe':'GP','guyane':'GF','la reunion':'RE','mayotte':'YT'})[nm];
  const c=a2&&pv.byKey.get(a2);if(c&&f.geometry)pvSetPolys(c,pvGeomPolys(f.geometry));
 }
 pvRedraw();
}
function pvFrName(c){
 if(c.fr)return c.fr;
 if(c.a2){try{pv.dn=pv.dn||new Intl.DisplayNames(['fr'],{type:'region'});const n=pv.dn.of(c.a2);if(n&&n!==c.a2)return n}catch(_){}}
 return ({'N. Cyprus':'Chypre du Nord','Somaliland':'Somaliland'})[c.name]||c.name;
}
/* ---- stockage ---- */
function pvLoadVisited(){
 const v=get(PV_KEY,{});pv.visited=v&&typeof v==='object'&&!Array.isArray(v)?v:{};
 /* Conserver les anciennes visites : une seule entrée PS ; ne pas écraser une visite existante. */
 if(pv.visited.IL){
  if(!pv.visited.PS)pv.visited.PS=pv.visited.IL;
  else if(!pv.visited.PS.when&&pv.visited.IL.when)pv.visited.PS.when=pv.visited.IL.when;
  delete pv.visited.IL;pvSave();
 }
}
function pvSave(){put(PV_KEY,pv.visited)}
function pvStatus(){const n=Object.keys(pv.visited).length,e=document.getElementById('pv-chip');if(e)e.innerHTML=`<strong>${n}</strong> pays visité${n>1?'s':''} <small>· ${Math.min(100,Math.round(n/195*100))} % du monde</small>`}
/* ---- projection (équirectangulaire) ---- */
function pvSize(){const r=pv.canvas.getBoundingClientRect();return [r.width,r.height]}
function pvToScr(lon,lat,w,h){const v=pv.view;return [w/2+(lon-v.cx)*v.s,h/2-(pvM(lat)-pvM(v.cy))*v.s]}
function pvFromScr(x,y,w,h){const v=pv.view;return [v.cx+(x-w/2)/v.s,pvInvM(pvM(v.cy)-(y-h/2)/v.s)]}
function pvClamp(){const [w]=pvSize(),v=pv.view;v.s=Math.max(w/360,Math.min(80,v.s));v.cx=Math.max(-180,Math.min(180,v.cx));v.cy=Math.max(-58,Math.min(80,v.cy))}
function pvRedraw(){if(pv.raf)return;pv.raf=requestAnimationFrame(()=>{pv.raf=0;pvDraw()})}
function pvDraw(){
 const can=pv.canvas;if(!can||!pv.countries)return;
 const dpr=Math.min(devicePixelRatio||1,2),[w,h]=pvSize();if(!w||!h)return;
 if(can.width!==Math.round(w*dpr)||can.height!==Math.round(h*dpr)){can.width=Math.round(w*dpr);can.height=Math.round(h*dpr)}
 const ctx=can.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle='#cfe5f4';ctx.fillRect(0,0,w,h);
 const v=pv.view,vm=pvM(v.cy),[lonA,latA]=pvFromScr(0,0,w,h),[lonB,latB]=pvFromScr(w,h,w,h);
 const strokeW=v.s>10?1:.6;
 const addPoly=(p,off)=>{
  if(p.box[2]+off<lonA||p.box[0]+off>lonB||p.box[1]>latA||p.box[3]<latB)return;
  for(const r of p.rings){let lx=-1e9,ly=-1e9,first=true;
   for(let i=0;i<r.length;i++){const x=w/2+(r[i][0]+off-v.cx)*v.s,y=h/2-(r[i][2]-vm)*v.s;if(!first&&Math.abs(x-lx)<.6&&Math.abs(y-ly)<.6&&i<r.length-1)continue;if(first){ctx.moveTo(x,y);first=false}else ctx.lineTo(x,y);lx=x;ly=y}
   ctx.closePath()}
 };
 /* Russie : ne dessiner que sa représentation à l'est du méridien 0.
    Évite la copie artificielle à gauche de l'Alaska, liée au passage du 180e méridien. */
 const pathOf=c=>{for(const p of c.polys){addPoly(p,0);if(c.key!=='RU'&&p.box[2]>180)addPoly(p,-360)}};
 const pvRussiaClip=()=>{
  const left=w/2+(0-v.cx)*v.s,right=w/2+(180-v.cx)*v.s;
  ctx.beginPath();ctx.rect(left,0,right-left,h);ctx.clip();
 };
 const drawSet=visitedPass=>{
  for(const c of pv.countries){
   const vis=!!pv.visited[c.key];if(vis!==visitedPass||c.pt)continue;
   if(c.key==='RU'){ctx.save();pvRussiaClip()}
   ctx.beginPath();pathOf(c);
   ctx.fillStyle=vis?'#38a56f':'#f2efe6';ctx.fill('evenodd');
   ctx.lineWidth=strokeW;ctx.strokeStyle=vis?'#1f7a4d':'#b8b3a3';ctx.lineJoin='round';ctx.stroke();
   if(c.key==='RU')ctx.restore();
  }
 };
 drawSet(false);drawSet(true);
 
 const sel=pv.sel&&pv.byKey.get(pv.sel);
 if(sel&&sel.polys.length){if(sel.key==='RU'){ctx.save();pvRussiaClip()}ctx.beginPath();pathOf(sel);ctx.lineWidth=2.4;ctx.strokeStyle='#1779ed';ctx.stroke();if(sel.key==='RU')ctx.restore()}
 if(true){ctx.font='600 12px -apple-system,system-ui,sans-serif';ctx.textAlign='center';
  for(const c of pv.countries){if(!pv.visited[c.key])continue;if(v.s<7)continue;const [x,y]=pvToScr(c.pin[0],c.pin[1],w,h);if(x<0||x>w||y<0||y>h)continue;const n=c.fr||(c.fr=pvFrName(c));ctx.lineWidth=3.5;ctx.strokeStyle='#fffd';ctx.strokeText(n,x,y);ctx.fillStyle='#15263b';ctx.fillText(n,x,y)}}
 ctx.textAlign='left';ctx.fillStyle='#4a5a6c';ctx.font='10px system-ui';ctx.fillText('Fond de carte © Natural Earth',8,h-8);
}
/* ---- interactions ---- */
function pvHit(x,y){
 const [w,h]=pvSize();
 for(const [dx,dy] of [[0,0],[9,0],[-9,0],[0,9],[0,-9]]){
  const [lon,lat]=pvFromScr(x+dx,y+dy,w,h);
  for(const c of pv.countries){if(!c.polys.length||lat<c.box[1]||lat>c.box[3])continue;if(c.key==='RU'&&(lon<0||lon>180))continue;for(const p of c.polys)if(pvInPoly(p,lon,lat)||(c.key!=='RU'&&p.box[2]>180&&pvInPoly(p,lon+360,lat)))return c}
 }
 return null;
}
function pvZoomAt(x,y,f){const [w,h]=pvSize(),v=pv.view,[lon,lat]=pvFromScr(x,y,w,h);v.s*=f;pvClamp();v.cx=lon-(x-w/2)/v.s;v.cy=pvInvM(pvM(lat)+(y-h/2)/v.s);pvClamp();pvRedraw()}
function pvZoomBtn(f){const [w,h]=pvSize();pvZoomAt(w/2,h/2,f)}
function pvSetup(can){
 can.style.touchAction='none';
 can.addEventListener('pointerdown',e=>{can.setPointerCapture(e.pointerId);pv.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pv.tap=pv.pointers.size===1?{x:e.clientX,y:e.clientY,t:Date.now(),moved:false}:null});
 can.addEventListener('pointermove',e=>{
  const old=pv.pointers.get(e.pointerId);if(!old)return;
  const r=can.getBoundingClientRect(),prev=[...pv.pointers.values()].map(p=>({...p}));
  pv.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const v=pv.view;
  if(pv.pointers.size===1){
   if(pv.tap&&Math.hypot(e.clientX-pv.tap.x,e.clientY-pv.tap.y)>7)pv.tap.moved=true;
   if(pv.tap&&!pv.tap.moved)return;
   v.cx-=(e.clientX-old.x)/v.s;v.cy=pvInvM(pvM(v.cy)+(e.clientY-old.y)/v.s);pvClamp();pvRedraw();
  }else if(pv.pointers.size===2){
   pv.tap=null;const now=[...pv.pointers.values()],d=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),pd=d(prev),nd=d(now);
   if(pd>10)pvZoomAt((now[0].x+now[1].x)/2-r.left,(now[0].y+now[1].y)/2-r.top,nd/pd);
  }
 });
 const end=e=>{
  const had=pv.pointers.has(e.pointerId);pv.pointers.delete(e.pointerId);
  if(had&&e.type==='pointerup'&&pv.tap&&!pv.tap.moved&&Date.now()-pv.tap.t<600){const r=can.getBoundingClientRect();pvTap(e.clientX-r.left,e.clientY-r.top)}
  if(!pv.pointers.size)pv.tap=null;
 };
 can.addEventListener('pointerup',end);can.addEventListener('pointercancel',end);
 can.addEventListener('wheel',e=>{e.preventDefault();const r=can.getBoundingClientRect();pvZoomAt(e.clientX-r.left,e.clientY-r.top,e.deltaY>0?.85:1.18)},{passive:false});
}
function pvTap(x,y){const c=pvHit(x,y);if(c)pvSelect(c.key);else{pv.sel=null;pvSheetClose();pvRedraw()}}
/* ---- fiche pays ---- */
function pvSelect(key,focus){
 const c=pv.byKey.get(key);if(!c)return;pv.sel=key;
 if(focus){const [w,h]=pvSize(),b=c.main,bw=Math.max(b[2]-b[0],.5),bh=Math.max(pvM(b[3])-pvM(b[1]),.5),v=pv.view;v.s=Math.min(w*.55/bw,h*.3/bh,14);v.s=Math.max(v.s,w/130);v.cx=(b[0]+b[2])/2;if(v.cx>180)v.cx-=360;v.cy=pvInvM((pvM(b[1])+pvM(b[3]))/2-(h*.18)/v.s);pvClamp()}
 pvSheet(c);pvRedraw();
}
function pvSheet(c){
 const host=document.getElementById('pv-sheet');if(!host)return;
 const rec=pv.visited[c.key],name=c.fr||(c.fr=pvFrName(c));
 host.innerHTML=`<div class="pv-sheet-in"><div class="pv-sheet-head"><span class="pv-flag">${pvFlag(c.a2)}</span><div><strong>${pvEsc(name)}</strong><small>${rec?'✓ Pays visité':'Pas encore visité'}</small></div><button class="pv-x" onclick="pvSheetClose()" aria-label="Fermer">✕</button></div><label>Quand ?</label><input id="pv-when" maxlength="40" placeholder="Ex. été 2023" value="${pvEsc(rec?.when||'')}"><div class="nx-map-buttons">${rec?`<button onclick="pvRemove('${c.key}')">Retirer</button>`:''}<button class="nx-primary" onclick="pvMark('${c.key}')">${rec?'Enregistrer':'✓ Marquer comme visité'}</button></div></div>`;
 host.hidden=false;
}
function pvSheetClose(){const h=document.getElementById('pv-sheet');if(h){h.hidden=true;h.innerHTML=''}pv.sel=null;pvRedraw()}
function pvMark(key){
 const prev=pv.visited[key];
 pv.visited[key]={when:(document.getElementById('pv-when')?.value||'').trim(),note:prev?.note||'',ts:prev?.ts||Date.now()};
 pvSave();pvStatus();const c=pv.byKey.get(key);pvSheet(c);pvRedraw();toast(prev?'Enregistré':'✓ '+(c.fr||c.name)+' marqué visité')
}
function pvRemove(key){delete pv.visited[key];pvSave();pvStatus();const c=pv.byKey.get(key);pvSheet(c);pvRedraw()}
/* ---- recherche & liste ---- */
function pvSearch(q){
 const box=document.getElementById('pv-results');if(!box)return;
 const n=pvNorm(q);if(!n){box.hidden=true;box.innerHTML='';return}
 if(n==='israel'){box.innerHTML='<div class="pv-none">Aucun pays trouvé</div>';box.hidden=false;return;}
 const res=pv.countries.map(c=>({c,fr:c.fr||(c.fr=pvFrName(c))})).filter(x=>pvNorm(x.fr).includes(n)||pvNorm(x.c.name).includes(n)).sort((a,b)=>pvNorm(a.fr).indexOf(n)-pvNorm(b.fr).indexOf(n)||a.fr.localeCompare(b.fr,'fr')).slice(0,8);
 box.innerHTML=res.length?res.map(x=>`<button type="button" onclick="pvPick('${x.c.key.replace(/'/g,"\\'")}')">${pvFlag(x.c.a2)} ${pvEsc(x.fr)}${pv.visited[x.c.key]?' <small>✓</small>':''}</button>`).join(''):'<div class="pv-none">Aucun pays trouvé</div>';
 box.hidden=false;
}
function pvPick(key){const i=document.getElementById('pv-search');if(i){i.value='';i.blur()}pvSearch('');pvSelect(key,true)}
function pvList(){
 const items=Object.keys(pv.visited).map(k=>pv.byKey.get(k)).filter(Boolean).map(c=>({c,fr:c.fr||(c.fr=pvFrName(c))})).sort((a,b)=>a.fr.localeCompare(b.fr,'fr'));
 const m=document.getElementById('pv-modal');if(!m)return;
 m.innerHTML=`<div class="nx-map-dialog" role="dialog" aria-modal="true"><h3>Mes pays visités (${items.length})</h3>${items.length?items.map(x=>`<div class="nx-map-zone pv-row"><span class="pv-flag">${pvFlag(x.c.a2)}</span><div><strong>${pvEsc(x.fr)}</strong><small>${pvEsc(pv.visited[x.c.key].when||'')}</small></div><button onclick="pvListGo('${x.c.key.replace(/'/g,"\\'")}')">Voir</button></div>`).join(''):'<p>Aucun pays marqué pour l’instant. Touche un pays sur la carte, ou cherche-le en haut.</p>'}<div class="nx-map-buttons"><button class="nx-primary" onclick="pvModalClose()">Fermer</button></div></div>`;m.hidden=false;
}
function pvListGo(key){pvModalClose();pvSelect(key,true)}
function pvModalClose(){const m=document.getElementById('pv-modal');if(m){m.hidden=true;m.innerHTML=''}}
function pvRecenter(){const [w]=pvSize();pv.view={cx:12,cy:35,s:Math.max(w/360,w/120)};pvClamp();pvRedraw()}
function pvLeave(){document.body.classList.remove('moto-gps-fullscreen','nx-map-screen-on');pv.canvas=null;pv.pointers.clear();gen2Home()}
/* ---- ouverture ---- */
async function pvOpen(){
 try{motoGPSNavStop();motoGLDestroy()}catch(_){}
 document.body.classList.add('moto-gps-fullscreen','nx-map-screen-on');setHead('Pays visités','');
 content(`<div class="nx-map-shell"><div id="pv-map" class="nx-map-base"><canvas id="pv-canvas" aria-label="Carte du monde"></canvas></div><div class="nx-map-top"><div class="nx-map-toolbar"><button type="button" onclick="pvLeave()" aria-label="Retour">←</button><input id="pv-search" type="search" placeholder="Chercher un pays" autocomplete="off" oninput="pvSearch(this.value)"><button type="button" onclick="pvList()" aria-label="Liste des pays visités">☰</button></div><div id="pv-results" class="pv-results" hidden></div></div><div class="pv-chip" id="pv-chip"></div><div id="pv-msg" class="pv-msg">Chargement du planisphère…</div><div id="pv-sheet" class="pv-sheet" hidden></div><div id="pv-modal" class="nx-map-modal-back" hidden></div></div>`);
 pvLoadVisited();pvStatus();
 pv.canvas=document.getElementById('pv-canvas');pvSetup(pv.canvas);
 const msg=document.getElementById('pv-msg'),say=t=>{if(msg)msg.textContent=t};
 try{
  if(!pv.countries){
   let topo=await pvCacheGet();
   if(!topo){topo=await pvFetchTopo(say);pvCachePut(topo)}
   pv.countries=pvParse(topo);pv.byKey=new Map(pv.countries.map(c=>[c.key,c]));pvAddTerritories();
  }
  if(!pv.canvas)return;
  msg.hidden=true;pvRecenter();pvStatus();pvFetchTerritoryOutlines();
 }catch(e){
  if(msg)msg.innerHTML=`${pvEsc(e.message)}<br><button onclick="pvOpen()">Réessayer</button>`;
 }
}
window.addEventListener('resize',()=>{if(pv.canvas&&pv.view){pvClamp();pvRedraw()}});
