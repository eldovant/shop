#!/usr/bin/env node
/* ==========================================================================
   ELDOVANT Shop — static build (zero dependencies, Node ≥ 18).

   node tools/build.mjs                       build into the repository root
   node tools/build.mjs --check               build, then audit links / hreflang / canonical / sitemap
   node tools/build.mjs --data path.js        use another catalogue file (testing)
   node tools/build.mjs --out dir             write the whole site into dir (testing)

   Source of truth: shop-data.js. Everything else is generated.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const CHECK = argv.includes('--check');
const DATA = path.resolve(arg('--data') || path.join(REPO, 'shop-data.js'));
const OUT = path.resolve(arg('--out') || REPO);

/* ---------- load data ---------- */
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(DATA, 'utf8'), sandbox, { filename: DATA });
const D = sandbox.window.ELDOVANT_SHOP;
if (!D) fail('shop-data.js does not define window.ELDOVANT_SHOP');
const C = D.config;
const SITE = C.siteUrl.replace(/\/$/, '');
const MAIN = C.mainUrl.replace(/\/$/, '');
const LANGS = ['en', 'it'];
const PRODUCTS = D.products || [];

function fail(m) { console.error('\n✖ ' + m + '\n'); process.exit(1); }

/* ---------- validation ---------- */
(function validate() {
  const errs = [];
  const need = (o, k, where) => { if (!o || !o[k] || !String(o[k]).trim()) errs.push(`${where}: missing "${k}"`); };
  const bi = (o, where) => LANGS.forEach(l => need(o || {}, l, where + '.' + l));
  const slugs = { en: new Set(), it: new Set() }, ids = new Set();
  PRODUCTS.forEach((p, i) => {
    const w = `products[${i}] (${p.id || '?'})`;
    if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errs.push(`${w}: id must be lowercase letters, digits, hyphens`);
    if (ids.has(p.id)) errs.push(`${w}: duplicate id`); ids.add(p.id);
    LANGS.forEach(l => {
      const s = p.slug && p.slug[l];
      if (!s || !/^[a-z0-9-]+$/.test(s)) errs.push(`${w}: slug.${l} must be lowercase letters, digits, hyphens`);
      else { if (slugs[l].has(s)) errs.push(`${w}: duplicate slug.${l} "${s}"`); slugs[l].add(s); }
    });
    if (!['motion-pictures', 'music'].includes(p.pillar)) errs.push(`${w}: pillar must be 'motion-pictures' or 'music'`);
    if (!['available', 'soon', 'unavailable'].includes(p.status)) errs.push(`${w}: status must be available | soon | unavailable`);
    bi(p.title, w + '.title'); bi(p.kind, w + '.kind'); bi(p.tagline, w + '.tagline');
    LANGS.forEach(l => { if (!p.overview || !Array.isArray(p.overview[l]) || !p.overview[l].length) errs.push(`${w}: overview.${l} needs at least one paragraph`); });
    if (!p.cover || !p.cover.src) errs.push(`${w}: cover.src missing`);
    else {
      if (!fs.existsSync(path.join(REPO, p.cover.src)) && !fs.existsSync(path.join(path.dirname(DATA), p.cover.src))) errs.push(`${w}: cover file not found (${p.cover.src})`);
      if (!p.cover.width || !p.cover.height) errs.push(`${w}: cover.width and cover.height are required (prevents layout shift, keeps the artwork uncropped)`);
      bi(p.cover.alt, w + '.cover.alt');
    }
    if (p.status === 'available') {
      if (!p.price || !(p.price.amount >= 0)) errs.push(`${w}: an available product needs price.amount`);
      if (!p.gumroad && !/^https:\/\//i.test(p.checkoutUrl || '')) errs.push(`${w}: an available product needs a gumroad.url (or an https checkoutUrl)`);
    }
    if (p.gumroad) {
      if (!/^https:\/\/([a-z0-9-]+\.)?gumroad\.com\/l\/[A-Za-z0-9_-]+\/?$/.test(p.gumroad.url || '')) errs.push(`${w}: gumroad.url must look like https://<seller>.gumroad.com/l/<permalink>`);
      (p.gumroad.variants || []).forEach((v, j) => { need(v, 'value', `${w}.gumroad.variants[${j}]`); bi(v.label, `${w}.gumroad.variants[${j}].label`); });
    }
    if (p.includes) LANGS.forEach(l => { if (!Array.isArray(p.includes[l])) errs.push(`${w}: includes.${l} must be a list`); });
    (p.details || []).forEach((d, j) => { bi(d.k, `${w}.details[${j}].k`); bi(d.v, `${w}.details[${j}].v`); });
    if (p.preview) {
      if (!['audio', 'video'].includes(p.preview.type)) errs.push(`${w}: preview.type must be audio | video`);
      need(p.preview, 'src', w + '.preview');
    }
    if (p.featured && PRODUCTS.filter(x => x.featured).length > 1) errs.push(`${w}: only one product can be featured`);
  });
  if (errs.length) fail('shop-data.js has problems:\n  - ' + errs.join('\n  - '));
})();

/* ==========================================================================
   Strings
   ========================================================================== */
const S = {
  en: {
    loc: 'en_US', htmlLang: 'en',
    skip: 'Skip to content', brandAria: 'ELDOVANT Shop — home', shop: 'Shop', backShort: 'eldovant.com', backLong: 'Back to eldovant.com',
    menu: 'Menu', close: 'Close', menuAria: 'Shop menu', themeBtn: 'Switch to light mode', langAria: 'Passa alla versione italiana', langLabel: 'IT',
    nav: { home: 'Shop', products: 'Releases', delivery: 'Delivery & support' },
    navHint: { home: 'Home of the shop', main: 'Main site' },
    menuMain: 'The main site', menuSide: 'On eldovant.com',
    mainLinks: { home: 'ELDOVANT', productions: 'Productions', studio: 'The Studio', contact: 'Contact' },
    descriptor: 'Original Motion Pictures & Music',
    footNavigate: 'Navigate', footMain: 'ELDOVANT', footLegal: 'Legal', footChannels: 'Channels',
    privacy: 'Privacy Policy', cookies: 'Cookie Policy', terms: 'Terms of Service', refund: 'Refund policy',
    rights: 'All rights reserved.', digitalOnly: 'Every ELDOVANT release in this shop is digital.',
    top: 'Return to the top',
    hero: { eyebrow: 'ELDOVANT — Shop', title: ['Original work,', 'released.'], sub: 'Digital releases of ELDOVANT’s original motion pictures and music.', explore: 'Explore the releases', main: 'See what’s in production', delivery: 'How delivery works' },
    screen: { line: 'The first release will appear here.', small: 'No releases yet' },
    pillars: { 'motion-pictures': 'Motion Pictures', music: 'Music' },
    pillarChip: { 'motion-pictures': 'Motion Pictures', music: 'Music' },
    open: {
      h2: 'The shop is open. The first release is not yet.', lead: 'When ELDOVANT releases something, it will have its own page here: what it is, what is included, the format, and a clear way to purchase.',
      rows: [
        ['Motion Pictures', 'Digital releases connected to ELDOVANT’s films, short films and series.'],
        ['Music', 'Soundtracks, themes and original compositions.'],
        ['Every release', 'A page of its own, with the exact contents and technical details stated before you pay.']
      ],
      follow: 'Follow what is in production'
    },
    featured: 'Featured release', releases: 'Releases', moreReleases: 'More releases', allReleases: 'All releases', viewDetails: 'View details', purchase: 'Purchase',
    all: 'All', search: 'Search releases', noResTitle: 'Nothing matches.', noResText: 'Try another word, or show every release.', showAll: 'Show all',
    countOne: '1 release', countMany: (n) => n + ' releases',
    status: { available: 'Available', soon: 'Coming soon', unavailable: 'Unavailable' },
    pd: {
      overview: 'Overview', preview: 'Preview', includes: 'What’s included', details: 'Format & technical details', purchase: 'Purchase', credits: 'Credits', related: 'Related',
      releaseDate: 'Release date', crumbHome: 'Shop', crumbList: 'Releases', production: 'See the production on eldovant.com', others: 'Other releases',
      note: (prov) => 'Digital release. You complete payment on the checkout page' + (prov ? ' by ' + prov : '') + '.',
      soon: 'This release is not available to purchase yet.', unavailable: 'This release is currently unavailable.', unavailableText: 'Browse the other releases, or write to us if you were looking for something specific.',
      browse: 'Browse the releases', deliveryLink: 'Delivery & support', previewAudio: 'Audio preview', previewVideo: 'Video preview', checkoutAria: (t) => 'Purchase ' + t,
      noteGumroad: 'Digital release. You review your order here, then pay in a secure Gumroad window.'
    },
    co: {
      crumb: 'Checkout', eyebrow: 'Checkout', h1: 'Review and pay', title: (t) => `Checkout — ${t} — ELDOVANT Shop`, desc: 'Review your order and continue to secure payment.',
      summary: 'Your order', total: 'Total', totalNote: 'The final amount is confirmed on the payment screen.', variant: 'Version', included: 'Included', digital: 'Digital release',
      steps: ['Review', 'Payment', 'Access'],
      review: { h: 'Before you pay', p: 'Payment is completed in a secure Gumroad window that opens over this page. ELDOVANT never sees or stores your card details.', mail: 'You will enter your email address once, in the payment window.', cta: 'Continue to payment', third: 'Gumroad’s payment window is loaded only when you continue.', back: 'Back to the release' },
      opening: { h: 'Opening secure payment…', p: 'One moment. Gumroad’s window opens over this page.' },
      paying: { h: 'Payment is open', p: 'Complete it in the window above. You can come back here at any time.', done: 'I’ve completed my purchase', cancel: 'Back to review' },
      blocked: { h: 'Payment could not be opened here', p: 'A browser extension or network setting may be blocking it. You can continue on Gumroad’s own checkout page instead — nothing has been charged.', cta: 'Continue on Gumroad', retry: 'Try again' },
      slow: { h: 'This is taking longer than expected', p: 'The payment window has not opened yet. You can wait, try again, or continue on Gumroad’s own checkout page.' },
      offline: { h: 'You appear to be offline', p: 'Reconnect and try again — nothing has been charged.', retry: 'Try again' },
      noscript: 'Payment needs JavaScript. You can continue directly on Gumroad:'
    },
    dl: {
      h1: 'Delivery & support', h1Order: 'Your order',
      lead: 'ELDOVANT releases are digital. This is how you get your files, and who to write to if something does not look right.',
      leadOrder: 'Here is what happens next, and where to turn if anything does not look right.',
      steps: [
        ['Choose a release', 'Each release page states what is included and in which format, before you pay.'],
        ['Complete payment', 'You pay on the checkout page opened from the release. This site never asks for your card details.'],
        ['Receive your access', null]
      ],
      faqH: 'Questions',
      faq: [
        ['I did not receive anything.', null],
        ['Can I get my files again?', 'Keep your confirmation: it is the reference for your purchase. If you can no longer reach your files, write to {support} with the email address used at purchase.'],
        ['Which formats will I get?', 'Every release page lists the exact format and technical details.'],
        ['Refunds and questions about a purchase', null],
        ['Privacy', 'Read how personal data is handled on {privacy}.']
      ],
      refundWith: 'The refund policy is published here: {refund}. For anything else, write to {support}.',
      refundWithout: 'For any question about a purchase, write to {support}.',
      write: 'Write to support', browse: 'Browse the releases', privacyLink: 'the Privacy Policy'
    },
    meta: {
      homeTitle: 'ELDOVANT Shop — Digital releases of original motion pictures & music', homeDesc: 'The official ELDOVANT shop: digital releases of original motion pictures and music.',
      listTitle: 'ELDOVANT Shop — Releases', listDesc: 'Every ELDOVANT release available as a digital product: original motion pictures and music.',
      dlTitle: 'ELDOVANT Shop — Delivery & support', dlDesc: 'How ELDOVANT digital releases are delivered, and who to contact about a purchase.',
      orderTitle: 'ELDOVANT Shop — Your order', orderDesc: 'What happens after your purchase.'
    },
    e404: { code: '404', h1: 'This page is not in the catalogue.', p: 'The release may have been removed, or the address may be wrong.', a: 'Browse the releases', b: 'Back to eldovant.com' },
    state: { h: 'Order status' }
  },
  it: {
    loc: 'it_IT', htmlLang: 'it',
    skip: 'Vai al contenuto', brandAria: 'ELDOVANT Shop — home', shop: 'Shop', backShort: 'eldovant.com', backLong: 'Torna a eldovant.com',
    menu: 'Menu', close: 'Chiudi', menuAria: 'Menu dello shop', themeBtn: 'Passa alla modalità chiara', langAria: 'Switch to the English version', langLabel: 'EN',
    nav: { home: 'Shop', products: 'Uscite', delivery: 'Consegna e assistenza' },
    navHint: { home: 'Home dello shop', main: 'Sito principale' },
    menuMain: 'Il sito principale', menuSide: 'Su eldovant.com',
    mainLinks: { home: 'ELDOVANT', productions: 'Produzioni', studio: 'Lo Studio', contact: 'Contatti' },
    descriptor: 'Original Motion Pictures & Music',
    footNavigate: 'Navigate', footMain: 'ELDOVANT', footLegal: 'Note legali', footChannels: 'Canali',
    privacy: 'Informativa privacy', cookies: 'Informativa cookie', terms: 'Termini di servizio', refund: 'Politica di rimborso',
    rights: 'Tutti i diritti riservati.', digitalOnly: 'Ogni uscita ELDOVANT in questo shop è digitale.',
    top: 'Torna in alto',
    hero: { eyebrow: 'ELDOVANT — Shop', title: ['Opere originali,', 'pubblicate.'], sub: 'Uscite digitali delle opere cinematografiche e musicali originali di ELDOVANT.', explore: 'Esplora le uscite', main: 'Cosa c’è in produzione', delivery: 'Come funziona la consegna' },
    screen: { line: 'La prima uscita apparirà qui.', small: 'Ancora nessuna uscita' },
    pillars: { 'motion-pictures': 'Motion Pictures', music: 'Musica' },
    pillarChip: { 'motion-pictures': 'Cinema', music: 'Musica' },
    open: {
      h2: 'Lo shop è aperto. La prima uscita non ancora.', lead: 'Quando ELDOVANT pubblicherà qualcosa, avrà qui una pagina tutta sua: cos’è, cosa include, il formato e un modo chiaro per acquistarlo.',
      rows: [
        ['Motion Pictures', 'Uscite digitali legate ai film, ai cortometraggi e alle serie di ELDOVANT.'],
        ['Musica', 'Colonne sonore, temi e composizioni originali.'],
        ['Ogni uscita', 'Una pagina dedicata, con contenuti esatti e dettagli tecnici dichiarati prima del pagamento.']
      ],
      follow: 'Segui ciò che è in produzione'
    },
    featured: 'Uscita in evidenza', releases: 'Uscite', moreReleases: 'Altre uscite', allReleases: 'Tutte le uscite', viewDetails: 'Vedi i dettagli', purchase: 'Acquista',
    all: 'Tutte', search: 'Cerca tra le uscite', noResTitle: 'Nessun risultato.', noResText: 'Prova un’altra parola, oppure mostra tutte le uscite.', showAll: 'Mostra tutto',
    countOne: '1 uscita', countMany: (n) => n + ' uscite',
    status: { available: 'Disponibile', soon: 'In arrivo', unavailable: 'Non disponibile' },
    pd: {
      overview: 'Panoramica', preview: 'Anteprima', includes: 'Cosa include', details: 'Formato e dettagli tecnici', purchase: 'Acquisto', credits: 'Crediti', related: 'Correlati',
      releaseDate: 'Data di uscita', crumbHome: 'Shop', crumbList: 'Uscite', production: 'Vedi la produzione su eldovant.com', others: 'Altre uscite',
      note: (prov) => 'Uscita digitale. Completi il pagamento sulla pagina di checkout' + (prov ? ' di ' + prov : '') + '.',
      soon: 'Questa uscita non è ancora disponibile per l’acquisto.', unavailable: 'Questa uscita al momento non è disponibile.', unavailableText: 'Sfoglia le altre uscite, oppure scrivici se cercavi qualcosa di preciso.',
      browse: 'Sfoglia le uscite', deliveryLink: 'Consegna e assistenza', previewAudio: 'Anteprima audio', previewVideo: 'Anteprima video', checkoutAria: (t) => 'Acquista ' + t,
      noteGumroad: 'Uscita digitale. Controlli l’ordine qui, poi paghi in una finestra sicura di Gumroad.'
    },
    co: {
      crumb: 'Pagamento', eyebrow: 'Pagamento', h1: 'Controlla e paga', title: (t) => `Pagamento — ${t} — ELDOVANT Shop`, desc: 'Controlla l’ordine e prosegui verso il pagamento sicuro.',
      summary: 'Il tuo ordine', total: 'Totale', totalNote: 'L’importo finale è confermato nella schermata di pagamento.', variant: 'Versione', included: 'Incluso', digital: 'Uscita digitale',
      steps: ['Riepilogo', 'Pagamento', 'Accesso'],
      review: { h: 'Prima di pagare', p: 'Il pagamento si completa in una finestra sicura di Gumroad che si apre sopra questa pagina. ELDOVANT non vede né conserva i dati della tua carta.', mail: 'Inserirai il tuo indirizzo email una sola volta, nella finestra di pagamento.', cta: 'Continua al pagamento', third: 'La finestra di pagamento di Gumroad viene caricata solo quando prosegui.', back: 'Torna all’uscita' },
      opening: { h: 'Apertura del pagamento sicuro…', p: 'Un attimo. La finestra di Gumroad si apre sopra questa pagina.' },
      paying: { h: 'Il pagamento è aperto', p: 'Completalo nella finestra qui sopra. Puoi tornare qui in qualsiasi momento.', done: 'Ho completato l’acquisto', cancel: 'Torna al riepilogo' },
      blocked: { h: 'Impossibile aprire il pagamento qui', p: 'Un’estensione del browser o un’impostazione di rete potrebbe bloccarlo. Puoi proseguire sulla pagina di pagamento di Gumroad — non è stato addebitato nulla.', cta: 'Continua su Gumroad', retry: 'Riprova' },
      slow: { h: 'Ci sta mettendo più del previsto', p: 'La finestra di pagamento non si è ancora aperta. Puoi attendere, riprovare o proseguire sulla pagina di pagamento di Gumroad.' },
      offline: { h: 'Sembra che tu sia offline', p: 'Riconnettiti e riprova — non è stato addebitato nulla.', retry: 'Riprova' },
      noscript: 'Il pagamento richiede JavaScript. Puoi proseguire direttamente su Gumroad:'
    },
    dl: {
      h1: 'Consegna e assistenza', h1Order: 'Il tuo ordine',
      lead: 'Le uscite ELDOVANT sono digitali. Qui trovi come ricevere i tuoi file e a chi scrivere se qualcosa non torna.',
      leadOrder: 'Ecco cosa succede adesso e a chi rivolgerti se qualcosa non torna.',
      steps: [
        ['Scegli un’uscita', 'Ogni pagina indica cosa è incluso e in quale formato, prima del pagamento.'],
        ['Completa il pagamento', 'Paghi sulla pagina di checkout aperta dall’uscita. Questo sito non ti chiede mai i dati della carta.'],
        ['Ricevi l’accesso', null]
      ],
      faqH: 'Domande',
      faq: [
        ['Non ho ricevuto nulla.', null],
        ['Posso riavere i miei file?', 'Conserva la conferma: è il riferimento del tuo acquisto. Se non riesci più a raggiungere i file, scrivi a {support} indicando l’indirizzo email usato all’acquisto.'],
        ['Che formati riceverò?', 'Ogni pagina indica il formato esatto e i dettagli tecnici.'],
        ['Rimborsi e domande su un acquisto', null],
        ['Privacy', 'Leggi come vengono trattati i dati personali nell’{privacy}.']
      ],
      refundWith: 'La politica di rimborso è pubblicata qui: {refund}. Per tutto il resto, scrivi a {support}.',
      refundWithout: 'Per qualsiasi domanda su un acquisto, scrivi a {support}.',
      write: 'Scrivi all’assistenza', browse: 'Sfoglia le uscite', privacyLink: 'Informativa privacy'
    },
    meta: {
      homeTitle: 'ELDOVANT Shop — Uscite digitali di film e musica originali', homeDesc: 'Lo shop ufficiale ELDOVANT: uscite digitali di opere cinematografiche e musicali originali.',
      listTitle: 'ELDOVANT Shop — Uscite', listDesc: 'Tutte le uscite ELDOVANT disponibili come prodotti digitali: opere cinematografiche e musicali originali.',
      dlTitle: 'ELDOVANT Shop — Consegna e assistenza', dlDesc: 'Come vengono consegnate le uscite digitali ELDOVANT e a chi rivolgersi per un acquisto.',
      orderTitle: 'ELDOVANT Shop — Il tuo ordine', orderDesc: 'Cosa succede dopo il tuo acquisto.'
    },
    e404: { code: '404', h1: 'Questa pagina non è nel catalogo.', p: 'L’uscita potrebbe essere stata rimossa, oppure l’indirizzo non è corretto.', a: 'Sfoglia le uscite', b: 'Torna a eldovant.com' },
    state: { h: 'Stato dell’ordine' }
  }
};

/* ---------- URLs ---------- */
const SEG = { products: { en: 'products', it: 'prodotti' }, delivery: { en: 'delivery', it: 'consegna' }, order: { en: 'order', it: 'ordine' }, checkout: { en: 'checkout', it: 'pagamento' } };
const MAINP = {
  home: { en: '/en/', it: '/it/' }, productions: { en: '/en/productions/', it: '/it/produzioni/' }, studio: { en: '/en/studio/', it: '/it/studio/' },
  contact: { en: '/en/contact/', it: '/it/contatti/' }, privacy: { en: '/en/privacy-policy/', it: '/it/informativa-privacy/' },
  cookies: { en: '/en/cookie-policy/', it: '/it/informativa-cookie/' }, terms: { en: '/en/terms-of-service/', it: '/it/termini-di-servizio/' }
};
const mainUrl = (k, l) => MAIN + MAINP[k][l];
const U = {
  home: (l) => `/${l}/`,
  list: (l) => `/${l}/${SEG.products[l]}/`,
  product: (p, l) => `/${l}/${SEG.products[l]}/${p.slug[l]}/`,
  delivery: (l) => `/${l}/${SEG.delivery[l]}/`,
  order: (l) => `/${l}/${SEG.order[l]}/`,
  checkout: (p, l) => `/${l}/${SEG.checkout[l]}/${p.slug[l]}/`
};
const abs = (p) => SITE + p;

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const trunc = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const money = (p, l) => new Intl.NumberFormat(l === 'it' ? 'it-IT' : 'en-GB', { style: 'currency', currency: p.price.currency || C.currency }).format(p.price.amount);
const dateFmt = (iso, l) => { try { return new Intl.DateTimeFormat(l === 'it' ? 'it-IT' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z')); } catch { return iso; } };
const write = (rel, content) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
const featured = PRODUCTS.find(p => p.featured) || PRODUCTS.find(p => p.status === 'available') || PRODUCTS[0] || null;
const SOCIAL_NAMES = [['YouTube', /youtube/], ['Instagram', /instagram/], ['TikTok', /tiktok/], ['Facebook', /facebook/], ['X', /x\.com|twitter/]];
const socialName = (u) => (SOCIAL_NAMES.find(([, r]) => r.test(u)) || [u])[0];

/* ==========================================================================
   Chrome
   ========================================================================== */
const HEAD_SCRIPT = (home) => `<script>
/* Runs before first paint: theme, motion preference, opening state. */
(function(){
  var d=document.documentElement; d.classList.add('js');
  var t=null; try{t=localStorage.getItem('eld-theme')}catch(e){}
  if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark'}
  d.setAttribute('data-theme',t);
  var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches; if(rm)d.classList.add('rm');
  var seen=false; try{seen=sessionStorage.getItem('eld-open-shop')==='1'}catch(e){}
  try{var lx=JSON.parse(sessionStorage.getItem('eld-lx')||'null'); sessionStorage.removeItem('eld-lx');
    if(lx&&!rm&&Date.now()-lx.t<8000&&lx.to===location.pathname.replace(/index\\.html$/,'')){d.classList.add('lx-in','lx-arrive');seen=true}}catch(e){}
  ${home ? "if(!rm&&!seen)d.classList.add('open');" : ''}
})();
</script>`;

const logoPair = (cls, kind, w, h) => `<img class="${cls} dk" src="/assets/brand/${kind}-dk.webp" alt="" width="${w}" height="${h}"><img class="${cls} lt" src="/assets/brand/${kind}-lt.webp" alt="" width="${w}" height="${h}">`;
const logoWord = (cls) => `<img class="${cls} dk" src="/assets/brand/brand-w-dk.webp" alt="ELDOVANT" width="1070" height="117"><img class="${cls} lt" src="/assets/brand/brand-w-lt.webp" alt="ELDOVANT" width="1070" height="117">`;

function headerHtml(l, st, always) {
  const alt = l === 'en' ? 'it' : 'en';
  return `<header class="hdr${always ? ' always' : ''}" id="hdr">
  <a class="brand" href="${U.home(l)}" aria-label="${esc(st.brandAria)}">${logoPair('brand-e', 'brand-e', 200, 215)}${logoWord('brand-w')}</a>
  <div class="hdr-mid"><span class="where">${esc(st.shop)}</span><a class="back" href="${mainUrl('home', l)}"><span aria-hidden="true">←</span> ${esc(st.backShort)}</a></div>
  <div class="hdr-ctl">
    <button class="ibtn" id="btnTheme" type="button" aria-label="${esc(st.themeBtn)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg></button>
    <span class="lswitch"><a id="btnLang" href="__ALT__" aria-label="${esc(st.langAria)}" hreflang="${alt}" lang="${alt}" rel="alternate">${st.langLabel}</a></span>
    <button class="mbtn" id="btnMenu" type="button" aria-haspopup="dialog" aria-controls="menu">${esc(st.menu)}<i aria-hidden="true"></i></button>
  </div>
  <div class="hdr-line" aria-hidden="true"><i id="prog"></i></div>
</header>`;
}

function menuHtml(l, st, key) {
  const cur = (k) => (key === k ? ' aria-current="page"' : '');
  return `<dialog class="menu" id="menu" aria-label="${esc(st.menuAria)}">
  <div class="menu-in">
    <div class="menu-top">
      <a class="brand" href="${U.home(l)}" aria-label="${esc(st.brandAria)}">${logoPair('brand-e', 'brand-e', 200, 215)}${logoWord('brand-w')}</a>
      <button class="mbtn" id="menuClose" type="button">${esc(st.close)}<i aria-hidden="true"></i></button>
    </div>
    <div class="menu-body">
      <nav aria-label="${esc(st.shop)}"><ul class="menu-main">
        <li><a href="${U.home(l)}"${cur('home')}>${esc(st.nav.home)}</a></li>
        <li><a href="${U.list(l)}"${cur('list')}>${esc(st.nav.products)}</a></li>
        <li><a href="${U.delivery(l)}"${cur('delivery')}>${esc(st.nav.delivery)}</a></li>
        <li><a href="${mainUrl('home', l)}">${esc(st.backShort)} <small>${esc(st.navHint.main)} ↗</small></a></li>
      </ul></nav>
      <nav class="menu-side" aria-label="${esc(st.menuSide)}">
        <h2>${esc(st.menuSide)}</h2>
        <ul>${['productions', 'studio', 'contact'].map(k => `<li><a href="${mainUrl(k, l)}"><span>${esc(st.mainLinks[k])}</span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul>
      </nav>
    </div>
    <div class="menu-foot"><span>${esc(st.descriptor)}</span><span><a href="${mainUrl('privacy', l)}">${esc(st.privacy)}</a><a href="${mainUrl('terms', l)}">${esc(st.terms)}</a></span></div>
  </div>
</dialog>`;
}

function footerHtml(l, st) {
  const social = (C.social || []).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(l === 'it' ? 'ELDOVANT su ' : 'ELDOVANT on ')}${esc(socialName(u))}">${esc(socialName(u))}</a>`).join('');
  const refund = C.refundPolicyUrl && C.refundPolicyUrl[l] ? `<a href="${esc(C.refundPolicyUrl[l])}">${esc(st.refund)}</a>` : '';
  return `<footer class="credits" id="credits">
  ${logoPair('mark', 'brand-e', 200, 215)}
  <p class="cap">${esc(st.descriptor)}</p>
  <dl class="roll">
    <dt>${esc(st.footNavigate)}</dt><dd><a href="${U.home(l)}">${esc(st.nav.home)}</a><a href="${U.list(l)}">${esc(st.nav.products)}</a><a href="${U.delivery(l)}">${esc(st.nav.delivery)}</a></dd>
    <dt>${esc(st.footMain)}</dt><dd><a href="${mainUrl('home', l)}">${esc(st.backShort)}</a><a href="${mainUrl('productions', l)}">${esc(st.mainLinks.productions)}</a><a href="${mainUrl('studio', l)}">${esc(st.mainLinks.studio)}</a><a href="${mainUrl('contact', l)}">${esc(st.mainLinks.contact)}</a></dd>
    ${social ? `<dt>${esc(st.footChannels)}</dt><dd>${social}</dd>` : ''}
    <dt>${esc(st.footLegal)}</dt><dd><a href="${mainUrl('privacy', l)}">${esc(st.privacy)}</a><a href="${mainUrl('cookies', l)}">${esc(st.cookies)}</a><a href="${mainUrl('terms', l)}">${esc(st.terms)}</a>${refund}</dd>
  </dl>
  <div class="fine"><span>${esc(st.digitalOnly)}</span><span>© <span id="year">${new Date().getFullYear()}</span> ELDOVANT. ${esc(st.rights)}</span></div>
</footer>`;
}

/* Full page. `alts` = { en: path, it: path } (omit for noindex pages that have no equivalent list). */
function page(o) {
  const { l, key, title, desc, canonical, alts, body, ld = [], og, noindex, home } = o;
  const st = S[l];
  const alt = l === 'en' ? 'it' : 'en';
  const ogImage = og && og.url ? og : { url: abs('/assets/og-brand.jpg'), w: 1200, h: 630 };
  const seo = [
    `<link rel="canonical" href="${abs(canonical)}">`,
    ...(alts && !noindex ? [`<link rel="alternate" hreflang="en" href="${abs(alts.en)}">`, `<link rel="alternate" hreflang="it" href="${abs(alts.it)}">`, `<link rel="alternate" hreflang="x-default" href="${SITE}/">`] : []),
    `<meta property="og:type" content="${o.ogType || 'website'}">`, `<meta property="og:site_name" content="ELDOVANT Shop">`,
    `<meta property="og:title" content="${esc(title)}">`, `<meta property="og:description" content="${esc(desc)}">`, `<meta property="og:url" content="${abs(canonical)}">`,
    `<meta property="og:locale" content="${st.loc}">`, `<meta property="og:locale:alternate" content="${S[alt].loc}">`,
    `<meta property="og:image" content="${esc(ogImage.url)}">`, ...(ogImage.w ? [`<meta property="og:image:width" content="${ogImage.w}">`, `<meta property="og:image:height" content="${ogImage.h}">`] : []),
    `<meta name="twitter:card" content="summary_large_image">`, `<meta name="twitter:title" content="${esc(title)}">`, `<meta name="twitter:description" content="${esc(desc)}">`, `<meta name="twitter:image" content="${esc(ogImage.url)}">`,
    ...ld.map(jsonLd)
  ].join('\n');
  const altHref = alts ? alts[alt] : U.home(alt);
  return `<!DOCTYPE html>
<html lang="${l}" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex,follow">\n' : ''}<!-- build:seo:start -->
${seo}
<!-- build:seo:end -->
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#070605" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#e5e2d9" media="(prefers-color-scheme: light)">
<link rel="icon" href="/favicon.ico" sizes="48x48 96x96 144x144">
<link rel="icon" type="image/png" href="/favicon-48x48.png" sizes="48x48">
<link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96">
<link rel="icon" type="image/png" href="/favicon.png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
<link rel="preload" href="/assets/fonts/CormorantGaramond-300.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/InstrumentSans-400.woff2" as="font" type="font/woff2" crossorigin>
${HEAD_SCRIPT(home)}
<link rel="stylesheet" href="/shop.css">
</head>
<body>
<a class="skip" href="#main">${esc(st.skip)}</a>
${headerHtml(l, st, !home).replace('__ALT__', altHref)}
${menuHtml(l, st, key)}
<main id="main"${o.mainAttrs || ''}>
${body}
</main>
${o.afterMain || ''}
${footerHtml(l, st)}
<script src="/shop.js" defer></script>
</body>
</html>
`;
}

/* ==========================================================================
   Parts
   ========================================================================== */
const orgLd = () => ({ '@context': 'https://schema.org', '@type': 'Organization', name: 'ELDOVANT', url: MAIN + '/', logo: MAIN + '/apple-touch-icon.png', slogan: 'Original Motion Pictures & Music', sameAs: C.social || [] });
const siteLd = () => ({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'ELDOVANT Shop', url: SITE + '/', inLanguage: LANGS, publisher: { '@type': 'Organization', name: 'ELDOVANT', url: MAIN + '/' } });
const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: abs(it[1]) })) });

