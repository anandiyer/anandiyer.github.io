/* County centroids for the national map view.

   The map has to answer "is anything near me" for someone who does not know an
   address, which means it needs a zoomed-out view — and at national zoom you
   cannot draw 125 overlapping pins over Northern Virginia.

   So the national view draws one bubble per county, sized by site count. That
   is an *aggregate* marker, not a claim about where any individual site sits,
   which is why it is allowed to use a county centroid while individual site
   pins are still never placed on one. Zooming in swaps bubbles for real,
   validated coordinates. */

import path from 'node:path';
import { getJSON } from './lib/http.mjs';
import { DATA, readJSON, writeJSON, log } from './lib/util.mjs';

const TIGER = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/1/query';

const STATE_FIPS = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10',
  DC: '11', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19',
  KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27',
  MS: '28', MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35',
  NY: '36', NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44',
  SC: '45', SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53',
  WV: '54', WI: '55', WY: '56', PR: '72',
};

/* "Loudoun Co." -> "Loudoun"; "Manassas City" -> "Manassas" (an independent
   city, which TIGER carries as a county equivalent). */
function tigerName(locality) {
  return String(locality)
    .replace(/\s*(County|Co\.|City)\s*$/i, '')
    .trim();
}

async function lookup(locality, state) {
  const fips = STATE_FIPS[state];
  if (!fips) return null;
  const name = tigerName(locality).replace(/'/g, "''");
  const q = new URLSearchParams({
    where: `BASENAME='${name}' AND STATE='${fips}'`,
    outFields: 'BASENAME,NAME,STATE,GEOID,CENTLAT,CENTLON',
    returnGeometry: 'false',
    f: 'json',
  });
  const r = await getJSON(`${TIGER}?${q}`);
  const feats = r?.features || [];
  if (!feats.length) return null;

  /* Virginia has both "Fairfax County" and the independent "Fairfax city".
     Match the one whose form agrees with the permit's locality string. */
  const wantsCity = /\bcity\b/i.test(locality);
  const pick = feats.find((f) => /city/i.test(f.attributes.NAME) === wantsCity) || feats[0];
  const a = pick.attributes;
  return {
    name: a.NAME,
    geoid: a.GEOID,
    state,
    lat: Number(a.CENTLAT),
    lon: Number(a.CENTLON),
    source: 'US Census TIGERweb',
  };
}

export async function collect() {
  const db = readJSON(path.join(DATA, 'sites.json'));
  if (!db) throw new Error('run 03-build-sites.mjs first');

  const file = path.join(DATA, 'counties.json');
  const cache = readJSON(file, { counties: {} });

  const wanted = new Map();
  for (const s of db.sites) wanted.set(`${s.locality}|${s.state}`, [s.locality, s.state]);

  let added = 0, missing = [];
  for (const [key, [locality, state]] of wanted) {
    if (cache.counties[key]) continue;
    if (/^undetermined/i.test(locality)) continue; // ECHO's placeholder for an unknown county
    try {
      const hit = await lookup(locality, state);
      if (hit) { cache.counties[key] = hit; added++; }
      else missing.push(key);
    } catch (err) { missing.push(`${key} (${err.message})`); }
  }

  cache.generated_at = new Date().toISOString();
  writeJSON(file, cache);
  log(`county centroids: ${Object.keys(cache.counties).length} known (+${added} new)${missing.length ? `, unresolved: ${missing.join(', ')}` : ''}`);
  return cache;
}

if (import.meta.url === `file://${process.argv[1]}`) await collect();
