/* Layer: REPORTED (PRD §9.2 and §13).

   The disclosure pipeline runs itself; this layer does not, and the spec is
   explicit that pretending otherwise would be dishonest. So the editorial
   surface is kept as small as possible and strictly bounded:

     - `editorial/reported-sites.json` is the only hand-maintained input.
     - A reported site is published with every disclosure layer marked pending,
       because the point of the tier is that a search should still find
       something at the moment it is most useful.
     - When a permit later appears for a reported site, the disclosure record
       takes over and the reported entries fall back to the timeline. Nothing
       has to be un-published by hand.

   `07-monitor.mjs` produces the review queue that feeds this file; it never
   writes here itself. A human decides what becomes a page. */

import path from 'node:path';
import { DATA, ROOT, readJSON, writeJSON, log } from './lib/util.mjs';

const EDITORIAL = path.join(ROOT, 'editorial', 'reported-sites.json');

const pending = (what, why) => ({ status: 'pending', confidence: 'pending', label: 'Awaiting disclosure', note: why });

export function merge() {
  const db = readJSON(path.join(DATA, 'sites.json'));
  const ed = readJSON(EDITORIAL, { sites: [], claims: [] });
  if (!db) throw new Error('run 03-build-sites.mjs first');

  /* Attach curated claims to existing disclosure-backed sites. */
  const bySlug = new Map(db.sites.map((s) => [s.slug, s]));
  let claimsAttached = 0;
  for (const c of ed.claims || []) {
    const site = bySlug.get(c.site_slug);
    if (!site) { log(`WARN claim references unknown site_slug "${c.site_slug}"`); continue; }
    site.claims = site.claims || [];
    site.claims.push(c);
    claimsAttached++;
  }

  /* Publish reported-tier sites that have no disclosure record yet. */
  let added = 0, upgraded = 0;
  for (const r of ed.sites || []) {
    if (bySlug.has(r.slug)) { upgraded++; continue; } // disclosure has caught up
    db.sites.push({
      slug: r.slug,
      name: r.name,
      state: r.state,
      locality: r.locality,
      permit_locality: null,
      locality_conflict: false,
      tier: 'reported',
      operator: {
        name: r.operator || null,
        confidence: 'reported',
        basis: 'Attributed by press coverage, not by a permit of record.',
        permittee_name: '—',
      },
      permit: {
        confidence: 'pending',
        count: 0,
        latest_issued: null,
        first_issued: null,
        programs: [],
        regional_office: '—',
        records: [],
        source: 'No permit located',
        source_url: 'https://canonical.cc/labs/groundwork/#methodology',
        publisher_as_of: null,
      },
      address: r.address
        ? { street: r.address, confidence: 'reported', basis: 'Address established by press coverage; no permit of record confirms it.' }
        : { street: null, confidence: 'pending', basis: 'No street address established.' },
      equipment: { generators_permitted: null, turbines_permitted: null, confidence: 'pending', basis: 'No permit to read.' },
      pipeline: {
        stages: ['Proposed', 'Filed', 'Approved', 'Under construction', 'Operational'],
        reached: r.status || 'Proposed',
        reached_index: Math.max(0, ['Proposed', 'Filed', 'Approved', 'Under construction', 'Operational']
          .findIndex((s) => s.toLowerCase() === String(r.status || 'Proposed').toLowerCase().split(' —')[0])),
        basis: `Stage as described in press coverage: ${r.status || 'Proposed'}. Not established by a filing.`,
        confidence: 'reported',
      },
      geo: null,
      flood: pending('flood', 'No confirmed street address, so no FEMA point-in-polygon lookup has been run. This page upgrades automatically once a permit or address appears.'),
      water: pending('water', 'No confirmed coordinate, so no Aqueduct basin lookup has been run.'),
      grid: pending('grid', 'No interconnection match attempted for a site without a disclosure record.'),
      filings: null,
      reported: r.reported || [],
      claims: [],
      timeline: (r.reported || []).map((n) => ({
        date: n.date, kind: 'news', title: n.title,
        detail: n.publication + (n.url ? '' : ' (citation pending verification)'),
        url: n.url, confidence: 'reported', source: n.publication,
      })),
    });
    added++;
  }

  db.counts.sites = db.sites.length;
  db.counts.reported_tier = added;
  db.coverage.states = [...new Set(db.sites.map((s) => s.state))];
  writeJSON(path.join(DATA, 'sites.json'), db);
  log(`reported tier: ${added} sites published, ${upgraded} already superseded by disclosure, ${claimsAttached} claims attached`);

  const uncited = (ed.sites || []).flatMap((s) => (s.reported || []).filter((n) => !n.url).map((n) => `${s.slug}: ${n.title}`));
  if (uncited.length) log(`AUDIT — ${uncited.length} reported entries lack a verified URL:\n  ` + uncited.join('\n  '));
  return db;
}

if (import.meta.url === `file://${process.argv[1]}`) merge();
