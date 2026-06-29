// One-off: remove Compass + Luxury Presence branding from the footer across pages,
// matching the rest of the Owl's Nest footer.
const fs = require('fs');
const path = require('path');

const files = [
  'featured-properties.html',
  'past-transactions.html',
  'private-exclusives.html',
  'compass-concierge.html',
];

const dir = path.join(__dirname, '..');

// 1) Compass footer logo -> Owl's Nest logo
const compassLogo = '<img src="https://media-production.lp-cdn.com/cdn-cgi/image/format=auto,quality=85/https://media-production.lp-cdn.com/media/dc358717-3b5c-40f8-97bf-2cdb633433a8" alt="Compass" class="h-6 w-auto" />';
const owlLogo = '<img src="assets/images/logo.png" alt="Owl\'s Nest Real Estate" class="h-10 w-auto [filter:brightness(0)_invert(1)]" />';

// 2) Compass social icon link -> remove (regex to absorb whitespace + svg)
const compassSocialRe = /\s*<a href="#" aria-label="Compass"[\s\S]*?<\/a>(?=\s*<\/div>)/;

// 3) Disclaimer: drop "team of agents affiliated with Compass. Compass Massachusetts, LLC d/b/a Compass"
const disclaimerOld = "Owl's Nest Real Estate is a team of real estate agents affiliated with Compass. Compass Massachusetts, LLC d/b/a Compass is a licensed real estate broker and abides by equal housing opportunity laws.";
const disclaimerNew = "Owl's Nest Real Estate is a licensed real estate broker and abides by equal housing opportunity laws.";

// 4) Luxury Presence bottom bar -> plain copyright/privacy
const luxuryImg = /\s*<img src="https:\/\/media-production\.lp-cdn\.com[^"]*jnymuan6tigs629jigsz" alt="Luxury Presence" class="h-10 w-auto" \/>/;
const poweredBy = /<span>Powered by <a href="#" class="underline text-gray-200">LUXURY PRESENCE<\/a><\/span>\s*<span class="text-white\/30">\|<\/span>\s*/;

let summary = [];
for (const f of files) {
  const p = path.join(dir, f);
  let html = fs.readFileSync(p, 'utf8');
  const counts = {};

  counts.logo = html.includes(compassLogo) ? 1 : 0;
  html = html.split(compassLogo).join(owlLogo);

  counts.social = compassSocialRe.test(html) ? 1 : 0;
  html = html.replace(compassSocialRe, '');

  counts.disclaimer = html.includes(disclaimerOld) ? 1 : 0;
  html = html.split(disclaimerOld).join(disclaimerNew);

  counts.luxImg = luxuryImg.test(html) ? 1 : 0;
  html = html.replace(luxuryImg, '');

  counts.powered = poweredBy.test(html) ? 1 : 0;
  html = html.replace(poweredBy, '');

  fs.writeFileSync(p, html, 'utf8');
  summary.push(`${f}: ${JSON.stringify(counts)}`);
}
console.log(summary.join('\n'));
