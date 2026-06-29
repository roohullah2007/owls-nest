// Pass 3: reliably remove the Compass social icon anchor from all footer pages.
const fs = require('fs');
const path = require('path');

const files = [
  'featured-properties.html',
  'past-transactions.html',
  'private-exclusives.html',
  'compass-concierge.html',
];
const dir = path.join(__dirname, '..');

const compassAnchorRe = /\s*<a href="#" aria-label="Compass"[^>]*>\s*<svg[\s\S]*?<\/svg>\s*<\/a>/g;

let summary = [];
for (const f of files) {
  const p = path.join(dir, f);
  let html = fs.readFileSync(p, 'utf8');
  const m = html.match(compassAnchorRe);
  html = html.replace(compassAnchorRe, '');
  fs.writeFileSync(p, html, 'utf8');
  summary.push(`${f}: removed ${m ? m.length : 0}`);
}
console.log(summary.join('\n'));
