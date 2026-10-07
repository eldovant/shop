/* ELDOVANT Shop — behaviour. Everything here enhances pages that are already complete HTML. */
(function(){
'use strict';
var root=document.documentElement, RM=root.classList.contains('rm');
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var clamp=function(v,a,b){return Math.min(b,Math.max(a,v))};
var L=root.lang==='it'?'it':'en';
var T={
  en:{light:'Switch to light mode',dark:'Switch to dark mode',offline:'You appear to be offline. Reconnect and try again — nothing has been charged.',opening:'Opening checkout…',back:'Checkout did not open? Try again.',play:'Play preview',pause:'Pause preview',loadfail:'This preview could not be loaded.',
      status:{success:['Thank you.','If your payment went through, a confirmation is on its way. Access details follow the steps below.'],cancelled:['Checkout was cancelled.','Nothing has been charged. You can return to the release whenever you like.'],failed:['The payment did not go through.','Nothing has been charged, or the provider will refund any hold. You can try again from the release page.'],expired:['This checkout session has expired.','For your security, checkout sessions close after a while. Start again from the release page.']}},
  it:{light:'Passa alla modalità chiara',dark:'Passa alla modalità scura',offline:'Sembra che tu sia offline. Riconnettiti e riprova — non è stato addebitato nulla.',opening:'Apertura del checkout…',back:'Il checkout non si è aperto? Riprova.',play:'Ascolta l’anteprima',pause:'Metti in pausa',loadfail:'Non è stato possibile caricare questa anteprima.',
      status:{success:['Grazie.','Se il pagamento è andato a buon fine, la conferma è in arrivo. I dettagli di accesso seguono i passaggi qui sotto.'],cancelled:['Il checkout è stato annullato.','Non è stato addebitato nulla. Puoi tornare alla uscita quando vuoi.'],failed:['Il pagamento non è andato a buon fine.','Non è stato addebitato nulla, oppure il provider rilascerà l’eventuale blocco. Puoi riprovare dalla pagina della uscita.'],expired:['Questa sessione di checkout è scaduta.','Per sicurezza le sessioni di checkout si chiudono dopo un po’. Ricomincia dalla pagina della uscita.']}}
}[L];

/* ---------- analytics-ready, provider-free: a DOM event + dataLayer if one exists ---------- */
function track(name,detail){
  try{ document.dispatchEvent(new CustomEvent('eld:shop',{detail:Object.assign({event:name,lang:L},detail||{})})); }catch(e){}
  try{ if(window.dataLayer&&window.dataLayer.push) window.dataLayer.push(Object.assign({event:'eld_'+name,lang:L},detail||{})); }catch(e){}
}
window.ELDShop={track:track};

/* ---------- toast (never a browser alert) ---------- */
var toastEl=null, toastT=null;
function toast(msg){
  if(!toastEl){ toastEl=document.createElement('div'); toastEl.className='toast'; toastEl.setAttribute('role','status'); toastEl.setAttribute('aria-live','polite'); document.body.appendChild(toastEl); }
  toastEl.textContent=msg; void toastEl.offsetWidth; toastEl.classList.add('on');
  clearTimeout(toastT); toastT=setTimeout(function(){ toastEl.classList.remove('on'); },5200);
}

/* ---------- year ---------- */
var y=$('#year'); if(y) y.textContent=new Date().getFullYear();

/* ---------- theme: one coordinated transition ---------- */
function eldThemeSwap(apply){
  if(root.__tvtBusy) return;
  if(RM){ apply(); return; }
  root.__tvtBusy=true;
  var done=function(){ root.classList.remove('tvt'); root.__tvtBusy=false; };
  try{
    if(document.startViewTransition){
      root.classList.add('tvt');
      var vt=document.startViewTransition(function(){ apply(); });
      vt.finished.then(done,done); return;
    }
    var v=document.createElement('div');
    v.setAttribute('aria-hidden','true');
    v.style.cssText='position:fixed;inset:0;z-index:399;pointer-events:none;opacity:0;background:'+getComputedStyle(root).backgroundColor;
    document.body.appendChild(v);
    var a=v.animate([{opacity:0},{opacity:1}],{duration:240,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'});
    a.onfinish=function(){ apply(); var b=v.animate([{opacity:1},{opacity:0}],{duration:560,easing:'cubic-bezier(.3,0,.2,1)',fill:'forwards'}); b.onfinish=function(){ v.remove(); done(); }; };
  }catch(err){ try{apply()}catch(e2){} done(); }
}
var btnTheme=$('#btnTheme');
function syncTheme(){ if(!btnTheme) return; var light=root.getAttribute('data-theme')==='light'; btnTheme.setAttribute('aria-label',light?T.dark:T.light); }
if(btnTheme){
  syncTheme();
  btnTheme.addEventListener('click',function(){
    var next=root.getAttribute('data-theme')==='light'?'dark':'light';
    eldThemeSwap(function(){ root.setAttribute('data-theme',next); try{localStorage.setItem('eld-theme',next)}catch(e){} syncTheme(); });
    track('theme_change',{theme:next});
  });
}

/* ---------- menu ---------- */
var menu=$('#menu'), btnMenu=$('#btnMenu');
function openMenu(){ menu.classList.remove('closing'); menu.showModal(); document.body.style.overflow='hidden'; }
function closeMenu(){
  if(!menu.open) return;
  if(RM){ menu.close(); return; }
  menu.classList.add('closing');
  setTimeout(function(){ menu.close(); menu.classList.remove('closing'); },520);
}
if(menu&&btnMenu){
  menu.addEventListener('close',function(){ document.body.style.overflow=''; btnMenu.focus({preventScroll:true}); });
  menu.addEventListener('cancel',function(e){ e.preventDefault(); closeMenu(); });
  btnMenu.addEventListener('click',openMenu);
  $('#menuClose').addEventListener('click',closeMenu);
  $$('a',menu).forEach(function(a){ a.addEventListener('click',function(){ if(a.getAttribute('href').charAt(0)==='#') closeMenu(); }); });
}

/* ---------- header, progress, hero depth ---------- */
var hdr=$('#hdr'), prog=$('#prog'), hero=$('.sh-hero'), tick=false;
function frame(){
  tick=false;
  var vh=innerHeight, yy=scrollY, max=Math.max(1,root.scrollHeight-vh);
  if(prog) prog.style.transform='scaleX('+clamp(yy/max,0,1).toFixed(4)+')';
  if(hdr) hdr.classList.toggle('solid',yy>vh*.35);
  if(hero&&!RM) hero.style.setProperty('--hp',clamp(yy/Math.max(1,hero.offsetHeight),0,1).toFixed(4));
}
addEventListener('scroll',function(){ if(!tick){ tick=true; requestAnimationFrame(frame); } },{passive:true});
addEventListener('resize',frame); frame();
if(hero&&!RM&&matchMedia('(hover:hover) and (pointer:fine)').matches){
  hero.addEventListener('pointermove',function(e){
    var r=hero.getBoundingClientRect();
    hero.style.setProperty('--mx',(((e.clientX-r.left)/r.width)-.5).toFixed(3));
    hero.style.setProperty('--my',(((e.clientY-r.top)/r.height)-.5).toFixed(3));
  },{passive:true});
}

/* ---------- opening plays once per session, skippable ---------- */
if(root.classList.contains('open')){
  var endOpen=function(){ root.classList.remove('open'); try{sessionStorage.setItem('eld-open-shop','1')}catch(e){} };
  setTimeout(endOpen,3200);
  setTimeout(function(){ ['wheel','touchmove','keydown'].forEach(function(t){ addEventListener(t,endOpen,{once:true,passive:true}); }); },300);
}

/* ---------- reveals ---------- */
(function(){
  var targets=$$('.wipe,.rise');
  if(RM||!('IntersectionObserver' in window)){ targets.forEach(function(t){ t.classList.add('in'); }); return; }
  var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }); },{threshold:.15,rootMargin:'0px 0px -6% 0px'});
  targets.forEach(function(t){ io.observe(t); });
})();

