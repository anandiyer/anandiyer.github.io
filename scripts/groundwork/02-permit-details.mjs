/* Layer: SPINE detail (Virginia).
   Downloads each issued permit PDF and mines it for the facts the HTML
   listing omits — most importantly the facility's street address, which is
   what makes a real FEMA point-in-polygon lookup possible.

   Two traps this handles explicitly, because getting either wrong would put a
   site on the wrong map pin:

   1. The address on the letterhead is the *correspondent's mailing address*,
      not the facility. One observed permit is addressed to a Cloud HQ office
      in Ashburn (Loudoun Co.) for a facility whose stated location is Prince
      William County. We therefore never treat the letterhead block as a site
      location.
   2. The authoritative locality is the "Location: <X> County" line in the
      permit, which can disagree with the City/County column of the listing.
      Where they disagree we keep both and flag it.

   Addresses recovered from prose are labelled `probable`, never `confirmed`:
   they come from a regex over a permit body, not a structured field. */

import fs from 'node:fs';
import path from 'node:path';
import { get, CHROME_HEADERS, sleep } from './lib/http.mjs';
import { pdfToText } from './lib/pdf.mjs';
import { RAW, readJSON, writeJSON, log } from './lib/util.mjs';

const CACHE = path.join(RAW, 'permit-pdfs');
const RATE_MS = 900; // be a good citizen against a state portal

const STREET_SUFFIX = String.raw`(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Parkway|Pkwy|Boulevard|Blvd|Lane|Ln|Way|Court|Ct|Circle|Cir|Place|Pl|Terrace|Ter|Highway|Hwy|Loop|Run|Trail|Turnpike|Pike)`;
const ADDRESS_RE = new RegExp(String.raw`\b(\d{3,6})\s+([A-Z][A-Za-z0-9'.\-]*(?:\s+[A-Z][A-Za-z0-9'.\-]*){0,4}\s+${STREET_SUFFIX})\b\.?`, 'g');

/* Address-like strings that are DEQ's own offices or otherwise not a site. */
const ADDRESS_DENYLIST = [
  /13901\s+Crown\s+Court/i,      // DEQ Northern Regional Office
  /1111\s+East\s+Main/i,         // DEQ central office
  /629\s+East\s+Main/i,
  /4949\s+Cox\s+Road/i,          // DEQ Piedmont
  /3019\s+Peters\s+Creek/i,      // DEQ Blue Ridge
  /355\s+Deadmore/i,             // DEQ Southwest
  /1300\s+Sycamore/i,
];

/* Score each address-like string by how the permit uses it.

   These letters contain at least two addresses: the permittee's corporate
   mailing address in the header block, and the facility itself, which is
   almost always introduced by "located at". Picking the wrong one puts a pin
   in the wrong state — an observed Fairfax County permit is addressed to a
   managing member at 1707 H St NW, Washington DC, for a facility at 1780
   Business Center Drive, Reston. So "located at" dominates the score, and an
   address followed by a non-Virginia state is pushed out entirely. */
/* Any US state other than Virginia appearing right after an address means the
   address is not the facility. Listing every state matters: an early version
   omitted Nevada and duly attributed a Caroline County, VA site to its
   operator's head office on South Las Vegas Boulevard. */
const OTHER_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Washington','West Virginia','Wisconsin','Wyoming'];
const OTHER_ABBR = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','WA','WV','WI','WY','DC'];
/* Full state names can be matched case-insensitively. Abbreviations cannot:
   a case-insensitive \bIN\b happily matches the word "in", which rejected
   every address followed by "in accordance with the Conditions of this
   permit" — i.e. most of them. Abbreviations must therefore be uppercase AND
   in state position: after a comma, or immediately before a ZIP. */
const OUT_OF_STATE_NAME = new RegExp('\\b(?:washington,?\\s*d\\.?c\\.?|' + OTHER_STATES.join('|') + ')\\b', 'i');
const OUT_OF_STATE_ABBR = new RegExp('(?:,\\s*(?:' + OTHER_ABBR.join('|') + ')\\b|\\b(?:' + OTHER_ABBR.join('|') + ')\\s+\\d{5})');
const isOutOfState = (t) => OUT_OF_STATE_NAME.test(t) || OUT_OF_STATE_ABBR.test(t);

const IN_VIRGINIA = /\b(virginia|\bVA\b)\s*,?\s*\d{5}|\bVA\s+\d{5}/i;

