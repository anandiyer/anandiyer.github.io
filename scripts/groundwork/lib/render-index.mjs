import { esc, badge, fmtDate, head, foot, CORRECTION_BLOCK } from './render-parts.mjs';
import { slugify } from './util.mjs';

const countyName = (loc) => String(loc).replace(/\s*Co\.$/, ' County');

export function renderIndex(db) {
  const c = db.counts;
  const sites = db.sites;
  const totalGens = sites.reduce((a, s) => a + (s.equipment.generators_permitted || 0), 0);
  const counties = new Map();
  for (const s of sites) {
    const n = countyName(s.locality);
    const cur = counties.get(n) || { sites: 0, permits: 0, gens: 0, sfha: 0 };
    cur.sites++; cur.permits += s.permit.count; cur.gens += s.equipment.generators_permitted || 0;
    if (s.flood?.in_sfha) cur.sfha++;
    counties.set(n, cur);
  }
  const countyRows = [...counties.entries()].sort((a, b) => (b[1].sites - a[1].sites) || (b[1].gens - a[1].gens));
  const COUNTY_LIMIT = 20;
  const countyShown = countyRows.slice(0, COUNTY_LIMIT);
  const countyRest = countyRows.length - countyShown.length;
  const operators = new Map();
  for (const s of sites) {
    if (!s.operator.name) continue;
    const cur = operators.get(s.operator.name) || { sites: 0, gens: 0 };
    cur.sites++; cur.gens += s.equipment.generators_permitted || 0;
    operators.set(s.operator.name, cur);
  }
  const opRows = [...operators.entries()].sort((a, b) => b[1].sites - a[1].sites).slice(0, 12);

  const located = sites.filter((s) => s.geo && s.geo.lat);
  const stateCount = (db.coverage?.states || []).length;
  const vaSites = c.from_va_permits || 0;
  const natSites = c.from_epa_registry || 0;
  const sfhaSites = located.filter((s) => s.flood?.in_sfha);
  const txCount = sites.filter((s) => s.state === 'TX').length;
  const withNox = sites.filter((s) => s.emissions?.nox_tons_per_year);
  const justUnder = withNox.filter((s) => s.emissions.just_under_threshold);
  const atOrOver = withNox.filter((s) => s.emissions.nox_tons_per_year >= 100);
  const inSfha = located.filter((s) => s.flood?.in_sfha).length;
  const highWater = located.filter((s) => /^High|^Extremely High/.test(s.water?.label || '')).length;

  const asOf = db.coverage?.source_as_of?.VA || '';
  const updated = fmtDate((db.generated_at || '').slice(0, 10));

  /* Titled for the query this is actually built to answer: someone looking up
     what is permitted where they live. */
  const title = 'Data center permits by county — what operators actually filed | Groundwork';
  const desc = `What data center operators filed with air regulators, county by county: ${c.sites} sites in ${stateCount} states, ${totalGens.toLocaleString()} permitted backup generators. Every figure sourced.`;

  const extraCss = `    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />`;

  const body = `
            <section class="gw-hero" id="top">
                <div class="container mx-auto px-8">
                    <div class="gw-hero-content">
                        <span class="gw-eyebrow">[00] &nbsp; Canonical Labs &middot; Groundwork</span>
                        <h1 class="gw-title">What data centers are actually permitted in <em>your county</em>.</h1>
                        <p class="gw-subtitle">
                            There is a great deal of noise about data centers right now and very little that anyone can check. Groundwork reads the permits. For every county it tracks, it publishes what operators have actually filed with the regulator &mdash; how many sites, how many backup generators, how much they are permitted to emit &mdash; each figure sourced to the filing it came from. No press releases, and no panic.
                        </p>
                        {% include lab-share.html github_path="labs/groundwork" %}
                        <div class="gw-meta">
                            <div class="gw-meta-item"><span class="gw-meta-key">Sites tracked</span><span class="gw-meta-val">${c.sites}</span></div>
                            <div class="gw-meta-item"><span class="gw-meta-key">Issued permits</span><span class="gw-meta-val">${c.permits}</span></div>
                            <div class="gw-meta-item"><span class="gw-meta-key">Coverage</span><span class="gw-meta-val">${stateCount} states &middot; ${counties.size} counties</span></div>
                            <div class="gw-meta-item"><span class="gw-meta-key">Updated</span><span class="gw-meta-val">${esc(updated || '')}</span></div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="gw-tldr">
                <div class="container mx-auto px-8">
                    <div class="gw-tldr-intro">What the filings add up to, once somebody adds them up.</div>
                    <div class="gw-tldr-grid">
                        <div class="gw-tldr-item">
                            <div class="gw-stat"><em>${justUnder.length}</em><span class="gw-stat-unit">vs ${atOrOver.length}</span></div>
                            <div class="gw-tldr-label"><strong>Permits just under the line.</strong> ${justUnder.length} Virginia data center permits are written for 90&ndash;99.99 tons of NOx a year. Only ${atOrOver.length} reach 100 &mdash; the threshold that triggers major-source review.</div>
                        </div>
                        <div class="gw-tldr-item">
                            <div class="gw-stat">${totalGens.toLocaleString()}</div>
                            <div class="gw-tldr-label"><strong>Permitted backup generators.</strong> Counted from the text of individually unremarkable permits. No single filing discloses this total.</div>
                        </div>
                        <div class="gw-tldr-item">
                            <div class="gw-stat">${countyRows[0] ? countyRows[0][1].gens.toLocaleString() : '0'}</div>
                            <div class="gw-tldr-label"><strong>In ${esc(countyRows[0] ? countyRows[0][0] : '—')} alone.</strong> The densest county on record, and the reason the aggregate matters more than any one permit.</div>
                        </div>
                        <div class="gw-tldr-item">
                            <div class="gw-stat">${c.sites}</div>
                            <div class="gw-tldr-label"><strong>Sites tracked, in ${stateCount} states.</strong> ${vaSites} read permit-by-permit in Virginia; ${natSites} from EPA's national registry.</div>
                        </div>
                    </div>
                </div>
            </section>

            <div class="gw-subnav" id="gw-subnav">
                <div class="container mx-auto px-8">
                    <ul class="gw-subnav-list">
                        <li><a href="#find">Your county</a></li>
                        <li><a href="#threshold">The threshold</a></li>
                        <li><a href="#counties">All counties</a></li>
                        <li><a href="#confidence">Confidence</a></li>
                        <li><a href="#methodology">Methodology</a></li>
                    </ul>
                </div>
            </div>

            <section class="gw-scene" id="find">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[01]</span> Your county</div>
                    <h2 class="gw-scene-h2">Start with where you <em>live</em>.</h2>
                    <p class="gw-lede"><strong>Read the map as a floor, not a census.</strong> Coverage is uneven by design of the source, not by design of ours: air permitting is a state function, so there is no national permit list. The national layer is EPA's registry, where the industry code is self-reported &mdash; which is why Texas shows only ${txCount} facilities here despite being one of the largest data center markets in the country. An empty county means nobody has filed under a code we can see, never that nothing is there.</p>
                    <p class="gw-lede">Of the ${located.length} sites located precisely enough to check, ${sfhaSites.length} sit inside a FEMA Special Flood Hazard Area and ${highWater} draw from basins WRI rates high or extremely high for water stress. Virginia &mdash; the densest cluster on the map &mdash; has zero in a flood zone; its exposure is water.</p>

                    <div class="gw-finder">
                        <div class="gw-search-wrap">
                            <input id="gw-q" class="gw-dir-search" type="search" role="combobox"
                                   aria-expanded="false" aria-autocomplete="list" aria-controls="gw-ac"
                                   placeholder="Search a county, town, operator or address&hellip;" autocomplete="off" />
                            <ul id="gw-ac" class="gw-ac" role="listbox" hidden></ul>
                        </div>
                        <div class="gw-map-shell">
                            <div id="gw-map" role="application" aria-label="Map of tracked data center sites"></div>
                            <div class="gw-map-legend" id="gw-legend">
                                <span class="gw-legend-item"><i class="dot county"></i> County &mdash; click to zoom in</span>
                                <span class="gw-legend-item"><i class="dot site"></i> Site &mdash; verified location</span>
                                <span class="gw-legend-item"><i class="dot sfha"></i> In a FEMA flood zone</span>
                            </div>
                            <button type="button" id="gw-reset" class="gw-map-reset" hidden>Back to the US</button>
                        </div>
                        <div class="gw-panel" id="gw-panel">
                            <div class="gw-panel-head">
                                <span class="gw-panel-title" id="gw-panel-title">Zoom in or search to see sites</span>
                                <span class="gw-dir-count" id="gw-count"></span>
                            </div>
                            <div class="gw-rows" id="gw-rows"></div>
                        </div>
                    </div>
                    <p class="gw-note-navy">${sites.length - located.length} of ${sites.length} tracked sites have no verified coordinate and are deliberately absent from the map &mdash; placing them on a county centroid would imply a precision the permit does not support. They are all reachable through the search box above and through the county tables below.</p>
                </div>
            </section>

            <section class="gw-scene" id="counties">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[03]</span> Regional rollup</div>
                    <h2 class="gw-scene-h2">The aggregate nobody else <em>discloses</em>.</h2>
                    <p class="gw-lede">Permit-by-permit, a data center build-out looks routine. County-by-county, it looks like this. These totals exist only because someone added up hundreds of separately-published filings. Generator counts appear only for Virginia, where Groundwork reads the permit documents themselves.</p>
                    <div class="gw-table-wrap">
                    <table class="gw-table">
                        <thead><tr><th>Locality</th><th class="num">Sites</th><th class="num">Permits</th><th class="num">Generators permitted</th><th class="num">In flood zone</th></tr></thead>
                        <tbody>
                        ${countyShown.map(([n, v]) => `<tr><td><a href="/labs/groundwork/county/${slugify(n)}/">${esc(n)}</a></td><td class="num">${v.sites}</td><td class="num">${v.permits || '&mdash;'}</td><td class="num">${v.gens ? v.gens.toLocaleString() : '&mdash;'}</td><td class="num">${v.sfha || '&mdash;'}</td></tr>`).join('\n                        ')}
                        </tbody>
                    </table>
                    </div>
                    <p class="gw-note-navy">The ${COUNTY_LIMIT} densest of ${countyRows.length} counties. A dash in the permits or generators column means Groundwork has the facility from EPA's registry but has not yet read that state's permit documents &mdash; not that the facility is unpermitted.</p>

                    <h3 class="gw-method-k" style="margin-top:2.25rem">Every county tracked</h3>
                    <div class="gw-county-index">
                      ${countyRows.map(([n, v]) => `<a href="/labs/groundwork/county/${slugify(n)}/">${esc(n)} <span>${v.sites}</span></a>`).join('\n                      ')}
                    </div>
                </div>
            </section>

            <section class="gw-scene" id="threshold">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[03]</span> The threshold</div>
                    <h2 class="gw-scene-h2">Permits stop just short of the <em>line</em>.</h2>
                    <p class="gw-lede">Virginia air permits tabulate how much nitrogen oxide a facility may emit each year. At 100 tons a year a new source becomes a major source, which brings a stricter review and a public participation process. Of the ${withNox.length} data center permits where that figure is readable, here is where they land.</p>

                    <div class="gw-hist">
                      ${(() => {
                        const bands = [
                          { label: 'Under 25', lo: 0, hi: 25 },
                          { label: '25 – 50', lo: 25, hi: 50 },
                          { label: '50 – 75', lo: 50, hi: 75 },
                          { label: '75 – 90', lo: 75, hi: 90 },
                          { label: '90 – 99.99', lo: 90, hi: 100, hot: true },
                          { label: '100 and over', lo: 100, hi: Infinity },
                        ].map((b) => ({ ...b, n: withNox.filter((s) => s.emissions.nox_tons_per_year >= b.lo && s.emissions.nox_tons_per_year < b.hi).length }));
                        const max = Math.max(...bands.map((b) => b.n), 1);
                        return bands.map((b) => `<div class="gw-hist-row${b.hot ? ' hot' : ''}">
                          <span class="gw-hist-label">${b.label}</span>
                          <span class="gw-bar-track"><span class="gw-bar-fill" style="width:${Math.max(1, Math.round((b.n / max) * 100))}%"></span></span>
                          <span class="gw-bar-val">${b.n}</span>
                        </div>`).join('\n                      ');
                      })()}
                    </div>
                    <p class="gw-note-navy">Tons of NOx per year permitted, per facility. Read from the emissions table of each permit and labelled ${badge('probable')} &mdash; a figure parsed from a PDF, and a permitted ceiling rather than measured emissions.</p>

                    <div class="gw-twoup">
                      <div class="gw-plainly">
                        <span class="gw-plainly-label">What this is not</span>
                        <p>It is not evidence of wrongdoing. Designing a facility to stay under a regulatory threshold is lawful, ordinary engineering, and every industry does it. These are also <strong>backup</strong> generators &mdash; permitted to run during outages and for testing, typically tens of hours a year.</p>
                        <p>Groundwork takes no view on any individual application, and does not claim any single permit was sized to avoid scrutiny.</p>
                      </div>
                      <div class="gw-plainly alt">
                        <span class="gw-plainly-label">What it does show</span>
                        <p>The distribution is not what engineering need alone would produce. <strong>${justUnder.length} permits land in the last ten tons below the line; ${atOrOver.length} cross it.</strong> A threshold that was incidental would not bend the curve this hard.</p>
                        <p>Whatever else is true, the review process that 100 tons is meant to trigger is being triggered ${atOrOver.length} times, in the densest data center market on earth.</p>
                      </div>
                    </div>
                </div>
            </section>

            <section class="gw-scene" id="confidence">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[04]</span> Confidence</div>
                    <h2 class="gw-scene-h2">Which facts you can <em>lean on</em>.</h2>
                    <p class="gw-lede">There is no blended score. A single number would hide which inputs came from a filing and which came from a fuzzy match, and that difference is the product.</p>
                    <div class="gw-table-wrap">
                    <table class="gw-table">
                        <thead><tr><th>Tier</th><th>Means</th><th>Source</th></tr></thead>
                        <tbody>
                          <tr><td>${badge('confirmed')}</td><td>Read straight from a filing, or an exact point-in-polygon lookup</td><td>State air permits &middot; EPA registry &middot; FEMA NFHL &middot; WRI Aqueduct</td></tr>
                          <tr><td>${badge('probable')}</td><td>Matched on a non-unique key. Very likely right, not certain</td><td>Addresses and emissions read from permit PDFs</td></tr>
                          <tr><td>${badge('reported')}</td><td>Established by journalism, no filing yet. Upgrades automatically</td><td>Named publication, per entry</td></tr>
                          <tr><td>${badge('pending')}</td><td>Not collected yet. Never a claim that nothing is there</td><td>&mdash;</td></tr>
                        </tbody>
                    </table>
                    </div>
                </div>
            </section>

            <section class="gw-scene" id="methodology">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[05]</span> Methodology</div>
                    <h2 class="gw-scene-h2">How this is built, and where it is <em>weak</em>.</h2>
                    <div class="gw-method-grid">
                        <div class="gw-method-col">
                            <h3 class="gw-method-k">Sources</h3>
                            <ul class="gw-method-list">
                                <li><a href="https://www.deq.virginia.gov/news-info/shortcuts/permits/air/issued-air-permits-for-data-centers" target="_blank" rel="noopener">VA DEQ data center permits</a> &mdash; ${c.permits} permits, each PDF read for address, equipment and permitted NOx.</li>
                                <li><a href="https://echo.epa.gov/tools/web-services" target="_blank" rel="noopener">EPA ECHO</a> &mdash; ${natSites} facilities in other states, by industry code and operator name.</li>
                                <li><a href="https://hazards.fema.gov/femaportal/NFHL/" target="_blank" rel="noopener">FEMA NFHL</a> and <a href="https://www.wri.org/aqueduct?ref=canonicalcc" target="_blank" rel="noopener">WRI Aqueduct 4.0</a> &mdash; flood zone and water stress, by exact location.</li>
                            </ul>
                        </div>
                        <div class="gw-method-col">
                            <h3 class="gw-method-k">Limits</h3>
                            <ul class="gw-method-list">
                                <li><strong>A floor, not a census.</strong> Permitting is a state function. Depth varies by what each state publishes &mdash; every county page says which.</li>
                                <li><strong>Virginia is deepest by accident of disclosure</strong>, not importance. It is the only state with a data-center-specific permit list.</li>
                                <li><strong>Permits are ceilings, not measurements</strong>, and approval is not construction.</li>
                                <li><strong>${sites.length - located.length} sites have no verified coordinate</strong> and are off the map by choice. A county centroid would imply precision the filing does not support.</li>
                                <li><strong>${db.coverage?.national_excluded_unidentified ?? 0} facilities were excluded</strong> &mdash; they carry the data-processing industry code but nothing identifies them as data centers.</li>
                            </ul>
                        </div>
                    </div>
                    ${CORRECTION_BLOCK}
                </div>
            </section>

            <p class="gw-disclaimer">Groundwork compiles US public disclosures. Not investment advice, not a flood model, and not a substitute for a site-specific engineering or insurance assessment. Confidence tiers describe how a fact was established, not how severe a risk is. <a href="/labs/groundwork/data/sites.json">Download the dataset</a>.</p>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="/labs/groundwork/app.js?v={{ site.asset_version }}" defer></script>`;

  return head({ title, description: desc, canonical: 'https://www.canonical.cc/labs/groundwork/', extraCss }) + body + foot;
}
