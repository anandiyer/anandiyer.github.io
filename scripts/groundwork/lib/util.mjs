import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = path.join(ROOT, 'data');
export const RAW = path.join(DATA, 'raw');

export function readJSON(p, fallback = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return fallback; }
}

export function writeJSON(p, obj, { pretty = true } = {}) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, pretty ? 2 : 0) + '\n');
  return p;
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/* "05/16/2008" -> "2008-05-16". Returns null rather than an Invalid Date so a
   bad cell can't silently become a real-looking timestamp downstream. */
export function usDateToISO(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || '').trim());
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export const titleCase = (s) =>
  String(s).toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());

export function log(...a) { console.log('[groundwork]', ...a); }
