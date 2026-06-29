const fs = require('fs');
const path = require('path');

const dir = __dirname + '/..';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let changed = 0;

for (const f of files) {
  const p = path.join(dir, f);
  const src = fs.readFileSync(p, 'utf8');
  const start = src.indexOf('<footer');

  if (start === -1) {
continue;
}

  const end = src.indexOf('</footer>', start);

  if (end === -1) {
continue;
}

  const close = end + '</footer>'.length;
  let block = src.slice(start, close);

  if (!block.includes('max-w-5xl mb-8')) {
continue;
}

  const newBlock = block.split('max-w-5xl mb-8').join('mb-8');
  fs.writeFileSync(p, src.slice(0, start) + newBlock + src.slice(close));
  changed++;
  console.log('full-width disclaimer: ' + f);
}

console.log('Done. Files changed: ' + changed);
