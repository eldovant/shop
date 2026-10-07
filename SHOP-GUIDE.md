# ELDOVANT Shop — guida (shop.eldovant.com)

Lo Shop è un **sito separato** dal sito principale: stesso design system, repository diverso, sottodominio `shop.eldovant.com`.
Raccoglie tutte le uscite ELDOVANT (solo prodotti digitali), in inglese e italiano.

## 1. Pubblicazione (una sola volta)

1. **Repo**: su GitHub crea un repository `eldovant-shop` (pubblico) e carica *tutto* il contenuto di questa cartella (compresa `.github/` e il file `CNAME`).
2. **Pages**: Settings → Pages → *Deploy from a branch* → `main` / `(root)`. In *Custom domain* scrivi `shop.eldovant.com` → Save → spunta **Enforce HTTPS** (appare dopo qualche minuto).
3. **DNS** (dove gestisci `eldovant.com`): aggiungi un record
   `CNAME` — nome `shop` — valore `eldovant.github.io`
   (non toccare i record già esistenti per `www`). Attendi la propagazione (da minuti a qualche ora).
4. **Actions**: Settings → Actions → General → Workflow permissions → *Read and write permissions*.
5. **Search Console**: aggiungi la proprietà `https://shop.eldovant.com/` (oppure la proprietà *Dominio* se `eldovant.com` è già verificato via DNS: copre anche i sottodomini) e invia `https://shop.eldovant.com/sitemap.xml`.
6. **Sito principale**: carica lo ZIP aggiornato di `eldovant.com` (contiene il link *Shop* nel menu e nel footer di ogni pagina).

## 2. Come funzionano le lingue

| URL | Cosa succede |
| --- | --- |
| `shop.eldovant.com/` | Unico punto d'ingresso intelligente: scelta manuale salvata → lingua del browser → inglese. Poi un solo salto a `/en/` o `/it/`. |
| `/en/…` e `/it/…` | Pagine reali e stabili: **mai** reindirizzate, mostrano sempre la propria lingua (per persone, Google e link condivisi). |
| Selettore EN/IT | Sempre visibile; porta alla pagina equivalente e ricorda la scelta. |

SEO: canonical su ogni pagina, hreflang `en` / `it` reciproci + `x-default` sulla root, sitemap con alternative, JSON-LD (Organization, WebSite, BreadcrumbList, ItemList, Product). La pagina `/en/order/` / `/it/ordine/` è `noindex`.
Il localStorage non è condiviso tra `www.eldovant.com` e `shop.eldovant.com`: per questo i link dal sito principale portano già alla lingua giusta (`/en/` o `/it/`).

## 3. Aggiungere la prima uscita

