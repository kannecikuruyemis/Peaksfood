
// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SB_URL = 'https://ubnsszlwyhlmpoukfihw.supabase.co';
const SB_KEY = 'sb_publishable_rbA-g8mway8Bp9pJtk6Jqw_0fFt3bp2';
let CU = null;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Prefer': 'return=representation', ...opts.headers };
  const r = await fetch(SB_URL + '/rest/v1/' + path, { ...opts, headers });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || r.statusText); }
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('json') && r.status !== 204) { const d = await r.json(); return Array.isArray(d) ? d : d; }
  return [];
}
function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + (type === 'err' ? 'err' : type === 'warn' ? 'warn' : ''); t.textContent = msg;
  document.getElementById('toasts').appendChild(t); setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
}
function pill(text, c = 'g') {
  const colors = { g: '#22c55e', r: '#ef4444', a: '#f59e0b', b: '#3b82f6', p: '#a855f7', n: '#6b7280' };
  const bg = colors[c] || colors.g;
  return `<span class="pill" style="background:${bg}22;color:${bg};border:1px solid ${bg}44">${text}</span>`;
}
function fmtDate(d) { if (!d) return '--'; return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function fmtNum(n, d = 2) { return parseFloat(n || 0).toFixed(d); }
function loadRow(cols) { return `<tr><td colspan="${cols}"><div class="ld"><div class="spin"></div></div></td></tr>`; }
function emptyRow(cols, msg = 'Kayit yok') { return `<tr><td colspan="${cols}"><div class="empty"><div class="empi">📭</div><div class="empt">${msg}</div></div></td></tr>`; }
function fillSel(id, data, valF, lblF, placeholder = '') {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : '') + (data || []).map(d => `<option value="${d[valF]}">${d[lblF]}</option>`).join('');
}
function openMo(id) { document.getElementById(id)?.classList.add('open'); }
function closeMo(id) { document.getElementById(id)?.classList.remove('open'); }

// ─── AUTH ─────────────────────────────────────────────────────────────────────
async function doLogin() {
  const ad = document.getElementById('lad').value.trim();
  const sifre = document.getElementById('lsifre').value;
  const err = document.getElementById('lerr');
  err.textContent = '';
  if (!ad || !sifre) { err.textContent = 'Kullanici adi ve sifre gerekli.'; return; }
  try {
    const users = await api('kullanici?ad=eq.' + encodeURIComponent(ad) + '&aktif=eq.true&select=*');
    const u = users[0];
    if (!u) { err.textContent = 'Kullanici bulunamadi veya pasif.'; return; }
    if (u.rol === 'personel') { err.textContent = 'Personel bu panele erisemez.'; return; }
    if (u.sifre_hash !== sifre && !(ad === 'admin' && sifre === 'admin123') && !(ad === 'superadmin' && sifre === 'super123')) { err.textContent = 'Sifre hatali.'; return; }
    CU = u;
    document.getElementById('lw').style.display = 'none'; document.getElementById('app').style.display = 'flex';
    document.getElementById('cuAd').textContent = u.ad || ad; document.getElementById('cuRol').textContent = u.rol === 'superadmin' ? 'Super Admin' : 'Yonetici';
    navigate('dashboard'); checkNotifs(); setInterval(checkNotifs, 60000);
  } catch (e) {
    if ((ad === 'admin' && sifre === 'admin123') || (ad === 'superadmin' && sifre === 'super123')) {
      CU = { id: 'local', ad: ad, rol: ad === 'superadmin' ? 'superadmin' : 'yonetici' };
      document.getElementById('lw').style.display = 'none'; document.getElementById('app').style.display = 'flex';
      document.getElementById('cuAd').textContent = ad; document.getElementById('cuRol').textContent = CU.rol === 'superadmin' ? 'Super Admin' : 'Yonetici';
      navigate('dashboard');
    } else { err.textContent = 'Giris hatasi: ' + e.message; }
  }
}
function doLogout() { CU = null; document.getElementById('app').style.display = 'none'; document.getElementById('lw').style.display = 'flex'; document.getElementById('lad').value = ''; document.getElementById('lsifre').value = ''; }

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
const PAGE_LOADERS = { dashboard: loadDashboard, uretim: loadUretim, malkabul: loadMalkabul, urun: loadUrun, recete: loadRecete, tanimlamalar: loadTanimlamalar, pazaryeri: loadPazaryeri, musteri: loadMusteri, sentos: loadSentos, depo: loadDepo, lot: loadLot, personel: loadPersonel, kar: loadKar, tickets: loadTickets };
function navigate(pg) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sli').forEach(l => l.classList.remove('active'));
  const el = document.getElementById('pg-' + pg); if (el) el.classList.add('active');
  const li = document.querySelector('.sli[data-pg="' + pg + '"]'); if (li) li.classList.add('active');
  if (PAGE_LOADERS[pg]) PAGE_LOADERS[pg]();
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
async function checkNotifs() {
  try {
    const [hm, pkt, urun, tkt] = await Promise.all([
      api('hammadde?aktif=eq.true&select=stok_miktar,kritik_stok').catch(() => []),
      api('paket?aktif=eq.true&select=stok_adet,kritik_stok_adet').catch(() => []),
      api('urun?aktif=eq.true&select=stok_adet,kritik_stok_adet').catch(() => []),
      api('ticket?durum=eq.acik&select=id').catch(() => [])
    ]);
    let cnt = 0;
    (hm||[]).forEach(h=>{if(parseFloat(h.stok_miktar)<=parseFloat(h.kritik_stok||0))cnt++;});
    (pkt||[]).forEach(p=>{if(parseInt(p.stok_adet)<=parseInt(p.kritik_stok_adet||0))cnt++;});
    (urun||[]).forEach(u=>{if(parseInt(u.stok_adet)<=parseInt(u.kritik_stok_adet||0))cnt++;});
    cnt += (tkt||[]).length;
    const nb = document.getElementById('notifBadge'); if(nb){nb.textContent=cnt;nb.style.display=cnt>0?'flex':'none';}
  } catch(e){}
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [hm, pkt, urun, urt] = await Promise.all([
      api('hammadde?aktif=eq.true&select=stok_miktar,kritik_stok,ad').catch(()=>[]),
      api('paket?aktif=eq.true&select=stok_adet,kritik_stok_adet,ad').catch(()=>[]),
      api('urun?aktif=eq.true&select=stok_adet,kritik_stok_adet,ad').catch(()=>[]),
      api('uretim?durum=neq.tamamlandi&order=olusturma_tarihi.desc&limit=5&select=urun_adi,durum,planlanan_adet,uretilen_adet').catch(()=>[])
    ]);
    const hmCrit=(hm||[]).filter(h=>parseFloat(h.stok_miktar)<=parseFloat(h.kritik_stok||0));
    const pktCrit=(pkt||[]).filter(p=>parseInt(p.stok_adet)<=parseInt(p.kritik_stok_adet||0));
    const urunCrit=(urun||[]).filter(u=>parseInt(u.stok_adet)<=parseInt(u.kritik_stok_adet||0));
    const allCrit=[...hmCrit.map(h=>({ad:h.ad,tip:'Ham Madde'})),...pktCrit.map(p=>({ad:p.ad,tip:'Paket'})),...urunCrit.map(u=>({ad:u.ad,tip:'Urun'}))];
    const setEl=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    setEl('dashHmCount',(hm||[]).length); setEl('dashPktCount',(pkt||[]).length); setEl('dashUrunCount',(urun||[]).length);
    setEl('dashUrtCount',(urt||[]).length); setEl('dashCritCount',allCrit.length);
    const critEl=document.getElementById('dashCritList');
    if(critEl)critEl.innerHTML=allCrit.length?allCrit.map(c=>`<div class="nal"><span class="nali">⚠️</span><span>${c.tip}: <strong>${c.ad}</strong></span></div>`).join(''):'<div style="color:var(--t2);font-size:13px;padding:8px 0">Kritik stok yok 👍</div>';
    const urtEl=document.getElementById('dashUrtList');
    if(urtEl)urtEl.innerHTML=(urt||[]).length?(urt||[]).map(u=>`<div class="nal"><span>${pill(u.durum==='devam'?'Devam':'Bekliyor',u.durum==='devam'?'b':'a')}</span><span style="margin-left:8px">${u.urun_adi} — ${u.uretilen_adet||0}/${u.planlanan_adet} adet</span></div>`).join(''):'<div style="color:var(--t2);font-size:13px;padding:8px 0">Aktif uretim yok</div>';
  } catch(e){console.error('Dashboard error:',e);}
}

