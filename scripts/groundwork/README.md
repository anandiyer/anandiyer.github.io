# Groundwork pipeline

Collects US data-center disclosures, joins them to hazard and grid data, and
generates the static pages under `labs/groundwork/`.

## Run it

```bash
node scripts/groundwork/run-all.mjs               # full refresh
node scripts/groundwork/run-all.mjs --skip-pdfs   # skip the PDF pass (cached)
node scripts/groundwork/run-all.mjs --skip-tx     # skip the TCEQ browser scrape
node scripts/groundwork/07-monitor.mjs            # build the editorial review queue
```

`--skip-tx` skips only the browser scrape (`10`), not the Texas rebuild (`11`).
Change `lib/operators.mjs` and you must re-run the refresh even with `--skip-tx`,
because the brand list is applied to the cached Texas rows in `11`.

Then commit `labs/groundwork/`. GitHub Pages serves the generated HTML directly;
there is no server component and no database.

**This will not run inside a restricted sandbox.** It needs outbound access to
`deq.virginia.gov`, `hazards.fema.gov`, `services.arcgis.com`,
`geocoding.geo.census.gov`, `nominatim.openstreetmap.org` and `efts.sec.gov`.

## Steps

| Script | Layer | Tier produced |
|---|---|---|
| `01-va-deq.mjs` | VA DEQ issued data-center air permits | confirmed |
| `02-permit-details.mjs` | Street address, generator counts, stated locality, from permit PDFs | probable |
| `03-build-sites.mjs` | Rolls permits up into sites ("the join") | — |
| `04-enrich.mjs` | Geocode → FEMA flood zone, WRI Aqueduct, PJM queue, SEC EDGAR | confirmed / probable / directional |
| `06-reported.mjs` | Merges hand-curated reported-tier entries | reported |
| `05-render.mjs` | Generates every static page + the public dataset | — |
| `07-monitor.mjs` | RSS → editorial review queue (never publishes) | — |
| `09-echo-national.mjs` | EPA ECHO — air-permitted facilities in the other 49 states | confirmed |
| `10-tceq.mjs` | TCEQ New Source Review search, driven in a real browser | — |
| `11-tceq-sites.mjs` | Rolls the TCEQ scrape into Texas facilities | confirmed |

## Things that will bite you

- **VA DEQ is behind Akamai bot management.** `curl` is rejected; Node's `fetch`
  with a full browser header set is not. That is why everything goes through
  `lib/http.mjs`. Don't "simplify" it back to curl.
- **The permit listing has no street addresses.** They are mined from the permit
  PDFs, where the *facility* address is the one introduced by "located at" —
  the address in the letterhead is the permittee's corporate mail drop, often
  in another state. `lib/pdf.mjs` + the scoring in `02` exist for this reason.
- **16 of 201 permits are scanned images** with no text layer, so those sites
  publish at locality precision with the flood and water layers pending. That
  is intended behaviour, not a gap to paper over.
- **Every geocode is validated against the county the permit names** and
  discarded on mismatch. Loosening this will put pins in the wrong state.
- **The grid layer needs `PJM_API_KEY`** (free, from PJM Data Miner 2). Without
  it the layer stays `pending` rather than guessing.

## Adding a state

Write a collector that emits the same shape as `01-va-deq.mjs`
(`{ layer, source, source_url, permits: [...] }`) and add it to `run-all.mjs`.
Texas (TCEQ) is the intended next target; unlike Virginia it has no
data-center-specific listing, so it needs an SIC/NAICS filter over all air
permits.
