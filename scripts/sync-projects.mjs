#!/usr/bin/env node
/**
 * Sync "Projects that excite us" (/projects/) from the Canonical Frontier
 * Themes database in Notion.
 *
 * Notion is the source of truth; the page only prints it. This script reads
 * row PROPERTIES ONLY and writes _data/projects.json, which Jekyll renders at
 * build time. It never fetches page bodies: those carry "Our pipeline" (named,
 * confidential teams) and "Comparables", and an allowlist of properties is the
 * only way a private section added later can't leak. Likewise "Link to doc"
 * (an internal Notion URL), "Number" and "Status" are never written out —
 * Status is read only to drop rows marked Cut.
 *
 * Run by .github/workflows/sync-projects.yml. Locally:
 *
 *   NOTION_TOKEN=secret_… node scripts/sync-projects.mjs
 *   node scripts/sync-projects.mjs --rows rows.json   # pre-normalised rows, no API call
 *
 * Optional Notion properties, honoured when present:
 *   Publish (checkbox)     — once the property exists, only checked rows ship
 *   Site thesis (select)   — overrides the Area/Category mapping below
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, '..', '_data', 'projects.json');
const DATABASE_ID = 'b815c37d3ccc4e9da34bbbb9382d1d25';

// Display order on the page and in the filter chips. Mirror the homepage
// thesis grid (index.html #thesis).
const THESES = [
    { slug: 'physical-ai-robotics', name: 'Physical AI & Robotics' },
    { slug: 'silicon-quantum', name: 'Silicon & Quantum' },
    { slug: 'open-infrastructure', name: 'Open Infrastructure' },
    { slug: 'frontier-systems', name: 'Frontier Systems' },
];

// Area decides first; Area "Other" falls through to Category.
const BY_AREA = {
    Chips: 'silicon-quantum',
    Quantum: 'silicon-quantum',
    Cybersecurity: 'frontier-systems',
    Defense: 'frontier-systems',
    Ocean: 'frontier-systems',
    Space: 'frontier-systems',
};
const BY_CATEGORY = {
    'Physical AI': 'physical-ai-robotics',
    Silicon: 'silicon-quantum',
    DeAI: 'open-infrastructure',
    'Post-AGI infrastructure': 'open-infrastructure',
    Energy: 'frontier-systems',
    Bio: 'frontier-systems',
};

function thesisFor(row) {
    if (row.siteThesis) {
        const t = THESES.find((x) => x.name === row.siteThesis || x.slug === row.siteThesis);
        if (t) return t.slug;
        console.warn(`Unknown Site thesis "${row.siteThesis}" on "${row.name}"; using the mapping.`);
    }
    return BY_AREA[row.area] || BY_CATEGORY[row.category] || 'frontier-systems';
}

// "…by 2028 [press]." → "…by 2028." Research annotations aren't for the page.
function clean(text) {
    return (text || '').replace(/\s*\[[^\]]*\]/g, '').replace(/\s+([.,;])/g, '$1').trim();
}

// --- Notion API -------------------------------------------------------------

const plain = (rich) => (rich || []).map((r) => r.plain_text).join('');

function normalise(page) {
    const p = page.properties;
    const prop = (name) => p[name];
    return {
        name: plain(prop('Name')?.title),
        area: prop('Area')?.select?.name || null,
        category: prop('Category')?.select?.name || null,
        status: prop('Status')?.select?.name || null,
        oneLiner: plain(prop('One-liner')?.rich_text),
        wedge: plain(prop('Wedge')?.rich_text),
        trigger: plain(prop('Trigger')?.rich_text),
        triggerDate: prop('Trigger date')?.date?.start || null,
        updated: prop('Last updated')?.date?.start || null,
        created: page.created_time,
        siteThesis: prop('Site thesis')?.select?.name || null,
        // undefined = no Publish property in the database yet
        publish: prop('Publish') ? prop('Publish').checkbox === true : undefined,
    };
}

async function fetchRows(token) {
    const rows = [];
    let cursor;
    do {
        const res = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
        });
        if (!res.ok) throw new Error(`Notion query failed: HTTP ${res.status} ${await res.text()}`);
        const body = await res.json();
        rows.push(...body.results.map(normalise));
        cursor = body.has_more ? body.next_cursor : undefined;
    } while (cursor);
    return rows;
}

// --- Build ------------------------------------------------------------------

function build(rows) {
    const publishGate = rows.some((r) => r.publish !== undefined && r.publish !== null);
    const projects = rows
        .filter((r) => r.name && r.oneLiner)
        .filter((r) => r.status !== 'Cut')
        .filter((r) => !publishGate || r.publish === true)
        .sort((a, b) =>
            (b.updated || '').localeCompare(a.updated || '') ||
            (b.created || '').localeCompare(a.created || ''))
        .map((r) => {
            const slug = thesisFor(r);
            return {
                name: clean(r.name),
                thesis: THESES.find((t) => t.slug === slug).name,
                thesis_slug: slug,
                one_liner: clean(r.oneLiner),
                wedge: clean(r.wedge),
                trigger: clean(r.trigger),
                trigger_date: r.triggerDate,
                updated: r.updated,
            };
        });
    return {
        generated_by: 'scripts/sync-projects.mjs — do not edit by hand; edit Notion',
        theses: THESES,
        projects,
    };
}

async function main() {
    const i = process.argv.indexOf('--rows');
    let rows;
    if (i !== -1) {
        rows = JSON.parse(readFileSync(process.argv[i + 1], 'utf8'));
    } else {
        const token = process.env.NOTION_TOKEN;
        if (!token) throw new Error('NOTION_TOKEN is not set');
        rows = await fetchRows(token);
    }
    const data = build(rows);
    // An empty result is far likelier to be a permissions or schema problem
    // than a real empty database; keep the last good file rather than blank the page.
    if (data.projects.length === 0) throw new Error(`0 publishable rows out of ${rows.length}; not writing. (If you just added the Publish checkbox, tick the rows to show.)`);
    writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + '\n');
    const counts = THESES.map((t) => `${t.name}: ${data.projects.filter((p) => p.thesis_slug === t.slug).length}`);
    console.log(`Wrote ${data.projects.length} projects to _data/projects.json (${counts.join(', ')})`);
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
