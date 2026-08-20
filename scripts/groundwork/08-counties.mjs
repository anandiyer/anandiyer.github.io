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

const STATE_FIPS = { VA: '51', TX: '48', CA: '06', GA: '13', OH: '39', AZ: '04', MD: '24', WA: '53' };

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
