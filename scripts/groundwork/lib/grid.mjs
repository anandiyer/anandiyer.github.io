/* Layer: GRID INTERCONNECTION QUEUE — `probable` tier when present.

   There is no unified national interconnection queue; each ISO/RTO publishes
   its own, and matching a queue position to a permitted site is inherently
   fuzzy (the queue is keyed by county + utility + point of interconnection,
   never by air-permit registration number).

   Status of the sources as of this build:
     PJM (covers Virginia) — the old bulk XLSX at pjm.com/pub/planning has been
       retired; queue data now comes from Data Miner 2, which requires a free
       subscription key. Set PJM_API_KEY to enable this layer.
     ERCOT (covers Texas) — public GIS report, no key, wired for the TX pass.

   When no key/source is configured we emit an explicit `pending` layer rather
   than guessing. A wrong queue match is the single most likely way for this
   project to get one bad fact publicised, so the default is silence. */

import { getJSON } from './http.mjs';

const PJM_DATAMINER = 'https://api.pjm.com/api/v1/new_service_queues';

export function pendingLayer(reason) {
  return {
    status: 'pending',
    confidence: 'pending',
    label: 'Not yet matched',
    note: reason,
    source: 'ISO/RTO interconnection queue',
  };
}

export async function pjmQueue({ county, state = 'VA' } = {}) {
  const key = process.env.PJM_API_KEY;
  if (!key) {
    return pendingLayer('PJM Data Miner 2 API key not configured (set PJM_API_KEY). PJM retired the public bulk queue download, so no interconnection match is asserted for this site.');
  }
  const q = new URLSearchParams({
    rowCount: '50', startRow: '1', format: 'json',
    state, county: String(county || '').replace(/\s+(County|Co\.?)$/i, ''),
  });
  try {
    const r = await getJSON(`${PJM_DATAMINER}?${q}`, { headers: { 'Ocp-Apim-Subscription-Key': key, Accept: 'application/json' } });
    const items = r?.items || [];
    if (!items.length) return pendingLayer('No PJM queue request found matching this county.');
    return {
      status: 'matched',
      confidence: 'probable',
      match_basis: 'county + state',
      count: items.length,
      requests: items.slice(0, 10).map((it) => ({
        queue_id: it.queue_number ?? it.queueNumber ?? null,
        mw: it.mfo ?? it.maximum_facility_output ?? null,
        fuel: it.fuel ?? null,
        status: it.status ?? null,
        submitted: it.submitted_date ?? null,
      })),
      source: 'PJM Interconnection — New Service Queue (Data Miner 2)',
      source_url: 'https://dataminer2.pjm.com/feed/new_service_queues',
      caveat: 'Matched on county and state only. PJM does not publish street addresses or permit numbers, so a queue position cannot be tied to a specific permitted facility with certainty.',
    };
  } catch (err) {
    return pendingLayer(`PJM Data Miner query failed: ${err.message}`);
  }
}
