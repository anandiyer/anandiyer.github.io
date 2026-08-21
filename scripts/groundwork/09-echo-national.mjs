/* Layer: NATIONAL SPINE — EPA ECHO.

   Virginia is the only state that publishes a data-center-specific permit
   list, which is why a VA-only build looks, misleadingly, like Virginia is
   the whole build-out. Air permitting is a state function, so there is no
   national permit list to scrape.

   There is, however, a national *registry*: EPA's ECHO holds every
   air-permitted facility in the country, with the operator's self-reported
   NAICS code, an address, and a coordinate. That gives real national coverage
   from mandatory disclosure without writing fifty scrapers.

   Two queries, unioned on registry ID:
     - NAICS 518210 — "Data Processing, Hosting, and Related Services"
     - facility name containing "data cent(er|re)" / "datacenter"

   NAICS alone is noisy: the code is self-reported and catches things like a
   "test site" in North Dakota. So a facility is only published as a site when
   something in the record actually identifies it as a data center — its name,
   or a recognised operator. Facilities carrying the NAICS code with no such
   signal are counted and reported in the methodology, not published as sites. */

import path from 'node:path';
import { get, sleep } from './lib/http.mjs';
import { parseCSV } from './lib/csv.mjs';
import { RAW, readJSON, writeJSON, log } from './lib/util.mjs';
import { identify } from './lib/operators.mjs';

const ECHO = 'https://echodata.epa.gov/echo/air_rest_services';
const UA = { 'User-Agent': 'Canonical Labs Groundwork ai@canonical.cc', Accept: 'text/csv,application/json' };

/* 1 name · 2 registry id · 3 street · 4 city · 5 state · 7 zip · 9 county
   21 SIC · 22 NAICS · 23 lat · 24 long */
const QCOLUMNS = '1,2,3,4,5,7,9,21,22,23,24';


/* NAICS is self-reported and the "data center" name search only catches
   facilities that say so. A campus filed as "VANTAGE TX 11" or "META FORT
   WORTH" is invisible to both — which is why Texas first appeared here with
   five facilities. Querying ECHO for each known operator name closes that gap
   everywhere at once. Hits still have to pass the same identification test
   below, so an unrelated "Amazon" facility is not published as a data center
   on the name alone. */
const OPERATOR_QUERIES = [
  'amazon data services', 'vadata', 'microsoft', 'meta platforms', 'google',
  'equinix', 'digital realty', 'cyrusone', 'vantage', 'aligned', 'stack infrastructure',
  'qts', 'cloudhq', 'compass datacenters', 'coresite', 'cologix', 'databank',
  'edgeconnex', 'switch inc', 'iron mountain data', 'ntt global data', 'sabey',
  'tract', 'prime data', 'novva', 'flexential', 'tierpoint', 'cyxtera', 'yondr',

  /* Added August 2026. The estates below were absent from this list entirely,
     which is why Groundwork published 4 sites in California against a public
     count in the hundreds. The seed names were taken from the aggregate
     operator ranking dcmap.us publishes at /agent-api/v1/operators.json —
     names only, used as search terms; every record below is fetched from EPA.
     dcmap.us does not permit bulk reuse of its dataset and none is made here.

     The telco estates (Lumen, Cogent, Zayo, American Tower) are large and
     mostly legacy colocation in existing buildings, so many will have no air
     permit at all and will simply not appear. That is the correct outcome —
     Groundwork publishes disclosure records, not facility rumours. */
  'lumen', 'centurylink', 'level 3 communications', 'cogent', 'american tower',
  't5 data', 'csquare', 'stream data centers', 'edgecore', 'corscale',
  'powerhouse data', 'skybox data', 'element critical', 'supernap',
  'crusoe', 'applied digital', 'coreweave', 'oracle', 'apple inc', 'colossus',
];

/* ECHO throttles on a sliding window, not per-request, so the queries below are
   spaced as well as retried. Without the pause, adding twenty operator names in
   August 2026 tripped the limit and the last thirteen queries all 429'd, and
   a re-run ten minutes later was refused outright for nine minutes. Each query
   below is two requests (get_facilities, then get_download), so 4s of spacing
   is roughly one request every two seconds. */
const PAUSE_MS = 4000;

async function query(params, label) {
  const qs = new URLSearchParams({ ...params, output: 'JSON', qcolumns: QCOLUMNS });
  const head = JSON.parse(await get(`${ECHO}.get_facilities?${qs}`, { headers: UA, timeout: 90000, retries: 5 }));
  const qid = head?.Results?.QueryID;
  const rows = head?.Results?.QueryRows;
  if (!qid) throw new Error(`ECHO ${label}: no QueryID (${JSON.stringify(head?.Results?.Error || {}).slice(0, 120)})`);
  log(`ECHO ${label}: ${rows} rows (qid ${qid})`);
  const csv = await get(`${ECHO}.get_download?qid=${qid}&qcolumns=${QCOLUMNS}&output=CSV`, { headers: UA, timeout: 120000, retries: 5 });
  return parseCSV(csv).rows;
}

/* The rows ECHO returns are cached verbatim, because almost every change made
   here since is a change to *classification* — which brands count, what counts
   as identification — and re-deciding that should not cost EPA fifty queries.
   `--reclassify` rebuilds the published set from this cache and touches no
   network at all. Refreshing the underlying facts still means a real run. */