const artImg = (p, l, { eager = false, sizes } = {}) => `<img src="/${esc(p.cover.src)}" alt="${esc(p.cover.alt[l])}" width="${p.cover.width}" height="${p.cover.height}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}${sizes ? ` sizes="${sizes}"` : ''}>`;

function tile(p, l, i) {
  const st = S[l];
  const search = [p.title[l], p.tagline[l], p.kind[l], st.pillars[p.pillar]].join(' ');
  return `<article class="pc rise" data-id="${esc(p.id)}" data-pillar="${p.pillar}" data-search="${esc(search)}" style="--d:${(i % 3) * 0.08}s">
  <a class="pc-art" href="${U.product(p, l)}" tabindex="-1" aria-hidden="true">${artImg(p, l)}</a>
  <div class="pc-no"><span>${String(i + 1).padStart(2, '0')} · ${esc(p.kind[l])}</span><span>${esc(st.pillars[p.pillar])}</span></div>
  <h3><a href="${U.product(p, l)}">${esc(p.title[l])}</a></h3>
  <p class="pc-tag">${esc(p.tagline[l])}</p>
  <div class="pc-foot">${p.status === 'available' && p.price ? `<span class="price">${esc(money(p, l))}</span>` : `<span></span>`}<span class="pill" data-status="${p.status}">${esc(st.status[p.status])}</span></div>
</article>`;
}

