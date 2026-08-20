/* Turn the TCEQ scrape into Texas facilities.

   The scrape queries by permit holder, which is noisy in Texas in a way it is
   not elsewhere: "VANTAGE" returns 265 rows, almost all of them Vantage
   Energy's oil and gas sites, and "AMAZON" returns a concrete plant. So a row
   is only published when something identifies it as a data center — the holder
   is a known data center operator AND the record carries no signal of another
   industry — and rows are grouped by TCEQ's regulated-entity (RN) number,
   which is the facility key. */

import path from 'node:path';
import { RAW, readJSON, writeJSON, usDateToISO, titleCase, log } from './lib/util.mjs';
import { resolveOperator } from './lib/operators.mjs';

/* Holders whose name alone establishes a data center. */
const DC_CUSTOMER = /data\s*cent|datacenter|data\s+services|\bcloudhq\b|\bcyrusone\b|\bequinix\b|\bqts\b|\bflexential\b|\btierpoint\b|\bskybox\b|\bdatabank\b|\bcologix\b|\bcoresite\b|\bedgeconnex\b|\bstack infrastructure\b/i;
/* Holders that are data center operators but whose name is generic enough to
   need corroboration from the rest of the record. */
const DC_BRAND = /\bmicrosoft\b|\bgoogle llc\b|\bmeta platforms\b|\bamazon\b|\bntt\b|\boracle\b|\bswitch\b|\bvantage\b|\baligned\b|\bcompass\b|\bdigital realty\b|\bprime data\b|\bpowerhouse\b/i;

/* Signals the record is some other industry entirely. */
const NOT_DC = /\bOGS\b|OIL|\bGAS\b(?!\s*TURBINE)|PIPELINE|COMPRESSOR|CONCRETE|BATCH PLANT|ROCK CRUSH|QUARRY|ASPHALT|WELL SITE|TANK BATTERY|FRAC|DRILLING|SAND MINE|FORMS LLC|LANDFILL|GRAIN|FEEDLOT|REFINER/i;
/* Positive signals a record is a data center even when the holder is generic. */
const DC_SIGNAL = /DATA\s*CENT|BACKUP GENERATOR|EMERGENCY GENERATOR|DIESEL ENGINE GENERA|GENERATOR|PBR NEW REGISTRATION|PBR EXISTING REGISTRATION|STANDARD PERMIT|APD CERTIFICATION|MAERT/i;

const looksLikeAddress = (s) => /^\d{2,6}\s+[A-Z0-9]/i.test(String(s || '').trim());

export function build() {
  const raw = readJSON(path.join(RAW, 'tceq-permits.json'));
  if (!raw) throw new Error('run 10-tceq.mjs first');
  const H = raw.header;
  const col = (cells, name) => cells[H.indexOf(name)] || '';

  const kept = [];
  let rejectedIndustry = 0, rejectedUnknown = 0;

  for (const p of raw.permits) {
    const customer = col(p.cells, 'Customer Name');
    const project = col(p.cells, 'Project Name');
    const blob = `${customer} ${project}`;

    if (NOT_DC.test(blob)) { rejectedIndustry++; continue; }
    const named = DC_CUSTOMER.test(customer);
    const branded = DC_BRAND.test(customer) && DC_SIGNAL.test(blob);
    if (!named && !branded) { rejectedUnknown++; continue; }

    kept.push({
      rn: col(p.cells, 'Regulated Entity'),
      customer,
      project,
      permit_no: col(p.cells, 'Permit Number'),
      permit_type: col(p.cells, 'Permit Type'),
      permit_status: col(p.cells, 'Permit Status'),
      project_status: col(p.cells, 'Project Status'),
      received: usDateToISO(col(p.cells, 'TCEQ Received Date')),
      completed: usDateToISO(col(p.cells, 'Project Complete Date')),
      location: col(p.cells, 'Physical Location'),
      county: col(p.cells, 'County Name'),
      city: col(p.cells, 'Near City Name'),
      identified_by: named ? 'holder name' : 'operator + record signal',
    });
  }

  /* One facility per RN. */
  const byRn = new Map();
  for (const r of kept) {
    if (!r.rn) continue;
    if (!byRn.has(r.rn)) byRn.set(r.rn, []);
    byRn.get(r.rn).push(r);
  }

  const facilities = [...byRn.entries()].map(([rn, rows]) => {
    rows.sort((a, b) => String(b.completed || b.received || '').localeCompare(String(a.completed || a.received || '')));
    const lead = rows[0];
    const address = rows.map((r) => r.location).find(looksLikeAddress) || null;
    return {
      rn,
      name: lead.customer,
      /* TCEQ shouts: "BEXAR". Title-case it so it matches the Census county
         lookup and reads like the rest of the site. */
      county: lead.county ? `${titleCase(lead.county.replace(/\s+CO(UNTY)?$/i, ''))} County` : null,
      city: lead.city ? titleCase(lead.city) : null,
      state: 'TX',
      address: address ? titleCase(address).replace(/\b(N|S|E|W|NE|NW|SE|SW|FM|US|TX|IH|RR|CR)\b/gi, (m) => m.toUpperCase()) : null,
      location_note: address ? null : (lead.location || null),
      permit_count: rows.length,
      permit_types: [...new Set(rows.map((r) => r.permit_type).filter(Boolean))],
      latest: rows.map((r) => r.completed || r.received).filter(Boolean).sort().pop() || null,
      earliest: rows.map((r) => r.received).filter(Boolean).sort()[0] || null,
      identified_by: lead.identified_by,
      operator: resolveOperator(lead.customer),
    };
  });

  const out = {
    layer: 'spine-tx',
    source: 'TCEQ — New Source Review air permit search',
    source_url: 'https://www2.tceq.texas.gov/airperm/index.cfm?fuseaction=airpermits.start',
    fetched_at: raw.updated_at,
    raw_rows: raw.permits.length,
    kept_rows: kept.length,
    rejected_other_industry: rejectedIndustry,
    rejected_unidentified: rejectedUnknown,
    facilities,
  };
  writeJSON(path.join(RAW, 'tceq-sites.json'), out);
  log(`TCEQ: ${facilities.length} facilities from ${kept.length} kept rows (${rejectedIndustry} other-industry, ${rejectedUnknown} unidentified, of ${raw.permits.length} raw)`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) build();
