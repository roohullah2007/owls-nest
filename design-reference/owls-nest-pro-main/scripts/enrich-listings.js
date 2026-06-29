/* Enrich each listing with REAL photos + REAL details scraped from its idxbroker
   detail page. Only the listing ID (taken from the existing image URL) is needed. */
const fs = require('fs');
const { execSync } = require('child_process');

const FILE = 'property-search.html';
const html = fs.readFileSync(FILE, 'utf8');

const m = html.match(/const LISTINGS = (\[[^\n]*\]);/);
if (!m) { console.error('LISTINGS array not found'); process.exit(1); }
const LISTINGS = JSON.parse(m[1]);
console.log('listings:', LISTINGS.length);

function fetchHtml(url) {
  try {
    return execSync(
      'curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" --max-time 45 ' + JSON.stringify(url),
      { maxBuffer: 1024 * 1024 * 12, encoding: 'utf8' }
    );
  } catch (e) { return ''; }
}
function decode(s) {
  return String(s)
    .replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'").replace(/&rsquo;/g, '’')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, ' ').replace(/&#0?34;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function field(h, name) {
  const re = new RegExp('IDX-field-' + name + ' IDX-field"[\\s\\S]{0,160}?<span class="IDX-text">([^<]*)<\\/span>');
  const r = h.match(re); return r ? decode(r[1]).trim() : '';
}
function photos(h, id) {
  const re = /https:\/\/[a-z0-9.]*paragon[^"'\\ ]+?\.(?:jpg|jpeg|png)/gi;
  const seen = {}; const out = [];
  let x;
  while ((x = re.exec(h))) {
    const u = x[0];
    if (u.indexOf('/' + id + '/') === -1) continue;          // only this listing's photos
    if (seen[u]) continue; seen[u] = 1;
    const pm = u.match(new RegExp('/' + id + '/(\\d+)/'));     // photo index segment
    out.push({ u: u, i: pm ? parseInt(pm[1], 10) : 999 });
  }
  out.sort((a, b) => a.i - b.i);
  return out.map(o => o.u);
}
function description(h) {
  let d = h.match(/<div id="IDX-description"[^>]*>([\s\S]*?)<\/div>/i);
  if (d) { const t = decode(d[1]); if (t.length > 40) return t; }
  let mt = h.match(/<meta name="description" content="([^"]*)"/i);
  return mt ? decode(mt[1]) : '';
}

const out = [];
let ok = 0, fail = 0;
for (let k = 0; k < LISTINGS.length; k++) {
  const p = LISTINGS[k];
  const idm = String(p.img).match(/PRIMEMLS\/(\d+)\//);
  const id = idm ? idm[1] : null;
  let rec = Object.assign({}, p);
  if (id) {
    const url = 'https://owlsnestrealestate.idxbroker.com/idx/details/listing/b027/' + id + '/x';
    const h = fetchHtml(url);
    const ph = photos(h, id);
    const beds = field(h, 'bedrooms');
    if (ph.length || beds) {
      ok++;
      rec.id = id;
      rec.photos = ph.length ? ph : [p.img];
      if (beds) rec.beds = beds + ' bd';
      const tb = field(h, 'totalBaths'); if (tb) rec.baths = tb + ' ba';
      rec.fullBaths = field(h, 'fullBaths');
      rec.sqft = field(h, 'sqFt');
      rec.acres = field(h, 'acres');
      rec.year = field(h, 'yearBuilt');
      rec.propType = field(h, 'propType');
      rec.subType = field(h, 'propSubType');
      rec.county = field(h, 'countyName');
      rec.ppsf = field(h, 'pricePerSqFt');
      const st = field(h, 'propStatus'); if (st) rec.status = st;
      rec.desc = description(h);
    } else {
      fail++; rec.photos = [p.img];
    }
  } else { fail++; rec.photos = [p.img]; }
  out.push(rec);
  if ((k + 1) % 10 === 0) console.log((k + 1) + '/' + LISTINGS.length + '  ok=' + ok + ' fail=' + fail);
}

const newArr = 'const LISTINGS = ' + JSON.stringify(out) + ';';
const newHtml = html.replace(/const LISTINGS = \[[^\n]*\];/, newArr.replace(/\$/g, '$$$$'));
fs.writeFileSync(FILE, newHtml);
console.log('DONE. ok=' + ok + ' fail=' + fail + '  total photos=' + out.reduce((a, b) => a + (b.photos ? b.photos.length : 0), 0));