/* ---------- catalogue: filters and search (present only when the build says the catalogue needs them) ---------- */
(function(){
  var wall=$('[data-wall]'); if(!wall) return;
  var tiles=$$('.pc',wall), chips=$$('.chip[data-filter]'), q=$('#q'), none=$('#noresults'), cur='all', term='';
  if(!chips.length&&!q) return;
  function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''); }
  function apply(){
    var shown=0;
    tiles.forEach(function(t){
      var ok=(cur==='all'||t.getAttribute('data-pillar')===cur)&&(!term||norm(t.getAttribute('data-search')).indexOf(term)>=0);
      t.hidden=!ok; if(ok) shown++;
    });
    wall.setAttribute('data-count',shown>2?'many':String(shown));
    if(none) none.hidden=shown>0;
  }
  chips.forEach(function(c){ c.addEventListener('click',function(){
    cur=c.getAttribute('data-filter');
    chips.forEach(function(x){ x.setAttribute('aria-pressed',x===c?'true':'false'); });
    apply(); track('filter_use',{filter:cur});
  }); });
  if(q){ var st=null; q.addEventListener('input',function(){ term=norm(q.value.trim()); apply(); clearTimeout(st); st=setTimeout(function(){ if(term) track('search',{length:term.length}); },900); }); }
  var reset=$('#resetFilters'); if(reset) reset.addEventListener('click',function(){ cur='all'; term=''; if(q) q.value=''; chips.forEach(function(x){ x.setAttribute('aria-pressed',x.getAttribute('data-filter')==='all'?'true':'false'); }); apply(); });
})();

