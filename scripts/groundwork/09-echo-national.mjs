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
import { get } from './lib/http.mjs';
import { parseCSV } from './lib/csv.mjs';
import { RAW, writeJSON, log } from './lib/util.mjs';
import { resolveOperator } from './lib/operators.mjs';

const ECHO = 'https://echodata.epa.gov/echo/air_rest_services';
const UA = { 'User-Agent': 'Canonical Labs Groundwork ai@canonical.cc', Accept: 'text/csv,application/json' };

/* 1 name · 2 registry id · 3 street · 4 city · 5 state · 7 zip · 9 county
   21 SIC · 22 NAICS · 23 lat · 24 long */
const QCOLUMNS = '1,2,3,4,5,7,9,21,22,23,24';

const DC_NAME = /data\s*-?\s*cent(er|re)|datacenter|\bdata\s+hall\b|colocation|\bcolo\b/i;

async function query(params, label) {
  const qs = new URLSearchParams({ ...params, output: 'JSON', qcolumns: QCOLUMNS });
  const head = JSON.parse(await get(`${ECHO}.get_facilities?${qs}`, { headers: UA, timeout: 90000 }));
  const qid = head?.Results?.QueryID;
  const rows = head?.Results?.QueryRows;
  if (!qid) throw new Error(`ECHO ${label}: no QueryID (${JSON.stringify(head?.Results?.Error || {}).slice(0, 120)})`);
  log(`ECHO ${label}: ${rows} rows (qid ${qid})`);
  const csv = await get(`${ECHO}.get_download?qid=${qid}&qcolumns=${QCOLUMNS}&output=CSV`, { headers: UA, timeout: 120000 });
  return parseCSV(csv).rows;
}

export async function collect() {
  const batches = await Promise.all([
    query({ p_ncs: '518210' }, 'NAICS 518210'),
    query({ p_fn: 'data center' }, 'name "data center"'),
    query({ p_fn: 'datacenter' }, 'name "datacenter"'),
    query({ p_fn: 'data centre' }, 'name "data centre"'),
  ]);

  const byId = new Map();
  batches.flat().forEach((r) => {
    const id = r.SourceID || `${r.AIRName}|${r.AIRState}`;
    if (!byId.has(id)) byId.set(id, r);
  });

  const facilities = [];
  let namedOnly = 0, brandOnly = 0, unidentified = 0;

  for (const [id, r] of byId) {
    const name = (r.AIRName || '').replace(/\s+/g, ' ').trim();
    const op = resolveOperator(name);
    const byName = DC_NAME.test(name);
    const byBrand = op.confidence === 'confirmed' || op.confidence === 'probable';

    if (!byName && !byBrand) { unidentified++; continue; }
    if (byName && !byBrand) namedOnly++;
    if (!byName && byBrand) brandOnly++;

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
      identified_by: byName && byBrand ? 'name+operator' : byName ? 'name' : 'operator',
    });
  }

  const out = {
    layer: 'spine-national',
    source: 'EPA ECHO — air-permitted facilities (NAICS 518210 and data-center-named facilities)',
    source_url: 'https://echo.epa.gov/tools/web-services',
    fetched_at: new Date().toISOString(),
    candidates_returned: byId.size,
    published: facilities.length,
    excluded_unidentified: unidentified,
    identified_by: { name_only: namedOnly, operator_only: brandOnly },
    states: [...new Set(facilities.map((f) => f.state))].sort(),
    facilities,
  };
  writeJSON(path.join(RAW, 'echo-national.json'), out);
  log(`ECHO national: ${facilities.length} identified data center facilities across ${out.states.length} states (${unidentified} NAICS-coded facilities excluded as unidentifiable)`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) await collect();
