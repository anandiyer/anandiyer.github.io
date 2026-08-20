/* Layer: SPINE (Texas).

   Texas publishes no data-center-specific permit list, its emissions
   inventory contains almost no data centers, and ERCOT's queue is a
   statewide aggregate. What does exist is TCEQ's New Source Review air
   permit search — an interactive application, not a dataset.

   So this drives that application in a real browser, one operator at a time,
   slowly. It is the least elegant collector here and the only way to get
   Texas at facility level.

   Deliberately polite: one query at a time, a long pause between them, and
   results written after every query so a long run is resumable and its
   progress is visible while it works. */

import path from 'node:path';
import fs from 'node:fs';
import { launch, attach, sleep } from './lib/browser.mjs';
import { RAW, readJSON, writeJSON, log } from './lib/util.mjs';

const START = 'https://www2.tceq.texas.gov/airperm/index.cfm?fuseaction=airpermits.start';
const OUT = path.join(RAW, 'tceq-permits.json');
const PROGRESS = path.join(RAW, 'tceq-progress.txt');
const PAUSE_MS = 6000;

/* Customer names to query. TCEQ matches on the permit holder, so this is the
   same identification problem as everywhere else: a campus held by an SPV
   will not be found by operator name. Those surface later via EPA's registry. */
const OPERATORS = [
  'AMAZON', 'VADATA', 'MICROSOFT', 'META PLATFORMS', 'GOOGLE', 'EQUINIX',
  'DIGITAL REALTY', 'CYRUSONE', 'VANTAGE', 'ALIGNED', 'STACK INFRASTRUCTURE',
  'QTS', 'CLOUDHQ', 'COMPASS DATACENTERS', 'CORESITE', 'COLOGIX', 'DATABANK',
  'EDGECONNEX', 'SWITCH', 'IRON MOUNTAIN', 'NTT', 'SABEY', 'TRACT', 'NOVVA',
  'FLEXENTIAL', 'TIERPOINT', 'CYXTERA', 'YONDR', 'STREAM DATA CENTERS',
  'PRIME DATA CENTERS', 'SKYBOX', 'LINCOLN RACKHOUSE', 'T5', 'DATA CENTER',
  'POWERHOUSE', 'CLOUD', 'DIGITAL BRIDGE', 'CROWN CASTLE', 'ORACLE',
];

const note = (msg) => {
  const line = `${new Date().toISOString().slice(11, 19)}  ${msg}`;
  fs.mkdirSync(path.dirname(PROGRESS), { recursive: true });
  fs.appendFileSync(PROGRESS, line + '\n');
  log(msg);
};

/* Fill the form and let the browser submit it natively — the POST cannot be
   reconstructed by hand (see lib/browser.mjs). */
const FILL = (name) => `(()=>{
  const f=document.forms[0];
  if(!f) return 'noform';
  f.elements['cn_issue_to_txt'].value=${JSON.stringify(name)};
  if(f.elements['proj_status_txt']) [...f.elements['proj_status_txt']].forEach(r=>{r.checked=(r.value==='ALL')});
  /* The HTML results grid is malformed — the browser collapses every row into
     one. The pipe-delimited "text" output is well formed, so use that. */
  if(f.elements['out_form']) [...f.elements['out_form']].forEach(r=>{r.checked=(r.value==='text')});
  f.querySelector('input[type=image]').click();
  return 'ok';
})()`;

/* The text output is pipe-delimited, one record per line, after a header line
   that starts with "Program Area|". */
const READ = `(()=>{
  const txt=document.body.innerText;
  const lines=txt.split('\\n');
  const h=lines.findIndex(l=>/^Program Area\\s*\\|/.test(l));
  if(h===-1) return {header:[],rows:[],note:txt.slice(0,200)};
  const split=(l)=>l.split('|').map(c=>c.trim());
  const header=split(lines[h]);
  const rows=lines.slice(h+1)
    .filter(l=>l.includes('|'))
    .map(split)
    .filter(r=>r.length>=header.length-2 && r[0]);
  return {header,rows};
})()`;

export async function collect({ only = null } = {}) {
  const existing = readJSON(OUT, { queries: {}, permits: [] });
  const targets = (only ? [only] : OPERATORS).filter((o) => !existing.queries[o]);
  if (!targets.length) { log('TCEQ: nothing left to query'); return existing; }

  note(`TCEQ: starting — ${targets.length} operator queries to run, ~${Math.round((targets.length * (PAUSE_MS + 9000)) / 60000)} min`);
  const { proc, port } = await launch({ port: 9333, profile: '/tmp/gw-chrome-tceq' });
  const page = await attach(port);

  let header = existing.header || [];
  try {
    for (const [i, op] of targets.entries()) {
      try {
        await page.goto(START, 4500);
        const filled = await page.eval(FILL(op));
        if (filled !== 'ok') { note(`  ${op}: form not present, skipped`); existing.queries[op] = { rows: 0, error: 'noform' }; continue; }
        await sleep(9000); // the search is slow; let it land
        const res = await page.eval(READ);
        if (res.header?.length > header.length) header = res.header;
        const rows = (res.rows || []).map((cells) => ({ query: op, cells }));
        existing.permits.push(...rows);
        existing.queries[op] = { rows: rows.length };
        note(`  [${i + 1}/${targets.length}] ${op}: ${rows.length} rows`);
      } catch (err) {
        existing.queries[op] = { rows: 0, error: String(err.message || err).slice(0, 120) };
        note(`  [${i + 1}/${targets.length}] ${op}: FAILED — ${err.message}`);
      }
      existing.header = header;
      existing.updated_at = new Date().toISOString();
      writeJSON(OUT, existing);
      await sleep(PAUSE_MS);
    }
  } finally {
    page.close();
    try { proc.kill(); } catch { /* already gone */ }
  }

  note(`TCEQ: done — ${existing.permits.length} rows across ${Object.keys(existing.queries).length} queries`);
  return existing;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv.find((a) => a.startsWith('--only='));
  await collect({ only: only ? only.split('=')[1] : null });
}