Tutto passa da **`shop-data.js`** (nella sezione `products`, c'è il modello da copiare).

1. Metti le immagini in `assets/products/` (copertina nel suo formato reale — niente ritagli forzati — e, opzionale, `og` 1200×630).
2. Compila il blocco prodotto con **testi EN e IT** (il build si ferma se ne manca uno).
3. `status: 'available'` richiede `price` e `checkoutUrl` (https). Con `'soon'` la pagina esiste ma l'acquisto è disattivato; con `'unavailable'` mostra uno stato dedicato.
4. Fai push su `main`: la GitHub Action ricostruisce pagine, SEO e sitemap (circa 1 minuto). In locale: `node tools/build.mjs --check`.
5. **Rimuovere** un prodotto: cancellalo da `products` → la sua pagina sparisce e mostra la 404 dello Shop.

Filtri per categoria e ricerca compaiono da soli solo quando servono (`thresholds` in `config`: 6 e 12 uscite). Con 1–2 uscite il catalogo resta curato e grande, mai "vuoto".

## 4. Pagamento e consegna con Gumroad (checkout ELDOVANT)

Gumroad resta **l'unico sistema che incassa, calcola le tasse, consegna il file e invia la ricevuta**. Lo Shop aggiunge solo una pagina ELDOVANT *prima* del pagamento (`/en/checkout/<prodotto>/`, `/it/pagamento/<prodotto>/`): immagine, nome, versione, prezzo, cosa è incluso, come arriva il file, poi il pulsante che apre la finestra di pagamento Gumroad **sopra la pagina**, con transizione, stati di caricamento/lentezza/blocco/offline e un link di riserva.

**Cosa è tecnicamente possibile (e cosa no)**
- Gumroad non ha un'API per creare un pagamento né un modulo carta incorporabile: carta ed email si inseriscono **nella finestra Gumroad** (una sola volta). ELDOVANT non vede, non salva, non inoltra dati di pagamento. Non esistono workaround supportati: non ne ho usati.
- Prezzo, versione/variante e quantità si passano a Gumroad tramite parametri URL ufficiali; il totale definitivo (tasse incluse) lo mostra Gumroad.
- Gumroad non notifica il sito a pagamento concluso: la pagina di conferma ELDOVANT si raggiunge dal link che metti nel testo ricevuta Gumroad o dal pulsante "Ho completato l'acquisto". Ricevuta e download restano di Gumroad: nessuna duplicazione.
- Ho verificato le funzioni sul codice open source di Gumroad, non sulla documentazione ufficiale (non raggiungibile da qui): **fai un acquisto di prova reale** prima di lanciare.

**Cosa fare**
1. Su Gumroad crea il prodotto (con file, prezzo, eventuali versioni). Copia l'URL del prodotto (`https://tuonome.gumroad.com/l/permalink`).
2. In `shop-data.js`, nel prodotto, aggiungi `gumroad: { url: 'https://tuonome.gumroad.com/l/permalink', variants: [ { id: 'Standard', label: {en:'Standard', it:'Standard'} } ] }` (le `variants` sono opzionali; `id` = nome esatto della versione su Gumroad). Lascia `price` e `status:'available'`. Il pulsante "Acquista" porterà alla pagina checkout ELDOVANT.
3. In Gumroad, nel testo della ricevuta (custom receipt text) aggiungi: `Torna a ELDOVANT: https://shop.eldovant.com/it/ordine/?status=success` (EN: `/en/order/?status=success`).
4. Modalità: `config.checkout.mode` = `'overlay'` (default, finestra sopra la pagina) oppure `'redirect'` (si va alla pagina Gumroad). Se la finestra è bloccata, offline o lenta, compare comunque il link diretto.
5. Prodotti con solo `checkoutUrl` (senza `gumroad`) continuano ad aprire direttamente il provider.

**Privacy**: lo script `gumroad.js` viene caricato **solo quando l'utente preme "Continua al pagamento"**, non prima. Aggiorna Informativa privacy/cookie del sito principale citando Gumroad come fornitore di pagamento e consegna.

Altro: in `config.delivery` modifichi il testo "cosa succede dopo il pagamento"; `config.refundPolicyUrl` resta vuota finché non esiste una vera politica di rimborso.

## 5. Cose da fare prima di vendere (non le ho inventate io)

- Termini di vendita / diritto di recesso per contenuti digitali, informativa privacy che citi il provider di pagamento, imposta (IVA): servono testi legali reali, da far verificare.
- Il sito principale ha Privacy, Cookie e Termini: lo Shop li linka, non li duplica.

## 6. Eventi per l'analisi (opzionali, senza provider)

Lo Shop emette l'evento DOM `eld:shop` (e `dataLayer.push` se presente): `view_product`, `select_product`, `begin_checkout`, `checkout_blocked`, `language_change`, `theme_change`, `filter_use`, `search`, `preview_play`, `order_status`. Nessuno script di terzi è caricato.

## 7. Struttura del repository

    shop-data.js         ← l'unico file da modificare
    shop.css / shop.js   design system e comportamento (stessi di eldovant.com)
    tools/build.mjs      build a zero dipendenze (+ --check: link, hreflang, canonical, sitemap)
    assets/              font (self-hosted), loghi originali, prodotti
    en/ it/              pagine generate  ·  index.html = router  ·  404.html
    CNAME                shop.eldovant.com

## 8. Root `/`, crawler e link esterni

- GitHub Pages è statico: non può leggere `Accept-Language`, l'IP o lo User-Agent lato server. La root `/` è l'unico punto con rilevamento (scelta salvata → lingua del browser → inglese) fatto nel browser; i crawler riconosciuti dallo User-Agent (Googlebot, Bingbot, anteprime social…) **non vengono mai reindirizzati**: leggono la root statica con i link reali a `/en/` e `/it/`. Gli URL `/en/` e `/it/` non reindirizzano mai.
- Geolocalizzazione IP: non attivata (servirebbe un servizio terzo o Cloudflare Workers; la lingua del browser è più affidabile e rispetta la privacy). Se un giorno userete Cloudflare davanti al dominio, si può aggiungere sull'edge senza toccare le pagine.
- - Link esterni (canali): nel footer compare solo il nome della piattaforma (YouTube, Instagram…) come link cliccabile, mai l'URL; i link restano in `config.social` e nel JSON-LD `sameAs`.

## 9. Come appaiono i risultati su Google

Titoli nel formato "ELDOVANT Shop — Nome pagina/prodotto", breadcrumb (BreadcrumbList) su ogni pagina e `WebSite` con nome "ELDOVANT Shop" sono i segnali che controlliamo. Google decide da solo cosa mostrare (nome del sito sopra l'URL, percorso a briciole, titolo): i cambiamenti compaiono dopo una nuova scansione, in genere giorni o settimane. Dopo la pubblicazione: Search Console → Controllo URL → "Richiedi indicizzazione" per la home e le pagine principali.
