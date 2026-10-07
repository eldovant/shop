/* ==========================================================================
   ELDOVANT — Shop · the one file you edit.
   shop.eldovant.com collects every ELDOVANT release (digital only).

   After editing, run:  node tools/build.mjs      (GitHub Actions does it for you on every push)

   Rules the build enforces:
   - every text field exists in English (en) AND Italian (it);
   - a product with status 'available' needs a price and an https checkoutUrl;
   - nothing is invented: an empty `products` list launches the Shop with a designed
     "first release" state, not with placeholder products.
   ========================================================================== */
window.ELDOVANT_SHOP = {

  config: {
    siteUrl:  'https://shop.eldovant.com',
    mainUrl:  'https://www.eldovant.com',
    currency: 'EUR',

    /* Sections appear only when the catalogue is large enough to need them. */
    thresholds: { filters: 6, search: 12 },

    /* Support & legal. Legal pages live on the main site. */
    support: 'contact@eldovant.com',
    refundPolicyUrl: { en: '', it: '' },     // leave empty until a real refund policy exists

    /* Checkout. ELDOVANT does not run its own payment system: each product opens the hosted
       checkout of whatever provider you choose, via its own `checkoutUrl`. */
    checkout: { mode: 'overlay' },            // 'overlay' (Gumroad window over the page) | 'redirect'
    checkoutLabel: '',                        // optional provider name, e.g. 'Stripe' — shown as "Secure checkout by …"

    /* What happens after payment. Edit to match the provider you actually use. */
    delivery: {
      summary: {
        en: 'After payment, confirmation and access details are sent to the email address used at checkout.',
        it: 'Dopo il pagamento, conferma e dettagli di accesso vengono inviati all’indirizzo email usato al checkout.'
      },
      help: {
        en: 'If nothing arrives within a few minutes, check your spam folder, then write to us with the email you used.',
        it: 'Se non arriva nulla entro pochi minuti, controlla la cartella spam, poi scrivici indicando l’email che hai usato.'
      }
    },

    /* Optional: how you want ELDOVANT credited in structured data. */
    social: [
      'https://www.youtube.com/@eldovant',
      'https://www.instagram.com/eldovant',
      'https://www.tiktok.com/@eldovant',
      'https://www.facebook.com/eldovant',
      'https://x.com/eldovant'
    ]
  },

  /* ----------------------------------------------------------------------
     PRODUCTS — add one object per release. Copy the template below.

     {
       id: 'unique-id',
       slug: { en: 'english-slug', it: 'slug-italiano' },
       pillar: 'motion-pictures' | 'music',
       kind:  { en: 'Soundtrack', it: 'Colonna sonora' },
       status: 'available' | 'soon' | 'unavailable',
       featured: true,                         // one product at most gets the editorial spread
       title:   { en: '…', it: '…' },
       tagline: { en: '…', it: '…' },
       overview:{ en: ['Paragraph', 'Paragraph'], it: ['…'] },
       cover:   { src: 'assets/products/name.jpg', width: 1600, height: 1600, alt: { en: '…', it: '…' } },
       og:      'assets/products/name-og.jpg',  // optional 1200x630
       price:   { amount: 12.00, currency: 'EUR' },
       checkoutUrl: 'https://…',               // direct provider link (used when there is no `gumroad` block)
       gumroad: {                              // ELDOVANT checkout page + Gumroad payment window
         url: 'https://yourname.gumroad.com/l/permalink',
         variants: [ { id: 'Exact Gumroad version name', label: {en:'Standard', it:'Standard'} } ]   // optional
       },
       includes: { en: ['…'], it: ['…'] },
       details:  [ { k: {en:'Format', it:'Formato'}, v: {en:'WAV, 24-bit', it:'WAV, 24 bit'} } ],
       preview:  { type: 'audio'|'video', src: 'assets/products/preview.mp3', poster: '…', label: {en:'…',it:'…'} },
       releaseDate: '2026-12-01',
       production: 'l01',                      // optional: slug of the production on the main site
       credits: { en: ['…'], it: ['…'] }       // optional
     }
     ---------------------------------------------------------------------- */
  products: []
};
