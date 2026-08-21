/* Layer: SPINE (California).

   California issues no air permits. Its thirty-five local air districts do —
   Bay Area AQMD, South Coast AQMD, San Joaquin Valley, and so on down to
   single-county districts — and each publishes, or does not publish, on its
   own terms. There is no California equivalent of the VA DEQ listing, which is
   why the state sat at four sites here while it holds one of the largest data
   center markets in the country.

   What does exist statewide is CARB's emissions inventory. Every permitted
   stationary source in California reports to it, whichever district wrote the
   permit, and CARB exposes it through a facility search that will hand back
   CSV. That is one query surface covering all thirty-five districts, and it
   carries the street address as a structured field — which the national EPA
   registry usually does not, and which Virginia needed PDF mining to get.

   What it does NOT carry is the permit itself: no issue date, no generator
   count, no permitted tonnage. So California publishes at the same tier as the
   EPA registry layer — the facility is established, the equipment is not.

   Two things about the source worth knowing before changing anything here:

     - SIC is self-reported, exactly like NAICS in ECHO. SIC 7374 returns
       office buildings ("100 INDEPENDENCE", "601 CALIFORNIA STREET") that
       filed under data processing because a tenant does data processing. The
       code is the net, never the identification.
     - The interesting facilities are scattered across other codes entirely.
       Evoque's San Jose data center is filed under 4813, telephone
       communications, alongside eleven hundred telco central offices. Querying
       4813 broadly would drag every one of those in. So it is reached by name
       instead, and 4813 is never queried as a code. */

import path from 'node:path';
import { get, sleep } from './lib/http.mjs';
import { parseCSV } from './lib/csv.mjs';
import { RAW, readJSON, writeJSON, titleCase, log } from './lib/util.mjs';
import { identify } from './lib/operators.mjs';

const FORM = 'https://www.arb.ca.gov/app/emsinv/iframe/facinfo/facinfo.php';
const CSV = 'https://www.arb.ca.gov/app/emsinv/iframe/facinfo/factox_output.csv';
const ROWS_CACHE = 'carb-raw-rows.json';

/* The most recent inventory year CARB publishes. Bump when they do; an
   unknown year returns an empty result rather than an error, which is why the
   row count is asserted below. */
const YEAR = '2023';

const PAUSE_MS = 2500;

/* SIC codes worth sweeping. 7374 is the data-processing code most California
   data centers file under; 7370/7379/7376 are its neighbours and catch the
   ones that self-classified slightly differently. 4813 is deliberately absent
   — see the header. */
const SIC_QUERIES = ['7374', '7370', '7376', '7379'];

/* Name queries. `fname_` is a substring match on the facility name, capped by
   the form at twenty characters. These do the real work: the codes are noisy
   and the good rows are spread across all of them. */
const NAME_QUERIES = [
  'DATA CENTER', 'DATACENTER', 'DATA CTR', 'COLOCATION',
  'EQUINIX', 'DIGITAL REALTY', 'VANTAGE', 'CYRUSONE', 'CORESITE', 'STACK',
  'QTS', 'COLOGIX', 'DATABANK', 'EDGECONNEX', 'FLEXENTIAL', 'TIERPOINT',
  'IRON MOUNTAIN', 'SABEY', 'PRIME DATA', 'STREAM DATA', 'H5 DATA',
  'AMAZON', 'MICROSOFT', 'GOOGLE', 'META PLATFORMS', 'APPLE INC', 'ORACLE',
  'NTT', 'ALIGNED', 'COMPASS', 'YONDR', 'CLOUDHQ', 'EVOQUE', 'EVOCATIVE',
  'SWITCH', 'T5', 'CYXTERA', 'RAGINGWIRE', 'MCKINLEY', 'ELEMENT CRITICAL',
];

const csvUrl = (params) => {
  const qs = new URLSearchParams({
    dbyr: YEAR, all_fac: 'C', sort: 'FacilityNameA',
    co_: '', ab_: '', facid_: '', dis_: '', city_: '', fzip_: '',
    fsic_: '', fname_: '', chapis_only: '', dd: '', showpol: '',
    ...params,
  });
  return `${CSV}?${qs}`;
};

async function query(params, label) {
  const csv = await get(csvUrl(params), { timeout: 60000, retries: 5 });
  const { rows } = parseCSV(csv);
  log(`CARB ${label}: ${rows.length} rows`);
  return rows;
}

/* The county code map is read off the search form rather than hardcoded.
   CARB numbers counties alphabetically, which is stable, but a list copied
   into this file is a list that can silently disagree with the source. */