function toolsHtml(l, list) {
  const st = S[l];
  const showFilters = list.length >= C.thresholds.filters && new Set(list.map(p => p.pillar)).size > 1;
  const showSearch = list.length >= C.thresholds.search;
  if (!showFilters && !showSearch) return '';
  const pillars = [...new Set(list.map(p => p.pillar))];
  return `<div class="tools">
  ${showFilters ? `<div class="chips" role="group" aria-label="${esc(st.releases)}"><button class="chip" type="button" data-filter="all" aria-pressed="true">${esc(st.all)}</button>${pillars.map(k => `<button class="chip" type="button" data-filter="${k}" aria-pressed="false">${esc(st.pillarChip[k])}</button>`).join('')}</div>` : ''}
  ${showSearch ? `<label class="srch"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><span class="sr-only">${esc(st.search)}</span><input id="q" type="search" placeholder="${esc(st.search)}" autocomplete="off"></label>` : ''}
</div>`;
}

function wall(l, list) {
  const st = S[l];
  const n = list.length;
  return `${toolsHtml(l, list)}<div class="wall" data-wall data-count="${n > 2 ? 'many' : n}">${list.map((p, i) => tile(p, l, i)).join('')}</div>
<div class="noresults" id="noresults" hidden><h3>${esc(st.noResTitle)}</h3><p>${esc(st.noResText)}</p><p style="margin-top:20px"><button class="cta ghost" id="resetFilters" type="button">${esc(st.showAll)}</button></p></div>`;
}