const ROWS_CACHE = 'echo-raw-rows.json';

async function fetchRows() {
  /* These four were a `Promise.all`, which is four simultaneous requests to a
     service that rate-limits — the one place in this file that ignored the
     politeness the comment below insists on, and the place the August 2026
     throttle actually started. Sequential and paced, like everything else. */
  const BASE_QUERIES = [
    [{ p_ncs: '518210' }, 'NAICS 518210'],
    [{ p_fn: 'data center' }, 'name "data center"'],
    [{ p_fn: 'datacenter' }, 'name "datacenter"'],
    [{ p_fn: 'data centre' }, 'name "data centre"'],
  ];
  const base = [];
  for (const [params, label] of BASE_QUERIES) {
    base.push(await query(params, label));
    await sleep(PAUSE_MS);
  }

  /* Sequential and paced: ECHO is a public service and these are cheap
     queries, but forty of them at once is rude — and gets you a 429. */
  const opBatches = [];
  const failed = [];
  for (const op of OPERATOR_QUERIES) {
    await sleep(PAUSE_MS);
    try { opBatches.push(await query({ p_fn: op }, `name "${op}"`)); }
    catch (err) {
      log(`ECHO operator query "${op}" failed: ${err.message}`);
      failed.push({ query: op, error: err.message });
    }
  }

  const byId = new Map();
  [...base, ...opBatches].flat().forEach((r) => {
    const id = r.SourceID || `${r.AIRName}|${r.AIRState}`;
    if (!byId.has(id)) byId.set(id, r);
  });

  writeJSON(path.join(RAW, ROWS_CACHE), {
    fetched_at: new Date().toISOString(),
    queries: OPERATOR_QUERIES.length + 4,
    failed_queries: failed,
    rows: [...byId.values()],
  });
  return { byId, failed };
}

function cachedRows() {
  const c = readJSON(path.join(RAW, ROWS_CACHE), null);
  if (!c) throw new Error(`--reclassify needs ${ROWS_CACHE}; run 09 once without it first.`);
  log(`ECHO: reclassifying ${c.rows.length} cached rows fetched ${c.fetched_at} (no network)`);
  const byId = new Map();
  for (const r of c.rows) byId.set(r.SourceID || `${r.AIRName}|${r.AIRState}`, r);
  return { byId, failed: c.failed_queries || [] };
}

export async function collect({ reclassify = false } = {}) {
  const { byId, failed } = reclassify ? cachedRows() : await fetchRows();

  const facilities = [];
  let namedOnly = 0, brandOnly = 0, unidentified = 0, needsSignal = 0;

  for (const [id, r] of byId) {
    const name = (r.AIRName || '').replace(/\s+/g, ' ').trim();
    const verdict = identify(name);
    const op = verdict.operator;
    if (!verdict.publish) {
      if (verdict.reason === 'brand_without_dc_signal') needsSignal++; else unidentified++;
      continue;
    }
    if (verdict.identified_by === 'name') namedOnly++;
    if (verdict.identified_by === 'operator') brandOnly++;

    const lat = Number(r.FacLat), lon = Number(r.FacLong);
    facilities.push({
      registry_id: id,
      name,
      street: r.AIRStreet || null,
      city: r.AIRCity || null,
      state: r.AIRState || null,
      zip: r.AIRZip || null,
      county: r.FacStdCountyName || r.AIRCounty || null,
      naics: r.AIRNAICS || null,
      sic: r.FacSICCodes || null,
      lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
      lon: Number.isFinite(lon) && lon !== 0 ? lon : null,
      identified_by: verdict.identified_by,
    });
  }

  const out = {
    layer: 'spine-national',
    source: 'EPA ECHO — air-permitted facilities (NAICS 518210 and data-center-named facilities)',
    source_url: 'https://echo.epa.gov/tools/web-services',
    fetched_at: new Date().toISOString(),
    complete: failed.length === 0,
    failed_queries: failed,
    candidates_returned: byId.size,
    published: facilities.length,
    excluded_unidentified: unidentified,
    excluded_brand_without_dc_signal: needsSignal,
    identified_by: { name_only: namedOnly, operator_only: brandOnly },
    states: [...new Set(facilities.map((f) => f.state))].sort(),
    facilities,
  };
  writeJSON(path.join(RAW, 'echo-national.json'), out);
  log(`ECHO national: ${facilities.length} identified data center facilities across ${out.states.length} states (${unidentified} excluded as unidentifiable, ${needsSignal} excluded as telco/tower estate with no data-center signal)`);

  /* Written either way, so a partial run can be inspected — but a partial run
     must not go on to render. A missing operator query does not look like an
     error downstream; it looks like an operator that has no permits, which is
     a claim this site would be making on the strength of a 429. */
  if (failed.length) {
    throw new Error(
      `ECHO national is incomplete: ${failed.length} of ${OPERATOR_QUERIES.length} operator queries failed `
      + `(${failed.map((f) => f.query).join(', ')}). The raw file was written and marked `
      + `"complete": false. Re-run 09 before building sites.`,
    );
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await collect({ reclassify: process.argv.includes('--reclassify') });
}
