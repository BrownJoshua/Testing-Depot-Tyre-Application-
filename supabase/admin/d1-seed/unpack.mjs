// Unpacks the reference prototype's JSON page bundle into separate files (data only; nothing is executed).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
const out = process.argv[3];
const html = readFileSync(src, 'utf8');
const m = html.match(/<script id="bundle" type="application\/json">([\s\S]*?)<\/script>/);
if (!m) { console.log('no bundle'); process.exit(1); }
const bundle = JSON.parse(m[1]);
console.log('top-level keys:', Object.keys(bundle));
const pages = bundle.pages ?? {};
const rows = [];
for (const [name, content] of Object.entries(pages)) {
  const p = path.join(out, name);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, content);
  rows.push([name, content.length]);
}
rows.sort((a, b) => a[0].localeCompare(b[0]));
console.log(rows.length, 'pages');
writeFileSync(path.join(out, '_index.txt'), rows.map((r) => `${r[1]}\t${r[0]}`).join('\n'));
for (const k of Object.keys(bundle)) if (k !== 'pages') console.log(k, typeof bundle[k], String(JSON.stringify(bundle[k])).length);
