/* Shared HTML fragments for the generated Groundwork pages.

   Two rules from the spec are enforced here rather than left to each caller:
   a confidence badge is never emitted without the citation it belongs to
   (`evidenceCard` takes both), and operator claims render in their own
   visually distinct block, never interleaved with verified fields. */

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const TIER_NOTE = {
  confirmed: 'Read directly from a mandatory public filing.',
  probable: 'Matched on a non-unique key; very likely correct but not certain.',
  directional: 'A weak match, useful as a pointer only.',
  reported: 'Sourced from journalism, not yet from a filing.',
  pending: 'Not yet resolved.',
  rejected: 'A candidate value was found and then rejected by validation.',
  unresolved: 'No value could be established from disclosure.',
};

export const badge = (tier) =>
  `<span class="gw-conf ${esc(tier)}" title="${esc(TIER_NOTE[tier] || '')}">${esc(tier)}</span>`;

export const fmtDate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
};

/* One evidence layer. `cite` is mandatory — that pairing is the whole point. */
export function evidenceCard({ key, value, tier, basis, cite, muted = false }) {
  return `<div class="gw-ev ${esc(tier)}">
  <div class="gw-ev-head"><span class="gw-ev-key">${esc(key)}</span>${badge(tier)}</div>
  <div class="gw-ev-val${muted ? ' muted' : ''}">${value}</div>
  ${basis ? `<p class="gw-ev-basis">${basis}</p>` : ''}
  <div class="gw-ev-cite">${cite}</div>
</div>`;
}

export function pipelineLadder(pipeline) {
  return `<div class="gw-pipeline">${pipeline.stages.map((s, i) => {
    const cls = i < pipeline.reached_index ? 'reached' : i === pipeline.reached_index ? 'current' : '';
    return `<div class="gw-pipe-step ${cls}">${esc(s)}</div>`;
  }).join('')}</div>
<p class="gw-note-navy">${esc(pipeline.basis)} ${badge(pipeline.confidence)}</p>`;
}

export function timeline(entries, nextEntry) {
  const items = entries.map((e) => `<li class="gw-tl-item ${e.kind === 'news' ? 'reported' : ''}">
  <div class="gw-tl-date">${esc(fmtDate(e.date) || e.date)}</div>
  <p class="gw-tl-title">${esc(e.title)}</p>
  <p class="gw-tl-detail">${esc(e.detail || '')}${e.url ? ` &middot; <a href="${esc(e.url)}" target="_blank" rel="noopener">source</a>` : ''} ${badge(e.confidence)}</p>
</li>`).join('\n');
  const next = nextEntry ? `<li class="gw-tl-item next">
  <div class="gw-tl-date">Next</div>
  <p class="gw-tl-title">${esc(nextEntry.title)}</p>
  <p class="gw-tl-detail">${esc(nextEntry.detail)}</p>
</li>` : '';
  return `<ul class="gw-timeline">\n${items}\n${next}\n</ul>`;
}

/* Head block matching the house convention across canonical.cc labs. */
export function head({ title, description, canonical, extraCss = '', noindex = false, jsonLd = null }) {
  /* jekyll-sitemap honours `sitemap: false` in front matter, so a page we do
     not want indexed is kept out of the sitemap as well as robots-tagged.
     Both are needed: one stops it being submitted, the other stops it being
     indexed if it is found by a link. */
  return `---
${noindex ? 'sitemap: false\n' : ''}---
<!DOCTYPE html>
<html lang="en">
<head>
    {% include google-analytics.html %}
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="author" content="Canonical" />
    <meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow'}" />
    <link rel="canonical" href="${esc(canonical)}" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="https://canonical.cc/images/site-logo.png" />
    <meta property="og:site_name" content="Canonical" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${esc(canonical)}" />
    <meta property="twitter:title" content="${esc(title)}" />
    <meta property="twitter:description" content="${esc(description)}" />
    <meta property="twitter:image" content="https://canonical.cc/images/site-logo.png" />
    <meta property="twitter:creator" content="@canonicalcc" />
    <meta property="twitter:site" content="@canonicalcc" />

    <meta name="theme-color" content="#1e3a8a" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com?ref=canonicalcc">
    <link rel="preconnect" href="https://fonts.gstatic.com?ref=canonicalcc" crossorigin>
    <link href="https://db.onlinewebfonts.com/c/8f2a9d487bbbc60974cd132fc3a63862?family=Aeonik+Regular&ref=canonicalcc" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap&ref=canonicalcc" rel="stylesheet">
    <link rel="stylesheet" href="/css/style.css?v={{ site.asset_version }}">
    <link rel="stylesheet" href="/labs/groundwork/lab.css?v={{ site.asset_version }}">
${extraCss}
${jsonLd ? `    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body>
    <div class="min-h-screen">
        {% include header.html %}
        <main>`;
}

export const foot = `        </main>
        {% include footer.html %}
    </div>
</body>
</html>
`;

/* Corrections go to a public issue tracker, not to a person's inbox: it is a
   real queue, it is visible to whoever else noticed the same thing, and the
   fix is auditable. */
const ISSUE_URL = 'https://github.com/anandiyer/anandiyer.github.io/issues/new?labels=groundwork&title=Correction%3A%20';

export const CORRECTION_BLOCK = `<div class="gw-correct">
  <h3>Spotted an error?</h3>
  <p>Fuzzy-matched fields are labelled as such and some will be wrong. <a href="${ISSUE_URL}" target="_blank" rel="noopener">Open an issue</a> &mdash; corrections are tracked in public and noted on the page.</p>
</div>`;