/* ---------- tiles: analytics only ---------- */
$$('.pc a[href]').forEach(function(a){ a.addEventListener('click',function(){ var pc=a.closest('.pc'); track('select_product',{product:pc&&pc.getAttribute('data-id')}); }); });
var pdMain=$('[data-product]'); if(pdMain) track('view_product',{product:pdMain.getAttribute('data-product')});

/* ---------- checkout: transparent hand-off, with honest states ---------- */
(function(){
  var links=$$('a[data-checkout]'); if(!links.length) return;
  var restore=function(){ links.forEach(function(a){ a.removeAttribute('aria-busy'); var s=a.querySelector('[data-l]'); if(s&&a.__label) s.textContent=a.__label; }); };
  links.forEach(function(a){
    var s=a.querySelector('[data-l]'); if(s) a.__label=s.textContent;
    a.addEventListener('click',function(e){
      if(e.metaKey||e.ctrlKey||e.shiftKey||e.button) return;
      if(navigator.onLine===false){ e.preventDefault(); toast(T.offline); track('checkout_blocked',{reason:'offline'}); return; }
      track('begin_checkout',{product:a.getAttribute('data-checkout')});
      links.forEach(function(x){ x.setAttribute('aria-busy','true'); var sl=x.querySelector('[data-l]'); if(sl) sl.textContent=T.opening; });
      setTimeout(function(){ if(document.visibilityState==='visible'){ restore(); toast(T.back); } },9000);
    });
  });
  addEventListener('pageshow',function(ev){ if(ev.persisted) restore(); });
})();


/* ---------- checkout: ELDOVANT review step → Gumroad's own payment window ----------
   Only officially supported pieces are used: the public gumroad.js overlay (loaded when the visitor continues),
   and Gumroad's own checkout URL as the fallback. No card data ever touches this site. */
