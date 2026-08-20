/* Layer: CAPEX / OPERATOR CONFIRMATION — `directional` tier.

   SEC EDGAR full-text search over the last ~4 years of filings. A hit means
   the locality (or facility name) is mentioned somewhere in a filing by a
   public company; it does NOT establish that the filing refers to this
   specific site. That is precisely why this layer never rises above
   `directional` and why the site page shows the filing link rather than a
   derived number. */

import { getSEC, sleep } from './http.mjs';

const FTS = 'https://efts.sec.gov/LATEST/search-index';

export async function searchFilings(phrase, { forms = '10-K,10-Q,8-K', limit = 5 } = {}) {
  const q = new URLSearchParams({ q: `"${phrase}"`, forms });
  let json;
  try { json = await getSEC(`${FTS}?${q}`); }
  catch { return { query: phrase, available: false, hits: [] }; }
  await sleep(1200); // SEC fair-access: stay well under 10 req/s

  const hits = (json?.hits?.hits || []).slice(0, limit).map((h) => {
    const src = h._source || {};
    const [adsh, doc] = String(h._id || '').split(':');
    const cik = (src.ciks || [])[0];
    const accession = String(adsh || '').replace(/-/g, '');
    return {
      company: (src.display_names || [])[0] || null,
      form: src.file_type || src.root_form || null,
      filed: src.file_date || null,
      cik: cik || null,
      url: cik && accession
        ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/${doc || ''}`
        : null,
    };
  });

  return {
    query: phrase,
    available: true,
    total: json?.hits?.total?.value ?? hits.length,
    hits,
    source: 'SEC EDGAR full-text search',
    source_url: `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${phrase}"`)}`,
    confidence: 'directional',
    caveat: 'Full-text match on a place or facility name. Confirms that a public filer discusses this locality; it does not confirm the filing refers to this specific site.',
  };
}
