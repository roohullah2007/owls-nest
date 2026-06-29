const fs = require('fs');
const path = require('path');

const dir = __dirname + '/..';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const find = 'rounded-full border border-white flex items-center justify-center hover:bg-white hover:text-navy';
const repl = 'rounded-full border border-white text-white flex items-center justify-center hover:bg-white hover:text-navy';

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
  if (!block.includes(find)) continue;
  const newBlock = block.split(find).join(repl);
  fs.writeFileSync(p, src.slice(0, start) + newBlock + src.slice(close));
  changed++;
  console.log('fixed icons: ' + f);
}
console.log('Done. Files changed: ' + changed);