(function(){
  var co=$('[data-co]'); if(!co) return;
  var url=co.getAttribute('data-gr'), direct=co.getAttribute('data-direct'), mode=co.getAttribute('data-mode')||'overlay';
  var views=$$('.co-view',co), steps=$$('.co-steps li',co), pay=$('#coPay'), vars=$$('input[name="variant"]',co);
  var veil=null, timer=null, slowT=null, scriptP=null, anchor=null, open=false;
  var CT={en:{opening:'Opening…'},it:{opening:'Apertura…'}}[L];
  function variant(){ var s=vars.filter(function(v){return v.checked})[0]; return s?s.value:''; }
  function withVariant(base){ var u=new URL(base); var v=variant(); if(v) u.searchParams.set('variant',v); return u.toString(); }
  function show(name,focus){
    co.setAttribute('data-state',name);
    views.forEach(function(v){ v.hidden=v.getAttribute('data-view')!==name; });
    var idx=(name==='review')?0:(name==='paying'||name==='opening'||name==='slow'||name==='blocked'||name==='offline')?1:2;
    steps.forEach(function(s,i){ if(i===idx) s.setAttribute('aria-current','step'); else s.removeAttribute('aria-current'); });
    var v=$('.co-view[data-view="'+name+'"]',co); if(v&&focus!==false){ try{v.focus({preventScroll:true})}catch(e){} }
    $$('a[data-direct]',co).forEach(function(a){ a.href=withVariant(direct); });
  }
  function setVeil(on){
    if(!veil){ veil=document.createElement('div'); veil.className='co-veil'; veil.setAttribute('aria-hidden','true'); document.body.appendChild(veil); }
    veil.classList.toggle('on',on);
  }
  function loadGumroad(){
    if(scriptP) return scriptP;
    scriptP=new Promise(function(res,rej){
      var s=document.createElement('script'); s.src='https://gumroad.com/js/gumroad.js'; s.async=true;
      s.onload=function(){ setTimeout(res,80); }; s.onerror=function(){ scriptP=null; rej(new Error('blocked')); };
      document.head.appendChild(s);
    });
    return scriptP;
  }
  function fail(name){ clearTimeout(timer); clearTimeout(slowT); setVeil(false); open=false; show(name); if(pay){ pay.removeAttribute('aria-busy'); } track('checkout_issue',{reason:name}); }
  function start(){
    if(navigator.onLine===false){ show('offline'); track('checkout_blocked',{reason:'offline'}); return; }
    track('begin_checkout',{product:co.getAttribute('data-co'),mode:mode});
    if(mode==='redirect'){ setVeil(true); setTimeout(function(){ location.href=withVariant(direct); },RM?0:450); return; }
    pay.setAttribute('aria-busy','true'); show('opening'); setVeil(true); open=true;
    slowT=setTimeout(function(){ if(open&&co.getAttribute('data-state')==='opening') show('slow'); },9000);
    loadGumroad().then(function(){
      if(anchor) anchor.remove();
      anchor=document.createElement('a'); anchor.href=withVariant(url); anchor.rel='noopener'; anchor.style.cssText='position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden'; anchor.textContent='Gumroad';
      document.body.appendChild(anchor);
      setTimeout(function(){ if(open) anchor.click(); },120);
    },function(){ fail('blocked'); });
  }
  /* Gumroad's window tells the page when it has loaded (it is the only signal it sends) */
  addEventListener('message',function(e){
    if(!open) return;
    try{ if(!/(^|\.)gumroad\.com$/.test(new URL(e.origin).host)) return; }catch(x){ return; }
    if(e.data&&e.data.type==='loaded'){ clearTimeout(slowT); show('paying'); if(pay) pay.removeAttribute('aria-busy'); setTimeout(function(){ setVeil(false); },500); track('payment_window_open',{}); }
  });
  if(pay) pay.addEventListener('click',start);
  $$('[data-retry]',co).forEach(function(b){ b.addEventListener('click',function(){ show('review'); setTimeout(start,60); }); });
  $$('[data-back]',co).forEach(function(b){ b.addEventListener('click',function(){ open=false; setVeil(false); show('review'); }); });
  vars.forEach(function(v){ v.addEventListener('change',function(){ track('variant_select',{variant:v.value}); show(co.getAttribute('data-state'),false); }); });
  addEventListener('pageshow',function(ev){ if(ev.persisted){ open=false; setVeil(false); if(pay) pay.removeAttribute('aria-busy'); show('review'); } });
  show('review',false);
})();

/* ---------- mobile purchase bar ---------- */
(function(){
  var bar=$('#pdBar'), buy=$('#buy'); if(!bar||!buy||!('IntersectionObserver' in window)) return;
  document.body.classList.add('has-bar');
  new IntersectionObserver(function(es){ bar.classList.toggle('on',!es[0].isIntersecting && es[0].boundingClientRect.top<0); },{threshold:0}).observe(buy);
})();

