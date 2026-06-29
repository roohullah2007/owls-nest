// Pass 2: handle the two pages where the footer imgs span multiple lines.
const fs = require('fs');
const path = require('path');

const files = ['private-exclusives.html', 'compass-concierge.html'];
const dir = path.join(__dirname, '..');

const compassLogoRe = /<img src="https:\/\/media-production\.lp-cdn\.com[^"]*dc358717-3b5c-40f8-97bf-2cdb633433a8"\s*\n\s*alt="Compass" class="h-6 w-auto" \/>/;
const owlLogo = '<img src="assets/images/logo.png" alt="Owl\'s Nest Real Estate" class="h-10 w-auto [filter:brightness(0)_invert(1)]" />';
const luxuryImgRe = /\s*<img src="https:\/\/media-production\.lp-cdn\.com[^"]*jnymuan6tigs629jigsz"\s*\n\s*alt="Luxury Presence" class="h-10 w-auto" \/>/;

let summary = [];

for (const f of files) {
  const p = path.join(dir, f);
  let html = fs.readFileSync(p, 'utf8');
  const counts = {};

  counts.logo = compassLogoRe.test(html) ? 1 : 0;
  html = html.replace(compassLogoRe, owlLogo);

  counts.luxImg = luxuryImgRe.test(html) ? 1 : 0;
  html = html.replace(luxuryImgRe, '');

  counts.comment1 = html.includes('Top row: Compass logo + social icons') ? 1 : 0;
  html = html.replace('Top row: Compass logo + social icons', 'Top row: logo + social icons');

  counts.comment2 = html.includes('Bottom row: Luxury Presence + copyright') ? 1 : 0;
  html = html.replace('Bottom row: Luxury Presence + copyright', 'Bottom row: copyright');

  fs.writeFileSync(p, html, 'utf8');
  summary.push(`${f}: ${JSON.stringify(counts)}`);
}

console.log(summary.join('\n'));
