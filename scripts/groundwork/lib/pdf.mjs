/* Dependency-free PDF text extraction.
   VA DEQ permits are text-based PDFs (FlateDecode content streams with TJ/Tj
   show-text operators), so we can pull the facility address out of them
   without adding poppler or an npm PDF tree to a Jekyll repo.

   This is deliberately not a general PDF parser: it decodes Flate streams,
   walks the text-showing operators, and reconstructs lines from TD/Td/TL/T*
   vertical moves. Scanned/image-only permits yield no text and are reported
   as such so callers can fall back rather than silently produce nothing. */

import zlib from 'node:zlib';

const OCTAL = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };

function decodePdfString(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== '\\') { out += c; continue; }
    const next = raw[++i];
    if (next === undefined) break;
    if (OCTAL[next] !== undefined) { out += OCTAL[next]; continue; }
    if (next >= '0' && next <= '7') {
      let oct = next;
      while (oct.length < 3 && raw[i + 1] >= '0' && raw[i + 1] <= '7') oct += raw[++i];
      out += String.fromCharCode(parseInt(oct, 8));
      continue;
    }
    if (next === '\n') continue; // line continuation
    out += next;
  }
  return out;
}

function inflateStreams(latin1) {
  const parts = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(latin1))) {
    const start = m.index + m[0].length;
    const end = latin1.indexOf('endstream', start);
    if (end < 0) continue;
    const raw = Buffer.from(latin1.slice(start, end), 'latin1');
    for (const fn of [zlib.inflateSync, zlib.inflateRawSync]) {
      try { parts.push(fn(raw).toString('latin1')); break; } catch { /* not this filter */ }
    }
  }
  return parts;
}

/* Pull the shown strings out of one content stream, inserting newlines where
   the text cursor moves down the page. */
function streamToText(content) {
  let out = '';
  const tokens = content.match(/\[(?:[^\][\\]|\\.)*\]\s*TJ|\((?:[^()\\]|\\.)*\)\s*'|\((?:[^()\\]|\\.)*\)\s*Tj|T\*|(?:[-\d.]+\s+){1,6}(?:TD|Td|Tm)/g) || [];
  for (const tok of tokens) {
    if (tok === 'T*') { out += '\n'; continue; }
    if (/(TD|Td|Tm)$/.test(tok)) {
      const nums = tok.trim().split(/\s+/).slice(0, -1).map(Number);
      const ty = nums.length >= 6 ? nums[5] : nums[1];
      /* Any downward move ends the visual line. */
      if (Number.isFinite(ty) && ty !== 0) out += '\n';
      continue;
    }
    if (/TJ$/.test(tok)) {
      const inner = tok.slice(tok.indexOf('[') + 1, tok.lastIndexOf(']'));
      const pieces = inner.match(/\((?:[^()\\]|\\.)*\)|-?[\d.]+/g) || [];
      for (const p of pieces) {
        if (p.startsWith('(')) out += decodePdfString(p.slice(1, -1));
        /* A large negative kern is PDF's word space. */
        else if (Number(p) < -180) out += ' ';
      }
      continue;
    }
    const str = tok.slice(tok.indexOf('(') + 1, tok.lastIndexOf(')'));
    out += decodePdfString(str);
    if (tok.trimEnd().endsWith("'")) out += '\n';
  }
  return out;
}

export function pdfToText(buffer) {
  const latin1 = Buffer.from(buffer).toString('latin1');
  const streams = inflateStreams(latin1);
  const text = streams.map(streamToText).join('\n');
  const cleaned = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trim()).join('\n')
    .trim();
  return {
    text: cleaned,
    /* Image-only permits decode to (almost) nothing; callers should treat a
       low character count as "no text layer" rather than "no address". */
    hasTextLayer: cleaned.replace(/\s/g, '').length > 400,
    imageOnly: /\/Subtype\s*\/Image/.test(latin1) && cleaned.replace(/\s/g, '').length <= 400,
  };
}
