/* 喵迹 Catlas — real app logic
   keyless static PWA: camera + on-device bg removal + breed classify + geo + Leaflet + IndexedDB */
'use strict';

/* ============================ icons ============================ */
const S = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">';
const ICONS = {
  map:    S+'<polygon points="3 7 9 4 15 7 21 4 21 17 15 20 9 17 3 20 3 7"/><line x1="9" y1="4" x2="9" y2="17"/><line x1="15" y1="7" x2="15" y2="20"/></svg>',
  grid:   S+'<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/></svg>',
  camera: S+'<path d="M4 8a2 2 0 0 1 2-2h1.5L9 4h6l1.5 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.3"/></svg>',
  chart:  S+'<line x1="6" y1="20" x2="6" y2="12"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="9"/></svg>',
  user:   S+'<circle cx="12" cy="8" r="3.6"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>',
  locate: S+'<circle cx="12" cy="12" r="7"/><line x1="12" y1="1.5" x2="12" y2="4.5"/><line x1="12" y1="19.5" x2="12" y2="22.5"/><line x1="1.5" y1="12" x2="4.5" y2="12"/><line x1="19.5" y1="12" x2="22.5" y2="12"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/></svg>',
  chevron:S+'<polyline points="15 5 8 12 15 19"/></svg>',
  search: S+'<circle cx="11" cy="11" r="7"/><line x1="16.2" y1="16.2" x2="21" y2="21"/></svg>',
  edit:   S+'<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z"/><line x1="13.5" y1="6.5" x2="17.5" y2="10.5"/></svg>',
  check:  S+'<polyline points="5 12.5 10 17.5 19 6.5"/></svg>',
  pin:    S+'<path d="M12 21s-7-6.4-7-12a7 7 0 0 1 14 0c0 5.6-7 12-7 12z"/><circle cx="12" cy="9" r="2.6"/></svg>',
  calendar:S+'<rect x="4" y="5" width="16" height="16" rx="2.2"/><line x1="4" y1="9.5" x2="20" y2="9.5"/><line x1="9" y1="3" x2="9" y2="6"/><line x1="15" y1="3" x2="15" y2="6"/></svg>',
  repeat: S+'<polyline points="17 1.5 21 5.5 17 9.5"/><path d="M3 11V9.5a4 4 0 0 1 4-4h14"/><polyline points="7 22.5 3 18.5 7 14.5"/><path d="M21 13v1.5a4 4 0 0 1-4 4H3"/></svg>',
  tag:    S+'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V4a1 1 0 0 1 1-1h9l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none"/></svg>',
  close:  S+'<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
  image:  S+'<rect x="3" y="4" width="18" height="16" rx="2.2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M4 18l5-5 4 4 2.5-2.5L21 17"/></svg>'
};
function paintIcons(root){
  (root||document).querySelectorAll('[data-ic]').forEach(e=>{
    if(e._painted) return;
    if(e.dataset.ic==='cat'){ e.textContent = e.dataset.e || '🐱'; e.classList.add('emoji'); }
    else if(ICONS[e.dataset.ic]){ e.innerHTML = ICONS[e.dataset.ic]; }
    e._painted = true;
  });
}

