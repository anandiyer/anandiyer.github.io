/* News monitoring -> editorial review queue.

   This is the automatable half of the reported tier. It pulls trade and local
   feeds, keeps items that mention a data center alongside a locality or
   operator we already track, and writes a scored queue for a human to triage.

   It deliberately does NOT write to editorial/reported-sites.json. Matching a
   news story to a site record is a judgement call, and the spec's own risk
   register (§13) flags auto-matching as the thing most likely to put a wrong
   fact on a page. The machine proposes; a person disposes. */

import path from 'node:path';
import { get } from './lib/http.mjs';
import { DATA, ROOT, readJSON, writeJSON, log } from './lib/util.mjs';

const FEEDS = [
  { name: 'Data Center Dynamics', url: 'https://www.datacenterdynamics.com/en/rss/' },
  /* Data Center Frontier has no working public RSS endpoint as of this build —
     every documented path 404s. Re-add when one is found. */
  { name: 'Virginia Mercury', url: 'https://virginiamercury.com/feed/' },
  { name: 'Loudoun Now', url: 'https://www.loudounnow.com/index.rss' },
  { name: 'Inside NoVA', url: 'https://www.insidenova.com/search/?f=rss&t=article&l=25' },
];

/* Match an operator on its most distinctive word, not its first one: "The
   Aerospace Corporation" split on the first token matches the word "the" and
   flags every story in the feed. */
const OP_STOPWORDS = new Set(['the', 'and', 'data', 'centers', 'center', 'inc', 'llc', 'corp', 'corporation', 'company', 'group', 'us', 'usa', 'global', 'american']);
function operatorToken(name) {
  const words = String(name).split(/[\s,]+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '')).filter(Boolean);
  const pick = words.find((w) => w.length >= 4 && !OP_STOPWORDS.has(w.toLowerCase()));
  return pick || null;
}

const DC_TERMS = /\bdata\s?cent(er|re)|hyperscale|colocation|gigawatt|interconnection\b/i;

function parseFeed(xml, source) {
  const items = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  return items.map((it) => {
    const pick = (tag) => {
      const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(it);
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : null;
    };
    const linkAttr = /<link[^>]*href="([^"]+)"/i.exec(it);
    return {
      source,
      title: pick('title'),
      url: pick('link') || (linkAttr ? linkAttr[1] : null),
      date: pick('pubDate') || pick('updated') || pick('published'),
      summary: (pick('description') || pick('summary') || '').slice(0, 400),
    };
  }).filter((i) => i.title && i.url);
}

export async function monitor() {
  const db = readJSON(path.join(DATA, 'sites.json'));
  if (!db) throw new Error('run 03-build-sites.mjs first');

  const localities = [...new Set(db.sites.map((s) => String(s.locality).replace(/\s*Co\.$/, '')))].filter(Boolean);
  const operators = [...new Set(db.sites.map((s) => s.operator?.name).filter(Boolean))];

  const seen = readJSON(path.join(ROOT, 'editorial', 'seen-urls.json'), []);
  const seenSet = new Set(seen);

  const queue = [];
  for (const feed of FEEDS) {
    let xml;
    try { xml = await get(feed.url, { retries: 1, timeout: 20000 }); }
    catch (err) { log(`feed unavailable: ${feed.name} (${err.message})`); continue; }

    for (const item of parseFeed(xml, feed.name)) {
      if (seenSet.has(item.url)) continue;
      const hay = `${item.title} ${item.summary}`;
      if (!DC_TERMS.test(hay)) continue;

      const locHits = localities.filter((l) => new RegExp(`\\b${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(hay));
      const opHits = operators.filter((o) => {
        const token = operatorToken(o);
        return token && new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(hay);
      });
      if (!locHits.length && !opHits.length) continue;

      /* Candidate site pages an editor should look at first. */
      const candidates = db.sites
        .filter((s) => locHits.includes(String(s.locality).replace(/\s*Co\.$/, '')) || opHits.includes(s.operator?.name))
        .slice(0, 6)
        .map((s) => ({ slug: s.slug, name: s.name, locality: s.locality }));

      queue.push({
        ...item,
        matched_localities: locHits,
        matched_operators: opHits,
        score: locHits.length * 2 + opHits.length,
        candidate_sites: candidates,
        editor_action: 'unreviewed',
      });
    }
  }

  queue.sort((a, b) => b.score - a.score);
  const file = path.join(ROOT, 'editorial', 'review-queue.json');
  writeJSON(file, {
    generated_at: new Date().toISOString(),
    instructions: 'Triage each item: attach it as a `claim` to a site_slug in reported-sites.json, promote it to a new reported `site`, or drop it. Then add its URL to seen-urls.json so it stops reappearing.',
    count: queue.length,
    items: queue.slice(0, 100),
  });
  log(`monitor: ${queue.length} items queued for editorial review -> ${path.relative(process.cwd(), file)}`);
  return queue;
}

if (import.meta.url === `file://${process.argv[1]}`) await monitor();
