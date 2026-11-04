// Reads the unpacked D1 prototype pages and returns the folio, fleet and tyre sample data as plain objects.
import { readFileSync } from 'node:fs';

const P = 'C:/Users/USER/AppData/Local/Temp/claude/bb28191aa67975c4/6beeea62-574a-4c31-a736-0fa933459e4e/scratchpad/proto';
const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function tables(file) {
  const html = readFileSync(`${P}/${file}`, 'utf8');
  return [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => {
    const t = m[0];
    // a table can have two <thead>; take the first header row only
    const head = [...(t.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? '').matchAll(/<th(?=[\s>])[\s\S]*?<\/th>/g)].map((x) => strip(x[0]));
    const rows = [...t.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((r) => r[0]).filter((r) => /<td/.test(r))
      .map((r) => [...r.matchAll(/<td[\s\S]*?<\/td>/g)].map((c) => strip(c[0])));
    return { head, rows: rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]]))) };
  });
}

export const dash = (v) => (v === undefined || v === '—' || v === '' || v === '-' ? null : v);
export const num = (v) => { const x = dash(v); if (x === null) return null; const n = Number(String(x).replace(/[₹,\s]/g, '')); return Number.isFinite(n) ? n : null; };
const MON = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
export function date(v) {
  const x = dash(v); if (x === null) return null;
  let m = x.match(/^(\d{2})-(\d{2})-(\d{4})$/); if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = x.match(/^(\d{1,2}) (\w{3}) (\d{4})$/); if (m && MON[m[2]]) return `${m[3]}-${MON[m[2]]}-${m[1].padStart(2, '0')}`;
  return null;
}

if (process.argv[1].endsWith('d1data.mjs')) {
  const reg = tables('tic/tyre-register.html')[1].rows;
  const good = tables('tic/tyre.html')[1].rows;
  const rep = tables('tic/tyre.html')[6].rows;
  const ho = tables('ho/fleet-master.html')[0].rows;
  const uniq = (rows, k) => [...new Set(rows.map((r) => r[k]))].slice(0, 25);
  console.log('register', reg.length, 'status', uniq(reg, 'Status'), 'location', uniq(reg, 'Location').slice(0, 8));
  console.log('good', good.length, uniq(good, 'Location'), uniq(good, 'Setting Status'), uniq(good, 'Status'));
  console.log('repair', rep.length, uniq(rep, 'Location'), uniq(rep, 'Status'), uniq(rep, 'Setting Status'));
  console.log('grade', uniq(reg, 'Grade'), 'cond', uniq(reg, 'Tyre Condition'), 'pos', uniq(reg, 'Fitted Position'));
  console.log('fleets', ho.length, 'depots', uniq(ho, 'Depot'), 'model', uniq(ho, 'Model'), 'mtype', uniq(ho, 'Model Type'), 'ftype', uniq(ho, 'Fleet Type'), 'status', uniq(ho, 'Status'), 'axle', uniq(ho, 'Axle Type'), 'air', uniq(ho, 'Air Type'));
  console.log('mandaveli fleets', ho.filter((r) => r['Depot'] === 'Mandaveli').length);
  const fl = new Set(ho.map((r) => r['Fleet No'])); console.log('fleet no unique', fl.size);
  const usedFleets = new Set(reg.map((r) => r['Current fleet']).filter((x) => x && x !== '—')); console.log('fleets with tyres in register', usedFleets.size, 'all in HO list', [...usedFleets].every((f) => fl.has(f)));
  const folios = new Map(); for (const r of [...reg, ...good, ...rep]) folios.set(r['Folio ID'], r['Folio Name']); console.log('folios from tyres', folios.size);
  console.log('sample reg row keys', Object.keys(reg[0]).length);
}
