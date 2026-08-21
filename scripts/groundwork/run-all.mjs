/* Full Groundwork refresh, in dependency order.

   Intended to run as a scheduled job on a machine with ordinary outbound
   network access — not inside a restricted build sandbox (PRD §6). The state
   portals are rate-limited and the permit PDFs are cached on disk, so a
   routine re-run is mostly cheap: only new permits are downloaded.

   Cadence, per source:
     VA DEQ listing + permit PDFs   monthly
     FEMA NFHL / WRI Aqueduct       quarterly (re-run only for new sites)
     SEC EDGAR                      weekly
     News monitor                   daily, output reviewed by a human

   Usage:  node scripts/groundwork/run-all.mjs [--no-edgar] [--skip-pdfs] [--skip-tx]
*/

import { log } from './lib/util.mjs';

const args = new Set(process.argv.slice(2));

const step = async (name, fn) => {
  const t = Date.now();
  log(`▶ ${name}`);
  await fn();
  log(`✓ ${name} (${Math.round((Date.now() - t) / 1000)}s)`);
};

await step('collect VA DEQ permit listing', async () => {
  const m = await import('./01-va-deq.mjs'); await m.collect();
});

if (!args.has('--skip-pdfs')) {
  await step('mine permit PDFs for addresses and equipment', async () => {
    const m = await import('./02-permit-details.mjs'); await m.collect();
  });
}

/* 09/10/11 were added after this orchestrator and were never wired into it,
   so until August 2026 a "full refresh" quietly rebuilt the national spine and
   Texas from whatever raw JSON happened to be on disk. Refreshing Virginia
   while leaving 38 other states frozen is the kind of staleness that shows up
   as a wrong number on a live page, not as an error. */
await step('collect EPA ECHO national spine', async () => {
  const m = await import('./09-echo-national.mjs'); await m.collect();
});

/* The TCEQ scrape drives an interactive application in a real browser at one
   query per six seconds, so it is opt-out rather than automatic. `11` is pure
   reprocessing of the cached scrape and always runs — it is also where the
   operator brand list is applied to Texas, so it must run after any change to
   `lib/operators.mjs`, scrape or no scrape. */
if (!args.has('--skip-tx')) {
  await step('scrape TCEQ air permit search (browser)', async () => {
    const m = await import('./10-tceq.mjs'); await m.collect();
  });
}

await step('turn the TCEQ scrape into Texas facilities', async () => {
  const m = await import('./11-tceq-sites.mjs'); m.build();
});

/* California issues no state air permits — its thirty-five local districts do —
   so the statewide surface is CARB's emissions inventory rather than a permit
   listing. One paced pass over CARB, no browser required. */
await step('collect California air district facilities (CARB)', async () => {
  const m = await import('./12-carb-ca.mjs'); await m.collect();
});

await step('assemble site records (the join)', async () => {
  const m = await import('./03-build-sites.mjs'); m.build();
});

await step('attach hazard, grid and filing layers', async () => {
  const m = await import('./04-enrich.mjs'); await m.enrich({ skipEdgar: args.has('--no-edgar') });
});

await step('merge curated reported-tier entries', async () => {
  const m = await import('./06-reported.mjs'); m.merge();
});

await step('render static pages', async () => {
  const m = await import('./05-render.mjs'); m.render();
});

log('done — commit labs/groundwork/ to publish');
