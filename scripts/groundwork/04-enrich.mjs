/* Attach the hazard, grid and filing layers to each site.

   Order matters: nothing hazard-related is attached without a coordinate, and
   no coordinate is accepted unless it survives county validation against the
   permit. A site whose address geocodes to the wrong county keeps its
   `pending` flood/water layers and records why — visibly, on the page. */

import path from 'node:path';
import { DATA, RAW, readJSON, writeJSON, log } from './lib/util.mjs';
import { geocode } from './lib/geo.mjs';
import { floodZone, waterStress } from './lib/hazards.mjs';
import { searchFilings } from './lib/edgar.mjs';
import { pjmQueue, pendingLayer } from './lib/grid.mjs';

/* Which sites PJM can actually answer for. Asking PJM about a Californian
   facility returns nothing today only because no API key is set; with a key it
   would return somebody else's queue position, which is the single worst
   failure mode this project has. */
const PJM_STATES = new Set(['VA', 'MD', 'DE', 'NJ', 'PA', 'OH', 'WV', 'DC']);

const ISO_BY_STATE = {
  CA: 'CAISO', TX: 'ERCOT', NY: 'NYISO', IL: 'MISO and PJM', IA: 'MISO',
  MN: 'MISO', MO: 'MISO and SPP', NE: 'SPP', KS: 'SPP', OK: 'SPP',
  AZ: 'The Western Interconnection', NV: 'The Western Interconnection',
  OR: 'The Western Interconnection', WA: 'The Western Interconnection',
  UT: 'The Western Interconnection', CO: 'The Western Interconnection',
  GA: 'The Southeast (non-ISO) utilities', NC: 'The Southeast (non-ISO) utilities',
  TN: 'TVA', MA: 'ISO-NE', NH: 'ISO-NE', CT: 'ISO-NE',
};
import { sleep } from './lib/http.mjs';

const CACHE_FILE = path.join(RAW, 'enrich-cache.json');

export async function enrich({ skipEdgar = false } = {}) {
  const db = readJSON(path.join(DATA, 'sites.json'));
  if (!db) throw new Error('run 03-build-sites.mjs first');
  const cache = readJSON(CACHE_FILE, { geo: {}, flood: {}, water: {}, edgar: {} });

  let geoOk = 0, geoRejected = 0, geoNone = 0;

  for (const [i, site] of db.sites.entries()) {
    /* ---- geocode ---- */
    /* ECHO sites arrive with an EPA-published coordinate; nothing to resolve. */
    if (site.geo && site.geo.lat) {
      geoOk++;
    } else if (site.address.street) {
      /* This appended a literal "VA" until August 2026, and the cache key
         omitted the state entirely. Neither mattered while every site with a
         street address was Virginian and everything else arrived from EPA with
         a coordinate. California arrives with an address and no coordinate, so
         both would now put California pins in Virginia — or serve one state's
         cached coordinate for another state's identically-named street. */
      const key = `${site.address.street}|${site.locality}|${site.state}`;
      /* Entries cached before the state joined the key are still valid — they
         were all resolved from the same street string and validated against the
         same county. Adopt them under the new key rather than making public
         geocoders re-answer four hundred questions they already answered. */
      const legacy = `${site.address.street}|${site.locality}`;
      if (!(key in cache.geo) && legacy in cache.geo) {
        cache.geo[key] = cache.geo[legacy];
        delete cache.geo[legacy];
      }
      if (!(key in cache.geo)) {
        const expect = site.permit_locality || site.locality;
        cache.geo[key] = await geocode(`${site.address.street}, ${site.locality.replace(/\s*Co\.$/, ' County')}, ${site.state}`, { expectCounty: expect });
        await sleep(150);
      }
      const g = cache.geo[key];
      if (g && !g.rejected) {
        site.geo = {
          lat: g.lat, lon: g.lon,
          matched_address: g.matched_address,
          county: g.county,
          provider: g.provider,
          county_verified: !!g.county_verified,
          confidence: g.county_verified ? 'probable' : 'directional',
          basis: `Address geocoded via ${g.provider}${g.county_verified ? ' and confirmed to fall in the county the permit names' : '; county could not be cross-checked'}.`,
        };
        geoOk++;
      } else if (g && g.rejected) {
        site.geo = { confidence: 'rejected', basis: g.reject_reason, rejected_candidate: g.matched_address };
        site.address.confidence = 'rejected';
        site.address.basis += ` — Rejected: ${g.reject_reason}`;
        geoRejected++;
      } else {
        geoNone++;
      }
    }

    /* ---- hazard layers (only with an accepted coordinate) ---- */
    if (site.geo && site.geo.lat) {
      const gk = `${site.geo.lat.toFixed(5)},${site.geo.lon.toFixed(5)}`;
      if (!(gk in cache.flood)) { cache.flood[gk] = await floodZone(site.geo.lat, site.geo.lon); await sleep(120); }
      if (!(gk in cache.water)) { cache.water[gk] = await waterStress(site.geo.lat, site.geo.lon); await sleep(120); }
      site.flood = cache.flood[gk];
      site.water = cache.water[gk];
    } else {
      site.flood = { status: 'pending', confidence: 'pending', label: 'Awaiting a verified location', note: 'FEMA flood zone is an exact point-in-polygon lookup, so it cannot be resolved until this site has a street address that survives county validation.' };
      site.water = { status: 'pending', confidence: 'pending', label: 'Awaiting a verified location', note: 'Water stress is read from the WRI Aqueduct basin containing the site, which requires a verified coordinate.' };
    }

    /* ---- grid interconnection ---- */
    site.grid = PJM_STATES.has(site.state)
      ? await pjmQueue({ county: site.locality, state: site.state })
      : pendingLayer(`${ISO_BY_STATE[site.state] || 'The interconnection queue for this region'} covers this site; Groundwork has only wired up PJM so far, so no queue position is asserted here.`);

    if ((i + 1) % 40 === 0) log(`enriched ${i + 1}/${db.sites.length}`);
  }

  /* ---- SEC filings, one query per operator rather than per site ---- */
  if (!skipEdgar) {
    const operators = [...new Set(db.sites.map((s) => s.operator.name).filter(Boolean))];
    for (const op of operators) {
      if (!(op in cache.edgar)) cache.edgar[op] = await searchFilings(`${op} data center`, { forms: '10-K,10-Q,8-K' });
    }
    for (const site of db.sites) {
      site.filings = site.operator.name
        ? cache.edgar[site.operator.name] || null
        : { available: false, confidence: 'pending', caveat: 'No operator resolved, so no filing search was run.' };
    }
    log(`edgar: ${operators.length} operator queries`);
  }

  writeJSON(CACHE_FILE, cache);
  db.generated_at = new Date().toISOString();
  db.counts.geocoded = geoOk;
  db.counts.geocode_rejected = geoRejected;
  db.counts.flood_mapped = db.sites.filter((s) => s.flood?.status === 'mapped').length;
  db.counts.in_sfha = db.sites.filter((s) => s.flood?.in_sfha).length;
  writeJSON(path.join(DATA, 'sites.json'), db);
  log(`geocoded ${geoOk}, rejected ${geoRejected}, no match ${geoNone}; flood mapped ${db.counts.flood_mapped}, in SFHA ${db.counts.in_sfha}`);
  return db;
}

if (import.meta.url === `file://${process.argv[1]}`) await enrich({ skipEdgar: process.argv.includes('--no-edgar') });
