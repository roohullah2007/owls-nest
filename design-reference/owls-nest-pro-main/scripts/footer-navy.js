const fs = require('fs');
const path = require('path');

const dir = __dirname + '/..';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

function themeFooter(block) {
  let b = block;
  // root + any white backgrounds -> navy (do BEFORE we introduce hover:bg-white)
  b = b.split('bg-white').join('bg-navy');
  // social icon hover state
  b = b.split('hover:bg-black hover:text-white').join('hover:bg-white hover:text-navy');
  // text + borders
  b = b.split('text-black').join('text-white');
  b = b.split('border-black').join('border-white');
  b = b.split('border-gray-300').join('border-white/20');
  b = b.split('text-gray-300').join('text-white/30');
  b = b.split('text-[rgb(85,85,85)]').join('text-gray-200');
  // make the dark logos visible on navy
  b = b.split('alt="Owl\'s Nest Real Estate" class="h-10 w-auto"')
       .join('alt="Owl\'s Nest Real Estate" class="h-10 w-auto [filter:brightness(0)_invert(1)]"');
  b = b.split('class="h-12 w-auto flex-shrink-0"')
       .join('class="h-12 w-auto flex-shrink-0 [filter:brightness(0)_invert(1)]"');
  return b;
}

let changed = 0;
for (const f of files) {
  const p = path.join(dir, f);
  const src = fs.readFileSync(p, 'utf8');
  const start = src.indexOf('<footer');
  if (start === -1) continue;
  const end = src.indexOf('</footer>', start);
  if (end === -1) continue;
  const close = end + '</footer>'.length;
  const block = src.slice(start, close);
  const newBlock = themeFooter(block);
  if (newBlock !== block) {
    fs.writeFileSync(p, src.slice(0, start) + newBlock + src.slice(close));
    changed++;
    console.log('themed footer: ' + f);
  }
}
console.log('Done. Files changed: ' + changed);
