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

   Usage:  node scripts/groundwork/run-all.mjs [--no-edgar] [--skip-pdfs]
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
