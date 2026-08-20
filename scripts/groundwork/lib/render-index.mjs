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
  const inSfha = located.filter((s) => s.flood?.in_sfha).length;
  const highWater = located.filter((s) => /^High|^Extremely High/.test(s.water?.label || '')).length;

  const asOf = db.coverage?.source_as_of?.VA || '';
  const updated = fmtDate((db.generated_at || '').slice(0, 10));

  const title = 'Groundwork — the AI buildout, minus the press release | Canonical Labs';
  const desc = `A public directory of ${c.sites} US AI data center sites, scored on flood exposure, water stress and grid status — built from mandatory public disclosures, not company announcements.`;

  const extraCss = `    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />`;

  const body = `
            <section class="gw-hero" id="top">
                <div class="container mx-auto px-8">
                    <div class="gw-hero-content">
                        <span class="gw-eyebrow">[00] &nbsp; Canonical Labs &middot; Groundwork</span>
                        <h1 class="gw-title">The AI buildout, minus the <em>press release</em>.</h1>
                        <p class="gw-subtitle">
                            Over $690B has been committed to US AI data center construction, and flood, water and grid exposure are still priced as secondary to power and land. Groundwork is a permanently-indexed record of where these sites actually are and what they are built on &mdash; assembled from EPA's national air-permit registry, Virginia's permit-level disclosures, FEMA flood maps, WRI Aqueduct and SEC filings. Every fact carries its own confidence tier and its own citation. Nothing here comes from a company announcement.
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
                    <div class="gw-tldr-intro">What the disclosures add up to.</div>
                    <div class="gw-tldr-grid">
                        <div class="gw-tldr-item">
                            <div class="gw-stat"><em>${totalGens.toLocaleString()}</em></div>
                            <div class="gw-tldr-label"><strong>Permitted generators.</strong> Counted from the text of individually unremarkable permits. No single filing discloses this total.</div>
                        </div>
                        <div class="gw-tldr-item">
                            <div class="gw-stat">${c.permits}</div>
                            <div class="gw-tldr-label"><strong>Issued air permits.</strong> Across ${c.sites} distinct facilities &mdash; campuses are permitted in phases, so permits outnumber sites.</div>
                        </div>
                        <div class="gw-tldr-item">
                            <div class="gw-stat"><em>${sfhaSites.length}</em></div>
                            <div class="gw-tldr-label"><strong>Sit in a FEMA flood zone.</strong> Including Equinix in Hudson County NJ and two Microsoft campuses in Cheyenne. None of them are in Virginia.</div>
                        </div>
                        <div class="gw-tldr-item">
                            <div class="gw-stat">${highWater}<span class="gw-stat-unit">/${located.length}</span></div>
                            <div class="gw-tldr-label"><strong>In high water-stress basins.</strong> Of the sites located precisely enough to check. Flood is not Virginia's exposure &mdash; water is.</div>
                        </div>
                    </div>
                </div>
            </section>

            <div class="gw-subnav" id="gw-subnav">
                <div class="container mx-auto px-8">
                    <ul class="gw-subnav-list">
                        <li><a href="#find">Find a site</a></li>
                        <li><a href="#counties">Counties</a></li>
                        <li><a href="#operators">Operators</a></li>
                        <li><a href="#confidence">Confidence</a></li>
                        <li><a href="#methodology">Methodology</a></li>
                    </ul>
                </div>
            </div>

            <section class="gw-scene" id="find">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[01]</span> Find a site</div>
                    <h2 class="gw-scene-h2">Start with a <em>place</em>.</h2>
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
                    <p class="gw-note-navy">The ${COUNTY_LIMIT} densest of ${countyRows.length} counties. A dash in the permits or generators column means Groundwork has the facility from EPA's registry but has not yet read that state's permit documents &mdash; not that the facility is unpermitted. The remaining counties are reachable from the map above, or from any site page.</p>
                </div>
            </section>

            <section class="gw-scene" id="operators">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[04]</span> Operators</div>
                    <h2 class="gw-scene-h2">Who is actually <em>behind</em> them.</h2>
                    <p class="gw-lede">Data center permits are routinely held by single-purpose LLCs named after the parcel. Resolving those to an operator is the most useful join here and the easiest place to be confidently wrong, so each attribution carries its own tier and its documentary basis.</p>
                    <div class="gw-table-wrap">
                    <table class="gw-table">
                        <thead><tr><th>Operator</th><th class="num">Sites</th><th class="num">Generators permitted</th></tr></thead>
                        <tbody>
                        ${opRows.map(([n, v]) => `<tr><td><a href="/labs/groundwork/operator/${slugify(n)}/">${esc(n)}</a></td><td class="num">${v.sites}</td><td class="num">${v.gens ? v.gens.toLocaleString() : '&mdash;'}</td></tr>`).join('\n                        ')}
                        </tbody>
                    </table>
                    </div>
                    <p class="gw-note-navy" style="margin-top:0.9rem">${sites.filter((s) => !s.operator.name).length} sites are held by entities Groundwork could not resolve to a parent. They are published as unresolved rather than guessed.</p>
                </div>
            </section>

            <section class="gw-scene" id="confidence">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[05]</span> Confidence</div>
                    <h2 class="gw-scene-h2">Which facts you can <em>lean on</em>.</h2>
                    <p class="gw-lede">There is no blended Groundwork risk score, and there will not be one. A single number would hide which inputs came from a filing and which came from a fuzzy match &mdash; and that difference is the whole product.</p>
                    <div class="gw-evidence-grid">
                        <div class="gw-ev confirmed"><div class="gw-ev-head"><span class="gw-ev-key">Tier</span>${badge('confirmed')}</div><div class="gw-ev-val">Read from a filing</div><p class="gw-ev-basis">The permit record, and any exact point-in-polygon lookup against it (FEMA zone, Aqueduct basin). Directly checkable against the linked source.</p><div class="gw-ev-cite">State air permits &middot; FEMA NFHL &middot; WRI Aqueduct</div></div>
                        <div class="gw-ev probable"><div class="gw-ev-head"><span class="gw-ev-key">Tier</span>${badge('probable')}</div><div class="gw-ev-val">Matched on a non-unique key</div><p class="gw-ev-basis">Street addresses mined from permit prose, generator counts, grid queue positions matched by county. Very likely right; not certain.</p><div class="gw-ev-cite">Permit PDFs &middot; ISO/RTO queues</div></div>
                        <div class="gw-ev directional"><div class="gw-ev-head"><span class="gw-ev-key">Tier</span>${badge('directional')}</div><div class="gw-ev-val">A pointer, not a fact</div><p class="gw-ev-basis">SEC full-text hits on an operator and locality. Confirms a public filer discusses the area; not that the filing concerns this site.</p><div class="gw-ev-cite">SEC EDGAR full-text search</div></div>
                        <div class="gw-ev reported"><div class="gw-ev-head"><span class="gw-ev-key">Tier</span>${badge('reported')}</div><div class="gw-ev-val">Established by journalism</div><p class="gw-ev-basis">A site that news coverage has established but that no filing yet documents. Published with the disclosure layers pending, and upgraded automatically when a permit appears.</p><div class="gw-ev-cite">Named publication, per entry</div></div>
                    </div>
                </div>
            </section>

            <section class="gw-scene" id="methodology">
                <div class="container mx-auto px-8">
                    <div class="gw-section-label"><span class="gw-section-num">[06]</span> Methodology</div>
                    <h2 class="gw-scene-h2">How this is built, and where it is <em>weak</em>.</h2>
                    <div class="gw-method-grid">
                        <div class="gw-method-col">
                            <h3 class="gw-method-k">Sources</h3>
                            <ul class="gw-method-list">
                                <li><a href="https://echo.epa.gov/tools/web-services" target="_blank" rel="noopener">EPA ECHO</a> &mdash; the national air-permit facility registry. ${natSites} facilities outside Virginia, identified as data centers by name or by a recognised operator, each with an EPA-published address and coordinate.</li>
                                <li><a href="https://www.deq.virginia.gov/news-info/shortcuts/permits/air/issued-air-permits-for-data-centers" target="_blank" rel="noopener">VA DEQ &mdash; Issued Air Permits for Data Centers</a>, as published ${esc(asOf)}. ${c.permits} permits, each with its issuance document &mdash; the only state publishing a data-center-specific list.</li>
                                <li><a href="https://hazards.fema.gov/femaportal/NFHL/" target="_blank" rel="noopener">FEMA National Flood Hazard Layer</a> &mdash; point-in-polygon against the effective map.</li>
                                <li><a href="https://www.wri.org/aqueduct?ref=canonicalcc" target="_blank" rel="noopener">WRI Aqueduct 4.0</a> &mdash; baseline annual water stress by basin.</li>
                                <li><a href="https://efts.sec.gov/LATEST/search-index?q=%22data%20center%22" target="_blank" rel="noopener">SEC EDGAR full-text search</a> &mdash; operator and locality mentions in 10-K, 10-Q and 8-K filings.</li>
                                <li>ISO/RTO interconnection queues &mdash; PJM for Virginia.</li>
                            </ul>
                        </div>
                        <div class="gw-method-col">
                            <h3 class="gw-method-k">Known limitations</h3>
                            <ul class="gw-method-list">
                                <li><strong>Coverage is a floor, not a census.</strong> Air permitting is a state function; no national permit list exists. The national layer comes from EPA's registry, where the NAICS industry code is self-reported, so whole markets are under-represented &mdash; Texas most obviously. Counting sites per state here measures disclosure practice as much as build-out.</li>
                                <li><strong>Two spines, different depth.</strong> Virginia is built permit-by-permit from VA DEQ, so those pages carry issuance dates, programs, generator counts and a PDF per permit. Everywhere else is facility-level from EPA, so permit detail and equipment counts show as pending. Each page states which spine it came from.</li>
                                <li><strong>${db.coverage?.national_excluded_unidentified ?? 0} facilities were deliberately excluded.</strong> They carry the data-processing NAICS code but nothing in the record &mdash; not the name, not a recognisable operator &mdash; identifies them as data centers. Publishing them as data centers on a self-reported code alone would be a guess.</li>
                                <li><strong>DEQ publishes locality, not addresses.</strong> Street addresses are recovered from the text of permit PDFs and are ${badge('probable')} at best. ${sites.filter((s) => !s.address.street).length} sites have no address &mdash; usually because the permit is a scanned image with no text layer.</li>
                                <li><strong>Geocodes are validated, and some are rejected.</strong> An address in a permit is frequently the operator's corporate mailing address, not the facility. Any geocode landing in a different county from the one the permit names is discarded rather than published.</li>
                                <li><strong>Generator counts are read from prose.</strong> Permits describe equipment in sentences and tables. Treat the count as the permitted maximum described, not an installed count.</li>
                                <li><strong>The grid layer is mostly pending.</strong> PJM retired its public bulk queue download; the layer is wired for Data Miner 2 and stays silent until a feed is configured. A wrong queue match is the fastest way to discredit the layers that are right.</li>
                                <li><strong>Permits are not operations.</strong> An issued permit establishes approval, not that anything is built or running. The pipeline ladder on each page stops at Approved for that reason.</li>
                            </ul>
                        </div>
                    </div>
                    ${CORRECTION_BLOCK}
                </div>
            </section>

            <section class="gw-cta">
                <div class="container mx-auto px-8">
                    <div class="gw-cta-grid">
                        <div>
                            <h2 class="gw-cta-h2">Built by <em>Canonical</em>.</h2>
                            <p class="gw-cta-p">Groundwork is written for the people pricing this build-out &mdash; project-debt lenders, insurers and LPs with AI-infrastructure exposure &mdash; and is deliberately public so the communities living next to these sites can use the same record. If you are underwriting a site and want the structured data behind a page, or you think a field here is wrong, get in touch.</p>
                            <div class="gw-cta-actions">
                                <a class="gw-btn" href="mailto:ai@canonical.cc?subject=Groundwork">Email us <span class="gw-btn-arrow">&rarr;</span></a>
                                <a class="gw-btn" href="/labs/groundwork/data/sites.json">Download the dataset <span class="gw-btn-arrow">&darr;</span></a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <p class="gw-disclaimer">Groundwork compiles US public disclosures. It is not investment advice, not a flood model, and not a substitute for a site-specific engineering or insurance assessment. Confidence tiers describe how a fact was established, not how severe a risk is.</p>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="/labs/groundwork/app.js?v={{ site.asset_version }}" defer></script>`;

  return head({ title, description: desc, canonical: 'https://canonical.cc/labs/groundwork/', extraCss }) + body + foot;
}
