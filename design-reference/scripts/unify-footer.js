// Standardize every page's footer to match buyers.html (the canonical PrimeMLS footer).
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..');

const buyers = fs.readFileSync(path.join(dir, 'buyers.html'), 'utf8');
const withComment = buyers.match(/<!-- FOOTER SECTION -->[\s\S]*?<\/footer>/)[0];
const footerOnly = withComment.match(/<footer[\s\S]*?<\/footer>/)[0];

// Pages that already have a (different) footer -> replace the <footer> element.
const replaceTargets = [
  'featured-properties.html',
  'past-transactions.html',
  'private-exclusives.html',
  'compass-concierge.html',
];

// Pages with no footer -> insert the full block before </body>.
const insertTargets = ['contact.html', 'contact-us.html'];

const summary = [];

for (const f of replaceTargets) {
  const p = path.join(dir, f);
  let html = fs.readFileSync(p, 'utf8');
  const had = /<footer[\s\S]*?<\/footer>/.test(html);
  html = html.replace(/<footer[\s\S]*?<\/footer>/, footerOnly);
  fs.writeFileSync(p, html, 'utf8');
  summary.push(`${f}: replaced=${had ? 1 : 0}`);
}

for (const f of insertTargets) {
  const p = path.join(dir, f);
  let html = fs.readFileSync(p, 'utf8');
  const alreadyHas = /<footer[\s\S]*?<\/footer>/.test(html);

  if (!alreadyHas) {
    html = html.replace(/<\/body>/, `\n  ${withComment}\n\n</body>`);
  }

  fs.writeFileSync(p, html, 'utf8');
  summary.push(`${f}: inserted=${alreadyHas ? 0 : 1}`);
}

console.log(summary.join('\n'));
