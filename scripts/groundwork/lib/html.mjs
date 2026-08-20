/* Minimal HTML table extraction. The state portals we ingest emit plain
   server-rendered tables, so a dependency-free parser is enough — and keeps
   this repo (a Jekyll site with no package.json) free of an npm tree. */

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
};

export function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m);
}

export function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/* Returns { headers, rows } where each row is { cells:[text], links:[href] }. */
export function parseTable(html, { index = 0 } = {}) {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  const table = tables[index];
  if (!table) return null;

  const headers = (table.match(/<th[\s\S]*?<\/th>/gi) || []).map(stripTags);
  const trs = table.match(/<tr[\s\S]*?<\/tr>/gi) || [];

  const rows = [];
  for (const tr of trs) {
    const tds = tr.match(/<td[\s\S]*?<\/td>/gi);
    if (!tds) continue; // header row
    const cells = tds.map(stripTags);
    const links = (tr.match(/href="([^"]+)"/gi) || []).map((h) => /href="([^"]+)"/i.exec(h)[1]);
    if (cells.some(Boolean)) rows.push({ cells, links });
  }
  return { headers, rows };
}