async function countyMap() {
  const html = await get(FORM, { timeout: 45000 });
  const block = /<select name="co_"[\s\S]*?<\/select>/i.exec(html);
  if (!block) throw new Error('CARB: county dropdown not found — the form changed');
  const map = new Map();
  for (const m of block[0].matchAll(/<option[^>]*value="?(\d+)"?[^>]*>\s*\d+\s*&nbsp;?\s*&nbsp;?\s*([^<]+)/gi)) {
    map.set(m[1], titleCase(m[2].replace(/&nbsp;/g, ' ').trim()));
  }
  if (map.size < 50) throw new Error(`CARB: parsed only ${map.size} counties from the form, expected 58`);
  log(`CARB: ${map.size} county codes read from the search form`);
  return map;
}

async function fetchRows() {
  const counties = await countyMap();
  const byId = new Map();
  const failed = [];

  const run = async (params, label) => {
    await sleep(PAUSE_MS);
    try {
      for (const r of await query(params, label)) {
        const id = String(r.FACID || '').trim();
        if (id && !byId.has(id)) byId.set(id, r);
      }
    } catch (err) {
      log(`CARB query ${label} failed: ${err.message}`);
      failed.push({ query: label, error: err.message });
    }
  };

  for (const sic of SIC_QUERIES) await run({ fsic_: sic }, `SIC ${sic}`);
  for (const name of NAME_QUERIES) await run({ fname_: name }, `name "${name}"`);

  if (!byId.size) throw new Error(`CARB returned no rows at all for ${YEAR} — check the inventory year`);

  writeJSON(path.join(RAW, ROWS_CACHE), {
    fetched_at: new Date().toISOString(),
    inventory_year: YEAR,
    queries: SIC_QUERIES.length + NAME_QUERIES.length,
    failed_queries: failed,
    counties: [...counties],
    rows: [...byId.values()],
  });
  return { byId, failed, counties };
}

function cachedRows() {
  const c = readJSON(path.join(RAW, ROWS_CACHE), null);
  if (!c) throw new Error(`--reclassify needs ${ROWS_CACHE}; run 12 once without it first.`);
  log(`CARB: reclassifying ${c.rows.length} cached rows fetched ${c.fetched_at} (no network)`);
  const byId = new Map();
  for (const r of c.rows) byId.set(String(r.FACID).trim(), r);
  return { byId, failed: c.failed_queries || [], counties: new Map(c.counties || []) };
}

export async function collect({ reclassify = false } = {}) {
  const { byId, failed, counties } = reclassify ? cachedRows() : await fetchRows();

  const facilities = [];
  let unidentified = 0, needsSignal = 0;

  for (const [id, r] of byId) {
    const name = titleCase(String(r.FNAME || '').replace(/\s+/g, ' ').trim());
    const verdict = identify(name);
    if (!verdict.publish) {
      if (verdict.reason === 'brand_without_dc_signal') needsSignal++; else unidentified++;
      continue;
    }

    const street = String(r.FSTREET || '').trim();
    const city = titleCase(String(r.FCITY || '').trim());
    facilities.push({
      registry_id: `CARB-${id}`,
      facility_id: id,
      name,
      street: street ? titleCase(street) : null,
      city: city || null,
      state: 'CA',
      zip: String(r.FZIP || '').trim() || null,
      county: counties.get(String(r.CO || '').trim()) || null,
      district: String(r.DISN || '').trim() || null,
      sic: String(r.FSIC || '').trim() || null,
      naics: null,
      /* CARB's inventory carries no coordinate; 04 geocodes from the street
         address and validates the result against the county named here. */
      lat: null,
      lon: null,
      identified_by: verdict.identified_by,
    });
  }

  const out = {
    layer: 'spine-california',
    source: `CARB emissions inventory — facilities permitted by California's local air districts (${YEAR})`,
    source_url: 'https://ww2.arb.ca.gov/applications/facility-search-tool',
    inventory_year: YEAR,
    fetched_at: new Date().toISOString(),
    complete: failed.length === 0,
    failed_queries: failed,
    candidates_returned: byId.size,
    published: facilities.length,
    excluded_unidentified: unidentified,
    excluded_brand_without_dc_signal: needsSignal,
    districts: [...new Set(facilities.map((f) => f.district).filter(Boolean))].sort(),
    counties: [...new Set(facilities.map((f) => f.county).filter(Boolean))].sort(),
    facilities,
  };
  writeJSON(path.join(RAW, 'carb-ca.json'), out);
  log(`CARB California: ${facilities.length} identified data center facilities across ${out.counties.length} counties and ${out.districts.length} air districts (${unidentified} excluded as unidentifiable, ${needsSignal} excluded as telco estate with no data-center signal)`);

  if (failed.length) {
    throw new Error(
      `CARB California is incomplete: ${failed.length} queries failed `
      + `(${failed.map((f) => f.query).join(', ')}). The raw file was written and marked `
      + '"complete": false. Re-run 12 before building sites.',
    );
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await collect({ reclassify: process.argv.includes('--reclassify') });
}
