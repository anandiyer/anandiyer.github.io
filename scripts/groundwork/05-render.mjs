/* Generate the static Groundwork pages.

   Everything is emitted as real HTML committed to the repo, one file per site,
   county and operator. That is a deliberate choice over a client-side app:
   the product promise is a *permanently indexed* page per site (PRD §3), and
   only real HTML at a stable URL delivers that. canonical.cc is Jekyll on
   GitHub Pages, so generation happens here at build time rather than in a
   server at request time. */

import fs from 'node:fs';
import path from 'node:path';
import { DATA, readJSON, writeJSON, slugify, log } from './lib/util.mjs';
import { esc, badge, fmtDate, evidenceCard, pipelineLadder, timeline, head, foot, CORRECTION_BLOCK } from './lib/render-parts.mjs';
import { renderIndex } from './lib/render-index.mjs';
import { regimeFor } from './lib/disclosure.mjs';

const OUT = path.resolve('labs/groundwork');
/* The apex 301s to www, so canonicals must name the host that actually
   serves the page — a canonical pointing at a redirect wastes the signal. */
const BASE = 'https://www.canonical.cc/labs/groundwork';

const countyName = (loc) => String(loc).replace(/\s*Co\.$/, ' County');
const countySlug = (loc) => slugify(countyName(loc));

const written = new Set();

function write(rel, html) {
  const file = path.join(OUT, rel, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  written.add(rel);
}

/* Remove pages for entries that no longer exist.

   This renderer only ever wrote files, so a site that was withdrawn stayed
   published — orphaned from every index and link, but still served, still in
   the sitemap, still indexed. Sixteen Iowa grain elevators mistakenly
   identified as data centers were corrected in the dataset in August 2026 and
   would have remained live indefinitely without this.

   A directory that cannot retract an entry can only accumulate its mistakes,
   and a wrong page nobody links to is worse than one that is linked: it is
   still findable by search and by anyone holding the URL, with nothing left
   pointing at the correction. */
function prune(kind) {
  const dir = path.join(OUT, kind);
  if (!fs.existsSync(dir)) return [];
  const removed = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const rel = `${kind}/${entry.name}`;
    if (written.has(rel)) continue;
    fs.rmSync(path.join(dir, entry.name), { recursive: true, force: true });
    removed.push(rel);
  }
  return removed;
}

/* ---------------------------------------------------------------- site ---- */

