/* Assemble the denormalized `sites` record set — "the join" (PRD §5).

   A permit is not a site. VA DEQ lists 201 issued permits across roughly 150
   distinct facilities: campuses are permitted in phases, and a single campus
   may hold a Title V permit plus several minor-source amendments. We roll
   permits up by (normalized facility name + locality) and keep every
   contributing permit on the record, because the permit list is the evidence.

   Each layer is attached with its own confidence tier and citation. Nothing is
   blended into a single score — per PRD §5, a blended score hides which parts
   are verified. */

import path from 'node:path';
import { RAW, DATA, readJSON, writeJSON, slugify, log } from './lib/util.mjs';
import { resolveOperator } from './lib/operators.mjs';

const ECHO_DETAIL = 'https://echo.epa.gov/air-pollutant-report?fid=';

/* Virginia is built from VA DEQ, which is permit-level and far richer than the
   national registry (issuance dates, programs, generator counts, a PDF per
   permit). Everywhere else is built from EPA ECHO, which is facility-level.
   Splitting on state avoids reconciling two different keying schemes, and the
   provenance is stated on every page. */
function echoSites(echo) {
  if (!echo) return [];
  return echo.facilities.filter((f) => f.state !== 'VA').map((f) => {
    const op = resolveOperator(f.name);
    const county = f.county ? `${f.county} County` : null;
    const slug = slugify(`${f.name}-${f.county || f.city || ''}-${f.state}`);
    return {
      slug,
      name: f.name,
      state: f.state,
      locality: county || f.city || f.state,
      permit_locality: county,
      locality_conflict: false,
      source_tier: 'echo',
      operator: {
        name: op.operator,
        confidence: op.confidence,
        basis: op.basis,
        permittee_name: f.name,
      },
      permit: {
        confidence: 'confirmed',
        count: 0,
        latest_issued: null,
        first_issued: null,
        programs: [],
        regional_office: f.state,
        records: [],
        registry_id: f.registry_id,
        naics: f.naics,
        source: 'EPA ECHO — air-permitted facility registry',
        source_url: ECHO_DETAIL + encodeURIComponent(f.registry_id),
        publisher_as_of: (echo.fetched_at || '').slice(0, 10),
      },
      address: {
        street: f.street ? `${f.street}${f.city ? ', ' + f.city : ''}` : null,
        confidence: f.street ? 'confirmed' : 'pending',
        basis: f.street
          ? 'Street address as published in EPA’s air-permit facility registry — a structured field, not text mined from a document.'
          : 'EPA’s registry carries no street address for this facility.',
      },
      equipment: {
        generators_permitted: null,
        turbines_permitted: null,
        confidence: 'pending',
        basis: 'Equipment counts come from reading a state permit document. Outside Virginia, Groundwork has the facility registry but not yet the permit text.',
      },
      pipeline: {
        stages: ['Proposed', 'Filed', 'Approved', 'Under construction', 'Operational'],
        reached: 'Approved',
        reached_index: 2,
        basis: 'Facility holds an active air permit in EPA’s registry. Construction and operational status are not established by registry data alone.',
        confidence: 'confirmed',
      },
      /* EPA supplies the coordinate, so no geocoding is needed — but its
         positional accuracy varies by how the state submitted it. */
      geo: f.lat && f.lon ? {
        lat: f.lat, lon: f.lon,
        matched_address: f.street || null,
        county: f.county || null,
        provider: 'epa-echo',
        county_verified: true,
        confidence: 'probable',
        basis: 'Coordinate published by EPA for this permitted facility. Positional accuracy varies with how the permitting authority submitted it.',
      } : null,
      flood: null, water: null, grid: null, filings: null,
      reported: [], claims: [],
      timeline: [],
    };
  });
}

/* Strip the phase/building enumeration so "Amazon Data Services Inc IAD-110/111"
   and "Amazon Data Services, Inc. IAD-114 IAD-115" don't collapse into one
   another, but "Equinix, LLC - DC 14" and "Equinix LLC - DC 14" do. */
function campusKey(name, locality) {
  const n = String(name)
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\b(inc|incorporated|llc|l\.p\.|lp|corp|corporation|ltd|company|co)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return `${n}::${String(locality).toLowerCase()}`;
}

const PROGRAM_LABEL = (p) => String(p || '').replace(/\s*-\s*/, ' — ').replace(/Article 6\s*—?\s*mNSR/i, 'Article 6 — minor new source review');

/* Pipeline stage (PRD §8) inferred only from what the permit record supports.
   Groundwork does not claim a site is operational without evidence, so the
   ladder tops out at "Permitted" from air-permit data alone. */
function pipelineStage(permits) {
  const issued = permits.some((p) => p.permit_issued);
  const newest = permits.map((p) => p.permit_issued).filter(Boolean).sort().pop();
  return {
    stages: ['Proposed', 'Filed', 'Approved', 'Under construction', 'Operational'],
    reached: issued ? 'Approved' : 'Filed',
    reached_index: issued ? 2 : 1,
    basis: issued
      ? `Air permit issued ${newest}. Construction and operational status are not established by permit data alone.`
      : 'Permit application on file; no issuance date published.',
    confidence: 'confirmed',
  };
}