function emptyHtml(l) {
  const st = S[l];
  return `<section class="sec" id="releases" aria-labelledby="eH"><div class="wrap"><div class="opening">
  <div><p class="eyebrow">${esc(st.releases)}</p><h2 class="display wipe" id="eH" style="margin-top:16px">${esc(st.open.h2)}</h2></div>
  <div><p class="lead" style="margin-bottom:34px">${esc(st.open.lead)}</p>
  <dl class="opening-rows">${st.open.rows.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
  <p style="margin-top:34px"><a class="tlink" href="${mainUrl('productions', l)}">${esc(st.open.follow)} ↗</a></p></div>
</div></div></section>`;
}

const arrow = '<svg class="arr" viewBox="0 0 18 10" aria-hidden="true"><path d="M0 5h16M12 1l4 4-4 4"/></svg>';

function buyBlock(p, l, id = 'buy') {
  const st = S[l], pd = st.pd;
  if (p.status === 'available') {
    const gr = !!p.gumroad;
    return `<div class="buy" id="${id}">
  <div class="buy-row"><span class="price">${esc(money(p, l))}</span><a class="cta solid" href="${esc(gr ? U.checkout(p, l) : p.checkoutUrl)}" data-${gr ? 'step' : 'checkout'}="${esc(p.id)}"${gr ? '' : ' rel="noopener"'} aria-label="${esc(pd.checkoutAria(p.title[l]))}"><span data-l>${esc(st.purchase)}</span>${arrow}</a></div>
  <p class="buy-note">${esc(gr ? pd.noteGumroad : pd.note(C.checkoutLabel))}</p>
  <p class="buy-note">${esc(C.delivery.summary[l])} <a class="tlink" href="${U.delivery(l)}">${esc(pd.deliveryLink)}</a></p>
</div>`;
  }
  if (p.status === 'soon') return `<div class="buy" id="${id}"><p class="buy-state">${esc(pd.soon)}</p>${p.releaseDate ? `<p class="buy-note">${esc(pd.releaseDate)}: <b>${esc(dateFmt(p.releaseDate, l))}</b></p>` : ''}</div>`;
  return `<div class="buy" id="${id}"><p class="buy-state">${esc(pd.unavailable)}</p><p class="buy-note">${esc(pd.unavailableText)}</p><p><a class="cta ghost" href="${U.list(l)}"><span>${esc(pd.browse)}</span>${arrow}</a></p></div>`;
}