function renderSite(site, db) {
  const opName = site.operator.name || 'Operator unresolved';
  const title = `${site.name} — ${countyName(site.locality)}, ${site.state} | Groundwork`;
  const desc = `Disclosure record for ${site.name} in ${countyName(site.locality)}, ${site.state}: air permit, flood zone, water stress and grid status, each sourced and confidence-labelled.`;

  /* --- evidence cards --- */
  const cards = [];

  cards.push(evidenceCard({
    key: 'Air permit',
    /* A count of 0 means the source establishes the permit without publishing
       how many documents sit behind it — the EPA registry, TCEQ and CARB all
       do this. Printing "0 issued permits" on a page asserting the facility is
       permitted said the opposite of what the data means. */
    value: site.permit.count
      ? `${site.permit.count} issued permit${site.permit.count === 1 ? '' : 's'}`
      : 'Permit held; count not published by this source',
    tier: site.permit.confidence,
    basis: `Latest issued ${esc(fmtDate(site.permit.latest_issued) || 'n/a')}. ${esc(site.permit.programs.join('; '))}. Issued by ${esc(site.permit.regional_office)}.`,
    /* This named VA DEQ on every page in the country while linking to whatever
       the site's actual source was — TCEQ, EPA ECHO, a California air district.
       Each tier already records its own source; use it. */
    cite: `<a href="${esc(site.permit.source_url)}" target="_blank" rel="noopener">${esc(site.permit.source)}</a>, published as of ${esc(site.permit.publisher_as_of)}`,
  }));

  const flood = site.flood || {};
  cards.push(evidenceCard({
    key: 'Flood zone',
    value: esc(flood.label || 'Pending'),
    tier: flood.confidence || 'pending',
    muted: flood.status !== 'mapped',
    basis: flood.status === 'mapped'
      ? `${flood.in_sfha ? 'Inside' : 'Outside'} a Special Flood Hazard Area${flood.static_bfe ? `. Base flood elevation ${flood.static_bfe} ft.` : '.'} Point-in-polygon lookup against the effective FEMA map.`
      : esc(flood.note || ''),
    cite: flood.status === 'pending'
      ? 'No citation &mdash; this layer is unresolved for this site.'
      : `<a href="https://msc.fema.gov/portal/search?AddressQuery=${encodeURIComponent(site.address.street || countyName(site.locality) + ', VA')}" target="_blank" rel="noopener">FEMA National Flood Hazard Layer</a>${flood.dfirm_id ? ` &middot; DFIRM ${esc(flood.dfirm_id)}` : ''}`,
  }));

  const water = site.water || {};
  cards.push(evidenceCard({
    key: 'Water stress',
    value: esc(water.label || 'Pending'),
    tier: water.confidence || 'pending',
    muted: water.status !== 'mapped',
    basis: water.status === 'mapped'
      ? `Baseline water stress &mdash; the share of available surface water withdrawn each year in this basin${water.overall_water_risk ? `. Overall water risk: ${esc(water.overall_water_risk)}.` : '.'}`
      : esc(water.note || ''),
    cite: water.status === 'mapped'
      ? `<a href="https://www.wri.org/aqueduct?ref=canonicalcc" target="_blank" rel="noopener">WRI Aqueduct 4.0</a> baseline annual water risk`
      : 'No citation &mdash; this layer is unresolved for this site.',
  }));

  const grid = site.grid || {};
  cards.push(evidenceCard({
    key: 'Grid interconnection',
    value: esc(grid.status === 'matched' ? `${grid.count} queue request${grid.count === 1 ? '' : 's'} in this county` : 'Not yet matched'),
    tier: grid.confidence || 'pending',
    muted: grid.status !== 'matched',
    basis: esc(grid.caveat || grid.note || ''),
    cite: grid.source_url
      ? `<a href="${esc(grid.source_url)}" target="_blank" rel="noopener">${esc(grid.source)}</a>`
      : 'No citation &mdash; PJM retired its public bulk queue download; this layer awaits a Data Miner feed.',
  }));

  /* --- address + operator --- */
  const addrTier = site.address.confidence;
  const addrVal = site.address.street
    ? esc(site.address.street) + `, ${esc(countyName(site.locality))}, VA`
    : `${esc(countyName(site.locality))}, VA <span style="color:var(--gw-ink-faint)">(locality only)</span>`;

  const geoLine = site.geo && site.geo.lat
    ? `<p class="gw-note-navy">Geocoded to ${site.geo.lat.toFixed(5)}, ${site.geo.lon.toFixed(5)} via ${esc(site.geo.provider)}${site.geo.county_verified ? ', county cross-checked against the permit' : ''}.</p>`
    : site.geo && site.geo.confidence === 'rejected'
      ? `<p class="gw-note-navy"><strong>Rejected candidate:</strong> ${esc(site.geo.rejected_candidate || '')} &mdash; ${esc(site.geo.basis)}</p>`
      : '';

  const filings = site.filings;
  const filingRows = filings && filings.hits && filings.hits.length
    ? `<ul class="gw-method-list">${filings.hits.slice(0, 4).map((h) => `<li><a href="${esc(h.url)}" target="_blank" rel="noopener">${esc(h.company || 'filing')}</a> &middot; ${esc(h.form || '')} &middot; ${esc(h.filed || '')}</li>`).join('')}</ul>`
    : '<p class="gw-ev-basis">No filings matched.</p>';

  const equip = site.equipment;
  const equipLine = equip.generators_permitted
    ? `${equip.generators_permitted} generator${equip.generators_permitted === 1 ? '' : 's'}${equip.turbines_permitted ? ` &middot; ${equip.turbines_permitted} turbine${equip.turbines_permitted === 1 ? '' : 's'}` : ''}`
    : 'Not stated in readable permit text';

  const next = {
    title: site.address.street ? 'Next permit action' : 'Awaiting a street address',
    detail: site.address.street
      ? `This page updates automatically when ${esc(site.permit.source)} publishes another permit or amendment for this facility.`
      : 'This permit PDF has no readable text layer, so no street address could be extracted. The flood and water layers unlock once an address is resolved.',
  };

  const body = `
            <section class="gw-hero" id="top">
                <div class="container mx-auto px-8">
                    <div class="gw-sitehead">
                        <div class="gw-crumb"><a href="/labs/groundwork/">Groundwork</a> &rsaquo; <a href="/labs/groundwork/county/${countySlug(site.locality)}/">${esc(countyName(site.locality))}</a>${site.operator.name ? ` &rsaquo; <a href="/labs/groundwork/operator/${slugify(site.operator.name)}/">${esc(site.operator.name)}</a>` : ''}</div>
                        <h1 class="gw-site-title">${esc(site.name)}</h1>
                        <p class="gw-site-where">${esc(countyName(site.locality))}, ${esc(site.state)}${site.locality_conflict ? ` &middot; <strong>permit states ${esc(site.permit_locality)}</strong>` : ''}</p>
                        <div class="gw-meta">
                            <div class="gw-meta-item"><span class="gw-meta-key">Operator</span><span class="gw-meta-val">${esc(opName)}</span></div>
                            <div class="gw-meta-item"><span class="gw-meta-key">Permits</span><span class="gw-meta-val">${site.permit.count}</span></div>
                            <div class="gw-meta-item"><span class="gw-meta-key">Generators permitted</span><span class="gw-meta-val">${equip.generators_permitted || '&mdash;'}</span></div>
                            <div class="gw-meta-item"><span class="gw-meta-key">Latest permit</span><span class="gw-meta-val">${esc(fmtDate(site.permit.latest_issued) || '&mdash;')}</span></div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="gw-scene" id="evidence">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[01]</span> The evidence</div>
                    <h2 class="gw-scene-h2">What the <em>disclosures</em> say.</h2>
                    <p class="gw-lede">Each layer below carries its own confidence tier and its own citation. There is deliberately no blended risk score: a single number would hide which parts are read from a filing and which are inferred.</p>

                    <div class="gw-evidence-grid">
                        ${cards.join('\n                        ')}
                    </div>

                    <div class="gw-evidence-grid">
                        ${evidenceCard({
                          key: 'Location',
                          value: addrVal,
                          tier: addrTier,
                          basis: esc(site.address.basis),
                          cite: site.address.from_permit
                            ? `Permit ${esc(site.address.from_permit)} &middot; <a href="${esc((site.permit.records.find((r) => r.registration_no === site.address.from_permit) || {}).pdf || site.permit.source_url)}" target="_blank" rel="noopener">permit PDF</a>`
                            : `<a href="${esc(site.permit.source_url)}" target="_blank" rel="noopener">${esc(site.permit.source)}</a>${site.source_tier ? '' : ' (locality column)'}`,
                        })}
                        ${evidenceCard({
                          key: 'Operator',
                          value: esc(opName),
                          tier: site.operator.confidence,
                          basis: esc(site.operator.basis),
                          cite: `Permittee of record: <strong>${esc(site.operator.permittee_name)}</strong>`,
                        })}
                        ${evidenceCard({
                          key: 'Permitted equipment',
                          value: equipLine,
                          tier: equip.confidence,
                          muted: !equip.generators_permitted,
                          basis: esc(equip.basis),
                          cite: `Read from the text of ${site.permit.count} permit document${site.permit.count === 1 ? '' : 's'} listed below`,
                        })}
                    </div>

                    ${geoLine}
                </div>
            </section>

            <section class="gw-scene" id="status">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[02]</span> Pipeline stage</div>
                    <h2 class="gw-scene-h2">Where this site sits in the <em>build</em>.</h2>
                    ${pipelineLadder(site.pipeline)}

                    <div class="gw-claims">
                        <span class="gw-claims-label">What the operator says</span>
                        ${site.claims && site.claims.length
                          ? site.claims.map((c) => `<p>${esc(c.text)} <a href="${esc(c.url)}" target="_blank" rel="noopener">source</a> ${badge('reported')}</p>`).join('\n                        ')
                          : '<p class="gw-empty">No public operator statements have been recorded for this site. Company claims about capacity, cooling technology and water use are kept in this block, separate from the verified record above, and are never merged into it.</p>'}
                    </div>
                </div>
            </section>

            <section class="gw-scene" id="timeline">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[03]</span> Activity</div>
                    <h2 class="gw-scene-h2">Every dated <em>event</em> on the record.</h2>
                    ${timeline([...(site.timeline || []), ...(site.reported || []).map((r) => ({ date: r.date, kind: 'news', title: r.title, detail: r.publication, url: r.url, confidence: 'reported' }))].sort((a, b) => String(a.date).localeCompare(String(b.date))), next)}
                </div>
            </section>

            <section class="gw-scene" id="sources">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[04]</span> Sources</div>
                    <h2 class="gw-scene-h2">Every permit behind this <em>record</em>.</h2>
                    <div class="gw-table-wrap">
                    <table class="gw-table">
                        <thead><tr><th>Registration</th><th>Issued</th><th>Program</th><th>Document</th></tr></thead>
                        <tbody>
                        ${site.permit.records.map((r) => `<tr><td>${esc(r.registration_no)}</td><td>${esc(fmtDate(r.issued) || '&mdash;')}</td><td>${esc(r.program)}</td><td><a href="${esc(r.pdf)}" target="_blank" rel="noopener">Permit PDF</a></td></tr>`).join('\n                        ')}
                        </tbody>
                    </table>
                    </div>
                    ${CORRECTION_BLOCK}
                </div>
            </section>`;

  /* A registry-only page with no address, no coordinate and no permit detail
     has nothing on it but its own name. Keep it reachable and linked, but do
     not ask Google to index several dozen near-identical stubs — that is how
     a section gets treated as thin and drags the useful pages down with it. */
  const contentless = !site.permit.count && !site.address.street && !site.geo?.lat;

  return head({
    title,
    description: desc,
    canonical: `${BASE}/site/${site.slug}/`,
    noindex: contentless,
  }) + body + foot;
}

