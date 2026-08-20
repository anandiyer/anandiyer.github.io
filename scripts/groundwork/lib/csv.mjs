/* RFC4180-ish CSV parser. EPA's ECHO downloads embed commas, quotes and
   newlines inside quoted fields, so splitting on commas silently corrupts
   every row after the first messy one. */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return { header: [], rows: [] };
  const header = rows[0].map((h) => h.trim());
  return {
    header,
    rows: rows.slice(1).filter((r) => r.some((v) => v !== '')).map((r) => {
      const o = {};
      header.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
      return o;
    }),
  };
}