function previewHtml(p, l) {
  const st = S[l], pv = p.preview; if (!pv) return '';
  const label = (pv.label && pv.label[l]) || (pv.type === 'audio' ? st.pd.previewAudio : st.pd.previewVideo);
  if (pv.type === 'video') return `<section class="pd-sec" aria-labelledby="hPv"><h2 id="hPv">${esc(st.pd.preview)}</h2><div class="pv"><video controls preload="none" playsinline${pv.poster ? ` poster="/${esc(pv.poster)}"` : ''} aria-label="${esc(label)}"><source src="/${esc(pv.src)}"></video></div></section>`;
  return `<section class="pd-sec" aria-labelledby="hPv"><h2 id="hPv">${esc(st.pd.preview)}</h2><div class="pv" data-audio><div class="pv-audio">
  <button class="pv-play" type="button" aria-pressed="false"><svg class="pp" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg><svg class="pa" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg></button>
  <div class="pv-main"><span>${esc(label)}</span><div class="pv-bar" role="presentation"><i></i></div><div class="pv-t"><span data-cur>0:00</span><span data-dur>0:00</span></div></div>
  <audio preload="none" src="/${esc(pv.src)}"></audio></div></div></section>`;
}

/* ==========================================================================
   Pages
   ========================================================================== */
const pages = []; // { path, html, indexable, alts }

function homePage(l) {
  const st = S[l], h = st.hero;
  const n = PRODUCTS.length;
  const f = featured;
  const frame = f
    ? `<div class="sh-frame"><div class="sh-plate" aria-hidden="true"></div><a class="sh-art" href="${U.product(f, l)}" aria-label="${esc(f.title[l])}">${artImg(f, l, { eager: true, sizes: '(max-width:900px) 80vw, 460px' })}</a></div>`
    : `<div class="sh-frame"><div class="sh-screen"><p>${esc(st.screen.line)}</p><small>${esc(st.screen.small)}</small></div></div>`;
  const cta = n
    ? `<a class="cta" href="#releases"><span>${esc(h.explore)}</span>${arrow}</a><a class="tlink" href="${U.delivery(l)}">${esc(h.delivery)}</a>`
    : `<a class="cta" href="${mainUrl('productions', l)}"><span>${esc(h.main)}</span>${arrow}</a><a class="tlink" href="${U.delivery(l)}">${esc(h.delivery)}</a>`;
  let sections = '';
  if (!n) sections = emptyHtml(l);
  else {
    const rest = PRODUCTS.filter(p => p !== f);
    sections += `<section class="sec" id="releases" aria-labelledby="fH"><div class="wrap">
  <div class="ft ft--text"><div class="rise"><p class="eyebrow">${esc(st.featured)} · ${esc(f.kind[l])}</p><h2 class="display" id="fH" style="margin-top:16px">${esc(f.title[l])}</h2></div>
  <div class="ft-body rise" style="--d:.1s"><p class="tag">${esc(f.tagline[l])}</p><p class="ov">${esc(f.overview[l][0])}</p>
  <div class="ft-meta">${f.status === 'available' ? `<span class="price">${esc(money(f, l))}</span>` : ''}<span class="pill" data-status="${f.status}">${esc(st.status[f.status])}</span></div>
  <p class="sh-cta" style="margin-top:0"><a class="cta${f.status === 'available' ? ' solid' : ''}" href="${U.product(f, l)}"><span>${esc(st.viewDetails)}</span>${arrow}</a></p></div></div></div></section>`;
    if (rest.length) {
      const shown = rest.slice(0, 6);
      sections += `<section class="sec" style="padding-top:0" aria-labelledby="mH"><div class="wrap"><div class="sec-head"><h2 class="display wipe" id="mH">${esc(st.moreReleases)}</h2>${rest.length > shown.length ? `<a class="tlink" href="${U.list(l)}">${esc(st.allReleases)}</a>` : ''}</div>${wall(l, shown)}</div></section>`;
    }
  }
  const body = `<section class="sh-hero" aria-labelledby="h1" data-scene>
  <div class="sh-horizon" aria-hidden="true"></div>
  <div class="sh-grid">
    <div>
      <p class="eyebrow first">${esc(h.eyebrow)}</p>
      <h1 class="display sh-title" id="h1"><span>${esc(h.title[0])}</span><span>${esc(h.title[1])}</span></h1>
      <p class="sh-sub">${esc(h.sub)}</p>
      <div class="sh-cta">${cta}</div>
      <div class="sh-pillars" aria-label="${esc(st.descriptor)}"><span>${esc(st.pillars['motion-pictures'])}</span><span>${esc(st.pillars.music)}</span></div>
    </div>
    ${frame}
  </div>
</section>
${sections}`;
  const alts = { en: U.home('en'), it: U.home('it') };
  return page({
    l, key: 'home', title: st.meta.homeTitle, desc: st.meta.homeDesc, canonical: U.home(l), alts, body, home: true,
    ld: [orgLd(), siteLd(), ...(n ? [itemListLd(l, PRODUCTS)] : [])]
  });
}

function itemListLd(l, list) {
  return { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(U.product(p, l)), name: p.title[l] })) };
}

function listPage(l) {
  const st = S[l];
  const n = PRODUCTS.length;
  const body = `<section class="pg"><div class="wrap">
  <ol class="crumbs" aria-label="Breadcrumb"><li><a href="${U.home(l)}">${esc(st.pd.crumbHome)}</a></li><li aria-current="page">${esc(st.pd.crumbList)}</li></ol>
  <p class="eyebrow">${esc(st.shop)}${n ? ' · ' + esc(n === 1 ? st.countOne : st.countMany(n)) : ''}</p>
  <h1 class="display wipe">${esc(st.releases)}</h1>
  ${n ? wall(l, PRODUCTS) : ''}
</div></section>${n ? '' : emptyHtml(l)}`;
  return page({
    l, key: 'list', title: st.meta.listTitle, desc: st.meta.listDesc, canonical: U.list(l), alts: { en: U.list('en'), it: U.list('it') }, body,
    ld: [orgLd(), crumbLd([[st.pd.crumbHome, U.home(l)], [st.pd.crumbList, U.list(l)]]), ...(n ? [itemListLd(l, PRODUCTS)] : [])]
  });
}