/* ---------- audio preview: never autoplays, one at a time ---------- */
$$('[data-audio]').forEach(function(box){
  var a=box.querySelector('audio'), b=box.querySelector('.pv-play'), bar=box.querySelector('.pv-bar'), fill=box.querySelector('.pv-bar i'), cur=box.querySelector('[data-cur]'), dur=box.querySelector('[data-dur]');
  var fmt=function(s){ s=Math.max(0,Math.floor(s||0)); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); };
  b.setAttribute('aria-label',T.play);
  b.addEventListener('click',function(){
    if(a.paused){ $$('[data-audio] audio').forEach(function(o){ if(o!==a) o.pause(); }); a.play().catch(function(){ toast(T.loadfail); }); track('preview_play',{}); } else a.pause();
  });
  a.addEventListener('play',function(){ b.setAttribute('aria-pressed','true'); b.setAttribute('aria-label',T.pause); });
  a.addEventListener('pause',function(){ b.setAttribute('aria-pressed','false'); b.setAttribute('aria-label',T.play); });
  a.addEventListener('ended',function(){ fill.style.width='0'; });
  a.addEventListener('loadedmetadata',function(){ dur.textContent=fmt(a.duration); });
  a.addEventListener('timeupdate',function(){ if(a.duration) fill.style.width=(a.currentTime/a.duration*100)+'%'; cur.textContent=fmt(a.currentTime); });
  a.addEventListener('error',function(){ toast(T.loadfail); });
  bar.addEventListener('click',function(e){ if(!a.duration) return; var r=bar.getBoundingClientRect(); a.currentTime=clamp((e.clientX-r.left)/r.width,0,1)*a.duration; });
});

/* ---------- order page: reflect ?status= honestly ---------- */
(function(){
  var box=$('#orderState'); if(!box) return;
  var s=''; try{ s=new URLSearchParams(location.search).get('status')||''; }catch(e){}
  var m=T.status[s]; if(!m) return;
  box.setAttribute('data-kind',s==='success'?'ok':s);
  $('h2',box).textContent=m[0]; $('p',box).textContent=m[1];
  box.hidden=false; box.setAttribute('tabindex','-1'); box.focus({preventScroll:false});
  track('order_status',{status:s});
})();

/* ---------- language: the URL decides ----------
   A localized URL always shows its own language: no detection, no redirect. Detection lives only on the root (/).
   The switcher is the one manual choice; it is remembered and wins the next time someone enters from the root. */
(function(){
  function openShutter(minWait){
    setTimeout(function(){ requestAnimationFrame(function(){ requestAnimationFrame(function(){
      root.classList.add('lx-open');
      setTimeout(function(){ root.classList.remove('lx-in','lx-open'); },1000);
    }); }); },Math.max(0,minWait));
  }
  if(root.classList.contains('lx-in')){
    var started=false, t0=Date.now();
    var go=function(){ if(started) return; started=true; openShutter(150-(Date.now()-t0)); };
    var afterFonts=function(){ var f=document.fonts&&document.fonts.ready; if(f) f.then(go,go); else go(); };
    if(document.readyState==='complete') afterFonts(); else addEventListener('load',afterFonts,{once:true});
    setTimeout(go,1600);
  }
  var a=$('#btnLang'); if(!a) return;
  var busy=false, safety=null;
  a.addEventListener('click',function(e){
    if(busy){ e.preventDefault(); return; }
    var href=a.getAttribute('href'); if(!href) return;
    if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
    var to=a.getAttribute('hreflang')||(L==='it'?'en':'it');
    try{ localStorage.setItem('eld-lang',to); }catch(err){}
    track('language_change',{to:to});
    if(RM) return;
    e.preventDefault(); busy=true;
    var path=''; try{ path=new URL(href,location.href).pathname; }catch(err){}
    try{ sessionStorage.setItem('eld-lx',JSON.stringify({t:Date.now(),to:path})); }catch(err){}
    root.classList.add('lx-out');
    setTimeout(function(){ location.href=href; },480);
    safety=setTimeout(function(){ busy=false; root.classList.remove('lx-out'); },5000);
  });
  addEventListener('pageshow',function(ev){
    if(!ev.persisted) return;
    clearTimeout(safety); busy=false;
    try{ sessionStorage.removeItem('eld-lx'); }catch(err){}
    if(root.classList.contains('lx-out')){ root.classList.add('lx-in'); root.classList.remove('lx-out'); openShutter(60); }
  });
})();
})();