export function build() {
  const spine = readJSON(path.join(RAW, 'va-deq-permits.json'));
  const details = readJSON(path.join(RAW, 'va-permit-details.json'), { permits: [] });
  if (!spine) throw new Error('run 01-va-deq.mjs first');

  const detailBy = new Map(details.permits.map((d) => [d.registration_no, d]));

  const groups = new Map();
  for (const p of spine.permits) {
    const key = campusKey(p.facility_name, p.locality);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const sites = [];
  for (const [key, permits] of groups) {
    permits.sort((a, b) => String(b.permit_issued || '').localeCompare(String(a.permit_issued || '')));
    const lead = permits[0];
    const op = resolveOperator(lead.facility_name);

    /* Best address across this campus's permits: prefer one found next to
       facility language, and only from permits we could actually read. */
    let address = null;
    let generators = null;
    let turbines = null;
    let permitLocality = null;
    for (const p of permits) {
      const d = detailBy.get(p.registration_no);
      if (!d || !d.text_layer) continue;
      permitLocality = permitLocality || d.permit_locality || null;
      if (d.generator_count_max) generators = Math.max(generators || 0, d.generator_count_max);
      if (d.turbine_count_max) turbines = Math.max(turbines || 0, d.turbine_count_max);
      const cand = (d.address_candidates || [])[0];
      if (cand && (!address || (cand.near_facility && !address.near_facility))) {
        address = { ...cand, from_permit: p.registration_no };
      }
    }

    const localityMismatch = permitLocality && lead.locality &&
      permitLocality.replace(/\s*(County|City)$/i, '').toLowerCase() !==
      lead.locality.replace(/\s*(Co\.|County|City)$/i, '').trim().toLowerCase();

    const name = lead.facility_name.replace(/\s+/g, ' ').trim();
    const slug = slugify(`${name}-${lead.locality}`.replace(/\s*Co\.$/, ''));

    sites.push({
      slug,
      name,
      state: 'VA',
      locality: lead.locality,
      permit_locality: permitLocality,
      locality_conflict: localityMismatch || false,

      operator: {
        name: op.operator,
        confidence: op.confidence,
        basis: op.basis,
        permittee_name: name,
      },

      /* SPINE — confirmed at locality precision. */
      permit: {
        confidence: 'confirmed',
        count: permits.length,
        latest_issued: permits.map((p) => p.permit_issued).filter(Boolean).sort().pop() || null,
        first_issued: permits.map((p) => p.permit_issued).filter(Boolean).sort()[0] || null,
        programs: [...new Set(permits.map((p) => PROGRAM_LABEL(p.program_type)))],
        regional_office: lead.regional_office,
        records: permits.map((p) => ({
          registration_no: p.registration_no,
          issued: p.permit_issued,
          program: PROGRAM_LABEL(p.program_type),
          pdf: p.permit_pdf,
        })),
        source: spine.source,
        source_url: spine.source_url,
        publisher_as_of: spine.publisher_as_of,
      },

      /* Address: mined from permit prose, so `probable` at best. Geocoding and
         hazard layers are attached by 04-enrich.mjs only if this survives
         county validation. */
      address: address
        ? {
            street: address.address,
            confidence: 'probable',
            basis: `Recovered from the text of permit ${address.from_permit}${address.near_facility ? ', adjacent to the facility/equipment description' : ''}. Not a structured field in the DEQ listing.`,
            from_permit: address.from_permit,
          }
        : {
            street: null,
            confidence: 'pending',
            basis: 'The DEQ listing publishes locality only, and no street address could be read from the permit PDF (often because the permit is a scanned image).',
          },

      equipment: {
        generators_permitted: generators,
        turbines_permitted: turbines,
        confidence: generators || turbines ? 'probable' : 'pending',
        basis: generators || turbines
          ? 'Counted from the permit text. Permits describe equipment in prose and tables; treat as the permitted maximum described, not an installed count.'
          : 'No generator count could be read from the permit text.',
      },

      pipeline: pipelineStage(permits),

      /* Attached downstream. */
      geo: null,
      flood: null,
      water: null,
      grid: null,
      filings: null,
      reported: [],
      timeline: permits
        .filter((p) => p.permit_issued)
        .map((p) => ({
          date: p.permit_issued,
          kind: 'permit',
          title: `Air permit ${p.registration_no} issued`,
          detail: PROGRAM_LABEL(p.program_type),
          url: p.permit_pdf,
          confidence: 'confirmed',
          source: 'VA DEQ',
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  }

  const echo = readJSON(path.join(RAW, 'echo-national.json'));
  const national = echoSites(echo);
  const taken = new Set(sites.map((s) => s.slug));
  for (const site of national) {
    let slug = site.slug, n = 2;
    while (taken.has(slug)) slug = `${site.slug}-${n++}`;
    site.slug = slug; taken.add(slug);
    sites.push(site);
  }

  sites.sort((a, b) => String(b.permit.latest_issued || '').localeCompare(String(a.permit.latest_issued || '')));

  const out = {
    generated_at: new Date().toISOString(),
    coverage: {
      states: [...new Set(sites.map((s) => s.state))].sort(),
      source_as_of: { VA: spine.publisher_as_of, national: (echo?.fetched_at || '').slice(0, 10) },
      national_excluded_unidentified: echo?.excluded_unidentified ?? 0,
    },
    counts: {
      sites: sites.length,
      permits: spine.permits.length,
      with_address: sites.filter((s) => s.address.street).length,
      operators_resolved: sites.filter((s) => s.operator.name).length,
      from_va_permits: sites.filter((s) => s.source_tier !== 'echo').length,
      from_epa_registry: sites.filter((s) => s.source_tier === 'echo').length,
    },
    sites,
  };
  const file = path.join(DATA, 'sites.json');
  writeJSON(file, out);
  log(`sites: ${sites.length} from ${spine.permits.length} permits; ${out.counts.with_address} with a street address`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) build();
