/* Layer: SPINE (Virginia).
   Source: VA DEQ "Issued Air Permits for Data Centers" — the only state page
   that publishes a data-center-specific permit list, which is why the PRD
   makes it the first target.

   Important limitation, carried through to the site pages: this listing gives
   locality (county/city) but NOT a street address. The PRD's data model
   assumed "permit has an address"; for Virginia that is not true. So the
   spine is confirmed at *county* precision and the address stays unresolved
   until a permit PDF or county record supplies one. We record that honestly
   rather than geocoding a county centroid and calling it a site location. */

import { get } from './lib/http.mjs';
import { parseTable } from './lib/html.mjs';
import { RAW, writeJSON, usDateToISO, slugify, log } from './lib/util.mjs';
import path from 'node:path';

const SOURCE_URL = 'https://www.deq.virginia.gov/news-info/shortcuts/permits/air/issued-air-permits-for-data-centers';
const PDF_BASE = 'https://www.deq.virginia.gov/home/showpublisheddocument/';

export async function collect() {
  const html = await get(SOURCE_URL);
  const asOf = (/as of ([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(html) || [])[1] || null;
  const table = parseTable(html);
  if (!table) throw new Error('VA DEQ: permit table not found — page structure changed');

  const permits = table.rows.map(({ cells, links }) => {
    const [name, reg, issued, program, locality, office] = cells;
    return {
      state: 'VA',
      facility_name: name,
      registration_no: reg,
      permit_issued: usDateToISO(issued),
      permit_issued_raw: issued,
      program_type: program,
      locality,
      regional_office: office,
      permit_pdf: links.find((h) => h.startsWith(PDF_BASE)) || null,
    };
  }).filter((p) => p.facility_name || p.registration_no);

  if (permits.length < 50) {
    throw new Error(`VA DEQ: only ${permits.length} rows parsed — refusing to overwrite with a likely-broken scrape`);
  }

  const out = {
    layer: 'spine',
    source: 'VA DEQ — Issued Air Permits for Data Centers',
    source_url: SOURCE_URL,
    publisher_as_of: asOf,
    fetched_at: new Date().toISOString(),
    address_precision: 'locality',
    count: permits.length,
    permits,
  };

  const file = path.join(RAW, 'va-deq-permits.json');
  writeJSON(file, out);
  log(`VA DEQ: ${permits.length} permits (publisher as of ${asOf}) -> ${path.relative(process.cwd(), file)}`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) await collect();
