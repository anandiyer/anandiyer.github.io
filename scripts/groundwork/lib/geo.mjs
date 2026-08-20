/* Geocoding with provenance and a hard validation step.

   Two providers, tried in order:
     1. US Census Geocoder — authoritative for US addresses, free, no key,
        and returns the county directly, which we need for validation.
     2. OSM Nominatim — fallback for addresses in new developments that the
        Census address ranges don't carry yet (common for data centers).

   Every result is validated against the county the permit itself states. An
   address mined from permit prose is frequently the operator's corporate
   mailing address (one observed permit for a Prince William County facility
   is addressed to an office in Ashburn, 40 miles away). If the geocoded county
   disagrees with the permit's stated county, we reject the point rather than
   publish a pin in the wrong place. */

import { getJSON, get, sleep } from './http.mjs';

const NOMINATIM_UA = { 'User-Agent': 'Canonical Labs Groundwork (ai@canonical.cc)', 'Accept': 'application/json' };

const normCounty = (s) => String(s || '')
  .toLowerCase()
  .replace(/\b(county|co\.?|city)\b/g, '')
  .replace(/[^a-z]/g, '')
  .trim();

export function countyMatches(a, b) {
  const x = normCounty(a), y = normCounty(b);
  if (!x || !y) return null; // unknown, not a mismatch
  return x === y;
}

async function census(address) {
  const q = new URLSearchParams({
    address, benchmark: 'Public_AR_Current', vintage: 'Current_Current', format: 'json',
  });
  const r = await getJSON(`https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?${q}`);
  const m = r?.result?.addressMatches?.[0];
  if (!m) return null;
  const county = m.geographies?.Counties?.[0]?.BASENAME || null;
  return {
    lat: m.coordinates.y, lon: m.coordinates.x,
    matched_address: m.matchedAddress, county,
    state: m.addressComponents?.state || null,
    provider: 'us-census-geocoder',
  };
}

async function nominatim(address) {
  const q = new URLSearchParams({ q: address, format: 'jsonv2', addressdetails: '1', limit: '1', countrycodes: 'us' });
  const txt = await get(`https://nominatim.openstreetmap.org/search?${q}`, { headers: NOMINATIM_UA });
  const arr = JSON.parse(txt);
  const m = arr?.[0];
  await sleep(1100); // Nominatim usage policy: max 1 req/sec
  if (!m) return null;
  return {
    lat: Number(m.lat), lon: Number(m.lon),
    matched_address: m.display_name,
    county: m.address?.county || null,
    state: m.address?.state || null,
    provider: 'osm-nominatim',
  };
}

/* expectCounty: the locality the permit itself states, used to validate. */
export async function geocode(address, { expectCounty = null, state = 'VA' } = {}) {
  const query = /\b[A-Z]{2}\b|\bVirginia\b/i.test(address) ? address : `${address}, ${state}`;
  for (const fn of [census, nominatim]) {
    let hit = null;
    try { hit = await fn(query); } catch { /* try next provider */ }
    if (!hit) continue;
    const match = countyMatches(hit.county, expectCounty);
    if (match === false) {
      return { ...hit, rejected: true, reject_reason: `geocoded county "${hit.county}" does not match permit locality "${expectCounty}" — likely a corporate mailing address, not the facility` };
    }
    return { ...hit, rejected: false, county_verified: match === true };
  }
  return null;
}
