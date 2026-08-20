# Groundwork — Product Requirements Document

**Status:** Draft v1, assembled from a design conversation — treat as a first pass, not a finished spec. See "Open questions" before building.
**Owner:** Anand Iyer, Canonical
**Target home:** canonical.cc/labs/groundwork

> **Build note (added during implementation).** Three §13 questions were resolved
> before building: the reported tier ships at launch; data acquisition pushed
> for the full VA DEQ ingest; and Groundwork lives inside the existing
> canonical.cc Jekyll repo as generated static HTML rather than as a separate
> Next.js/Supabase app (§11 assumed infrastructure canonical.cc does not use).
> Two §5 assumptions turned out to be wrong against real data and are corrected
> in `scripts/groundwork/README.md`: VA DEQ permits carry a *locality*, not an
> address, and the address that does appear in a permit PDF is usually the
> permittee's corporate mail drop rather than the facility.

---

## 1. What this is

Groundwork is a public, permanently-indexed directory of AI data center sites in the US, scored on flood exposure, water stress, and grid interconnection status — sourced entirely from mandatory public disclosures (state air permits, FEMA flood data, ISO interconnection queues, SEC filings), not from company press releases or announcements.

**Tagline:** "The AI buildout, minus the press release."

**What it is not:**
- Not a live hydrodynamic simulation or "digital twin" in the technical sense (see §10). FEMA flood zones are pre-computed lookups, not something Groundwork simulates.
- Not a proprietary flood model — Fathom, First Street, and Climate Central already do this better than a v1 could. Groundwork consumes public hazard data, it doesn't generate it.
- Not a capex/buildout aggregator — that lane (Value Add VC's AI Buildout Tracker, usdatamap.com) is occupied and isn't defensible, since it's built from announcements, not disclosure.
- Not a site-selection tool for developers (that's Build.inc's lane) — Groundwork is aimed at people evaluating a site *after* it's been proposed or financed, not people choosing where to build.

## 2. Problem and why now

- Over $690B has been committed to US AI data center construction. A growing body of industry research (see Appendix C) argues climate risk is currently underpriced in how that capital is deployed — flood and water exposure are treated as secondary to power and land cost in site selection and underwriting.
- Site-level opposition is now a weekly event across dozens of counties — moratoriums, permit fights, air-quality investigations (Sierra Club found ~10,500 permitted generators clustered in Northern Virginia alone; Floodlight mapped similar patterns in Texas). Communities and journalists currently reconstruct this by hand from permit portals.
- No existing tool joins the four things that actually determine whether a site is a good bet: where it is (permit), what it's built on (flood/water), how it connects to power (grid queue), and who's actually behind it (capex/filings). Existing tools each do one piece:

| Existing tool | Covers | Gap |
|---|---|---|
| Value Add VC AI Buildout Tracker | Capex, jobs, power, site count | Press-release sourced, no risk layer |
| usdatamap.com | Facility locations | No risk scoring |
| Fathom / First Street / Climate Central | Flood/climate risk modeling | No data-center context, sold generically |
| Build.inc | Fuses flood, utility, interconnection data | Paid, sold to developers picking sites — not public |
| **Public Evidence Project** (publicevidence.org) | Parcel-level permit crosswalk, confidence-staged | **Closest precedent found.** Permits only — no flood/water/grid overlay, no finance framing. Read before building. |
| Piedmont Environmental Council web map | VA generator locations for advocacy | Virginia-only, not disclosure-joined beyond permits |

## 3. Goals and non-goals

**Goals:**
- Publish one permanently-indexed page per site, each fact sourced and confidence-labeled.
- Serve lenders/insurers/LPs evaluating financing risk as the primary audience, with journalists and community groups as a real secondary audience.
- Be mechanically self-updating on the disclosure layers (permits, FEMA, queue, filings) with minimal editorial burden.

**Non-goals (explicitly, so scope doesn't creep):**
- Do not build a proprietary flood or climate model.
- Do not try to out-aggregate Value Add VC on capex/jobs/power headline stats.
- Do not present as a neutral community-advocacy tool and an institutional underwriting tool at the same time without picking a primary voice (see §13).

## 4. Users and core jobs

| User | Job to be done |
|---|---|
| Construction/project-debt lenders, BDCs | Independent pre-underwriting screen on a specific site's flood/water/grid exposure |
| LPs evaluating AI-infra-exposed funds | Aggregate exposure check across a manager's disclosed pipeline |
| Insurers/reinsurers | External benchmark against the insured's own risk submission |
| Journalists/analysts | Citable starting point instead of manual permit-portal reconstruction |
| Community members/advocacy groups | "Is anything near me" discovery, with sourced facts to cite |
| Canonical (internal) | Fund II LP artifact, deal diligence tool, recurring content engine |

## 5. Data model — "the join"

Every site is one row anchored to a spine record, with four layers attached at different confidence levels because the source keys don't match cleanly across datasets.

| Layer | Source | Match type | Confidence tier |
|---|---|---|---|
| Spine (address, operator, capacity) | State air permit | Direct (permit has an address) | Confirmed |
| Flood zone | FEMA NFHL | Exact geo (point-in-polygon) | Confirmed |
| Water stress | WRI Aqueduct / state water board | Exact geo | Confirmed |
| Grid queue position | ISO/RTO interconnection filing | County + utility, fuzzy | Probable |
| Capex/operator confirmation | SEC EDGAR full-text search | Region + name, fuzzy | Directional |
| News/status | Local/trade press | Manually matched | **Reported** (new tier — see §9.2) |

Each field on a site page carries its own confidence badge and citation. No blended single risk score — a blended score would hide which parts are verified and which are best guesses, and that's the difference between a tool that survives scrutiny and one that gets one wrong match publicized and dismissed wholesale.

## 6. Data sources and collection plan

| Source | Access method | MVP states | Refresh cadence | Notes |
|---|---|---|---|---|
| State air permits | Scraped HTML / downloaded PDF | VA, TX, GA, WA to start | Monthly | **VA DEQ maintains a dedicated data-center permit listing (deq.virginia.gov) — highest-priority, easiest ingestion.** TX via TCEQ (Floodlight's approach is a usable model). GA via EPD. |
| FEMA flood zone | ArcGIS REST API (NFHL) | National | Quarterly | Free, no scraping needed |
| Water stress | WRI Aqueduct dataset | National | ~Annual | Static dataset download |
| Grid interconnection queue | ISO/RTO bulk CSV/Excel | PJM (covers VA), ERCOT (TX), depends on region | Monthly | No unified national source — pull per-ISO |
| Capex/operator confirmation | SEC EDGAR full-text search API | National | Weekly | Free API, efts.sec.gov |
| News/status | Manual curation + RSS monitoring | Wherever a story breaks | Daily, human-reviewed | Not automatable at MVP — see §13 |

**Infrastructure requirement:** collection jobs need outbound network access to fema.gov, state .gov permit portals, ISO/RTO sites, and sec.gov. If the build environment has restricted egress (as this chat's sandbox does), this needs to run as a separate scheduled job outside that restriction — do not assume a locked-down dev sandbox can run this pipeline as-is.

## 7. MVP scope

Target ~100–150 sites at launch, concentrated in Virginia, Texas, Georgia, Ohio, and Arizona — the states with the most mature public permit access. Do not attempt full national coverage before the join logic and confidence-labeling are validated against real data at this smaller scale. See Appendix A for a real (partial, honestly incomplete) seed set gathered manually during this spec's research.

## 8. Site page spec

Each site page includes:
- Address, operator, project status pill
- Pipeline stage (Proposed → Filed → Approved → Under construction → Operational) — not a single status snapshot
- Four score cards: air permit, grid connection, flood zone, water stress — each with its confidence tier
- "What the operator says" section — public claims (capacity, cooling tech, water usage) kept visibly separate from independently-verified facts
- Activity timeline — chronological, dated entries (permit filed, council hearing, press coverage)
- Sources list — every fact links to its underlying filing or article
- Correction/dispute path — visible, since fuzzy-matched fields (grid queue, capex) will sometimes be wrong

## 9. Other pages

### 9.1 Landing page
Centered search bar + "browse by map" toggle, one-line description, live stat strip (sites tracked / states / last updated), footer badges naming the three source categories. Keep it minimal — this is a utility, not a marketing site.

### 9.2 Search behavior, including partial/empty states
Two entry paths: search (for someone who knows an address, operator, or city) and a clickable US map (for someone who doesn't — this is the primary path for the community audience). A search can resolve to a site with no disclosure-layer data yet but real news coverage — handle this explicitly as the **reported** tier: address confirmed via journalism, permit/FEMA/grid layers shown as pending, page upgrades automatically once a real filing appears. Do not suppress a result just because the disclosure pipeline hasn't caught up — that's often the moment it's most useful.

### 9.3 Regional rollup
Aggregate view by county/metro — cumulative permitted capacity, generator count, site count. This is the one feature that produces information nobody else discloses in aggregate (the Sierra Club's Northern Virginia number only exists because someone added up hundreds of individually unremarkable filings). Prioritize this over polish elsewhere.

### 9.4 Operator profile
Every tracked site under one developer/operator, one click away.

## 10. Design reference

Three screens were mocked up during this spec's development (landing page, search result card, activity timeline). These are layout and content-hierarchy references, not final visual design — the CSS in the working mockups uses Claude's internal design-token system and won't port directly; treat them as wireframes describing what fields exist and how they're grouped, not as production code. Use the frontend-design skill for actual visual direction during build.

Key layout decisions to preserve:
- Confidence badges are always paired with their source citation, never shown alone
- "What the operator says" is a visually distinct block from verified data, not interleaved
- Pipeline stage is a sequence, not a single pill
- The activity timeline has a visually distinct "pending/next" final entry from the past events

## 11. Suggested tech stack

- Next.js or Astro on Vercel — matches existing canonical.cc infrastructure
- Postgres (Supabase) — one denormalized `sites` table, joins pre-computed at ETL time, not query time
- Mapbox GL or Leaflet for the map view
- Scheduled ETL as a separate worker (Vercel Cron works for lightweight jobs; anything hitting rate-limited state portals may need a longer-running job elsewhere — e.g., the Mac Mini infrastructure already in use for other projects)
- FEMA NFHL lookups can be done live at request time (cheap, stable API); everything else is pre-collected

## 12. Success metrics

- Indexed pages generating organic search/citation traffic
- Inbound links from journalism/trade press covering data center siting
- Direct reference in LP conversations or diligence calls
- Lender/insurer inquiries about structured data access (potential future paid tier)

## 13. Risks and open questions — resolve before building

- **Dual-audience tension.** The same page reads as "price this risk into your loan" to a lender and "here's what's coming to your town" to a resident. Pick a primary voice (recommendation: institutional/underwriting, given Canonical's audience) and let the civic use be a real but secondary effect — don't try to be neutral between the two, that reads as evasive to both.
- **Fuzzy-match errors will happen.** Grid queue and capex matches are directional, not confirmed. Need a visible, easy correction path before this gets real traffic, or one publicized wrong match undermines the confirmed layers too.
- **News timeline doesn't scale as designed.** Matching a news event to a site record is manual editorial work, which cuts against the "no editorial maintenance" principle the rest of the design is built on. Decide explicitly: in scope for launch, or phase 2 once the disclosure-only version is proven.
- **Relationship exposure.** The companies this makes uncomfortable — Microsoft, Amazon, Google, Meta, the Stargate consortium — are also counterparties in the compute-financing relationships Canonical is building. Worth being a deliberate choice, not an accidental one.
- **Public Evidence Project overlap.** Read their actual coverage and methodology before building the permit-matching layer — there may be a partnership or data-sharing conversation worth having instead of parallel construction.

## 14. Phased roadmap

1. **Seed discovery** — pull VA DEQ's dedicated data-center permit list (highest-value, easiest first target) plus TX TCEQ; geocode.
2. **FEMA overlay** — point-in-polygon lookup per site.
3. **Water stress + grid queue** — WRI Aqueduct overlay; PJM/ERCOT queue fuzzy-match.
4. **Site page generation** — Next.js pages off the denormalized table, one per site.
5. **Regional rollup + operator profile** — the two features that create genuinely new information.
6. **News/reported tier** — manual curation workflow, scoped deliberately (see §13).

---

## Appendix A: Real seed data (partial, manually gathered — not exhaustive)

| Site | Address | Operator | Status | Notes |
|---|---|---|---|---|
| CloudHQ LC8 | 22190 Loudoun County Pkwy, Ashburn, VA 20147 | CloudHQ | Confirmed, 96MW | Address and capacity confirmed via county permit record |
| Hayden Data Center | Loudoun County, VA (exact address not yet resolved) | Unconfirmed | Confirmed permit | Permit lists 150+ diesel generators |
| Stargate Abilene | Abilene, TX (campus-level, exact address not yet resolved) | OpenAI/SoftBank/Oracle/MGX consortium | Confirmed, under construction | 62 diesel generators + 10 gas turbines per Floodlight reporting |
| Vantage data center | Outside San Antonio, TX (exact address not yet resolved) | Vantage | Confirmed permit | Permitted at 99.8 tons/year NOx — just under the 100-ton public-review threshold |
| Innovation campus (proposed) | 415 20th St, Oakland, CA | Behring Companies | Proposed, pending council — no permit filed | Reported tier only; reuses ~20MW former LBNL infrastructure |

## Appendix B: Working-backwards press release

See `press-release.md` in this folder.

## Appendix C: Supporting research referenced in this spec

- Industry report on data center drought/flood exposure and underpriced climate risk (smartwatermagazine.com, June 2026)
- Sierra Club investigation, ~10,500 permitted generators in Northern Virginia
- Floodlight investigation, Texas data center air permits
- Virginia Mercury / InsideNoVa reporting on VA DEQ's new public data-center permit page (177 permits as of analysis)
- KQED, The Oaklandside, SFist coverage of the 415 20th St, Oakland proposal