/* -------------------------------------------------------------- county ---- */

function renderCounty(name, sites, ctx) {
  const slug = slugify(name);
  const state = sites[0]?.state || '';
  const gens = sites.reduce((a, s) => a + (s.equipment.generators_permitted || 0), 0);
  const permits = sites.reduce((a, s) => a + s.permit.count, 0);
  const operators = [...new Set(sites.map((s) => s.operator.name).filter(Boolean))];
  const withNox = sites.filter((s) => s.emissions?.nox_tons_per_year);
  const justUnder = withNox.filter((s) => s.emissions.just_under_threshold);
  const noxTotal = withNox.reduce((a, s) => a + s.emissions.nox_tons_per_year, 0);
  const located = sites.filter((s) => s.geo?.lat);
  const inSfha = located.filter((s) => s.flood?.in_sfha);
  const highWater = located.filter((s) => /^High|^Extremely High/.test(s.water?.label || ''));

  /* "Is that a lot?" is the question a resident cannot answer alone, so the
     ranking against every other tracked county is the top of the page. */
  const rank = ctx.rankByGenerators.indexOf(name) + 1;
  const rankSites = ctx.rankBySites.indexOf(name) + 1;
  const median = ctx.medianGenerators;

  /* The headline answer belongs in the title, so the search snippet answers
     the query without a click. */
  /* Front-load the place, then add as many figures as fit. Search results cut
     titles around 60 characters, so a third clause is usually wasted. */
  const stem = `Data centers in ${name}, ${state}`;
  const bits = [`${sites.length} site${sites.length === 1 ? '' : 's'}`];
  if (gens) bits.push(`${gens.toLocaleString()} generators`);
  else if (permits) bits.push(`${permits} air permit${permits === 1 ? '' : 's'}`);
  let title = `${stem} — ${bits.join(', ')}`;
  if (title.length > 66) title = `${stem} — ${bits[0]}`;
  title += ' | Groundwork';
  const desc = gens
    ? `${sites.length} data center sites in ${name}, ${state}, holding ${permits} issued air permits and ${gens.toLocaleString()} permitted backup generators. Every figure sourced to the permit it came from.`
    : `${sites.length} air-permitted data center facilities in ${name}, ${state}, from EPA's national permit registry, with flood and water exposure for each.`;

  const answer = `<div class="gw-answer">
      <div class="gw-answer-grid">
        <div class="gw-answer-fig"><span class="v">${sites.length}</span><span class="k">data center site${sites.length === 1 ? '' : 's'}</span></div>
        ${permits ? `<div class="gw-answer-fig"><span class="v">${permits}</span><span class="k">issued air permits</span></div>` : ''}
        ${gens ? `<div class="gw-answer-fig"><span class="v">${gens.toLocaleString()}</span><span class="k">permitted backup generators</span></div>` : ''}
        ${noxTotal ? `<div class="gw-answer-fig"><span class="v">${Math.round(noxTotal).toLocaleString()}</span><span class="k">tons/year NOx permitted</span></div>` : ''}
      </div>
    </div>`;

  /* Benchmark. Without it the raw count is unreadable to the person who needs
     it most — 5,882 generators means nothing without knowing the median is a
     handful. */
  const benchmark = gens ? `
                    <div class="gw-section-label"><span class="gw-section-num">[01]</span> Is that a lot?</div>
                    <h2 class="gw-scene-h2">${rank === 1 ? 'The densest county Groundwork <em>tracks</em>.' : `Ranked <em>${rank}</em> of ${ctx.rankByGenerators.length} counties.`}</h2>
                    <p class="gw-lede">${name} holds <strong>${gens.toLocaleString()} permitted backup generators</strong> across ${sites.length} sites. The median tracked county with any generator data has <strong>${median.toLocaleString()}</strong>. ${rank <= 3 ? 'This is one of the densest concentrations of permitted data center generation in the country.' : ''}</p>
                    <div class="gw-bars">
                      ${ctx.topCounties.map((c) => `<div class="gw-bar-row${c.name === name ? ' me' : ''}">
                        <span class="gw-bar-label">${c.name === name ? esc(c.name) : `<a href="/labs/groundwork/county/${slugify(c.name)}/">${esc(c.name)}</a>`}</span>
                        <span class="gw-bar-track"><span class="gw-bar-fill" style="width:${Math.max(1, Math.round((c.gens / ctx.topCounties[0].gens) * 100))}%"></span></span>
                        <span class="gw-bar-val">${c.gens.toLocaleString()}</span>
                      </div>`).join('\n                      ')}
                    </div>
                    <p class="gw-note-navy">Counties with permitted generator counts Groundwork has read from permit documents. Only Virginia publishes permits in a form that makes this countable today, so this ranking is Virginia-only &mdash; not a claim that no county elsewhere is denser.</p>` : `
                    <div class="gw-section-label"><span class="gw-section-num">[01]</span> What is on file</div>
                    <h2 class="gw-scene-h2">${sites.length} permitted <em>facilities</em>.</h2>
                    <p class="gw-lede">These facilities hold active air permits in EPA's national registry. Groundwork has not yet read ${state}'s permit documents, so generator counts and permitted emissions show as pending here &mdash; unlike Virginia, where every figure is read from the permit itself.</p>`;

  /* The FUD-cutting explainer. Cuts both ways deliberately. */
  const explainer = `
                    <div class="gw-section-label"><span class="gw-section-num">[02]</span> What the permits actually authorise</div>
                    <h2 class="gw-scene-h2">What this does &mdash; and doesn't &mdash; <em>mean</em>.</h2>
                    <div class="gw-twoup">
                      <div class="gw-plainly">
                        <span class="gw-plainly-label">It is smaller than it sounds</span>
                        <p>These are <strong>emergency backup</strong> generators. They are permitted to run during grid outages and for routine testing &mdash; typically tens of hours a year, not continuously. A permit is a ceiling on what a site may emit, not a measurement of what it does emit.</p>
                        <p>A permit also is not a building. An issued permit establishes approval; it does not establish that anything is built, energised or running.</p>
                        ${inSfha.length === 0 && located.length ? `<p>None of the ${located.length} sites here that Groundwork could locate sits in a FEMA Special Flood Hazard Area.</p>` : ''}
                      </div>
                      <div class="gw-plainly alt">
                        <span class="gw-plainly-label">It is bigger than any one filing shows</span>
                        <p>No single permit discloses ${gens ? `the ${gens.toLocaleString()} generators` : 'the total'} permitted in this county. That number exists only because ${permits || sites.length} separately-published filings were added together. Each one, read alone, looks routine.</p>
                        ${justUnder.length ? `<p><strong>${justUnder.length} of the ${withNox.length} permits here with a readable NOx figure are permitted at 90&ndash;99.99 tons per year</strong> &mdash; just beneath the 100 ton/year threshold that triggers major-source review and public participation. Statewide the pattern is sharper still: ${ctx.justUnderStatewide} permits sit in that band and ${ctx.atOrOver} reach 100.</p>` : ''}
                      </div>
                    </div>`;

  const thresholdTable = justUnder.length ? `
                    <div class="gw-table-wrap">
                    <table class="gw-table">
                        <thead><tr><th>Site</th><th>Operator</th><th class="num">Permitted NOx (t/yr)</th><th class="num">Under 100 by</th></tr></thead>
                        <tbody>
                        ${justUnder.sort((a, b) => b.emissions.nox_tons_per_year - a.emissions.nox_tons_per_year).map((s) => `<tr><td><a href="/labs/groundwork/site/${s.slug}/">${esc(s.name)}</a></td><td>${esc(s.operator.name || '&mdash;')}</td><td class="num">${s.emissions.nox_tons_per_year}</td><td class="num">${s.emissions.under_threshold_margin}</td></tr>`).join('\n                        ')}
                        </tbody>
                    </table>
                    </div>
                    <p class="gw-note-navy">Read from the emissions table of each permit and labelled ${badge('probable')} accordingly. A permit sized below a review threshold is lawful and common; Groundwork reports the pattern, and takes no view on any individual application.</p>` : '';

  const body = `
            <section class="gw-hero" id="top">
                <div class="container mx-auto px-8">
                    <div class="gw-sitehead">
                        <div class="gw-crumb"><a href="/labs/groundwork/">Groundwork</a> &rsaquo; Counties</div>
                        <h1 class="gw-site-title">Data centers in ${esc(name)}, ${esc(state)}</h1>
                        <p class="gw-site-where">Everything on file with the regulator, added up. Every figure links to the filing it came from.</p>
                        ${answer}
                    </div>
                </div>
            </section>

            <section class="gw-scene">
                <div class="container mx-auto px-8">${benchmark}</div>
            </section>

            <section class="gw-scene">
                <div class="container mx-auto px-8">${explainer}
                    ${thresholdTable}
                </div>
            </section>

            <section class="gw-scene">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[03]</span> The sites</div>
                    <h2 class="gw-scene-h2">Every tracked site in <em>${esc(name)}</em>.</h2>
                    <div class="gw-table-wrap">
                    <table class="gw-table">
                        <thead><tr><th>Site</th><th>Operator</th><th class="num">Permits</th><th class="num">Generators</th><th class="num">NOx t/yr</th><th>Flood zone</th></tr></thead>
                        <tbody>
                        ${sites.map((s) => `<tr><td><a href="/labs/groundwork/site/${s.slug}/">${esc(s.name)}</a></td><td>${esc(s.operator.name || '&mdash;')}</td><td class="num">${s.permit.count || '&mdash;'}</td><td class="num">${s.equipment.generators_permitted || '&mdash;'}</td><td class="num">${s.emissions?.nox_tons_per_year || '&mdash;'}</td><td>${esc(s.flood?.zone ? 'Zone ' + s.flood.zone : 'Pending')}</td></tr>`).join('\n                        ')}
                        </tbody>
                    </table>
                    </div>
                    <p class="gw-note-navy">${operators.length} operator${operators.length === 1 ? '' : 's'} of record${highWater.length ? ` &middot; ${highWater.length} of ${located.length} located sites draw from a basin WRI rates high or extremely high for water stress` : ''}${inSfha.length ? ` &middot; ${inSfha.length} in a FEMA Special Flood Hazard Area` : ''}.</p>

                    ${(() => {
                      const r = regimeFor(state);
                      return `<div class="gw-regime">
                        <span class="gw-regime-label">What ${esc(state)} publishes</span>
                        <p>${esc(r.summary)}</p>
                        ${r.tested.length ? `<ul class="gw-regime-list">${r.tested.map((t) => `<li><strong>${esc(t.source)}</strong> &mdash; <em>${esc(t.result)}</em>. ${esc(t.detail)}</li>`).join('')}</ul>` : ''}
                      </div>`;
                    })()}
                    ${CORRECTION_BLOCK}
                </div>
            </section>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Dataset',
        name: `Data center air permits in ${name}, ${state}`,
        description: desc,
        url: `${BASE}/county/${slug}/`,
        creator: { '@type': 'Organization', name: 'Canonical', url: 'https://www.canonical.cc/' },
        isAccessibleForFree: true,
        distribution: { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${BASE}/data/sites.json` },
        spatialCoverage: { '@type': 'Place', name: `${name}, ${state}` },
        variableMeasured: ['permitted data center sites', 'issued air permits', 'permitted backup generators', 'permitted NOx tons per year', 'FEMA flood zone', 'baseline water stress'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Groundwork', item: `${BASE}/` },
          { '@type': 'ListItem', position: 2, name: `${name}, ${state}` },
        ],
      },
    ],
  };
  return { slug, html: head({ title, description: desc, canonical: `${BASE}/county/${slug}/`, jsonLd }) + body + foot };
}

