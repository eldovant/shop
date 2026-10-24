#!/usr/bin/env node
/* ELDOVANT — site-name audit (works in both repos: the main site and the shop).
   Usage:  node tools/check-site-name.mjs            (run from the repo root)
   Checks everything Google's site-name system reads on the home page of a domain/subdomain:
   - the domain-level home page (root) AND its duplicates (/en/, /it/) carry ONE identical WebSite node
   - that node has name + url (= the host root), a name that matches <title>, og:site_name and the visible h1 (root)
   - alternateName is a list and does NOT contain the bare domain (Google's "backup" would show "eldovant.com")
   - no inner page carries a competing WebSite node
   - the root is crawlable (no meta refresh, no robots block, crawlers never redirected), canonical to itself, and listed in sitemap.xml
   Exit code 1 on any problem. */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = process.cwd();
const host = fs.readFileSync(path.join(ROOT, 'CNAME'), 'utf8').trim().toLowerCase();
const ORIGIN = `https://${host}`;
const errs = [], ok = [];
const bad = (m) => errs.push(m), good = (m) => ok.push(m);
const read = (rel) => fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), 'utf8') : null;
const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch (e) { bad('invalid JSON-LD: ' + e.message); return null; } }).filter(Boolean);
const meta = (html, p) => (html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)) || [])[1];
const dec = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"');

const homes = ['index.html', 'en/index.html', 'it/index.html'];
const nodes = {};
for (const rel of homes) {
  const html = read(rel); if (html == null) { bad(`${rel}: missing`); continue; }
  const ws = ld(html).filter((o) => o['@type'] === 'WebSite');
  if (ws.length !== 1) { bad(`${rel}: expected exactly 1 WebSite node, found ${ws.length}`); continue; }
  nodes[rel] = ws[0];
  const n = ws[0];
  if (!n.name) bad(`${rel}: WebSite.name missing`);
  if (n.url !== ORIGIN + '/') bad(`${rel}: WebSite.url is "${n.url}", must be "${ORIGIN}/"`);
  if (!Array.isArray(n.alternateName) || !n.alternateName.length) bad(`${rel}: alternateName should be a non-empty list`);
  (n.alternateName || []).forEach((a) => { if (a === host || /^[a-z0-9.-]+\.[a-z]{2,}$/.test(a)) bad(`${rel}: alternateName contains the bare domain "${a}" (Google would show it as the site name)`); });
  if (dec(meta(html, 'og:site_name')) !== n.name) bad(`${rel}: og:site_name "${meta(html, 'og:site_name')}" ≠ WebSite.name "${n.name}"`);
  const title = dec((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
  if (!title.toLowerCase().includes(n.name.toLowerCase())) bad(`${rel}: <title> "${title}" does not contain the site name`);
  const org = ld(html).find((o) => o['@type'] === 'Organization');
  if (!org) bad(`${rel}: Organization node missing`);
  else if (n.publisher && n.publisher['@id'] && !org['@id'] && n.publisher['@id'].startsWith(ORIGIN)) bad(`${rel}: publisher @id points to a missing local node`);
}
const names = new Set(Object.values(nodes).map((n) => JSON.stringify(n)));
if (Object.keys(nodes).length === 3 && names.size !== 1) bad('root, /en/ and /it/ carry DIFFERENT WebSite nodes (they must be identical)');
else if (Object.keys(nodes).length === 3) good(`WebSite node identical on root, /en/, /it/: name "${nodes['index.html'].name}", url ${nodes['index.html'].url}`);

const root = read('index.html');
if (root) {
  if (/http-equiv="refresh"/i.test(root)) bad('root: meta refresh found (crawlers would be redirected)');
  if (/<meta[^>]+name="robots"[^>]*(noindex|nofollow)/i.test(root)) bad('root: robots noindex/nofollow found');
  if (!/<link rel="canonical" href="([^"]*)"/.test(root) || RegExp.$1 !== ORIGIN + '/') bad(`root: canonical must be ${ORIGIN}/`);
  const redir = (root.match(/location\.replace/g) || []).length;
  if (redir !== 1 || !/bot\|crawl\|spider/.test(root) || !/google/.test(root)) bad('root: needs exactly one JS redirect that skips crawlers (bot/google in the UA test)');
  else good('root: single JS redirect, crawlers/Google skipped, no meta refresh, no robots block');
  const n = nodes['index.html'];
  const h1 = (root.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  if (n && dec(h1).trim() !== n.name) bad(`root: <h1> "${dec(h1).trim()}" ≠ site name "${n.name}"`);
  else if (n) good(`root: <h1> = site name "${n.name}"`);
}
const sm = read('sitemap.xml') || '';
if (!sm.includes(`<loc>${ORIGIN}/</loc>`)) bad(`sitemap.xml does not list the home page ${ORIGIN}/`); else good('sitemap.xml lists the home page');
if (!/Sitemap:/i.test(read('robots.txt') || '') || /Disallow:\s*\/\s*$/m.test(read('robots.txt') || '')) bad('robots.txt: missing Sitemap line or blocks everything'); else good('robots.txt: open, sitemap declared');

// competing WebSite nodes on inner pages
let inner = 0; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'tools' || e.name === 'assets') continue; const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.name.endsWith('.html')) { const rel = path.relative(ROOT, f); if (homes.includes(rel) || rel === '404.html') continue; const h = fs.readFileSync(f, 'utf8'); if (/"@type":"WebSite"/.test(h)) { inner++; bad(`${rel}: inner page has a WebSite node (site names are per site, not per page)`); } } } };
walk(ROOT); if (!inner) good('no inner page carries a competing WebSite node');

console.log(`site-name audit for ${ORIGIN}`);
ok.forEach((m) => console.log('  ✔ ' + m));
if (errs.length) { console.error('\n✖ Problems:\n  - ' + errs.join('\n  - ')); process.exit(1); }
console.log('✔ Site-name audit OK');