function scoreAddress(flat, index, full, permitCity) {
  const before = flat.slice(Math.max(0, index - 90), index);
  const after = flat.slice(index + full.length, index + full.length + 70);
  let score = 0;

  /* The operative phrase in a VA DEQ permit. */
  if (/(located at|location of the facility|facility located|site address)\s*:?\s*$/i.test(before)) score += 100;
  else if (/(gen\s*-?\s*sets?|data center|facility|campus)[^.]{0,60}$/i.test(before)) score += 25;

  /* Header block: "Mr. X, Managing Member, <Company> <address>" is mail. */
  if (/(managing member|president|vice president|director|attn|c\/o|mr\.|ms\.|mrs\.)[^.]{0,80}$/i.test(before)) score -= 60;

  if (IN_VIRGINIA.test(after)) score += 40;
  if (isOutOfState(after)) score -= 150;
  if (permitCity && new RegExp(`\\b${permitCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(after)) score += 35;

  return score;
}

function extractAddresses(text, permitCity) {
  const flat = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const hits = new Map();
  let m;
  ADDRESS_RE.lastIndex = 0;
  while ((m = ADDRESS_RE.exec(flat))) {
    const full = `${m[1]} ${m[2]}`.replace(/\s+/g, ' ').trim();
    if (ADDRESS_DENYLIST.some((re) => re.test(full))) continue;
    const score = scoreAddress(flat, m.index, m[0], permitCity);
    const prev = hits.get(full);
    hits.set(full, {
      address: full,
      count: (prev?.count || 0) + 1,
      score: Math.max(prev?.score ?? -Infinity, score),
      near_facility: (prev?.near_facility || false) || score >= 100,
    });
  }
  /* Only surface addresses the permit actually points at. A purely
     incidental address (score <= 0) is worse than no address at all. */
  return [...hits.values()]
    .filter((h) => h.score > 0)
    .sort((a, b) => (b.score - a.score) || (b.count - a.count));
}

function extractDetails(text) {
  const flat = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const locality = (/Location:\s*([A-Z][A-Za-z .'-]{2,40}?(?:County|City))\b/.exec(flat) || [])[1] || null;
  /* "Location: Reston" names the facility's city; use it to disambiguate. */
  const permitCity = (/Location:\s*([A-Z][A-Za-z .'-]{2,30}?)(?:\s+County|\s+City|\s*Registration|\s*$)/.exec(flat) || [])[1] || null;
  const addresses = extractAddresses(text, permitCity && !/county/i.test(permitCity) ? permitCity.trim() : null);

  /* Counts read as "sixteen (16) emergency diesel engine generator sets" or
     "16 diesel engine gen - sets"; the PDF text layer freely splits words and
     hyphens, so allow a few filler words between the number and the noun. */
  const countBefore = (noun) => {
    const re = new RegExp(String.raw`\b(\d{1,4})\s*\)?\s*((?:[A-Za-z\-]+\s+){0,5}?)` + noun, 'gi');
    return [...flat.matchAll(re)]
      .filter((m) => !/\b(hour|hp|kw|mw|gallon|year|page|condition|table|no|rule|vac)\b/i.test(m[2]))
      .map((m) => Number(m[1]));
  };
  const genMatches = countBefore(String.raw`gen\s*-?\s*(?:erator)?\s*-?\s*sets?\b`)
    .filter((n) => n > 0 && n <= 1000);
  const turbines = countBefore(String.raw`(?:combustion\s+|gas\s+)?turbines?\b`)
    .filter((n) => n > 0 && n <= 200);

  /* Permitted emissions. VA permits tabulate each pollutant as
     "<name> <lb/hr> <tons/yr>", per emission unit and then facility-wide.
     We take the largest NOx figure in the document as the facility-wide
     permitted rate. This is `probable`, not confirmed: it is read from a
     table in a PDF, and a permitted ceiling is not measured emissions. */
  /* (?<![\d.]) matters: without it "0.998 tpy" matches as "998", which turned a
     0.998 t/yr unit into a 998 t/yr facility. */
  const noxFigures = [...flat.matchAll(/(nitrogen\s*oxides?|\bNO\s*x\b)[^%]{0,90}?(?<![\d.])(\d{1,4}(?:,\d{3})*(?:\.\d+)?)\s*(?:tons?\s*\/\s*(?:yr|year)|tons?\s+per\s+year|TPY)\b/gi)]
    .map((m) => Number(String(m[2]).replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 10000);

  return {
    permit_locality: locality,
    nox_tons_per_year: noxFigures.length ? Math.max(...noxFigures) : null,
    address_candidates: addresses.slice(0, 5),
    generator_count_max: genMatches.length ? Math.max(...genMatches) : null,
    turbine_count_max: turbines.length ? Math.max(...turbines) : null,
  };
}

async function fetchPdf(url, cacheFile) {
  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 2000) return fs.readFileSync(cacheFile);
  const res = await fetch(url, { headers: CHROME_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  fs.writeFileSync(cacheFile, buf);
  await sleep(RATE_MS);
  return buf;
}

export async function collect({ limit = Infinity } = {}) {
  const spine = readJSON(path.join(RAW, 'va-deq-permits.json'));
  if (!spine) throw new Error('run 01-va-deq.mjs first');

  const out = [];
  let ok = 0, noText = 0, failed = 0;
  const permits = spine.permits.slice(0, limit);

  for (const [i, p] of permits.entries()) {
    if (!p.permit_pdf) continue;
    const id = p.permit_pdf.split('/').slice(-2).join('_');
    const cacheFile = path.join(CACHE, `${id}.pdf`);
    const rec = { registration_no: p.registration_no, facility_name: p.facility_name, listing_locality: p.locality, permit_pdf: p.permit_pdf };
    try {
      const buf = await fetchPdf(p.permit_pdf, cacheFile);
      const { text, hasTextLayer, imageOnly } = pdfToText(buf);
      if (!hasTextLayer) { rec.text_layer = false; rec.image_only = imageOnly; noText++; }
      else { Object.assign(rec, extractDetails(text), { text_layer: true }); ok++; }
    } catch (err) {
      rec.error = String(err.message || err); failed++;
    }
    out.push(rec);
    if ((i + 1) % 25 === 0) log(`permit details ${i + 1}/${permits.length} (text ${ok}, no-text ${noText}, failed ${failed})`);
  }

  const file = path.join(RAW, 'va-permit-details.json');
  writeJSON(file, {
    layer: 'spine-detail',
    source: 'VA DEQ issued permit PDFs',
    fetched_at: new Date().toISOString(),
    stats: { total: out.length, with_text: ok, no_text_layer: noText, failed },
    permits: out,
  });
  log(`permit details done: ${ok} parsed, ${noText} image-only, ${failed} failed`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  await collect({ limit: limitArg ? Number(limitArg.split('=')[1]) : Infinity });
}