/* ------------------------------------------------------------ operator ---- */

function renderOperator(name, sites) {
  const slug = slugify(name);
  const gens = sites.reduce((a, s) => a + (s.equipment.generators_permitted || 0), 0);
  const permits = sites.reduce((a, s) => a + s.permit.count, 0);
  const counties = [...new Set(sites.map((s) => countyName(s.locality)))];
  const opStates = [...new Set(sites.map((s) => s.state))].sort();
  const probable = sites.filter((s) => s.operator.confidence === 'probable');

  const title = `${name} — permitted data center sites | Groundwork`;
  const desc = `Every ${name} data center site tracked by Groundwork: ${sites.length} sites across ${counties.length} localities in ${new Set(sites.map((s) => s.state)).size} states.`;

  const body = `
            <section class="gw-hero" id="top">
                <div class="container mx-auto px-8">
                    <div class="gw-sitehead">
                        <div class="gw-crumb"><a href="/labs/groundwork/">Groundwork</a> &rsaquo; Operators</div>
                        <h1 class="gw-site-title">${esc(name)}</h1>
                        <p class="gw-site-where">Every tracked site held by this operator, one click away.</p>
                        <div class="gw-meta">
                            <div class="gw-meta-item"><span class="gw-meta-key">Sites</span><span class="gw-meta-val">${sites.length}</span></div>
                            <div class="gw-meta-item"><span class="gw-meta-key">Issued permits</span><span class="gw-meta-val">${permits}</span></div>
                            <div class="gw-meta-item"><span class="gw-meta-key">Generators permitted</span><span class="gw-meta-val">${gens.toLocaleString()}</span></div>
                            <div class="gw-meta-item"><span class="gw-meta-key">States</span><span class="gw-meta-val">${opStates.length} &mdash; ${esc(opStates.join(', '))}</span></div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="gw-scene">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[01]</span> Portfolio</div>
                    <h2 class="gw-scene-h2">Sites attributed to this <em>operator</em>.</h2>
                    ${probable.length ? `<p class="gw-lede">${probable.length} of these ${probable.length === 1 ? 'attributions is' : 'attributions are'} ${badge('probable')} rather than confirmed &mdash; the permit is held by a single-purpose entity linked to this operator by documentary evidence rather than by name. The basis is stated on each site page.</p>` : ''}
                    <div class="gw-table-wrap">
                    <table class="gw-table">
                        <thead><tr><th>Site</th><th>County</th><th>State</th><th class="num">Permits</th><th class="num">Generators</th><th>Attribution</th></tr></thead>
                        <tbody>
                        ${sites.map((s) => `<tr><td><a href="/labs/groundwork/site/${s.slug}/">${esc(s.name)}</a></td><td><a href="/labs/groundwork/county/${countySlug(s.locality)}/">${esc(countyName(s.locality))}</a></td><td>${esc(s.state)}</td><td class="num">${s.permit.count || '&mdash;'}</td><td class="num">${s.equipment.generators_permitted || '&mdash;'}</td><td>${badge(s.operator.confidence)}</td></tr>`).join('\n                        ')}
                        </tbody>
                    </table>
                    </div>
                    ${CORRECTION_BLOCK}
                </div>
            </section>`;

  return { slug, html: head({ title, description: desc, canonical: `${BASE}/operator/${slug}/` }) + body + foot };
}

