/* What each state actually publishes.

   Coverage depth varies enormously by state, and the reason is regulatory, not
   technical. Rather than let a thin state read as Groundwork being incomplete,
   every county page states what its state publishes and what was tested.

   Each entry records routes actually attempted against live sources, so the
   claim "this is as far as the disclosure goes" is checkable rather than an
   excuse. Add a state here when its collector lands, or when someone
   establishes that no usable source exists. */

export const DEFAULT_REGIME = {
  depth: 'registry',
  summary: 'Groundwork has this state’s facilities from EPA’s national air-permit registry, but has not yet read the state’s own permit documents. Generator counts and permitted emissions therefore show as pending.',
  tested: [],
};

export const REGIMES = {
  VA: {
    depth: 'permit',
    summary: 'Virginia is the only state that publishes a data-center-specific air permit list, with the issuance document for every permit. That is why Virginia pages carry permit counts, generator counts and permitted NOx, and most other states do not.',
    tested: [
      { source: 'VA DEQ — Issued Air Permits for Data Centers', result: 'in use', detail: '201 permits, each with its issuance PDF, read for address, equipment and permitted emissions.' },
    ],
  },
  TX: {
    depth: 'registry',
    summary: 'Texas is the largest gap in this dataset, and the reason is what Texas publishes rather than what Groundwork collects. No Texas source found so far identifies data centers at facility level in a machine-readable form. The counts here are a floor and understate the state substantially.',
    tested: [
      {
        source: 'ERCOT large-load interconnection queue',
        result: 'unusable for local data',
        detail: 'The queue holding the roughly 1,800 projects paused by the governor in August 2026 is published only as a statewide aggregate, largely as chart images in a monthly PDF. It carries no county breakdown, so it cannot answer a question about a specific place.',
      },
      {
        source: 'TCEQ air permit search (New Source Review)',
        result: 'not machine-readable',
        detail: 'An interactive ColdFusion application rather than a dataset. It is session-bound, serves different content to automated clients, and returns a server error for programmatic queries.',
      },
      {
        source: 'TCEQ Point Source Emissions Inventory, RY2024',
        result: 'data centers essentially absent',
        detail: 'A 53MB site-level inventory covering roughly 2,000 large industrial sites. Searching it for the major data center operators returns almost nothing — two mentions of Microsoft, two of Equinix, one of CyrusOne, and none at all for Amazon, Vantage, Digital Realty or QTS. Data center backup generators appear to fall below its reporting thresholds or to be authorised under standard permits that generate no entry.',
      },
    ],
  },
};

export const regimeFor = (state) => REGIMES[state] || DEFAULT_REGIME;