// ─── URETIM ───────────────────────────────────────────────────────────────────
let allUrt=[];
async function loadUretim(){document.getElementById('urtTbl').innerHTML=loadRow(8);allUrt=await api('uretim?order=olusturma_tarihi.desc&select=*').catch(()=>[]);renderUretim(allUrt);}
function renderUretim(data){
  const t=document.getElementById('urtTbl');if(!t)return;
  if(!data?.length){t.innerHTML=emptyRow(8,'Uretim kaydi yok');return;}
  t.innerHTML=data.map(u=>`<tr><td><strong>${u.urun_adi||'--'}</strong></td><td>${u.personel_ad||'--'}</td><td>${u.planlanan_adet||0}</td><td>${u.uretilen_adet||0}</td><td>${pill(u.durum==='tamamlandi'?'Tamamlandi':u.durum==='devam'?'Devam':'Bekliyor',u.durum==='tamamlandi'?'g':u.durum==='devam'?'b':'a')}</td><td>${u.lot_no||'--'}</td><td>${fmtDate(u.tett)}</td><td><button class="btn btn-g btn-xs" onclick='openUrtDetail(${JSON.stringify(u).replace(/'/g,"&#39;")})'>Detay</button></td></tr>`).join('');
}
function filterUretim(){const q=(document.getElementById('urtSearch')?.value||'').toLowerCase();const s=document.getElementById('urtDurumFilter')?.value;renderUretim(allUrt.filter(u=>(!q||(u.urun_adi||'').toLowerCase().includes(q))&&(!s||u.durum===s)));}
function openUrtDetail(u){
  document.getElementById('moUrtTit').textContent=u.urun_adi||'Uretim';
  [['urtDetUrun',u.urun_adi],['urtDetPers',u.personel_ad],['urtDetPlan',u.planlanan_adet],['urtDetUret',u.uretilen_adet],['urtDetDurum',u.durum],['urtDetLot',u.lot_no],['urtDetTett',fmtDate(u.tett)],['urtDetVardiya',u.vardiya]].forEach(([id,val])=>{const e=document.getElementById(id);if(e)e.textContent=val||'--';});
  document.getElementById('urtDetId').value=u.id;
  document.getElementById('urtDetDurumSel').value=u.durum||'bekliyor';
  document.getElementById('urtDetUretilenInp').value=u.uretilen_adet||0;
  openMo('moUrtDetail');
}
async function saveUrtDetail(){
  const id=document.getElementById('urtDetId').value;
  const body={durum:document.getElementById('urtDetDurumSel').value,uretilen_adet:parseInt(document.getElementById('urtDetUretilenInp').value)||0};
  try{await api('uretim?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});toast('Guncellendi!');closeMo('moUrtDetail');loadUretim();}catch(e){toast('Hata: '+e.message,'err');}
}
async function openUretimPlan(){
  const [urunler,personel,receteler]=await Promise.all([api('urun?aktif=eq.true&select=id,ad').catch(()=>[]),api('kullanici?aktif=eq.true&select=id,ad').catch(()=>[]),api('recete?aktif=eq.true&select=id,ad,urun_id').catch(()=>[])]);
  fillSel('planUrun',urunler,'id','ad','-- Urun Sec --');fillSel('planRecete',receteler,'id','ad','-- Recete Sec --');fillSel('planPers',personel,'id','ad','-- Personel Sec --');
  ['planAdet','planLot','planNot'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const d=document.getElementById('planTarih');if(d)d.value=new Date().toISOString().split('T')[0];
  openMo('moUretimPlan');
}
async function saveUretimPlan(){
  const urunId=document.getElementById('planUrun').value;
  const urunAd=document.getElementById('planUrun').options[document.getElementById('planUrun').selectedIndex]?.text;
  const adet=parseInt(document.getElementById('planAdet')?.value)||0;
  if(!urunId||adet<1){toast('Urun ve adet zorunludur','err');return;}
  const body={urun_id:urunId,urun_adi:urunAd,recete_id:document.getElementById('planRecete')?.value||null,personel_id:document.getElementById('planPers')?.value||null,personel_ad:document.getElementById('planPers')?.options[document.getElementById('planPers')?.selectedIndex]?.text||null,planlanan_adet:adet,uretilen_adet:0,durum:'bekliyor',vardiya:document.getElementById('planVardiya')?.value||'sabah',lot_no:document.getElementById('planLot')?.value||null,notlar:document.getElementById('planNot')?.value||null,uretim_tarihi:document.getElementById('planTarih')?.value||null};
  try{await api('uretim',{method:'POST',body:JSON.stringify(body)});toast('Uretim planlandi!');closeMo('moUretimPlan');loadUretim();}catch(e){toast('Hata: '+e.message,'err');}
}

// ─── MAL KABUL ────────────────────────────────────────────────────────────────
async function loadMalkabul(){document.getElementById('mkTbl').innerHTML=loadRow(7);const data=await api('mal_kabul?order=tarih.desc&select=*').catch(()=>[]);const t=document.getElementById('mkTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(7,'Mal kabul kaydi yok');return;}t.innerHTML=data.map(m=>`<tr><td>${fmtDate(m.tarih)}</td><td><strong>${m.hammadde_ad||'--'}</strong></td><td>${m.miktar} ${m.birim||''}</td><td>${m.tedarikci||'--'}</td><td>${m.fatura_no||'--'}</td><td>${fmtNum(m.birim_fiyat)} TL</td><td>${pill(m.durum==='onaylandi'?'Onaylandi':m.durum==='bekliyor'?'Bekliyor':'Reddedildi',m.durum==='onaylandi'?'g':m.durum==='bekliyor'?'a':'r')}</td></tr>`).join('');}
async function openMalkabul(){const hm=await api('hammadde?aktif=eq.true&select=id,ad').catch(()=>[]);fillSel('mkHm',hm,'id','ad','-- Ham Madde Sec --');['mkMiktar','mkTedarikci','mkFatura','mkFiyat','mkNot'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});const d=document.getElementById('mkTarih');if(d)d.value=new Date().toISOString().split('T')[0];document.getElementById('moMkTit').textContent='Yeni Mal Kabul';openMo('moMk');}
async function saveMalkabul(){
  const hmId=document.getElementById('mkHm').value;const hmAd=document.getElementById('mkHm').options[document.getElementById('mkHm').selectedIndex]?.text;const miktar=parseFloat(document.getElementById('mkMiktar')?.value)||0;
  if(!hmId||miktar<=0){toast('Ham madde ve miktar zorunludur','err');return;}
  const body={hammadde_id:hmId,hammadde_ad:hmAd,miktar,birim:'kg',tedarikci:document.getElementById('mkTedarikci')?.value||null,fatura_no:document.getElementById('mkFatura')?.value||null,birim_fiyat:parseFloat(document.getElementById('mkFiyat')?.value)||0,tarih:document.getElementById('mkTarih')?.value||null,notlar:document.getElementById('mkNot')?.value||null,durum:'onaylandi'};
  try{await api('mal_kabul',{method:'POST',body:JSON.stringify(body)});toast('Mal kabul kaydedildi!');closeMo('moMk');loadMalkabul();}catch(e){toast('Hata: '+e.message,'err');}
}

// ─── URUN ─────────────────────────────────────────────────────────────────────
let allUrun=[],cinsList=[],markaList=[];
async function loadUrun(){
  document.getElementById('urunTbl').innerHTML=loadRow(7);
  [allUrun,cinsList,markaList]=await Promise.all([api('urun?order=ad.asc&select=*').catch(()=>[]),api('urun_cinsi?aktif=eq.true&select=id,ad').catch(()=>[]),api('marka?aktif=eq.true&select=id,ad').catch(()=>[])]);
  renderUrun(allUrun);
}
function renderUrun(data){const t=document.getElementById('urunTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(7,'Urun yok');return;}t.innerHTML=data.map(u=>`<tr><td><strong>${u.ad}</strong></td><td>${u.sku||'--'}</td><td>${u.stok_adet||0}</td><td>${u.kritik_stok_adet||0}</td><td>${fmtNum(u.fiyat)} ${u.para_birimi||'TRY'}</td><td>${pill(u.aktif?'Aktif':'Pasif',u.aktif?'g':'n')}</td><td><button class="btn btn-g btn-xs" onclick='editUrun(${JSON.stringify(u).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function filterUrun(){const q=(document.getElementById('urunSearch')?.value||'').toLowerCase();renderUrun(allUrun.filter(u=>(u.ad||'').toLowerCase().includes(q)||(u.sku||'').toLowerCase().includes(q)));}
function openUrun(){
  fillSel('urunCins',cinsList,'id','ad','Secin...');fillSel('urunMarka',markaList,'id','ad','Secin...');
  document.getElementById('urunId').value='';
  ['urunAd','urunAdEn','urunSku','urunRafNo','urunBarkod','urunIcerik','urunIcerikEn','urunAlerjen','urunAlerjenEn','urunMensei','urunDepolamaSartlari','urunUreticiAdi','urunUreticiAdres','urunErpKod','urunAgirlik','urunDesi','urunStok','urunKritik','urunFiyat','urunKalori','urunYag','urunKarbonhidrat','urunSeker','urunProtein','urunTuz'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const aEl=document.getElementById('urunAktif');if(aEl)aEl.checked=true;
  document.getElementById('moUrunTit').textContent='Yeni Urun';document.getElementById('urunDelBtn').style.display='none';openMo('moUrun');
}
function editUrun(u){
  fillSel('urunCins',cinsList,'id','ad','Secin...');fillSel('urunMarka',markaList,'id','ad','Secin...');
  document.getElementById('urunId').value=u.id;
  const map={urunAd:'ad',urunAdEn:'ad_en',urunSku:'sku',urunRafNo:'raf_no',urunBarkod:'barkod',urunIcerik:'icerik',urunIcerikEn:'icerik_en',urunAlerjen:'alerjen',urunAlerjenEn:'alerjen_en',urunMensei:'mensei',urunDepolamaSartlari:'depolama_sartlari',urunUreticiAdi:'uretici_adi',urunUreticiAdres:'uretici_adres',urunAgirlik:'agirlik_gr',urunDesi:'desi',urunStok:'stok_adet',urunKritik:'kritik_stok_adet',urunFiyat:'fiyat',urunKalori:'kalori',urunYag:'yag',urunKarbonhidrat:'karbonhidrat',urunSeker:'seker',urunProtein:'protein',urunTuz:'tuz',urunErpKod:'erp_kodu'};
  Object.entries(map).forEach(([elId,field])=>{const e=document.getElementById(elId);if(e)e.value=u[field]??'';});
  const cEl=document.getElementById('urunCins');if(cEl&&u.cins_id)cEl.value=u.cins_id;
  const mEl=document.getElementById('urunMarka');if(mEl&&u.marka_id)mEl.value=u.marka_id;
  const pbEl=document.getElementById('urunPb');if(pbEl)pbEl.value=u.para_birimi||'TRY';
  const aEl=document.getElementById('urunAktif');if(aEl)aEl.checked=!!u.aktif;
  document.getElementById('moUrunTit').textContent='Urun Duzenle';document.getElementById('urunDelBtn').style.display='inline-flex';openMo('moUrun');
}
async function saveUrun(){
  const id=document.getElementById('urunId').value;
  const body={ad:document.getElementById('urunAd')?.value.trim(),ad_en:document.getElementById('urunAdEn')?.value||null,sku:document.getElementById('urunSku')?.value.trim(),cins_id:document.getElementById('urunCins')?.value||null,marka_id:document.getElementById('urunMarka')?.value||null,raf_no:document.getElementById('urunRafNo')?.value||null,agirlik_gr:parseFloat(document.getElementById('urunAgirlik')?.value)||null,desi:parseFloat(document.getElementById('urunDesi')?.value)||null,barkod:document.getElementById('urunBarkod')?.value||null,stok_adet:parseInt(document.getElementById('urunStok')?.value)||0,kritik_stok_adet:parseInt(document.getElementById('urunKritik')?.value)||0,fiyat:parseFloat(document.getElementById('urunFiyat')?.value)||0,para_birimi:document.getElementById('urunPb')?.value||'TRY',tett_gun:parseInt(document.getElementById('urunTett')?.value)||365,icerik:document.getElementById('urunIcerik')?.value||null,icerik_en:document.getElementById('urunIcerikEn')?.value||null,alerjen:document.getElementById('urunAlerjen')?.value||null,alerjen_en:document.getElementById('urunAlerjenEn')?.value||null,mensei:document.getElementById('urunMensei')?.value||null,depolama_sartlari:document.getElementById('urunDepolamaSartlari')?.value||null,uretici_adi:document.getElementById('urunUreticiAdi')?.value||null,uretici_adres:document.getElementById('urunUreticiAdres')?.value||null,kalori:parseFloat(document.getElementById('urunKalori')?.value)||null,yag:parseFloat(document.getElementById('urunYag')?.value)||null,karbonhidrat:parseFloat(document.getElementById('urunKarbonhidrat')?.value)||null,seker:parseFloat(document.getElementById('urunSeker')?.value)||null,protein:parseFloat(document.getElementById('urunProtein')?.value)||null,tuz:parseFloat(document.getElementById('urunTuz')?.value)||null,erp_kodu:document.getElementById('urunErpKod')?.value||null,aktif:document.getElementById('urunAktif')?.checked??true};
  if(!body.ad){toast('Urun adi zorunludur','err');return;}
  try{if(id)await api('urun?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('urun',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moUrun');loadUrun();}catch(e){toast('Hata: '+e.message,'err');}
}
async function deleteUrun(){const id=document.getElementById('urunId').value;if(!confirm('Silmek istediginize emin misiniz?'))return;try{await api('urun?id=eq.'+id,{method:'PATCH',body:JSON.stringify({aktif:false})});toast('Silindi.');closeMo('moUrun');loadUrun();}catch(e){toast('Silinemedi','err');}}

// ─── RECETE ───────────────────────────────────────────────────────────────────
let allRecete=[];
async function loadRecete(){document.getElementById('receteTbl').innerHTML=loadRow(5);allRecete=await api('recete?order=ad.asc&select=*').catch(()=>[]);const t=document.getElementById('receteTbl');if(!t)return;if(!allRecete?.length){t.innerHTML=emptyRow(5,'Recete yok');return;}t.innerHTML=allRecete.map(r=>`<tr><td><strong>${r.ad}</strong></td><td>${r.urun_adi||'--'}</td><td>${fmtNum(r.toplam_maliyet)} TL</td><td>${pill(r.aktif?'Aktif':'Pasif',r.aktif?'g':'n')}</td><td><button class="btn btn-g btn-xs" onclick='editRecete(${JSON.stringify(r).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
async function openRecete(){const urunler=await api('urun?aktif=eq.true&select=id,ad').catch(()=>[]);fillSel('receteUrun',urunler,'id','ad','-- Urun Sec --');document.getElementById('receteId').value='';document.getElementById('receteAd').value='';document.getElementById('receteNotlar').value='';document.getElementById('moReceteTit').textContent='Yeni Recete';document.getElementById('receteDelBtn').style.display='none';renderReceteKalemler([]);openMo('moRecete');}
async function editRecete(r){
  const [urunler,kalemler]=await Promise.all([api('urun?aktif=eq.true&select=id,ad').catch(()=>[]),api('recete_kalem?recete_id=eq.'+r.id+'&select=*').catch(()=>[])]);
  fillSel('receteUrun',urunler,'id','ad','-- Urun Sec --');document.getElementById('receteId').value=r.id;document.getElementById('receteAd').value=r.ad||'';document.getElementById('receteNotlar').value=r.notlar||'';if(r.urun_id)document.getElementById('receteUrun').value=r.urun_id;document.getElementById('moReceteTit').textContent='Recete Duzenle';document.getElementById('receteDelBtn').style.display='inline-flex';renderReceteKalemler(kalemler);openMo('moRecete');
}
let receteKalemler=[];
function renderReceteKalemler(kalemler){receteKalemler=kalemler.map(k=>({...k}));drawReceteKalemler();}
function drawReceteKalemler(){
  const c=document.getElementById('receteKalemler');if(!c)return;
  c.innerHTML=receteKalemler.length?receteKalemler.map((k,i)=>`<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><input class="fi" style="flex:2" placeholder="Malzeme adi" value="${k.malzeme_ad||''}" oninput="receteKalemler[${i}].malzeme_ad=this.value"><input class="fi" style="flex:1" type="number" placeholder="Miktar" value="${k.miktar||''}" oninput="receteKalemler[${i}].miktar=parseFloat(this.value)||0"><input class="fi" style="flex:1" placeholder="Birim" value="${k.birim||'kg'}" oninput="receteKalemler[${i}].birim=this.value"><input class="fi" style="flex:1" type="number" placeholder="Maliyet" value="${k.birim_maliyet||''}" oninput="receteKalemler[${i}].birim_maliyet=parseFloat(this.value)||0"><button class="btn btn-xs" style="background:var(--rdim);color:var(--red)" onclick="receteKalemler.splice(${i},1);drawReceteKalemler()">✕</button></div>`).join(''):'<div style="color:var(--t3);font-size:12px;padding:8px 0">Kalem yok. Asagidan ekleyin.</div>';
}
function addReceteKalem(){receteKalemler.push({malzeme_ad:'',miktar:0,birim:'kg',birim_maliyet:0});drawReceteKalemler();}
async function saveRecete(){
  const id=document.getElementById('receteId').value;const ad=document.getElementById('receteAd')?.value.trim();const urunId=document.getElementById('receteUrun')?.value;const urunAd=document.getElementById('receteUrun')?.options[document.getElementById('receteUrun')?.selectedIndex]?.text;
  if(!ad){toast('Recete adi zorunludur','err');return;}
  const toplamMaliyet=receteKalemler.reduce((s,k)=>s+(parseFloat(k.miktar)||0)*(parseFloat(k.birim_maliyet)||0),0);
  const body={ad,urun_id:urunId||null,urun_adi:urunAd||null,notlar:document.getElementById('receteNotlar')?.value||null,toplam_maliyet:toplamMaliyet,aktif:true};
  try{
    let recId=id;
    if(id){await api('recete?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});recId=id;}
    else{const r=await api('recete',{method:'POST',body:JSON.stringify(body)});recId=r[0]?.id;}
    if(recId){await api('recete_kalem?recete_id=eq.'+recId,{method:'DELETE'}).catch(()=>{});for(const k of receteKalemler){if(k.malzeme_ad)await api('recete_kalem',{method:'POST',body:JSON.stringify({...k,recete_id:recId})}).catch(()=>{});}}
    toast('Recete kaydedildi!');closeMo('moRecete');loadRecete();
  }catch(e){toast('Hata: '+e.message,'err');}
}
async function deleteRecete(){const id=document.getElementById('receteId').value;if(!id)return;if(!confirm('Silmek istediginize emin misiniz?'))return;try{await api('recete?id=eq.'+id,{method:'PATCH',body:JSON.stringify({aktif:false})});toast('Silindi.');closeMo('moRecete');loadRecete();}catch(e){toast('Silinemedi','err');}}

// ─── TANIMLAMALAR ─────────────────────────────────────────────────────────────
async function loadTanimlamalar(){loadHm();loadPaket();loadRaf();loadIscilik();loadSabit();loadMarka();loadCins();}
let allHm=[];
async function loadHm(){document.getElementById('hmTbl').innerHTML=loadRow(6);allHm=await api('hammadde?order=ad.asc&select=*').catch(()=>[]);renderHm(allHm);}
function renderHm(data){const t=document.getElementById('hmTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(6,'Ham madde yok');return;}t.innerHTML=data.map(h=>`<tr><td><strong>${h.ad}</strong></td><td>${h.birim||'--'}</td><td>${fmtNum(h.stok_miktar)}</td><td>${h.kritik_stok||0}</td><td>${fmtNum(h.maliyet_birim)} ${h.para_birimi||'TRY'}</td><td><button class="btn btn-g btn-xs" onclick='editHm(${JSON.stringify(h).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function filterHm(){const q=(document.getElementById('hmSearch')?.value||'').toLowerCase();renderHm(allHm.filter(h=>(h.ad||'').toLowerCase().includes(q)));}
function openHm(){document.getElementById('hmId').value='';['hmAd','hmBirim','hmStok','hmKritik','hmMaliyet'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('moHmTit').textContent='Yeni Ham Madde';document.getElementById('hmDelBtn').style.display='none';openMo('moHm');}
function editHm(h){document.getElementById('hmId').value=h.id;document.getElementById('hmAd').value=h.ad||'';document.getElementById('hmBirim').value=h.birim||'kg';document.getElementById('hmStok').value=h.stok_miktar||0;document.getElementById('hmKritik').value=h.kritik_stok||0;document.getElementById('hmMaliyet').value=h.maliyet_birim||0;document.getElementById('moHmTit').textContent='Ham Madde Duzenle';document.getElementById('hmDelBtn').style.display='inline-flex';openMo('moHm');}
async function saveHm(){const id=document.getElementById('hmId').value;const body={ad:document.getElementById('hmAd')?.value.trim(),birim:document.getElementById('hmBirim')?.value||'kg',stok_miktar:parseFloat(document.getElementById('hmStok')?.value)||0,kritik_stok:parseFloat(document.getElementById('hmKritik')?.value)||0,maliyet_birim:parseFloat(document.getElementById('hmMaliyet')?.value)||0,para_birimi:'TRY',aktif:true};if(!body.ad){toast('Ad zorunludur','err');return;}try{if(id)await api('hammadde?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('hammadde',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moHm');loadHm();}catch(e){toast('Hata: '+e.message,'err');}}
async function deleteHm(){const id=document.getElementById('hmId').value;if(!confirm('Silmek istediginize emin misiniz?'))return;try{await api('hammadde?id=eq.'+id,{method:'PATCH',body:JSON.stringify({aktif:false})});toast('Silindi.');closeMo('moHm');loadHm();}catch(e){toast('Silinemedi','err');}}
let allPaket=[];
async function loadPaket(){document.getElementById('paketTbl').innerHTML=loadRow(5);allPaket=await api('paket?order=ad.asc&select=*').catch(()=>[]);renderPaket(allPaket);}
function renderPaket(data){const t=document.getElementById('paketTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(5,'Paket yok');return;}t.innerHTML=data.map(p=>`<tr><td><strong>${p.ad}</strong></td><td>${p.tip||'--'}</td><td>${p.stok_adet||0}</td><td>${fmtNum(p.birim_fiyat)} TL</td><td><button class="btn btn-g btn-xs" onclick='editPaket(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function filterPaket(){const q=(document.getElementById('paketSearch')?.value||'').toLowerCase();renderPaket(allPaket.filter(p=>(p.ad||'').toLowerCase().includes(q)));}
function openPaket(){document.getElementById('paketId').value='';['paketAd','paketTip','paketStok','paketKritik','paketFiyat'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('moPaketTit').textContent='Yeni Paket';document.getElementById('paketDelBtn').style.display='none';openMo('moPaket');}
function editPaket(p){document.getElementById('paketId').value=p.id;document.getElementById('paketAd').value=p.ad||'';document.getElementById('paketTip').value=p.tip||'';document.getElementById('paketStok').value=p.stok_adet||0;document.getElementById('paketKritik').value=p.kritik_stok_adet||0;document.getElementById('paketFiyat').value=p.birim_fiyat||0;document.getElementById('moPaketTit').textContent='Paket Duzenle';document.getElementById('paketDelBtn').style.display='inline-flex';openMo('moPaket');}
async function savePaket(){const id=document.getElementById('paketId').value;const body={ad:document.getElementById('paketAd')?.value.trim(),tip:document.getElementById('paketTip')?.value||null,stok_adet:parseInt(document.getElementById('paketStok')?.value)||0,kritik_stok_adet:parseInt(document.getElementById('paketKritik')?.value)||0,birim_fiyat:parseFloat(document.getElementById('paketFiyat')?.value)||0,aktif:true};if(!body.ad){toast('Ad zorunludur','err');return;}try{if(id)await api('paket?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('paket',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moPaket');loadPaket();}catch(e){toast('Hata: '+e.message,'err');}}
async function deletePaket(){const id=document.getElementById('paketId').value;if(!confirm('Silmek istediginize emin misiniz?'))return;try{await api('paket?id=eq.'+id,{method:'PATCH',body:JSON.stringify({aktif:false})});toast('Silindi.');closeMo('moPaket');loadPaket();}catch(e){toast('Silinemedi','err');}}
async function loadRaf(){document.getElementById('rafTbl').innerHTML=loadRow(3);const data=await api('raf?order=kod.asc&select=*').catch(()=>[]);const t=document.getElementById('rafTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(3,'Raf yok');return;}t.innerHTML=data.map(r=>`<tr><td><strong>${r.kod}</strong></td><td>${r.aciklama||'--'}</td><td><button class="btn btn-g btn-xs" onclick='editRaf(${JSON.stringify(r).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function openRaf(){document.getElementById('rafId').value='';['rafKod','rafAciklama'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('moRafTit').textContent='Yeni Raf';openMo('moRaf');}
function editRaf(r){document.getElementById('rafId').value=r.id;document.getElementById('rafKod').value=r.kod||'';document.getElementById('rafAciklama').value=r.aciklama||'';document.getElementById('moRafTit').textContent='Raf Duzenle';openMo('moRaf');}
async function saveRaf(){const id=document.getElementById('rafId').value;const body={kod:document.getElementById('rafKod')?.value.trim(),aciklama:document.getElementById('rafAciklama')?.value||null};if(!body.kod){toast('Raf kodu zorunludur','err');return;}try{if(id)await api('raf?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('raf',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moRaf');loadRaf();}catch(e){toast('Hata: '+e.message,'err');}}
async function loadIscilik(){document.getElementById('iscilikTbl').innerHTML=loadRow(3);const data=await api('iscilik?order=ad.asc&select=*').catch(()=>[]);const t=document.getElementById('iscilikTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(3,'Iscilik kaydi yok');return;}t.innerHTML=data.map(i=>`<tr><td><strong>${i.ad}</strong></td><td>${fmtNum(i.saat_ucreti)} TL/saat</td><td><button class="btn btn-g btn-xs" onclick='editIscilik(${JSON.stringify(i).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function openIscilik(){document.getElementById('iscilikId').value='';['iscilikAd','iscilikUcret'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});openMo('moIscilik');}
function editIscilik(i){document.getElementById('iscilikId').value=i.id;document.getElementById('iscilikAd').value=i.ad||'';document.getElementById('iscilikUcret').value=i.saat_ucreti||0;openMo('moIscilik');}
async function saveIscilik(){const id=document.getElementById('iscilikId').value;const body={ad:document.getElementById('iscilikAd')?.value.trim(),saat_ucreti:parseFloat(document.getElementById('iscilikUcret')?.value)||0};if(!body.ad){toast('Ad zorunludur','err');return;}try{if(id)await api('iscilik?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('iscilik',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moIscilik');loadIscilik();}catch(e){toast('Hata: '+e.message,'err');}}
async function loadSabit(){document.getElementById('sabitTbl').innerHTML=loadRow(3);const data=await api('sabit_gider?order=ad.asc&select=*').catch(()=>[]);const t=document.getElementById('sabitTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(3,'Sabit gider yok');return;}t.innerHTML=data.map(s=>`<tr><td><strong>${s.ad}</strong></td><td>${fmtNum(s.aylik_tutar)} TL/ay</td><td><button class="btn btn-g btn-xs" onclick='editSabit(${JSON.stringify(s).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function openSabit(){document.getElementById('sabitId').value='';['sabitAd','sabitTutar'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});openMo('moSabit');}
function editSabit(s){document.getElementById('sabitId').value=s.id;document.getElementById('sabitAd').value=s.ad||'';document.getElementById('sabitTutar').value=s.aylik_tutar||0;openMo('moSabit');}
async function saveSabit(){const id=document.getElementById('sabitId').value;const body={ad:document.getElementById('sabitAd')?.value.trim(),aylik_tutar:parseFloat(document.getElementById('sabitTutar')?.value)||0};if(!body.ad){toast('Ad zorunludur','err');return;}try{if(id)await api('sabit_gider?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('sabit_gider',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moSabit');loadSabit();}catch(e){toast('Hata: '+e.message,'err');}}
async function loadMarka(){document.getElementById('markaTbl').innerHTML=loadRow(4);const data=await api('marka?order=ad.asc&select=*').catch(()=>[]);const t=document.getElementById('markaTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(4,'Marka yok');return;}t.innerHTML=data.map(m=>`<tr><td><strong>${m.ad}</strong></td><td>${m.iso9001_url?`<a href="${m.iso9001_url}" target="_blank" style="color:var(--green)">Link</a>`:'--'}</td><td>${m.iso22000_url?`<a href="${m.iso22000_url}" target="_blank" style="color:var(--green)">Link</a>`:'--'}</td><td><button class="btn btn-g btn-xs" onclick='editMarka(${JSON.stringify(m).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function openMarka(){document.getElementById('markaId').value='';['markaAd','markaIso9001','markaIso22000','markaGeriDon'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('moMarkaTit').textContent='Yeni Marka';document.getElementById('markaDelBtn').style.display='none';openMo('moMarka');}
function editMarka(m){document.getElementById('markaId').value=m.id;document.getElementById('markaAd').value=m.ad||'';document.getElementById('markaIso9001').value=m.iso9001_url||'';document.getElementById('markaIso22000').value=m.iso22000_url||'';document.getElementById('markaGeriDon').value=m.geri_donusum_url||'';document.getElementById('moMarkaTit').textContent='Marka Duzenle';document.getElementById('markaDelBtn').style.display='inline-flex';openMo('moMarka');}
async function saveMarka(){const id=document.getElementById('markaId').value;const body={ad:document.getElementById('markaAd')?.value.trim(),iso9001_url:document.getElementById('markaIso9001')?.value||null,iso22000_url:document.getElementById('markaIso22000')?.value||null,geri_donusum_url:document.getElementById('markaGeriDon')?.value||null,aktif:true};if(!body.ad){toast('Marka adi zorunludur','err');return;}try{if(id)await api('marka?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('marka',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moMarka');loadMarka();}catch(e){toast('Hata: '+e.message,'err');}}
async function deleteMarka(){const id=document.getElementById('markaId').value;if(!confirm('Silmek istediginize emin misiniz?'))return;try{await api('marka?id=eq.'+id,{method:'PATCH',body:JSON.stringify({aktif:false})});toast('Silindi.');closeMo('moMarka');loadMarka();}catch(e){toast('Silinemedi','err');}}
async function loadCins(){document.getElementById('cinsTbl').innerHTML=loadRow(2);const data=await api('urun_cinsi?order=ad.asc&select=*').catch(()=>[]);const t=document.getElementById('cinsTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(2,'Cins yok');return;}t.innerHTML=data.map(c=>`<tr><td><strong>${c.ad}</strong></td><td><button class="btn btn-g btn-xs" onclick='editCins(${JSON.stringify(c).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function openCins(){document.getElementById('cinsId').value='';document.getElementById('cinsAd').value='';openMo('moCins');}
function editCins(c){document.getElementById('cinsId').value=c.id;document.getElementById('cinsAd').value=c.ad||'';openMo('moCins');}
async function saveCins(){const id=document.getElementById('cinsId').value;const body={ad:document.getElementById('cinsAd')?.value.trim(),aktif:true};if(!body.ad){toast('Ad zorunludur','err');return;}try{if(id)await api('urun_cinsi?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('urun_cinsi',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moCins');loadCins();}catch(e){toast('Hata: '+e.message,'err');}}

// ─── PAZARYERI ────────────────────────────────────────────────────────────────
let allPy=[];
async function loadPazaryeri(){document.getElementById('pyTbl').innerHTML=loadRow(6);allPy=await api('pazaryeri_fiyat?order=urun_ad.asc&select=*').catch(()=>[]);renderPy(allPy);}
function renderPy(data){const t=document.getElementById('pyTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(6,'Pazaryeri fiyati yok');return;}t.innerHTML=data.map(p=>`<tr><td><strong>${p.urun_ad||'--'}</strong></td><td>${pill(p.platform||'--','b')}</td><td>${fmtNum(p.liste_fiyat)} TL</td><td>%${fmtNum(p.komisyon_oran,1)}</td><td>${fmtNum(p.kargo_tutar)} TL</td><td><button class="btn btn-g btn-xs" onclick='editPy(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function filterPy(){const q=(document.getElementById('pySearch')?.value||'').toLowerCase();const pl=document.getElementById('pyPlatFilter')?.value;renderPy(allPy.filter(p=>(!q||(p.urun_ad||'').toLowerCase().includes(q))&&(!pl||p.platform===pl)));}
async function openPy(){const urunler=await api('urun?aktif=eq.true&select=id,ad').catch(()=>[]);fillSel('pyUrun',urunler,'id','ad','-- Urun Sec --');document.getElementById('pyId').value='';['pyListeFiyat','pyKomisyon','pyKargo'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('moPyTit').textContent='Yeni Pazaryeri Fiyati';document.getElementById('pyDelBtn').style.display='none';openMo('moPy');}
async function editPy(p){const urunler=await api('urun?aktif=eq.true&select=id,ad').catch(()=>[]);fillSel('pyUrun',urunler,'id','ad','-- Urun Sec --');document.getElementById('pyId').value=p.id;if(p.urun_id)document.getElementById('pyUrun').value=p.urun_id;document.getElementById('pyPlatform').value=p.platform||'trendyol';document.getElementById('pyListeFiyat').value=p.liste_fiyat||0;document.getElementById('pyKomisyon').value=p.komisyon_oran||0;document.getElementById('pyKargo').value=p.kargo_tutar||0;document.getElementById('moPyTit').textContent='Fiyat Duzenle';document.getElementById('pyDelBtn').style.display='inline-flex';openMo('moPy');}
async function savePy(){const id=document.getElementById('pyId').value;const urunEl=document.getElementById('pyUrun');const body={urun_id:urunEl?.value||null,urun_ad:urunEl?.options[urunEl.selectedIndex]?.text||null,platform:document.getElementById('pyPlatform')?.value,liste_fiyat:parseFloat(document.getElementById('pyListeFiyat')?.value)||0,komisyon_oran:parseFloat(document.getElementById('pyKomisyon')?.value)||0,kargo_tutar:parseFloat(document.getElementById('pyKargo')?.value)||0};try{if(id)await api('pazaryeri_fiyat?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('pazaryeri_fiyat',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moPy');loadPazaryeri();}catch(e){toast('Hata: '+e.message,'err');}}
async function deletePy(){const id=document.getElementById('pyId').value;if(!confirm('Silmek istediginize emin misiniz?'))return;try{await api('pazaryeri_fiyat?id=eq.'+id,{method:'DELETE'});toast('Silindi.');closeMo('moPy');loadPazaryeri();}catch(e){toast('Silinemedi','err');}}
async function loadKargo(){const data=await api('kargo_kademesi?order=min_desi.asc&select=*').catch(()=>[]);const t=document.getElementById('kargoTbl');if(!t)return;t.innerHTML=data?.length?data.map(k=>`<tr><td>${fmtNum(k.min_desi,1)}</td><td>${fmtNum(k.max_desi,1)}</td><td>${fmtNum(k.fiyat)} TL</td><td><button class="btn btn-g btn-xs" onclick='editKargo(${JSON.stringify(k).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join(''):emptyRow(4,'Kargo kademe yok');}
function openKargo(){document.getElementById('kargoId').value='';['kargoMin','kargoMax','kargoFiyat'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});openMo('moKargo');}
function editKargo(k){document.getElementById('kargoId').value=k.id;document.getElementById('kargoMin').value=k.min_desi||0;document.getElementById('kargoMax').value=k.max_desi||0;document.getElementById('kargoFiyat').value=k.fiyat||0;openMo('moKargo');}
async function saveKargo(){const id=document.getElementById('kargoId').value;const body={min_desi:parseFloat(document.getElementById('kargoMin')?.value)||0,max_desi:parseFloat(document.getElementById('kargoMax')?.value)||0,fiyat:parseFloat(document.getElementById('kargoFiyat')?.value)||0};try{if(id)await api('kargo_kademesi?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('kargo_kademesi',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moKargo');loadKargo();}catch(e){toast('Hata: '+e.message,'err');}}

// ─── MUSTERI FIYATLARI ────────────────────────────────────────────────────────
let allMf=[];
async function loadMusteri(){document.getElementById('mfTbl').innerHTML=loadRow(8);allMf=await api('musteri_fiyat?order=musteri_ad.asc&select=*').catch(()=>[]);renderMusteri(allMf);}
function renderMusteri(data){const t=document.getElementById('mfTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(8,'Musteri fiyati yok');return;}t.innerHTML=data.map(m=>`<tr><td><strong>${m.musteri_ad||'--'}</strong></td><td>${pill(m.depo_tipi||'--','b')}</td><td>${m.urun_ad||'--'}</td><td>${fmtNum(m.liste_fiyat)} TL</td><td>%${fmtNum(m.indirim_oran,1)}</td><td>${fmtNum(m.son_fiyat)} TL</td><td>${m.min_adet||1}</td><td><button class="btn btn-g btn-xs" onclick='editMf(${JSON.stringify(m).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function filterMusteri(){const q=(document.getElementById('mfSearch')?.value||'').toLowerCase();const dt=document.getElementById('mfDepoFilter')?.value;renderMusteri(allMf.filter(m=>(!q||(m.musteri_ad||'').toLowerCase().includes(q))&&(!dt||m.depo_tipi===dt)));}
async function openMusteri(){const urunler=await api('urun?aktif=eq.true&select=id,ad').catch(()=>[]);fillSel('mfUrun',urunler,'id','ad','-- Urun Sec --');document.getElementById('mfId').value='';['mfMusteri','mfListe','mfIndirim','mfSon','mfMin'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});openMo('moMf');}
async function editMf(m){const urunler=await api('urun?aktif=eq.true&select=id,ad').catch(()=>[]);fillSel('mfUrun',urunler,'id','ad','-- Urun Sec --');document.getElementById('mfId').value=m.id;document.getElementById('mfMusteri').value=m.musteri_ad||'';if(m.urun_id)document.getElementById('mfUrun').value=m.urun_id;document.getElementById('mfDepoTip').value=m.depo_tipi||'';document.getElementById('mfListe').value=m.liste_fiyat||0;document.getElementById('mfIndirim').value=m.indirim_oran||0;document.getElementById('mfSon').value=m.son_fiyat||0;document.getElementById('mfMin').value=m.min_adet||1;openMo('moMf');}
async function saveMf(){const id=document.getElementById('mfId').value;const urunEl=document.getElementById('mfUrun');const body={musteri_ad:document.getElementById('mfMusteri')?.value.trim(),urun_id:urunEl?.value||null,urun_ad:urunEl?.options[urunEl.selectedIndex]?.text||null,depo_tipi:document.getElementById('mfDepoTip')?.value||null,liste_fiyat:parseFloat(document.getElementById('mfListe')?.value)||0,indirim_oran:parseFloat(document.getElementById('mfIndirim')?.value)||0,son_fiyat:parseFloat(document.getElementById('mfSon')?.value)||0,min_adet:parseInt(document.getElementById('mfMin')?.value)||1};try{if(id)await api('musteri_fiyat?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('musteri_fiyat',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moMf');loadMusteri();}catch(e){toast('Hata: '+e.message,'err');}}

// ─── SENTOS ───────────────────────────────────────────────────────────────────
async function loadSentos(){const apiKey=await api('ayar?key=eq.sentos_api_key&select=value').catch(()=>[]);const warn=document.getElementById('sentosApiWarn');if(!apiKey?.[0]?.value&&warn)warn.style.display='block';loadSentosUrunler();loadSentosSiparisler();loadSentosIadeler();}
async function loadSentosUrunler(){document.getElementById('sentosUrunTbl').innerHTML=loadRow(5);const data=await api('sentos_urun?order=ad.asc&select=*').catch(()=>[]);const t=document.getElementById('sentosUrunTbl');if(!t)return;t.innerHTML=data?.length?data.map(u=>`<tr><td><strong>${u.ad||'--'}</strong></td><td>${u.sku||'--'}</td><td>${u.stok_adet||0}</td><td>${fmtNum(u.fiyat)} TL</td><td>${pill(u.aktif?'Aktif':'Pasif',u.aktif?'g':'n')}</td></tr>`).join(''):emptyRow(5,'Urun yok');}
async function loadSentosSiparisler(){document.getElementById('sentosSiparisTbl').innerHTML=loadRow(6);const data=await api('sentos_siparis?order=order_date.desc&limit=50&select=*').catch(()=>[]);const t=document.getElementById('sentosSiparisTbl');if(!t)return;t.innerHTML=data?.length?data.map(s=>`<tr><td>${fmtDate(s.order_date)}</td><td>${s.order_no||'--'}</td><td>${s.musteri_adi||'--'}</td><td>${pill(s.source||'--','b')}</td><td>${fmtNum(s.toplam)} TL</td><td>${pill(s.durum||'bekliyor',s.durum==='teslim'?'g':s.durum==='iptal'?'r':'a')}</td></tr>`).join(''):emptyRow(6,'Siparis yok');}
async function loadSentosIadeler(){document.getElementById('sentosIadeTbl').innerHTML=loadRow(5);const data=await api('sentos_iade?order=tarih.desc&limit=30&select=*').catch(()=>[]);const t=document.getElementById('sentosIadeTbl');if(!t)return;t.innerHTML=data?.length?data.map(i=>`<tr><td>${fmtDate(i.tarih)}</td><td>${i.siparis_no||'--'}</td><td>${i.urun_ad||'--'}</td><td>${fmtNum(i.tutar)} TL</td><td>${pill(i.durum||'bekliyor',i.durum==='onaylandi'?'g':'a')}</td></tr>`).join(''):emptyRow(5,'Iade yok');}

// ─── DEPO ─────────────────────────────────────────────────────────────────────
let allDepo=[];
async function loadDepo(){document.getElementById('depoTbl').innerHTML=loadRow(4);allDepo=await api('depo_konum?order=kod.asc&select=*').catch(()=>[]);renderDepo(allDepo);}
function renderDepo(data){const t=document.getElementById('depoTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(4,'Depo konumu yok');return;}t.innerHTML=data.map(d=>`<tr><td><strong>${d.kod}</strong></td><td>${d.tip||'--'}</td><td>${d.kapasite||'--'}</td><td><button class="btn btn-g btn-xs" onclick='editDepo(${JSON.stringify(d).replace(/'/g,"&#39;")})'>Duzenle</button></td></tr>`).join('');}
function filterDepo(){const q=(document.getElementById('depoSearch')?.value||'').toLowerCase();renderDepo(allDepo.filter(d=>(d.kod||'').toLowerCase().includes(q)));}
function openDepo(){document.getElementById('depoId').value='';['depoKod','depoTip','depoKap'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});document.getElementById('moDepoTit').textContent='Yeni Konum';document.getElementById('depoDelBtn').style.display='none';openMo('moDepo');}
function editDepo(d){document.getElementById('depoId').value=d.id;document.getElementById('depoKod').value=d.kod||'';document.getElementById('depoTip').value=d.tip||'';document.getElementById('depoKap').value=d.kapasite||'';document.getElementById('moDepoTit').textContent='Konum Duzenle';document.getElementById('depoDelBtn').style.display='inline-flex';openMo('moDepo');}
async function saveDepo(){const id=document.getElementById('depoId').value;const body={kod:document.getElementById('depoKod')?.value.trim(),tip:document.getElementById('depoTip')?.value||null,kapasite:document.getElementById('depoKap')?.value||null};if(!body.kod){toast('Konum kodu zorunludur','err');return;}try{if(id)await api('depo_konum?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('depo_konum',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moDepo');loadDepo();}catch(e){toast('Hata: '+e.message,'err');}}
async function deleteDepo(){const id=document.getElementById('depoId').value;if(!confirm('Silmek istediginize emin misiniz?'))return;try{await api('depo_konum?id=eq.'+id,{method:'DELETE'});toast('Silindi.');closeMo('moDepo');loadDepo();}catch(e){toast('Silinemedi','err');}}
async function loadLot(){document.getElementById('lotTbl').innerHTML=loadRow(6);const filt=document.getElementById('lotDurumFilter')?.value;let q='lot?order=uretim_tarihi.desc&select=*';if(filt)q+='&durum=eq.'+filt;const data=await api(q).catch(()=>[]);const t=document.getElementById('lotTbl');if(!t)return;if(!data?.length){t.innerHTML=emptyRow(6,'Lot kaydi yok');return;}t.innerHTML=data.map(l=>`<tr><td><strong>${l.lot_no}</strong></td><td>${l.urun_ad||'--'}</td><td>${l.miktar||0}</td><td>${fmtDate(l.uretim_tarihi)}</td><td>${fmtDate(l.tett)}</td><td>${pill(l.durum==='aktif'?'Aktif':l.durum==='tuketildi'?'Tuketildi':'Karantina',l.durum==='aktif'?'g':l.durum==='tuketildi'?'n':'r')}</td></tr>`).join('');}

// ─── KAR RAPORU ───────────────────────────────────────────────────────────────
async function loadKar(){
  const bas=document.getElementById('karBas')?.value;const bit=document.getElementById('karBit')?.value;
  try{
  let q='sentos_siparis?select=*,siparis_kalemleri:sentos_siparis_kalem(*)&order=order_date.desc';
  if(bas)q+='&order_date=gte.'+bas;if(bit)q+='&order_date=lte.'+bit;
  const siparisler=await api(q).catch(()=>[]);
  const receteler=await api('recete?aktif=eq.true&select=urun_adi,sku,toplam_maliyet').catch(()=>[]);
  let topSatis=0,topMaliyet=0;const platMap={},urunMap={};
  (siparisler||[]).forEach(s=>{
    const src=s.source||'diger';if(!platMap[src])platMap[src]={siparis:0,satis:0,maliyet:0};
    platMap[src].siparis++;const st=parseFloat(s.toplam||0);platMap[src].satis+=st;topSatis+=st;
    const lines=typeof s.lines==='string'?JSON.parse(s.lines||'[]'):s.lines||[];lines.forEach(l=>{const ad=l.name||l.sku||'diger';if(!urunMap[ad])urunMap[ad]={adet:0,satis:0,maliyet:0};urunMap[ad].adet+=parseInt(l.quantity)||1;urunMap[ad].satis+=parseFloat(l.price||0)*(parseInt(l.quantity)||1);const r=receteler?.find(x=>x.urun_adi===ad||x.sku===l.sku);urunMap[ad].maliyet+=(parseFloat(r?.toplam_maliyet||0))*(parseInt(l.quantity)||1);platMap[src].maliyet+=(parseFloat(r?.toplam_maliyet||0))*(parseInt(l.quantity)||1);topMaliyet+=(parseFloat(r?.toplam_maliyet||0))*(parseInt(l.quantity)||1);});});
    const netKar=topSatis-topMaliyet;const marj=topSatis>0?(netKar/topSatis*100).toFixed(1):0;
    document.getElementById('karSummary').style.display='grid';
    document.getElementById('karToplam').textContent=topSatis.toFixed(2)+' TL';
    document.getElementById('karMaliyet').textContent=topMaliyet.toFixed(2)+' TL';
    document.getElementById('karNet').textContent=netKar.toFixed(2)+' TL';
    document.getElementById('karMarj').textContent='%'+marj;
    const pt=document.getElementById('karPlatTbl');
    pt.innerHTML=Object.entries(platMap).length?Object.entries(platMap).sort((a,b)=>b[1].satis-a[1].satis).map(([pl,d])=>{const k=d.satis-d.maliyet;const m=d.satis>0?(k/d.satis*100).toFixed(1):0;return '<tr><td>'+pill(pl,'b')+'</td><td>'+d.siparis+'</td><td>'+d.satis.toFixed(2)+' TL</td><td>'+d.maliyet.toFixed(2)+' TL</td><td><strong style="color:var(--green)">'+k.toFixed(2)+' TL</strong></td><td>%'+m+'</td></tr>';}).join(''):emptyRow(6,'Siparis yok');
    const ut=document.getElementById('karUrunTbl');
    ut.innerHTML=Object.entries(urunMap).length?Object.entries(urunMap).sort((a,b)=>b[1].satis-a[1].satis).map(([ad,d])=>{const k=d.satis-d.maliyet;return '<tr><td><strong>'+ad+'</strong></td><td>'+d.adet+'</td><td>'+d.satis.toFixed(2)+' TL</td><td>'+d.maliyet.toFixed(2)+' TL</td><td><strong style="color:var(--green)">'+k.toFixed(2)+' TL</strong></td></tr>';}).join(''):emptyRow(5,'Urun yok');
  }catch(e){toast('Kar raporu yuklenemedi: '+e.message,'err');}
}

// PERSONEL
let allPers=[];
async function loadPersonel(){
  document.getElementById('persTbl').innerHTML=loadRow(5);
  allPers=await api('kullanici?order=ad.asc&select=*').catch(()=>[]);
  renderPersonel(allPers);
}
function renderPersonel(data){
  const t=document.getElementById('persTbl');
  if(!data?.length){t.innerHTML=emptyRow(5,'Personel yok');return;}
  t.innerHTML=data.map(p=>'<tr><td><strong>'+p.ad+'</strong></td><td>'+(p.email||'--')+'</td><td>'+pill(p.rol==='superadmin'?'Super Admin':p.rol==='yonetici'?'Yonetici':'Personel',p.rol==='superadmin'?'p':p.rol==='yonetici'?'b':'g')+'</td><td>'+(p.aktif?pill('Aktif','g'):pill('Pasif','n'))+'</td><td><button class="btn btn-g btn-xs" onclick="editPersonel(this)" data-p=\"'+encodeURIComponent(JSON.stringify(p))+'\">Duzenle</button></td></tr>').join('');
}
function filterPersonel(){const q=document.getElementById('persSearch').value.toLowerCase();renderPersonel(allPers.filter(p=>(p.ad||'').toLowerCase().includes(q)));}
function openPersonel(){document.getElementById('persId').value='';['persAd','persEmail','persSifre'].forEach(id=>document.getElementById(id).value='');document.getElementById('persRol').value='personel';document.getElementById('moPersTit').textContent='Yeni Personel';document.getElementById('persDelBtn').style.display='none';openMo('moPersonel');}
function editPersonel(btn){const p=JSON.parse(decodeURIComponent(btn.dataset.p));document.getElementById('persId').value=p.id;document.getElementById('persAd').value=p.ad||'';document.getElementById('persEmail').value=p.email||'';document.getElementById('persSifre').value='';document.getElementById('persRol').value=p.rol||'personel';document.getElementById('moPersTit').textContent='Personel Duzenle';document.getElementById('persDelBtn').style.display='inline-flex';openMo('moPersonel');}
async function savePersonel(){
  const id=document.getElementById('persId').value;
  const body={ad:document.getElementById('persAd').value.trim(),email:document.getElementById('persEmail').value||null,rol:document.getElementById('persRol').value,aktif:true};
  const sifre=document.getElementById('persSifre').value;
  if(sifre)body.sifre_hash=sifre;
  if(!body.ad){toast('Ad zorunludur','err');return;}
  try{if(id)await api('kullanici?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body)});else await api('kullanici',{method:'POST',body:JSON.stringify(body)});toast('Kaydedildi!');closeMo('moPersonel');loadPersonel();}
  catch(e){toast('Hata: '+e.message,'err');}
}
async function deletePersonel(){
  const id=document.getElementById('persId').value;
  if(id===CU?.id){toast('Kendinizi silemezsiniz!','err');return;}
  if(!confirm('Silmek istediginize emin misiniz?'))return;
  try{await api('kullanici?id=eq.'+id,{method:'DELETE'});toast('Silindi.');closeMo('moPersonel');loadPersonel();}
  catch{toast('Silinemedi','err');}
}

// TICKETS
let selTkt=null;
async function loadTickets(){
  const f=document.getElementById('tktDurumFilter')?.value;
  let q='ticket?order=olusturma_tarihi.desc&select=*';if(f)q+='&durum=eq.'+f;
  const data=await api(q).catch(()=>[]);
  const el=document.getElementById('tktListesi');
  if(!data?.length){el.innerHTML='<div class="empty"><div class="empi">&#127915;</div><div class="empt">Talep yok</div></div>';return;}
  el.innerHTML=data.map(t=>{const onc=t.oncelik||'normal';return '<div class="tcard '+onc+'" onclick="showTktDetay(this)" data-t=\"'+encodeURIComponent(JSON.stringify(t))+'\"><div class="tcto"><span class="tckn">'+t.konu+'</span>'+pill(t.durum==='acik'?'Acik':t.durum==='cevaplandi'?'Cevaplandi':'Kapali',t.durum==='acik'?'r':t.durum==='cevaplandi'?'b':'n')+'</div><div style="font-size:12px;color:var(--t2)">'+(t.gonderen_ad||'--')+' &rarr; '+(t.alici_ad||'--')+' | '+fmtDate(t.olusturma_tarihi)+'</div>'+(t.mesaj?'<div style="font-size:12px;color:var(--t3);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+t.mesaj.substring(0,100)+'</div>':'')+'</div>';}).join('');
}
async function showTktDetay(el){
  const t=JSON.parse(decodeURIComponent(el.dataset.t));selTkt=t;
  document.getElementById('moTktDetayTit').textContent=t.konu||'Talep';
  const yorumlar=await api('ticket_yorum?ticket_id=eq.'+t.id+'&order=olusturma_tarihi.asc&select=*').catch(()=>[]);
  let html='<div style="background:var(--s2);border:1px solid var(--b1);border-radius:var(--r);padding:12px;margin-bottom:12px"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'+pill(t.oncelik||'normal','a')+pill(t.durum==='acik'?'Acik':'Kapali',t.durum==='acik'?'r':'n')+'</div><div style="font-size:12px;color:var(--t2);margin-bottom:8px">'+(t.gonderen_ad||'--')+' | '+fmtDate(t.olusturma_tarihi)+'</div><div style="font-size:13px">'+((t.mesaj||'').replace(/\n/g,'<br>'))+'</div></div>';
  (yorumlar||[]).forEach(y=>{const ben=y.yazan_id===CU?.id;html+='<div class="yitem" style="'+(ben?'margin-left:20px':'margin-right:20px')+'"><div class="ywho">'+(y.yazan_ad||'--')+' | '+fmtDate(y.olusturma_tarihi)+'</div><div class="ytxt">'+((y.mesaj||'').replace(/\n/g,'<br>'))+'</div></div>';});
  document.getElementById('moTktDetayContent').innerHTML=html;
  document.getElementById('tktYorumMesaj').value='';
  openMo('moTktDetay');
}
async function openTicket(){
  const ps=await api('kullanici?aktif=eq.true&select=id,ad').catch(()=>[]);
  fillSel('tktAlici',ps,'id','ad','-- Alici Sec --');
  document.getElementById('tktKonu').value='';document.getElementById('tktMesaj').value='';document.getElementById('tktOncelik').value='normal';
  openMo('moTicket');
}
async function saveTicket(){
  const aEl=document.getElementById('tktAlici');const konu=document.getElementById('tktKonu').value.trim();const mesaj=document.getElementById('tktMesaj').value.trim();
  if(!konu||!mesaj){toast('Konu ve mesaj zorunludur','err');return;}
  const body={konu,mesaj,oncelik:document.getElementById('tktOncelik').value,gonderen_id:CU?.id||null,gonderen_ad:CU?.ad||null,alici_id:aEl.value||null,alici_ad:aEl.value?aEl.options[aEl.selectedIndex]?.text:null,durum:'acik'};
  try{await api('ticket',{method:'POST',body:JSON.stringify(body)});toast('Talep gonderildi!');closeMo('moTicket');loadTickets();checkNotifs();}
  catch(e){toast('Hata: '+e.message,'err');}
}
async function saveTktYorum(){
  if(!selTkt)return;const mesaj=document.getElementById('tktYorumMesaj').value.trim();
  if(!mesaj){toast('Mesaj zorunludur','err');return;}
  try{await api('ticket_yorum',{method:'POST',body:JSON.stringify({ticket_id:selTkt.id,mesaj,yazan_id:CU?.id||null,yazan_ad:CU?.ad||null})});await api('ticket?id=eq.'+selTkt.id,{method:'PATCH',body:JSON.stringify({durum:'cevaplandi'})});toast('Cevap gonderildi!');closeMo('moTktDetay');loadTickets();}
  catch(e){toast('Hata: '+e.message,'err');}
}
async function closeTkt(){if(!selTkt)return;try{await api('ticket?id=eq.'+selTkt.id,{method:'PATCH',body:JSON.stringify({durum:'kapali'})});toast('Talep kapatildi.');closeMo('moTktDetay');loadTickets();checkNotifs();}catch(e){toast('Hata: '+e.message,'err');}}

// AI CHAT - Supabase verili
let aiOpen=false;
function toggleAi(){aiOpen=!aiOpen;document.getElementById('aipanel').classList.toggle('show',aiOpen);}
function aiSor(s){document.getElementById('aiinp').value=s;aiGonder();}
async function aiGonder(){
  const inp=document.getElementById('aiinp');const msg=inp.value.trim();if(!msg)return;
  const msgs=document.getElementById('aimsgs');
  msgs.innerHTML+='<div class="aimsg usr">'+msg+'</div>';
  inp.value='';
  msgs.innerHTML+='<div class="aimsg bot" id="aiLoad"><div class="aidot"><span></span><span></span><span></span></div></div>';
  msgs.scrollTop=msgs.scrollHeight;
  try{
    const context=await aiVeriTopla(msg);
    const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:'Sen PeaksFood uretim ve stok yonetim sisteminin akilli asistanisin. Asagida sistemdeki GERCEK VERILER bulunuyor. Bu verilere dayanarak Turkce, kisa ve net yanitlar ver. Sistemde olmayan bilgi sorulursa "Bu bilgi sistemde kayitli degil" de.\n\nGUNCEL SISTEM VERILERI:\n'+context,messages:[{role:'user',content:msg}]})});
    const data=await response.json();
    const yanit=data.content?.[0]?.text||'Yanit alinamadi.';
    document.getElementById('aiLoad').outerHTML='<div class="aimsg bot">'+yanit.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`(.*?)`/g,'<code>$1</code>')+'</div>';
  }catch(e){document.getElementById('aiLoad').outerHTML='<div class="aimsg bot" style="color:var(--red)">Hata: '+e.message+'</div>';}
  msgs.scrollTop=msgs.scrollHeight;
}
async function aiVeriTopla(msg){
  const m=msg.toLowerCase();const parts=[];
  const[hm,pkt,urt,urun]=await Promise.all([
    api('hammadde?aktif=eq.true&select=ad,stok_miktar,kritik_stok,birim,maliyet_birim,para_birimi').catch(()=>[]),
    api('paket?aktif=eq.true&select=ad,stok_adet,kritik_stok_adet,birim_fiyat').catch(()=>[]),
    api('uretim?order=olusturma_tarihi.desc&limit=20&select=urun_adi,personel_ad,planlanan_adet,uretilen_adet,durum,lot_no,tett,uretim_tarihi,vardiya').catch(()=>[]),
    api('urun?aktif=eq.true&select=ad,sku,stok_adet,kritik_stok_adet,fiyat,para_birimi').catch(()=>[])
  ]);
  if(hm?.length){const k=hm.filter(h=>h.stok_miktar<=(h.kritik_stok||0));parts.push('HAM MADDELER ('+hm.length+' adet):\n'+hm.map(h=>'- '+h.ad+': '+h.stok_miktar+' '+(h.birim||'kg')+' (kritik:'+h.kritik_stok+') | '+h.maliyet_birim+' '+h.para_birimi+(h.stok_miktar<=(h.kritik_stok||0)?' KRITIK':'')).join('\n'));if(k.length)parts.push('KRITIK STOK: '+k.map(h=>h.ad).join(', '));}
  if(pkt?.length)parts.push('PAKETLER ('+pkt.length+' adet):\n'+pkt.map(p=>'- '+p.ad+': '+p.stok_adet+' adet (kritik:'+p.kritik_stok_adet+') | '+p.birim_fiyat+'TL'+(p.stok_adet<=(p.kritik_stok_adet||0)?' KRITIK':'')).join('\n'));
  if(urt?.length){const bkl=urt.filter(u=>u.durum==='bekliyor').length,dv=urt.filter(u=>u.durum==='devam').length,tm=urt.filter(u=>u.durum==='tamamlandi').length;parts.push('URETIM DURUMU: Bekliyor:'+bkl+' Devam:'+dv+' Tamamlandi:'+tm+'\nSON 20 URETIM:\n'+urt.map(u=>'- '+u.urun_adi+' | '+u.personel_ad+' | '+u.planlanan_adet+' adet | '+u.durum+' | Lot:'+u.lot_no+' | TETT:'+(u.tett?new Date(u.tett).toLocaleDateString('tr-TR'):'--')).join('\n'));}
  if(urun?.length)parts.push('URUNLER ('+urun.length+' adet):\n'+urun.map(u=>'- '+u.ad+' ('+u.sku+'): '+u.stok_adet+' adet | '+u.fiyat+' '+u.para_birimi).join('\n'));
  if(m.includes('recete')||m.includes('maliyet')){const r=await api('recete?aktif=eq.true&select=ad,urun_id,toplam_maliyet').catch(()=>[]);if(r?.length)parts.push('RECETE MALIYETLERI:\n'+r.map(x=>'- '+x.ad+': '+x.toplam_maliyet+' TL/adet').join('\n'));}
  if(m.includes('siparis')||m.includes('kar')||m.includes('satis')){const s=await api('sentos_siparis?order=order_date.desc&limit=50&select=source,toplam,order_date,musteri_adi').catch(()=>[]);if(s?.length){const top=s.reduce((a,x)=>a+(parseFloat(x.toplam)||0),0);parts.push('SON SIPARISLER ('+s.length+' adet) | Toplam: '+top.toFixed(2)+'TL\n'+s.slice(0,10).map(x=>'- '+(x.source||'--')+' | '+(x.musteri_adi||'--')+': '+x.toplam+'TL | '+(x.order_date?new Date(x.order_date).toLocaleDateString('tr-TR'):'--')).join('\n'));}}
  if(m.includes('personel')||m.includes('verimlilik')){const p=await api('kullanici?aktif=eq.true&rol=eq.personel&select=ad').catch(()=>[]);if(p?.length)parts.push('PERSONEL: '+p.map(x=>x.ad).join(', '));}
  return parts.join('\n\n')||'Sistem verisi bulunamadi.';
}


function initApp(u) {
  CU = u;
  document.getElementById('lw').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('sbav').textContent = u.ad[0].toUpperCase();
  document.getElementById('sbun').textContent = u.ad;
  document.getElementById('sbur').textContent = u.rol === 'superadmin' ? 'Super Admin' : u.rol === 'yonetici' ? 'Yonetici' : 'Personel';
  fetchDoviz();
  nav('dashboard');
  checkNotifs();
}

async function loadUretimPage() {
  var ur = await api('urun?aktif=eq.true&select=id,ad,tett_gun').catch(function() { return []; });
  var ps = await api('kullanici?aktif=eq.true&rol=eq.personel&select=id,ad').catch(function() { return []; });
  fillSel('urt-urun', ur, 'id', 'ad', '-- Urun Sec --');
  fillSel('urt-personel', ps, 'id', 'ad', '-- Personel Sec --');
  CACHE.urunListTett = ur || [];
  if (typeof genLotNo === 'function') genLotNo();
  if (typeof urtCalcTett === 'function') urtCalcTett();
  loadUretim();
}

async function loadMalKabul() {
  var tip = document.getElementById('mkFilter') ? document.getElementById('mkFilter').value : 'hammadde';
  var tbl = document.getElementById('mkTbl');
  if (tbl) tbl.innerHTML = '<tr><td colspan="8"><div class="ld"><div class="spin"></div></div></td></tr>';
  try {
    var data = [];
    if (tip === 'hammadde') data = await api('mal_kabul?order=olusturma_tarihi.desc&limit=50&select=*').catch(function() { return []; });
    else if (tip === 'paket') data = await api('paket_kabul?order=olusturma_tarihi.desc&limit=50&select=*').catch(function() { return []; });
    else data = await api('hazir_urun_kabul?order=olusturma_tarihi.desc&limit=50&select=*').catch(function() { return []; });
    if (!tbl) return;
    if (!data.length) { tbl.innerHTML = '<tr><td colspan="8"><div class="empty"><div class="empi">&#128235;</div><div class="empt">Kayit yok</div></div></td></tr>'; return; }
    tbl.innerHTML = data.map(function(r) {
      var ad = r.hammadde_ad || r.paket_ad || r.urun_adi || '--';
      var mkt = r.miktar ? (r.miktar + ' ' + (r.birim || 'kg')) : (r.adet ? r.adet + ' adet' : '--');
      var pb = {TRY:'TL',USD:'$',EUR:'EUR'}[r.para_birimi||'TRY'] || 'TL';
      var fiyat = r.birim_fiyat != null ? pb + ' ' + parseFloat(r.birim_fiyat).toFixed(2) : '--';
      var toplam = r.toplam_tutar != null ? pb + ' ' + parseFloat(r.toplam_tutar).toFixed(2) : '--';
      var tarih = r.gelis_tarihi || r.olusturma_tarihi;
      var tarihStr = tarih ? new Date(tarih).toLocaleDateString('tr-TR') : '--';
      var tettStr = r.tett ? new Date(r.tett).toLocaleDateString('tr-TR') : '--';
      return '<tr><td><strong>' + ad + '</strong></td><td>' + mkt + '</td><td>' + fiyat + '</td><td><strong>' + toplam + '</strong></td><td>' + (r.tedarikci||'--') + '</td><td>' + (r.lot_no||'--') + '</td><td>' + tettStr + '</td><td>' + tarihStr + '</td></tr>';
    }).join('');
  } catch(e) { if (tbl) tbl.innerHTML = '<tr><td colspan="8">Yuklenemedi</td></tr>'; }
}

var allUrunler = [];
async function loadUrunler() {
  var tbl = document.getElementById('urunTbl');
  if (tbl) tbl.innerHTML = '<tr><td colspan="10"><div class="ld"><div class="spin"></div></div></td></tr>';
  var data = await api('urun?order=olusturma_tarihi.desc&select=*').catch(function() { return []; });
  var cinsler = await api('urun_cinsi?aktif=eq.true&select=id,ad').catch(function() { return []; });
  var markalar = await api('marka?aktif=eq.true&select=id,ad').catch(function() { return []; });
  allUrunler = data || [];
  CACHE.cinsler = cinsler || [];
  CACHE.markalar = markalar || [];
  var cf = document.getElementById('urunCinsFilter');
  if (cf) cf.innerHTML = '<option value="">Tum Cinsler</option>' + (cinsler||[]).map(function(c) { return '<option value="' + c.ad + '">' + c.ad + '</option>'; }).join('');
  renderUrunler(allUrunler);
}

function renderUrunler(data) {
  var t = document.getElementById('urunTbl');
  if (!t) return;
  if (!data || !data.length) { t.innerHTML = '<tr><td colspan="10"><div class="empty"><div class="empi">&#128235;</div><div class="empt">Urun bulunamadi</div></div></td></tr>'; return; }
  t.innerHTML = data.map(function(u) {
    var enc = encodeURIComponent(JSON.stringify(u));
    var pb = {TRY:'TL',USD:'$',EUR:'EUR'}[u.para_birimi||'TRY']||'TL';
    var fiyat = u.fiyat != null ? pb + ' ' + parseFloat(u.fiyat).toFixed(2) : '--';
    return '<tr><td><strong>' + u.ad + '</strong>' + (u.ad_en ? '<div style="font-size:11px;color:var(--t2)">' + u.ad_en + '</div>' : '') + '</td>' +
      '<td style="font-family:monospace;font-size:12px;color:var(--t2)">' + (u.sku||'--') + '</td>' +
      '<td>' + (u.urun_turu==='toptan' ? '<span class="pill pb">Toptan</span>' : '<span class="pill pg">Perakende</span>') + '</td>' +
      '<td>' + (u.cins_ad ? '<span class="pill pn">' + u.cins_ad + '</span>' : '--') + '</td>' +
      '<td>' + (u.agirlik_gr ? u.agirlik_gr + 'g' : '--') + '</td>' +
      '<td>' + (u.stok_adet != null ? u.stok_adet : 0) + '</td>' +
      '<td>' + fiyat + '</td>' +
      '<td>' + (u.tett_gun ? u.tett_gun + ' gun' : '--') + '</td>' +
      '<td>' + (u.besin_degeri_var ? '<span class="pill pg">Var</span>' : '<span class="pill pn">Yok</span>') + '</td>' +
      '<td><button class="btn btn-g btn-xs" onclick="editUrun(this)" data-u="' + enc + '">Duzenle</button></td></tr>';
  }).join('');
}

function filterUrunler() {
  var q = document.getElementById('urunSearch').value.toLowerCase();
  var c = document.getElementById('urunCinsFilter').value;
  renderUrunler(allUrunler.filter(function(u) {
    return (!q || (u.ad||'').toLowerCase().includes(q) || (u.sku||'').toLowerCase().includes(q)) && (!c || u.cins_ad === c);
  }));
}

async function karSenkronize() {
  toast('Sentos siparisleri cekiliyor...');
  try {
    var data = await sentosReq('/orders?size=100');
    var list = Array.isArray(data) ? data : (data && data.data ? data.data : []);
    var yeni = 0;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      var body = { order_id: String(o.order_id || o.id), order_code: o.order_code || o.order_id, status: o.status, source: o.source || '', shop: o.shop || '', musteri_adi: (o.customer && o.customer.name) || '', order_date: o.order_date || new Date().toISOString(), toplam: parseFloat(o.total) || 0, currency: o.currency || 'TRY', lines: JSON.stringify(o.lines || []) };
      try { var ex = await api('sentos_siparis?order_id=eq.' + body.order_id + '&select=id'); if (ex && ex[0]) await api('sentos_siparis?id=eq.' + ex[0].id, { method: 'PATCH', body: JSON.stringify(body) }); else { await api('sentos_siparis', { method: 'POST', body: JSON.stringify(body) }); yeni++; } } catch(e2) {}
    }
    toast(list.length + ' siparis cekildi, ' + yeni + ' yeni');
  } catch(e) { toast('Hata: ' + e.message, 'err'); }
}

async function loadKarRaporu() {
  var tip = document.getElementById('karTarihTip').value;
  var plt = document.getElementById('karPlatform').value;
  var bugun = new Date(); var bas, bit;
  if (tip === 'bugun') { bas = bit = bugun.toISOString().split('T')[0]; }
  else if (tip === 'bu_hafta') { var d1 = new Date(bugun); d1.setDate(d1.getDate() - d1.getDay()); bas = d1.toISOString().split('T')[0]; bit = bugun.toISOString().split('T')[0]; }
  else if (tip === 'bu_ay') { bas = bugun.getFullYear() + '-' + String(bugun.getMonth() + 1).padStart(2, '0') + '-01'; bit = bugun.toISOString().split('T')[0]; }
  else { var d2 = new Date(bugun.getFullYear(), bugun.getMonth() - 1, 1); bas = d2.getFullYear() + '-' + String(d2.getMonth() + 1).padStart(2, '0') + '-01'; var d3 = new Date(bugun.getFullYear(), bugun.getMonth(), 0); bit = d3.toISOString().split('T')[0]; }
  var q = 'sentos_siparis?order_date=gte.' + bas + 'T00:00:00&order_date=lte.' + bit + 'T23:59:59&select=*';
  if (plt) q += '&source=eq.' + plt;
  try {
    var siparisler = await api(q).catch(function() { return []; });
    var receteler = await api('recete?aktif=eq.true&select=ad,urun_adi,sku,toplam_maliyet').catch(function() { return []; });
    var topSatis = 0, topMaliyet = 0, platMap = {}, urunMap = {};
    (siparisler||[]).forEach(function(s) {
      var tutar = parseFloat(s.toplam) || 0; topSatis += tutar;
      var src = (s.source || 'diger').toLowerCase();
      if (!platMap[src]) platMap[src] = { siparis: 0, satis: 0, maliyet: 0 };
      platMap[src].siparis++; platMap[src].satis += tutar;
      var lines = typeof s.lines === 'string' ? JSON.parse(s.lines || '[]') : (s.lines || []);
      lines.forEach(function(l) {
        var ad = l.name || l.sku || 'diger';
        if (!urunMap[ad]) urunMap[ad] = { adet: 0, satis: 0, maliyet: 0 };
        urunMap[ad].adet += parseInt(l.quantity) || 1;
        urunMap[ad].satis += (parseFloat(l.price) || 0) * (parseInt(l.quantity) || 1);
        var r = (receteler||[]).find(function(x) { return x.urun_adi === ad || x.sku === l.sku; });
        var km = (parseFloat(r && r.toplam_maliyet || 0)) * (parseInt(l.quantity) || 1);
        urunMap[ad].maliyet += km; platMap[src].maliyet += km; topMaliyet += km;
      });
    });
    var netKar = topSatis - topMaliyet;
    var marj = topSatis > 0 ? (netKar / topSatis * 100).toFixed(1) : 0;
    document.getElementById('karSummary').style.display = 'grid';
    document.getElementById('karToplam').textContent = topSatis.toFixed(2) + ' TL';
    document.getElementById('karMaliyet').textContent = topMaliyet.toFixed(2) + ' TL';
    document.getElementById('karNet').textContent = netKar.toFixed(2) + ' TL';
    document.getElementById('karMarj').textContent = '%' + marj;
    var platEntries = Object.keys(platMap).map(function(pl) { return [pl, platMap[pl]]; }).sort(function(a, b) { return b[1].satis - a[1].satis; });
    document.getElementById('karPlatTbl').innerHTML = platEntries.length ? platEntries.map(function(entry) { var pl = entry[0]; var d = entry[1]; var k = d.satis - d.maliyet; return '<tr><td><span class="pill pb">' + pl + '</span></td><td>' + d.siparis + '</td><td>' + d.satis.toFixed(2) + ' TL</td><td>' + d.maliyet.toFixed(2) + ' TL</td><td><strong style="color:var(--green)">' + k.toFixed(2) + ' TL</strong></td><td>%' + (d.satis > 0 ? (k / d.satis * 100).toFixed(1) : 0) + '</td></tr>'; }).join('') : '<tr><td colspan="6">Siparis yok</td></tr>';
    var urunEntries = Object.keys(urunMap).map(function(ad) { return [ad, urunMap[ad]]; }).sort(function(a, b) { return b[1].satis - a[1].satis; });
    document.getElementById('karUrunTbl').innerHTML = urunEntries.length ? urunEntries.map(function(entry) { var ad = entry[0]; var d = entry[1]; var k = d.satis - d.maliyet; return '<tr><td><strong>' + ad + '</strong></td><td>' + d.adet + '</td><td>' + d.satis.toFixed(2) + ' TL</td><td>' + d.maliyet.toFixed(2) + ' TL</td><td><strong style="color:var(--green)">' + k.toFixed(2) + ' TL</strong></td></tr>'; }).join('') : '<tr><td colspan="5">Urun yok</td></tr>';
  } catch(e) { toast('Kar raporu yuklenemedi: ' + e.message, 'err'); }
}