/* ----------------------------------------------------------------- run ---- */

export function render() {
  const db = readJSON(path.join(DATA, 'sites.json'));
  if (!db) throw new Error('run 03-build-sites.mjs first');

  fs.writeFileSync(path.join(OUT, 'index.html'), renderIndex(db));

  for (const s of db.sites) write(`site/${s.slug}`, renderSite(s, db));

  const byCounty = new Map();
  for (const s of db.sites) {
    const n = countyName(s.locality);
    if (!byCounty.has(n)) byCounty.set(n, []);
    byCounty.get(n).push(s);
  }
  const countyGens = [...byCounty.entries()].map(([n, list]) => ({
    name: n,
    gens: list.reduce((a, s) => a + (s.equipment.generators_permitted || 0), 0),
    sites: list.length,
  }));
  const withGens = countyGens.filter((c) => c.gens > 0).sort((a, b) => b.gens - a.gens);
  const sortedGensVals = withGens.map((c) => c.gens).sort((a, b) => a - b);
  const allNox = db.sites.filter((s) => s.emissions?.nox_tons_per_year);
  const ctx = {
    rankByGenerators: withGens.map((c) => c.name),
    rankBySites: [...countyGens].sort((a, b) => b.sites - a.sites).map((c) => c.name),
    medianGenerators: sortedGensVals.length ? sortedGensVals[Math.floor(sortedGensVals.length / 2)] : 0,
    topCounties: withGens.slice(0, 8),
    justUnderStatewide: allNox.filter((s) => s.emissions.just_under_threshold).length,
    atOrOver: allNox.filter((s) => s.emissions.nox_tons_per_year >= 100).length,
  };

  for (const [n, list] of byCounty) {
    list.sort((a, b) => (b.equipment.generators_permitted || 0) - (a.equipment.generators_permitted || 0));
    const { slug, html } = renderCounty(n, list, ctx);
    write(`county/${slug}`, html);
  }

  const byOp = new Map();
  for (const s of db.sites) {
    if (!s.operator.name) continue;
    if (!byOp.has(s.operator.name)) byOp.set(s.operator.name, []);
    byOp.get(s.operator.name).push(s);
  }
  for (const [n, list] of byOp) {
    list.sort((a, b) => String(b.permit.latest_issued || '').localeCompare(String(a.permit.latest_issued || '')));
    const { slug, html } = renderOperator(n, list);
    write(`operator/${slug}`, html);
  }

  /* County aggregates power the zoomed-out map view, where individual pins
     would be an unreadable pile over Northern Virginia. */
  const countyMeta = readJSON(path.join(DATA, 'counties.json'), { counties: {} }).counties;
  const countyAgg = new Map();
  for (const s of db.sites) {
    const key = `${s.locality}|${s.state}`;
    const meta = countyMeta[key];
    const name = countyName(s.locality);
    const cur = countyAgg.get(key) || {
      name, state: s.state, slug: slugify(name),
      lat: meta ? meta.lat : null, lon: meta ? meta.lon : null,
      sites: 0, permits: 0, generators: 0, located: 0,
    };
    cur.sites++; cur.permits += s.permit.count; cur.generators += s.equipment.generators_permitted || 0;
    if (s.geo?.lat) cur.located++;
    countyAgg.set(key, cur);
  }

  /* Public, citable dataset — trimmed for the client-side directory. */
  writeJSON(path.join(OUT, 'data', 'sites.json'), {
    counties: [...countyAgg.values()].filter((c) => c.lat != null),
    generated_at: db.generated_at,
    license: 'Compiled from US public disclosures. Reuse freely with attribution to Canonical Labs Groundwork.',
    coverage: db.coverage,
    counts: db.counts,
    sites: db.sites.map((s) => ({
      slug: s.slug, name: s.name, operator: s.operator.name, operator_confidence: s.operator.confidence,
      locality: countyName(s.locality), state: s.state,
      address: s.address.street, address_confidence: s.address.confidence,
      lat: s.geo?.lat ?? null, lon: s.geo?.lon ?? null,
      permits: s.permit.count, latest_permit: s.permit.latest_issued,
      generators: s.equipment.generators_permitted,
      flood_zone: s.flood?.zone ?? null, in_sfha: s.flood?.in_sfha ?? null,
      water_stress: s.water?.label ?? null,
      grid: s.grid?.status ?? 'pending',
    })),
  }, { pretty: false });

  const removed = [...prune('site'), ...prune('county'), ...prune('operator')];
  if (removed.length) {
    log(`pruned ${removed.length} page(s) for entries no longer in the dataset:`);
    for (const r of removed) log(`  - ${r}`);
  }

  log(`rendered ${db.sites.length} site pages, ${byCounty.size} county pages, ${byOp.size} operator pages`);
  return { sites: db.sites.length, counties: byCounty.size, operators: byOp.size, pruned: removed.length };
}

if (import.meta.url === `file://${process.argv[1]}`) render();