/* ============================ helpers ============================ */
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r=>setTimeout(r,ms));
const escapeHtml = s => (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function blobToImg(blob){
  return new Promise((res,rej)=>{ const img=new Image(); img.onload=()=>res(img); img.onerror=rej; img.src=URL.createObjectURL(blob); });
}
function imgLoaded(el){ return new Promise(r=>{ if(el.complete&&el.naturalWidth) return r(); el.onload=r; el.onerror=r; }); }
function fmtDate(ts){ const d=new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function daysAgo(ts){ const d=Math.floor((Date.now()-ts)/86400000); return d<=0?'今天':(d===1?'昨天':`${d} 天前`); }
function haversine(a,b){
  const R=6371000, t=x=>x*Math.PI/180;
  const dLat=t(b.lat-a.lat), dLng=t(b.lng-a.lng);
  const s=Math.sin(dLat/2)**2 + Math.cos(t(a.lat))*Math.cos(t(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s));
}
function loadScript(src){
  return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
}
const urlCache = new Set();
function objURL(blob){ const u=URL.createObjectURL(blob); urlCache.add(u); return u; }

// ---- image storage helpers ----
// iOS Safari is unreliable storing Blobs in IndexedDB; store ArrayBuffer instead.
function blobToRec(blob){ return blob.arrayBuffer().then(buf=>({buf, type:blob.type||'image/png'})); }
function imgURLFrom(rec){
  if(!rec) return '';
  if(rec instanceof Blob) return objURL(rec);                       // legacy records
  if(rec.buf) return objURL(new Blob([rec.buf], {type:rec.type||'image/png'}));
  return '';
}
function catCutURL(cat){ return imgURLFrom(cat.cut || cat.cutBlob); }
function catThumbURL(cat){ return imgURLFrom(cat.thumb || cat.thumbBlob || cat.cut || cat.cutBlob); }

/* ============================ IndexedDB ============================ */
const DB = (()=>{
  let dbp;
  function open(){
    if(dbp) return dbp;
    dbp = new Promise((res,rej)=>{
      const r = indexedDB.open('catlas', 1);
      r.onupgradeneeded = ()=>{ const db=r.result; if(!db.objectStoreNames.contains('cats')) db.createObjectStore('cats',{keyPath:'id'}); };
      r.onsuccess = ()=>res(r.result);
      r.onerror = ()=>rej(r.error);
    });
    return dbp;
  }
  function tx(mode){ return open().then(db=>db.transaction('cats',mode).objectStore('cats')); }
  return {
    async put(cat){ const st=await tx('readwrite'); return new Promise((res,rej)=>{ const r=st.put(cat); r.onsuccess=()=>res(cat); r.onerror=()=>rej(r.error); }); },
    async all(){ const st=await tx('readonly'); return new Promise((res,rej)=>{ const r=st.getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error); }); },
    async get(id){ const st=await tx('readonly'); return new Promise((res,rej)=>{ const r=st.get(id); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); },
    async del(id){ const st=await tx('readwrite'); return new Promise((res,rej)=>{ const r=st.delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }
  };
})();

let CATS = [];               // in-memory cache of all cats
async function refreshCats(){ CATS = await DB.all(); CATS.sort((a,b)=>b.lastSeen-a.lastSeen); }

/* ============================ background removal (on-device) ============================ */
let _removeBgP;
function ensureRemoveBg(){
  if(_removeBgP) return _removeBgP;
  _removeBgP = (async()=>{
    const mod = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm');
    return mod.removeBackground || mod.default;
  })();
  return _removeBgP;
}
async function removeBg(blob, onProgress){
  const fn = await ensureRemoveBg();
  const base = {
    output: { format: 'image/png' },
    progress: (key, cur, total)=>{ if(onProgress && total) onProgress(Math.min(1, cur/total)); }
  };
  // models live in the *data* package (not the main dist/). Try jsdelivr data pkg first
  // (CDN works well in CN), then fall back to imgly's built-in default CDN.
  const attempts = [
    { publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.5.5/dist/' },
    {} // library default resource CDN
  ];
  let lastErr;
  for(const extra of attempts){
    try{ return await fn(blob, Object.assign({}, base, extra)); }
    catch(e){ lastErr = e; console.warn('removeBg attempt failed', extra.publicPath||'(default)', e); }
  }
  throw lastErr;
}

/* ============================ breed classification (on-device) ============================ */
let _modelP;
function ensureModel(){
  if(_modelP) return _modelP;
  _modelP = (async()=>{
    if(!window.tf) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
    if(!window.mobilenet) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js');
    return window.mobilenet.load({version:2, alpha:1.0}); // most accurate general model
  })();
  return _modelP;
}
// warm up both heavy models while the user is still aiming the camera
function prewarmModels(){ ensureRemoveBg().catch(()=>{}); ensureModel().catch(()=>{}); }
// ImageNet cat classes -> friendly CN names
const CAT_MAP = [
  ['tabby','狸花猫 / 虎斑'], ['tiger cat','虎斑猫'], ['egyptian cat','田园猫'],
  ['persian cat','波斯猫'], ['siamese','暹罗猫'], ['angora','安哥拉猫'], ['lynx','猞猁（野猫）']
];
function toCN(en){ const l=en.toLowerCase(); for(const [k,v] of CAT_MAP){ if(l.includes(k)) return v; } return null; }
async function classify(imgEl){
  const model = await ensureModel();
  const preds = await model.classify(imgEl, 8);
  const seen = new Set(); const cands = [];
  for(const p of preds){ const cn = toCN(p.className); if(cn && !seen.has(cn)){ seen.add(cn); cands.push({cn, prob:p.probability}); } }
  if(cands.length === 0){
    cands.push({cn:'中华田园猫', prob: preds[0] ? preds[0].probability : 0.5, guess:true});
  }
  return cands.slice(0,3);
}

/* ============================ geolocation + reverse geocode ============================ */
function getLocation(){
  return new Promise((res,rej)=>{
    if(!navigator.geolocation) return rej(new Error('no geo'));
    navigator.geolocation.getCurrentPosition(
      p=>res({lat:p.coords.latitude, lng:p.coords.longitude}),
      err=>rej(err),
      {enableHighAccuracy:true, timeout:10000, maximumAge:60000}
    );
  });
}
async function reverseGeocode(lat,lng){
  try{
    const ctrl = new AbortController(); const t=setTimeout(()=>ctrl.abort(), 6000);
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=16&accept-language=zh&lat=${lat}&lon=${lng}`,
      {signal:ctrl.signal, headers:{'Accept':'application/json'}});
    clearTimeout(t);
    const j = await r.json(); const a = j.address || {};
    const city = a.city || a.town || a.county || a.municipality || a.state || '';
    const district = a.district || a.suburb || a.city_district || a.county || a.town || '';
    const road = a.road || a.neighbourhood || a.residential || '';
    return { city, district, road, label: [city, district].filter(Boolean).join(' · ') || '未知地点' };
  }catch(e){
    return { city:'', district:'', road:'', label:`${lat.toFixed(4)}, ${lng.toFixed(4)}` };
  }
}

/* ============================ camera ============================ */
let camStream = null;
async function startCamera(){
  const v = $('cam-video'), hint = $('cam-hint');
  hint.textContent = '正在打开摄像头…';
  try{
    camStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:{ideal:'environment'} }, audio:false });
    v.srcObject = camStream;
    v.setAttribute('playsinline',''); v.muted = true; v.style.display='';
    try{ await v.play(); }catch(e){}   // iOS Safari needs explicit play(), else frames are black
    hint.textContent = '把猫咪放进框里 · 点下方快门';
  }catch(e){
    v.style.display='none';
    hint.textContent = '无法打开摄像头，点「相册」选择照片';
  }
}
function stopCamera(){ if(camStream){ camStream.getTracks().forEach(t=>t.stop()); camStream=null; } }
function drawAndShoot(v){
  const c = document.createElement('canvas');
  c.width = v.videoWidth; c.height = v.videoHeight;
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  c.toBlob(b=>{ if(b) startPipeline(b); }, 'image/jpeg', 0.92);
}
async function capture(){
  const v = $('cam-video');
  if(!camStream){ $('cam-file').click(); return; }
  if(v.readyState < 2 || !v.videoWidth){            // wait for real frames (avoids black captures)
    try{ await v.play(); }catch(e){}
    for(let i=0;i<12 && (v.readyState<2 || !v.videoWidth); i++){ await wait(120); }
  }
  if(v.videoWidth){ drawAndShoot(v); }
  else { toast('相机还没准备好，请稍候再按快门'); }
}

/* ============================ processing pipeline ============================ */
let pending = null;
function setProc(title, sub){ $('procTitle').textContent=title; if(sub!==undefined) $('procSub').textContent=sub; }
function setBar(pct){ $('procBar').style.width = Math.max(6,Math.min(100,pct)) + '%'; }

async function startPipeline(blob){
  pending = { origBlob: blob, cands:null, breed:null, loc:null, place:null, matchId:null };
  go('proc');
  const stage = $('cutstage'); stage.classList.remove('done');
  const outImg = $('cut-out-img'); outImg.classList.remove('on');
  setProc('正在识别猫咪轮廓…','端上模型分割，图片不上传'); setBar(8);

  // downscale first — full-res phone photos make on-device segmentation OOM/fail on iOS Safari
  const work = await downscaleBlob(blob, 1024);
  $('cut-orig-img').src = objURL(work);

  const geoP = getLocation().then(loc=>reverseGeocode(loc.lat,loc.lng).then(pl=>({loc,pl}))).catch(()=>null);
  // classify in parallel with background removal (independent work)
  const classifyP = blobToImg(work).then(img=>classify(img)).catch(e=>{ console.warn('classify failed', e); return [{cn:'中华田园猫', prob:0.5, guess:true}]; });

  let cutBlob;
  try{ cutBlob = await removeBg(work, p=>setBar(8 + p*70)); }
  catch(e){
    console.warn('removeBg failed', e);
    cutBlob = work; pending.cutFailed = true; pending.cutErr = (e && e.message || String(e)).slice(0,90);
  }
  pending.cutBlob = cutBlob;

  outImg.src = objURL(cutBlob); await imgLoaded(outImg);
  setBar(84);
  setProc(pending.cutFailed?'背景去除未成功':'抠图完成', pending.cutFailed?'已用原图，仍可保存':'正在描出轮廓…');
  // natural reveal: background dissolves, white sticker edge traces in
  stage.classList.add('done'); outImg.classList.add('on');
  await wait(950);

  setProc('识别品种…','离线比对常见猫种特征'); setBar(92);
  pending.cands = await classifyP;
  pending.breed = pending.cands[0].cn;
  setBar(96);

  try{ pending.thumbBlob = await makeThumb(cutBlob); }catch(e){ pending.thumbBlob = cutBlob; }

  const g = await geoP;
  if(g){ pending.loc = g.loc; pending.place = g.pl; }
  setBar(100);

  buildNewCard();
  await wait(200);
  go('new');
  if(pending.cutFailed) toast('去背景失败，已用原图 · ' + (pending.cutErr||''));
}

// scale the longest side down to maxDim (keeps aspect); returns original if already small
async function downscaleBlob(blob, maxDim){
  try{
    const img = await blobToImg(blob);
    const long = Math.max(img.naturalWidth, img.naturalHeight) || maxDim;
    const scale = Math.min(1, maxDim/long);
    if(scale >= 1) return blob;
    const w = Math.round(img.naturalWidth*scale), h = Math.round(img.naturalHeight*scale);
    const c = document.createElement('canvas'); c.width=w; c.height=h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return await new Promise(r=>c.toBlob(b=>r(b||blob), 'image/jpeg', 0.9));
  }catch(e){ return blob; }
}

async function makeThumb(blob){
  const img = await blobToImg(blob);
  const size = 256; const c = document.createElement('canvas'); c.width=c.height=size;
  const ctx = c.getContext('2d');
  const r = Math.min(size/img.width, size/img.height);
  const w = img.width*r, h = img.height*r;
  ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
  return new Promise(res=>c.toBlob(b=>res(b||blob),'image/png'));
}

/* ============================ new-card screen ============================ */
function buildNewCard(){
  $('new-cut').src = objURL(pending.cutBlob);
  $('new-name').value = '';
  const badge = $('cut-badge');
  if(badge) badge.innerHTML = pending.cutFailed
    ? `<span class="i" data-ic="image"></span>原图（未去背景）`
    : `<span class="i" data-ic="check"></span>已抠图`;
  paintIcons(badge);
  const note = $('cut-note');
  if(note) note.textContent = pending.cutFailed ? ('去背景失败：' + (pending.cutErr || '未知错误')) : '';

  // breed chips
  const wrap = $('new-breeds'); wrap.innerHTML = '';
  pending.cands.forEach((c,i)=>{
    const el = document.createElement('div');
    el.className = 'chip' + (i===0?' on':'');
    el.innerHTML = `${escapeHtml(c.cn)} <span class="pct">${c.guess?'?':Math.round(c.prob*100)+'%'}</span>`;
    el.onclick = ()=>{ wrap.querySelectorAll('.chip').forEach(x=>x.classList.remove('on')); el.classList.add('on'); pending.breed=c.cn; };
    wrap.appendChild(el);
  });

  // location text
  const city=$('new-loc-city'), sub=$('new-loc-sub');
  if(pending.place){ city.firstChild.nodeValue = pending.place.label; sub.textContent = (pending.place.road||'') + (pending.place.road?' · ':'') + '刚刚'; }
  else { city.firstChild.nodeValue = '未获取位置'; sub.textContent = '点右侧按钮重试定位'; }

  // re-encounter / merge suggestion: nearest existing cat within 60m
  detectMatch();
}
function detectMatch(){
  const box = $('matchBlock'); box.style.display='none'; box.innerHTML=''; pending.matchId=null;
  if(!pending.loc || !CATS.length) return;
  let best=null, bestD=Infinity;
  for(const cat of CATS){ if(cat.lat==null) continue; const d=haversine(pending.loc,{lat:cat.lat,lng:cat.lng}); if(d<bestD){bestD=d;best=cat;} }
  if(best && bestD<=60){
    pending.matchId = best.id;
    box.innerHTML = `
      <div class="match">
        <div class="mt">疑似与 <b>「${escapeHtml(best.nickname)}」</b> 同一只 · ${daysAgo(best.lastSeen)} · 约 ${Math.round(bestD)}m</div>
        <div class="match-actions">
          <button class="btn-same" onclick="markSame()">是</button>
          <button class="btn-new" onclick="dismissMatch()">否</button>
        </div>
      </div>`;
    box.style.display='block';
  }
}
function dismissMatch(){ const b=$('matchBlock'); b.style.display='none'; pending.matchId=null; }
async function markSame(){
  const cat = await DB.get(pending.matchId); if(!cat){ dismissMatch(); return; }
  const t = Date.now();
  cat.encounters = cat.encounters || []; cat.encounters.push({t, lat:pending.loc?pending.loc.lat:null, lng:pending.loc?pending.loc.lng:null});
  cat.count = (cat.count||1)+1; cat.lastSeen = t;
  await DB.put(cat); await refreshCats(); refreshAll();
  toast(`${cat.nickname} · 遇见 +1（共 ${cat.count} 次）`);
  await wait(700); openDetail(cat.id);
}

function pickBreedDefault(){ /* placeholder kept for clarity */ }

async function retryLocate(){
  $('new-loc-city').firstChild.nodeValue='定位中…'; $('new-loc-sub').textContent='';
  try{ const loc=await getLocation(); pending.loc=loc; pending.place=await reverseGeocode(loc.lat,loc.lng);
    $('new-loc-city').firstChild.nodeValue=pending.place.label; $('new-loc-sub').textContent='刚刚'; detectMatch(); }
  catch(e){ $('new-loc-city').firstChild.nodeValue='未获取位置'; $('new-loc-sub').textContent='请检查定位权限'; }
}

let saving = false;
async function save(){
  if(saving) return;
  if(!pending){ go('book'); return; }
  saving = true;
  const t = Date.now();
  let name = ($('new-name').value||'').trim();
  if(!name) name = '无名喵 ' + String(t).slice(-4);
  let cat;
  try{
    // store images as ArrayBuffer (Blobs in IndexedDB are unreliable on iOS Safari)
    const cutRec = await blobToRec(pending.cutBlob);
    const thumbRec = pending.thumbBlob ? await blobToRec(pending.thumbBlob) : cutRec;
    cat = {
      id: 'c_'+t+'_'+Math.floor(Math.random()*1e4),
      nickname: name,
      breed: pending.breed || '未知',
      breedConf: pending.cands && pending.cands[0] && !pending.cands[0].guess ? Math.round(pending.cands[0].prob*100) : null,
      cut: cutRec, thumb: thumbRec,
      lat: pending.loc ? pending.loc.lat : null,
      lng: pending.loc ? pending.loc.lng : null,
      place: pending.place || null,
      firstSeen: t, lastSeen: t, count: 1,
      encounters: [{t, lat:pending.loc?pending.loc.lat:null, lng:pending.loc?pending.loc.lng:null}],
      note: ''
    };
    await Promise.race([ DB.put(cat), new Promise((_,rej)=>setTimeout(()=>rej(new Error('保存超时')), 8000)) ]);
  }catch(e){
    saving = false;
    toast('保存失败：' + (e && e.message || e));
    return;
  }
  pending = null; bookIndex = 0;          // show the newest cat first
  try{ await refreshCats(); refreshAll(); }catch(e){ console.warn('refresh after save failed', e); }
  saving = false;
  toast('已收进图鉴 🐾');
  go('book');                              // navigate right away
}

/* ============================ collection (swipeable card stack) ============================ */
// breed -> uppercase English tag (magazine style)
const BREED_EN = {'中华田园猫':'DOMESTIC','田园猫':'DOMESTIC','狸花猫 / 虎斑':'TABBY','狸花猫':'TABBY','虎斑猫':'TABBY',
  '奶牛猫':'TUXEDO','橘猫 / 田园猫':'GINGER','橘猫':'GINGER','布偶':'RAGDOLL','布偶猫':'RAGDOLL','暹罗猫':'SIAMESE',
  '波斯猫':'PERSIAN','玄猫':'BLACK CAT','安哥拉猫':'ANGORA','异国短毛':'EXOTIC','猞猁（野猫）':'LYNX'};
function breedEN(b){ return BREED_EN[b] || 'CAT'; }
// 1-based sequence number by chronological (firstSeen) order
let _noMap = {};
function rebuildNoMap(){ _noMap = {}; CATS.slice().sort((a,b)=>a.firstSeen-b.firstSeen).forEach((c,i)=>{ _noMap[c.id]=i+1; }); }
function catNo(cat){ return _noMap[cat.id] || 0; }
function no2(n){ return String(n).padStart(2,'0'); }

let bookIndex = 0;
function cardTransform(off, dx, rot){
  if(off===0) return `translateX(${dx}px) rotate(${rot}deg)`;
  const scale = 1 - off*0.04, ty = off*10, tx = off*9;   // side-back offset stack
  return `translateY(${ty}px) translateX(${tx}px) scale(${scale})`;
}
function makeCard(cat, off){
  const thumb = catThumbURL(cat);
  const place = cat.place ? (cat.place.district || cat.place.city || '街角') : '街角';
  const n = catNo(cat);
  const card = document.createElement('div');
  card.className = 'swipe-card'; card.dataset.off = off; card.dataset.id = cat.id;
  card.style.zIndex = String(30 - off);
  card.style.transform = cardTransform(off, 0, 0);
  if(off>0) card.style.boxShadow = 'none';
  card.innerHTML = `<div class="card-photo">${thumb?`<img class="die-cut" src="${thumb}">`:'🐱'}<span class="card-no">${no2(n)}</span></div>
    <div class="card-name">No. ${no2(n)} — ${escapeHtml(cat.nickname)}</div>
    <div class="card-sub">${breedEN(cat.breed)} · ${escapeHtml(place)}</div>`;
  return card;
}
function attachSwipe(card){
  let startX=0, dx=0, dragging=false, moved=false;
  card.addEventListener('pointerdown', e=>{ dragging=true; moved=false; dx=0; startX=e.clientX; card.style.transition='none'; try{card.setPointerCapture(e.pointerId);}catch(_){} });
  card.addEventListener('pointermove', e=>{ if(!dragging) return; dx=e.clientX-startX; if(Math.abs(dx)>6) moved=true; card.style.transform=cardTransform(0, dx, dx/18); });
  const end = ()=>{
    if(!dragging) return; dragging=false; card.style.transition='transform .32s cubic-bezier(.2,.8,.3,1)';
    if(!moved){ openDetail(card.dataset.id); return; }
    const W = card.offsetWidth || 300;
    if(dx < -80 && bookIndex < CATS.length-1){ card.style.transform=cardTransform(0,-W*1.5,-18); setTimeout(()=>{ bookIndex++; renderCollection(); },170); }
    else if(dx > 80 && bookIndex > 0){ card.style.transform=cardTransform(0, W*1.5, 18); setTimeout(()=>{ bookIndex--; renderCollection(); },170); }
    else { card.style.transform=cardTransform(0,0,0); }
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
}
function renderCollection(){
  rebuildNoMap();
  const wrap = $('stack-wrap'), hint = $('stack-hint'), viewAll = $('view-all');
  wrap.innerHTML = '';
  if(!CATS.length){
    $('book-sub').textContent = '图鉴';
    hint.textContent = ''; viewAll.style.display = 'none';
    wrap.innerHTML = `<div class="empty-state"><div class="big"><span class="i die-cut" data-ic="cat" data-e="🐾" style="font-size:40px"></span></div><p>还没有收藏任何猫<br>点下方快门，记录第一只</p></div>`;
    paintIcons(wrap);
    return;
  }
  if(bookIndex < 0) bookIndex = 0;
  if(bookIndex > CATS.length-1) bookIndex = CATS.length-1;
  $('book-sub').textContent = `图鉴 · ${CATS.length} encounters`;
  hint.textContent = `— ${bookIndex+1} / ${CATS.length} · 左右滑动 —`;
  viewAll.style.display = ''; viewAll.textContent = `查看全部 ${CATS.length} 只 ›`;
  // build back-to-front so the current card ends up on top and interactive
  const maxOff = Math.min(2, CATS.length-1-bookIndex);
  for(let off=maxOff; off>=0; off--){ wrap.appendChild(makeCard(CATS[bookIndex+off], off)); }
  const front = wrap.querySelector('.swipe-card[data-off="0"]');
  if(front) attachSwipe(front);
}

/* ============================ all (date-grouped overview) ============================ */
function renderAll(){
  rebuildNoMap();
  const wrap = $('all-wrap'); wrap.innerHTML = '';
  if(!CATS.length){ wrap.innerHTML = `<div class="empty-state"><p>还没有收藏任何猫</p></div>`; return; }
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const byDay = {};
  CATS.slice().sort((a,b)=>b.firstSeen-a.firstSeen).forEach(c=>{
    const d = new Date(c.firstSeen); const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    (byDay[key] = byDay[key] || {d, items:[]}).items.push(c);
  });
  let html = '';
  Object.values(byDay).forEach(g=>{
    html += `<div class="all-group-h">${MON[g.d.getMonth()]} ${g.d.getDate()}</div><div class="all-group-c">${g.items.length} 只</div><div class="all-grid">`;
    g.items.forEach(c=>{
      const thumb = catThumbURL(c);
      html += `<div class="all-item" data-id="${c.id}"><div class="ph">${thumb?`<img class="die-cut" src="${thumb}">`:'🐱'}</div>
        <div class="cap"><span class="no">${no2(catNo(c))}</span>${escapeHtml(c.nickname)}</div></div>`;
    });
    html += `</div>`;
  });
  wrap.innerHTML = html;
  wrap.querySelectorAll('.all-item').forEach(el=> el.onclick = ()=> openDetail(el.dataset.id));
}

/* ============================ detail ============================ */
let detailMap=null, detailMarker=null, currentDetailId=null;
async function openDetail(id){
  const cat = await DB.get(id); if(!cat) return;
  currentDetailId = id;
  rebuildNoMap();
  $('d-hero-img').src = catCutURL(cat);
  const dt = $('d-title'); if(dt) dt.textContent = `No. ${no2(catNo(cat))}`;
  $('d-name').textContent = cat.nickname;
  $('d-breed').textContent = `${cat.breed} · ${breedEN(cat.breed)}` + (cat.breedConf?` · ${cat.breedConf}%`:'');
  $('d-place').textContent = cat.place ? cat.place.label : '未定位';
  $('d-first').textContent = fmtDate(cat.firstSeen);
  $('d-count').innerHTML = `<em>${cat.count}</em> 次`;
  go('detail');
  // mini map
  const wrap = $('d-map-wrap');
  if(cat.lat==null){ wrap.style.display='none'; return; }
  wrap.style.display='';
  setTimeout(()=>{
    if(!window.L) return;
    if(!detailMap){
      detailMap = L.map('detail-map',{zoomControl:false, attributionControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, keyboard:false, tap:false});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(detailMap);
    }
    detailMap.invalidateSize();
    detailMap.setView([cat.lat,cat.lng], 15);
    if(detailMarker) detailMap.removeLayer(detailMarker);
    detailMarker = L.marker([cat.lat,cat.lng], {icon: catIcon(cat)}).addTo(detailMap);
  }, 80);
}
async function reencounter(){
  const cat = await DB.get(currentDetailId); if(!cat) return;
  const t = Date.now(); let loc=null;
  try{ loc = await getLocation(); }catch(e){}
  cat.encounters = cat.encounters||[]; cat.encounters.push({t, lat:loc?loc.lat:null, lng:loc?loc.lng:null});
  cat.count = (cat.count||1)+1; cat.lastSeen = t;
  await DB.put(cat); await refreshCats(); refreshAll();
  $('d-count').innerHTML = `<em>${cat.count}</em> 次`;
  toast(`又见到啦 · 遇见 +1（共 ${cat.count} 次）`);
}

/* ============================ map ============================ */
let map=null, cluster=null;
function catIcon(cat){
  const thumb = catThumbURL(cat);
  const inner = thumb ? `<img src="${thumb}">` : '🐱';
  return L.divIcon({ className:'', html:`<div class="cat-marker">${inner}</div>`, iconSize:[42,42], iconAnchor:[21,21] });
}
function initMap(){
  if(map || !window.L) return;
  map = L.map('map-host',{zoomControl:false, attributionControl:true}).setView([30.26,120.13], 4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap'}).addTo(map);
  cluster = (L.markerClusterGroup ? L.markerClusterGroup({maxClusterRadius:46}) : L.layerGroup());
  map.addLayer(cluster);
}
function renderMap(){
  if(!map) return;
  cluster.clearLayers();
  const pts = [];
  CATS.forEach(cat=>{
    if(cat.lat==null) return;
    const m = L.marker([cat.lat,cat.lng], {icon: catIcon(cat)});
    m.on('click', ()=>openDetail(cat.id));
    cluster.addLayer(m); pts.push([cat.lat,cat.lng]);
  });
  $('map-empty').style.display = pts.length ? 'none' : '';
  if(pts.length){ try{ map.fitBounds(pts, {padding:[60,60], maxZoom:16}); }catch(e){} }
}
function locateMe(){
  if(!map) return;
  map.locate({setView:true, maxZoom:15});
  map.once('locationfound', e=>{
    L.circleMarker(e.latlng,{radius:7, color:'#fff', weight:3, fillColor:'#3b82f6', fillOpacity:1}).addTo(map);
  });
  map.once('locationerror', ()=>toast('定位失败，请检查权限'));
}

/* ============================ stats ============================ */
function renderStats(){
  const total = CATS.length;
  $('st-total').textContent = total;
  const cities = new Set(), breeds = {}; let enc=0;
  CATS.forEach(c=>{ if(c.place&&c.place.city) cities.add(c.place.city); enc += (c.count||1); breeds[c.breed]=(breeds[c.breed]||0)+1; });
  $('st-cities').textContent = cities.size;
  $('st-breeds').textContent = Object.keys(breeds).length;
  $('st-enc').textContent = enc;

  // breed bars
  const bb = $('st-breed-bars');
  const arr = Object.entries(breeds).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const max = arr.length ? arr[0][1] : 1;
  bb.innerHTML = arr.length ? arr.map(([k,v])=>
    `<div class="barrow"><div class="bh"><span>${escapeHtml(k)}</span><span class="val">${v}</span></div><div class="track"><div class="fill" style="width:${Math.round(v/max*100)}%"></div></div></div>`
  ).join('') : `<div class="sec-label" style="margin:0">还没有数据</div>`;

  // city ranks
  const cityCount = {}; CATS.forEach(c=>{ const city=c.place&&c.place.city; if(city) cityCount[city]=(cityCount[city]||0)+1; });
  const cr = $('st-city-ranks');
  const ranks = Object.entries(cityCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
  cr.innerHTML = ranks.length ? ranks.map(([city,n],i)=>
    `<div class="rank"><span class="idx">${no2(i+1)}</span><span class="city">${escapeHtml(city)}</span><span class="c">${n} 只</span></div>`
  ).join('') : `<div class="sec-label" style="margin:0">还没有定位过的猫</div>`;

  // monthly trend (last 6 months)
  const now = new Date(); const months=[]; const counts=[];
  for(let i=5;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i, 1); months.push((d.getMonth()+1)+'月'); counts.push(0); }
  const base = new Date(now.getFullYear(), now.getMonth()-5, 1).getTime();
  CATS.forEach(c=>{ const d=new Date(c.firstSeen); const idx=(d.getFullYear()-new Date(base).getFullYear())*12 + (d.getMonth()-new Date(base).getMonth()); if(idx>=0&&idx<6) counts[idx]++; });
  const cmax = Math.max(1, ...counts);
  $('st-months').innerHTML = months.map((m,i)=>
    `<div class="m"><div class="col" style="height:${Math.round(counts[i]/cmax*100)}%"></div><span class="ml">${m}</span></div>`
  ).join('');
}

/* ============================ navigation ============================ */
const tabScreens = ['map','book','stats'];
function go(id){
  if(id!=='cam') stopCamera();
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el = $('s-'+id); if(el) el.classList.add('active');
  const showChrome = tabScreens.includes(id);
  $('tabbar').style.display = showChrome ? 'flex' : 'none';
  $('shutter').style.display = showChrome ? 'flex' : 'none';
  // map's 'me'/'stats' share highlight; keep book highlighted when on overview
  const hi = (id==='all') ? 'book' : id;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on', t.dataset.s===hi));
  onEnter(id);
}
function onEnter(id){
  if(id==='map'){ initMap(); setTimeout(()=>{ if(map){ map.invalidateSize(); renderMap(); } }, 60); }
  else if(id==='cam'){ startCamera(); prewarmModels(); }
  else if(id==='book'){ renderCollection(); }
  else if(id==='all'){ renderAll(); }
  else if(id==='stats'){ renderStats(); }
}
function refreshAll(){ updateStatPill(); if(map) renderMap(); }
function updateStatPill(){
  $('stat-cats').textContent = CATS.length;
  const places = new Set(CATS.filter(c=>c.place&&c.place.city).map(c=>c.place.city)); $('stat-places').textContent = places.size;
  const breeds = new Set(CATS.map(c=>c.breed)); $('stat-breeds').textContent = breeds.size;
}

/* ============================ toast ============================ */
function toast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),1600); }

/* ============================ expose for inline handlers ============================ */
Object.assign(window, { go, capture, save, markSame, dismissMatch, retryLocate, reencounter, locateMe, openDetail });

/* ============================ init ============================ */
async function init(){
  paintIcons();
  // photo-from-album fallback
  $('cam-file').addEventListener('change', e=>{ const f=e.target.files&&e.target.files[0]; if(f) startPipeline(f); e.target.value=''; });

  await refreshCats();
  updateStatPill();
  onEnter('book'); // default screen: 图鉴

  // Caching disabled while iterating — kill any old service worker + caches so updates always land
  if('serviceWorker' in navigator){ navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{}); }
  if(window.caches){ caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{}); }
}
init();