function productPage(p, l) {
  const st = S[l], pd = st.pd;
  const alt = (p.details || []);
  const others = PRODUCTS.filter(x => x !== p).slice(0, 4);
  const bar = p.status === 'available'
    ? `<div class="pd-bar" id="pdBar"><span class="price">${esc(money(p, l))}</span><a class="cta solid" href="${esc(p.gumroad ? U.checkout(p, l) : p.checkoutUrl)}" data-${p.gumroad ? 'step' : 'checkout'}="${esc(p.id)}"${p.gumroad ? '' : ' rel="noopener"'} aria-label="${esc(pd.checkoutAria(p.title[l]))}"><span data-l>${esc(st.purchase)}</span>${arrow}</a></div>` : '';
  const body = `<article class="pd" data-product="${esc(p.id)}"><div class="wrap">
  <ol class="crumbs" aria-label="Breadcrumb"><li><a href="${U.home(l)}">${esc(pd.crumbHome)}</a></li><li><a href="${U.list(l)}">${esc(pd.crumbList)}</a></li><li aria-current="page">${esc(p.title[l])}</li></ol>
  <div class="pd-grid">
    <div class="pd-art"><figure>${artImg(p, l, { eager: true, sizes: '(max-width:900px) 90vw, 620px' })}</figure></div>
    <div class="pd-id">
      <div class="pd-badges"><span class="eyebrow">${esc(st.pillars[p.pillar])} · ${esc(p.kind[l])}</span><span class="pill" data-status="${p.status}">${esc(st.status[p.status])}</span></div>
      <h1 class="display">${esc(p.title[l])}</h1>
      <p class="tag">${esc(p.tagline[l])}</p>
      ${buyBlock(p, l)}
    <section class="pd-sec" aria-labelledby="hOv"><h2 id="hOv">${esc(pd.overview)}</h2><div class="prose">${p.overview[l].map(t => `<p>${esc(t)}</p>`).join('')}</div></section>
    ${previewHtml(p, l)}
    ${p.includes && p.includes[l].length ? `<section class="pd-sec" aria-labelledby="hIn"><h2 id="hIn">${esc(pd.includes)}</h2><ul class="inc">${p.includes[l].map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
    ${alt.length || p.releaseDate ? `<section class="pd-sec" aria-labelledby="hTe"><h2 id="hTe">${esc(pd.details)}</h2><dl class="spec">${alt.map(d => `<div><dt>${esc(d.k[l])}</dt><dd>${esc(d.v[l])}</dd></div>`).join('')}${p.releaseDate ? `<div><dt>${esc(pd.releaseDate)}</dt><dd>${esc(dateFmt(p.releaseDate, l))}</dd></div>` : ''}</dl></section>` : ''}
    ${p.credits && p.credits[l] && p.credits[l].length ? `<section class="pd-sec" aria-labelledby="hCr"><h2 id="hCr">${esc(pd.credits)}</h2><ul class="inc">${p.credits[l].map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
    ${p.status === 'available' ? `<section class="pd-sec" aria-labelledby="hPu"><h2 id="hPu">${esc(pd.purchase)}</h2>${buyBlock(p, l, 'buy2').replace('class="buy"', 'class="buy" style="margin-top:0"')}</section>` : ''}
    ${p.production || others.length ? `<section class="pd-sec" aria-labelledby="hRe"><h2 id="hRe">${esc(pd.related)}</h2><div class="rel">${p.production ? `<a href="${mainUrl('productions', l).replace(/\/$/, '')}/${esc(p.production)}/"><span>${esc(pd.production)}</span><span aria-hidden="true">↗</span></a>` : ''}${others.map(o => `<a href="${U.product(o, l)}"><span>${esc(o.title[l])}</span><span aria-hidden="true">→</span></a>`).join('')}</div></section>` : ''}
    </div>
  </div>
</div></article>`;
  const desc = trunc(p.tagline[l] + ' — ' + p.overview[l][0], 158);
  const img = p.og ? { url: abs('/' + p.og), w: 1200, h: 630 } : { url: abs('/' + p.cover.src), w: p.cover.width, h: p.cover.height };
  const prod = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title[l], description: p.overview[l].join(' '), image: abs('/' + p.cover.src), sku: p.id,
    category: p.kind[l], brand: { '@type': 'Brand', name: 'ELDOVANT' }, inLanguage: l, url: abs(U.product(p, l)),
    ...(p.status === 'available' && p.price ? { offers: { '@type': 'Offer', price: Number(p.price.amount).toFixed(2), priceCurrency: p.price.currency || C.currency, availability: 'https://schema.org/InStock', url: abs(U.product(p, l)) } } : {})
  };
  return page({
    l, key: 'product', title: `ELDOVANT Shop — ${p.title[l]}`, desc, canonical: U.product(p, l), alts: { en: U.product(p, 'en'), it: U.product(p, 'it') },
    body, afterMain: bar, og: img, ogType: 'product',
    ld: [orgLd(), crumbLd([[pd.crumbHome, U.home(l)], [pd.crumbList, U.list(l)], [p.title[l], U.product(p, l)]]), prod]
  });
}


function checkoutPage(p, l) {
  const st = S[l], co = st.co, g = p.gumroad;
  const mode = (C.checkout && C.checkout.mode) === 'redirect' ? 'redirect' : 'overlay';
  const direct = new URL(g.url); direct.searchParams.set('wanted', 'true');
  const variants = g.variants || [];
  const steps = co.steps.map((s, i) => `<li${i === 0 ? ' aria-current="step"' : ''}><span>${esc(s)}</span></li>`).join('');
  const body = `<section class="pg co" data-co="${esc(p.id)}" data-gr="${esc(g.url)}" data-direct="${esc(direct.toString())}" data-mode="${mode}" data-state="review" data-order="${esc(U.order(l))}?status=success">
<div class="wrap">
  <ol class="crumbs" aria-label="Breadcrumb"><li><a href="${U.home(l)}">${esc(st.pd.crumbHome)}</a></li><li><a href="${U.product(p, l)}">${esc(p.title[l])}</a></li><li aria-current="page">${esc(co.crumb)}</li></ol>
  <p class="eyebrow">${esc(co.eyebrow)}</p>
  <h1 class="display">${esc(co.h1)}</h1>
  <div class="co-grid">
    <aside class="co-sum" aria-label="${esc(co.summary)}">
      <figure>${artImg(p, l, { eager: true, sizes: '(max-width:900px) 40vw, 220px' })}</figure>
      <div class="co-sum-body">
        <p class="eyebrow">${esc(p.kind[l])} · ${esc(co.digital)}</p>
        <h2 class="display">${esc(p.title[l])}</h2>
        ${variants.length ? `<fieldset class="co-var"><legend>${esc(co.variant)}</legend>${variants.map((v, i) => `<label><input type="radio" name="variant" value="${esc(v.value)}"${i === 0 ? ' checked' : ''}><span>${esc(v.label[l])}</span></label>`).join('')}</fieldset>` : ''}
        ${p.includes && p.includes[l].length ? `<p class="co-inc-h">${esc(co.included)}</p><ul class="inc">${p.includes[l].slice(0, 5).map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        <div class="co-total"><span>${esc(co.total)}</span><span class="price">${esc(money(p, l))}</span></div>
        <p class="buy-note">${esc(co.totalNote)}</p>
      </div>
    </aside>
    <div class="co-main">
      <ol class="co-steps" aria-label="${esc(co.h1)}">${steps}</ol>
      <div class="co-view" data-view="review" tabindex="-1">
        <h2 class="display">${esc(co.review.h)}</h2>
        <p class="lead">${esc(co.review.p)}</p>
        <p class="buy-note">${esc(co.review.mail)}</p>
        <p class="buy-note">${esc(C.delivery.summary[l])} <a class="tlink" href="${U.delivery(l)}">${esc(st.pd.deliveryLink)}</a></p>
        <p class="co-act"><button class="cta solid" id="coPay" type="button"><span data-l>${esc(co.review.cta)}</span>${arrow}</button><a class="tlink" href="${U.product(p, l)}">${esc(co.review.back)}</a></p>
        <p class="buy-note co-third">${esc(co.review.third)}</p>
        <noscript><p class="buy-note">${esc(co.noscript)} <a class="tlink" href="${esc(direct.toString())}" rel="noopener">Gumroad</a></p></noscript>
      </div>
      <div class="co-view" data-view="opening" tabindex="-1" hidden role="status"><h2 class="display">${esc(co.opening.h)}</h2><p class="lead">${esc(co.opening.p)}</p><div class="co-bar" aria-hidden="true"><i></i></div></div>
      <div class="co-view" data-view="paying" tabindex="-1" hidden><h2 class="display">${esc(co.paying.h)}</h2><p class="lead">${esc(co.paying.p)}</p>
        <p class="co-act"><a class="cta solid" href="${U.order(l)}?status=success" id="coDone"><span>${esc(co.paying.done)}</span>${arrow}</a><button class="tlink" type="button" data-back>${esc(co.paying.cancel)}</button></p></div>
      <div class="co-view" data-view="blocked" tabindex="-1" hidden role="alert"><h2 class="display">${esc(co.blocked.h)}</h2><p class="lead">${esc(co.blocked.p)}</p>
        <p class="co-act"><a class="cta solid" href="${esc(direct.toString())}" rel="noopener" data-direct><span>${esc(co.blocked.cta)}</span>${arrow}</a><button class="tlink" type="button" data-retry>${esc(co.blocked.retry)}</button></p></div>
      <div class="co-view" data-view="slow" tabindex="-1" hidden role="status"><h2 class="display">${esc(co.slow.h)}</h2><p class="lead">${esc(co.slow.p)}</p>
        <p class="co-act"><a class="cta solid" href="${esc(direct.toString())}" rel="noopener" data-direct><span>${esc(co.blocked.cta)}</span>${arrow}</a><button class="tlink" type="button" data-retry>${esc(co.blocked.retry)}</button></p></div>
      <div class="co-view" data-view="offline" tabindex="-1" hidden role="alert"><h2 class="display">${esc(co.offline.h)}</h2><p class="lead">${esc(co.offline.p)}</p>
        <p class="co-act"><button class="cta" type="button" data-retry><span>${esc(co.offline.retry)}</span>${arrow}</button></p></div>
    </div>
  </div>
</div>
</section>`;
  return page({
    l, key: 'checkout', title: co.title(p.title[l]), desc: co.desc, canonical: U.checkout(p, l),
    alts: { en: U.checkout(p, 'en'), it: U.checkout(p, 'it') }, noindex: true, body, ld: []
  });
}

function deliveryPage(l, mode) {
  const st = S[l], dl = st.dl, order = mode === 'order';
  const support = C.support;
  const mail = `<a class="tlink" href="mailto:${esc(support)}">${esc(support)}</a>`;
  const fill = (t) => esc(t)
    .replace('{support}', mail)
    .replace('{privacy}', `<a class="tlink" href="${mainUrl('privacy', l)}">${esc(dl.privacyLink)}</a>`)
    .replace('{refund}', C.refundPolicyUrl && C.refundPolicyUrl[l] ? `<a class="tlink" href="${esc(C.refundPolicyUrl[l])}">${esc(st.refund)}</a>` : '');
  const steps = dl.steps.map((s, i) => [s[0], i === 2 ? C.delivery.summary[l] : s[1]]);
  const faq = dl.faq.map((f, i) => {
    let a;
    if (i === 0) a = C.delivery.help[l] + ' {support}';
    else if (i === 3) a = (C.refundPolicyUrl && C.refundPolicyUrl[l]) ? dl.refundWith : dl.refundWithout;
    else a = f[1];
    return [f[0], a];
  });
  const body = `<section class="pg"><div class="wrap">
  <ol class="crumbs" aria-label="Breadcrumb"><li><a href="${U.home(l)}">${esc(st.pd.crumbHome)}</a></li><li aria-current="page">${esc(order ? dl.h1Order : dl.h1)}</li></ol>
  <p class="eyebrow">${esc(st.shop)}</p>
  <h1 class="display wipe">${esc(order ? dl.h1Order : dl.h1)}</h1>
  <p class="lead">${esc(order ? dl.leadOrder : dl.lead)}</p>
  <div class="state-banner" id="orderState" role="status" hidden><h2></h2><p></p><div class="row"><a class="tlink" href="${U.list(l)}">${esc(dl.browse)}</a><a class="tlink" href="mailto:${esc(support)}">${esc(dl.write)}</a></div></div>
  <div class="od-grid">
    <ol class="steps">${steps.map(s => `<li><div><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div></li>`).join('')}</ol>
    <div class="faq"><h2 class="sr-only">${esc(dl.faqH)}</h2>${faq.map(f => `<details><summary>${esc(f[0])}</summary><p>${fill(f[1])}</p></details>`).join('')}</div>
  </div>
  <p style="margin-top:44px"><a class="cta ghost" href="mailto:${esc(support)}"><span>${esc(dl.write)}</span>${arrow}</a></p>
</div></section>`;
  const key = order ? 'order' : 'delivery';
  const canonical = order ? U.order(l) : U.delivery(l);
  return page({
    l, key, title: order ? st.meta.orderTitle : st.meta.dlTitle, desc: order ? st.meta.orderDesc : st.meta.dlDesc, canonical,
    alts: order ? { en: U.order('en'), it: U.order('it') } : { en: U.delivery('en'), it: U.delivery('it') }, noindex: order, body,
    ld: order ? [] : [orgLd(), crumbLd([[st.pd.crumbHome, U.home(l)], [dl.h1, U.delivery(l)]])]
  });
}

/* ---------- 404, root router ---------- */
function notFoundPage() {
  const blocks = LANGS.map(l => {
    const e = S[l].e404;
    return `<section class="void" lang="${l}" data-l="${l}"><div><p class="code">${e.code}</p><h1 class="display">${esc(e.h1)}</h1><p>${esc(e.p)}</p>
<div class="sh-cta"><a class="cta" href="/${l}/${SEG.products[l]}/"><span>${esc(e.a)}</span>${arrow}</a><a class="tlink" href="${mainUrl('home', l)}">${esc(e.b)}</a></div></div></section>`;
  }).join('\n');
  const st = S.en;
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ELDOVANT Shop — 404</title>
<meta name="robots" content="noindex">
<meta name="color-scheme" content="dark light">
<link rel="icon" href="/favicon.ico" sizes="48x48 96x96 144x144">
<link rel="icon" type="image/png" href="/favicon-48x48.png" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
<script>
(function(){
  var d=document.documentElement; d.classList.add('js');
  var t=null; try{t=localStorage.getItem('eld-theme')}catch(e){}
  if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark'}
  d.setAttribute('data-theme',t);
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)d.classList.add('rm');
  /* language of a 404: the URL prefix first, then the saved choice, then the browser, then English */
  var l=null, m=/^\\/(en|it)(\\/|$)/.exec(location.pathname); if(m) l=m[1];
  if(!l){ try{var s=localStorage.getItem('eld-lang'); if(s==='it'||s==='en') l=s}catch(e){} }
  if(!l){ var list=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||'en']; for(var i=0;i<list.length&&!l;i++){var k=/^(it|en)\\b/i.exec(list[i]||''); if(k) l=k[1].toLowerCase();} }
  d.lang=l||'en';
})();
</script>
<link rel="stylesheet" href="/shop.css">
<style>html[lang="en"] [data-l="it"],html[lang="it"] [data-l="en"]{display:none!important}</style>
</head>
<body>
<header class="hdr always"><a class="brand" href="/" aria-label="ELDOVANT Shop">${logoPair('brand-e', 'brand-e', 200, 215)}${logoWord('brand-w')}</a>
<div class="hdr-ctl"><button class="ibtn" id="btnTheme" type="button" aria-label="${esc(st.themeBtn)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4v16"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg></button></div></header>
<main id="main">
${blocks}
</main>
<script src="/shop.js" defer></script>
</body>
</html>
`;
}

function rootPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ELDOVANT Shop — Original Motion Pictures &amp; Music</title>
<meta name="description" content="The official ELDOVANT shop. English and Italian editions.">
<!-- build:seo:start -->
<link rel="canonical" href="${SITE}/">
<link rel="alternate" hreflang="en" href="${abs('/en/')}">
<link rel="alternate" hreflang="it" href="${abs('/it/')}">
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ELDOVANT Shop">
<meta property="og:title" content="ELDOVANT Shop — Original Motion Pictures &amp; Music">
<meta property="og:description" content="The official ELDOVANT shop. English and Italian editions.">
<meta property="og:url" content="${SITE}/">
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="it_IT">
<meta property="og:image" content="${abs('/assets/og-brand.jpg')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
${jsonLd(orgLd())}
${jsonLd(siteLd())}
<!-- build:seo:end -->
<meta name="color-scheme" content="dark light">
<link rel="icon" href="/favicon.ico" sizes="48x48 96x96 144x144">
<link rel="icon" type="image/png" href="/favicon-48x48.png" sizes="48x48">
<link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96">
<link rel="icon" type="image/png" href="/favicon.png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
<style>
  body{margin:0;min-height:100svh;display:grid;place-items:center;background:#070605;color:#ece5d3;font:400 16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;text-align:center}
  main{display:grid;gap:18px;padding:32px}
  h1{margin:0;font:300 clamp(1.6rem,6vw,2.6rem)/1.1 Georgia,'Times New Roman',serif;letter-spacing:.42em;padding-left:.42em}
  p{margin:0;color:#a89d89}
  nav{display:flex;gap:28px;justify-content:center;margin-top:8px}
  a{color:#f1d48f;text-decoration:none;border-bottom:1px solid rgba(241,212,143,.4);padding-bottom:4px}
  a:hover,a:focus-visible{border-bottom-color:#f1d48f}
</style>
<script>
/* Entry point only. People arriving here are sent, in ONE step, to the right language:
   1) the language they chose with the switcher (eld-lang), 2) the browser's preferred language, 3) English.
   Every localized URL (/en/…, /it/…) is a real page that never redirects, so search engines can index both.
   The links below are real links: this page also works without JavaScript. */
(function(){
  /* Search-engine and link-preview crawlers are never redirected: they read this page as it is and follow the real /en/ and /it/ links. */
  var ua=navigator.userAgent||''; if(/bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|preview|lighthouse|headless/i.test(ua)) return;
  try{
    var lang=null;
    try{ var s=localStorage.getItem('eld-lang'); if(s==='it'||s==='en') lang=s; }catch(e){}
    if(!lang){
      var list=(navigator.languages&&navigator.languages.length)?navigator.languages:[navigator.language||'en'];
      for(var i=0;i<list.length&&!lang;i++){ var m=/^(it|en)\\b/i.exec(list[i]||''); if(m) lang=m[1].toLowerCase(); }
    }
    location.replace('/'+(lang||'en')+'/'+location.search+location.hash);
  }catch(e){}
})();
</script>
<noscript><meta http-equiv="refresh" content="0;url=/en/"></noscript>
</head>
<body>
<main>
  <h1>ELDOVANT</h1>
  <p>Shop · Original Motion Pictures &amp; Music</p>
  <nav aria-label="Language"><a href="/en/" hreflang="en" lang="en">English</a><a href="/it/" hreflang="it" lang="it">Italiano</a></nav>
</main>
</body>
</html>
`;
}

/* ==========================================================================
   Generate
   ========================================================================== */
function generate() {
  const out = [];
  const add = (p, html, indexable, alts) => { out.push({ path: p, html, indexable, alts }); };

  add('index.html', rootPage(), true, null);
  add('404.html', notFoundPage(), false, null);
  LANGS.forEach(l => {
    add(U.home(l).slice(1) + 'index.html', homePage(l), true, { en: U.home('en'), it: U.home('it') });
    add(U.list(l).slice(1) + 'index.html', listPage(l), true, { en: U.list('en'), it: U.list('it') });
    add(U.delivery(l).slice(1) + 'index.html', deliveryPage(l, 'delivery'), true, { en: U.delivery('en'), it: U.delivery('it') });
    add(U.order(l).slice(1) + 'index.html', deliveryPage(l, 'order'), false, null);
    PRODUCTS.forEach(p => add(U.product(p, l).slice(1) + 'index.html', productPage(p, l), true, { en: U.product(p, 'en'), it: U.product(p, 'it') }));
    PRODUCTS.filter(p => p.gumroad && p.status === 'available').forEach(p => add(U.checkout(p, l).slice(1) + 'index.html', checkoutPage(p, l), false, null));
  });
  return out;
}

function sitemap(list) {
  const urls = [{ loc: SITE + '/', alts: { en: abs('/en/'), it: abs('/it/') }, xdef: SITE + '/' }];
  const seen = new Set();
  list.filter(x => x.indexable && x.alts).forEach(x => {
    LANGS.forEach(l => {
      const loc = abs(x.alts[l]); if (seen.has(loc)) return; seen.add(loc);
      urls.push({ loc, alts: { en: abs(x.alts.en), it: abs(x.alts.it) }, xdef: SITE + '/' });
    });
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${u.alts.en}"/>
    <xhtml:link rel="alternate" hreflang="it" href="${u.alts.it}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${u.xdef}"/>
  </url>`).join('\n')}
</urlset>
`;
}

function cleanGenerated(list) {
  /* remove product folders of products that no longer exist (only folders this build created) */
  const keep = new Set(list.map(x => path.join(OUT, x.path)));
  LANGS.forEach(l => ['products', 'checkout'].forEach(k => {
    const dir = path.join(OUT, l, SEG[k][l]); if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).forEach(e => {
      const f = path.join(dir, e.name, 'index.html');
      if (fs.existsSync(f) && !keep.has(f) && /data-product=|data-co=/.test(fs.readFileSync(f, 'utf8'))) fs.rmSync(path.join(dir, e.name), { recursive: true, force: true });
    });
  }));
}

function copyStatic() {
  if (OUT === REPO) return;
  const items = ['shop.css', 'shop.js', 'assets', 'favicon.ico', 'favicon-48x48.png', 'favicon-96x96.png', 'favicon.png', 'apple-touch-icon.png', 'CNAME', '.nojekyll'];
  items.forEach(i => { const s = path.join(REPO, i); if (fs.existsSync(s)) fs.cpSync(s, path.join(OUT, i), { recursive: true }); });
  /* fixture assets next to the data file */
  const dd = path.dirname(DATA);
  if (dd !== REPO && fs.existsSync(path.join(dd, 'assets'))) fs.cpSync(path.join(dd, 'assets'), path.join(OUT, 'assets'), { recursive: true });
}

/* ==========================================================================
   Audit (--check)
   ========================================================================== */
function audit(list) {
  const errs = [];
  const fileFor = (u) => { u = u.split('#')[0].split('?')[0]; if (!u.startsWith('/')) return null; const f = path.join(OUT, u); return u.endsWith('/') ? path.join(f, 'index.html') : f; };
  const byUrl = new Map(list.map(x => [x.path.replace(/index\.html$/, ''), x]));
  list.forEach(x => {
    const html = x.html, where = '/' + x.path;
    /* internal links and assets resolve */
    [...html.matchAll(/\b(?:href|src)="(\/[^"#?]*)(?:[#?][^"]*)?"/g)].forEach(m => {
      if (m[1].startsWith('//')) return;
      const f = fileFor(m[1]); if (f && !fs.existsSync(f)) errs.push(`${where}: broken link ${m[1]}`);
    });
    const can = /<link rel="canonical" href="([^"]+)"/.exec(html);
    if (!can && x.path !== '404.html') errs.push(`${where}: no canonical`);
    if (x.indexable && x.alts && x.path !== 'index.html') {
      const self = x.path.replace(/index\.html$/, '');
      if (can && can[1] !== SITE + '/' + self) errs.push(`${where}: canonical is not self (${can[1]})`);
      const hl = Object.fromEntries([...html.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(m => [m[1], m[2]]));
      LANGS.forEach(l => {
        if (!hl[l]) { errs.push(`${where}: missing hreflang ${l}`); return; }
        const t = byUrl.get(hl[l].replace(SITE + '/', ''));
        if (!t) errs.push(`${where}: hreflang ${l} points nowhere (${hl[l]})`);
        else {
          const back = Object.fromEntries([...t.html.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(m => [m[1], m[2]]));
          if (back[LANGS.find(k => hl[k] === SITE + '/' + self) || 'en'] !== SITE + '/' + self) errs.push(`${where}: hreflang not reciprocal with ${hl[l]}`);
        }
      });
      if (hl['x-default'] !== SITE + '/') errs.push(`${where}: x-default must be the root`);
      if (/location\.(replace|href)\s*=|http-equiv="refresh"/.test(html)) errs.push(`${where}: localized page must not redirect`);
    }
    if (x.indexable === false && x.path !== '404.html' && !/noindex/.test(html)) errs.push(`${where}: should be noindex`);
    [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].forEach(m => { try { JSON.parse(m[1]); } catch { errs.push(`${where}: invalid JSON-LD`); } });
  });
  /* sitemap covers every indexable page */
  const sm = fs.readFileSync(path.join(OUT, 'sitemap.xml'), 'utf8');
  list.filter(x => x.indexable && x.alts).forEach(x => { const u = SITE + '/' + x.path.replace(/index\.html$/, ''); if (!sm.includes(`<loc>${u}</loc>`)) errs.push(`sitemap: missing ${u}`); });
  if (errs.length) { console.error('\n✖ Audit found problems:\n  - ' + errs.join('\n  - ') + '\n'); process.exit(1); }
  console.log(`✔ Audit OK — ${list.length} pages, links, canonical, hreflang (reciprocal), no redirects on localized URLs, JSON-LD, sitemap.`);
}

/* ---------- run ---------- */
const list = generate();
fs.mkdirSync(OUT, { recursive: true });
copyStatic();
cleanGenerated(list);
list.forEach(x => write(x.path, x.html));
write('sitemap.xml', sitemap(list));
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
if (!fs.existsSync(path.join(OUT, 'CNAME'))) write('CNAME', new URL(SITE).hostname);
console.log(`Built ${list.length} pages (${PRODUCTS.length} product${PRODUCTS.length === 1 ? '' : 's'}) → ${OUT}`);
if (CHECK) audit(list);
