#!/usr/bin/env node
/**
 * Render the "Request for startups" section of AGENTS.md and llms-full.txt
 * from _data/projects.json — the same data /request-for-startups/ is built from.
 *
 * Both are served as static files (Jekyll can't Liquid-render them and still
 * ship them verbatim), so the RFS list is written into each between two marker
 * comments instead. Everything outside the markers is hand-written and left
 * untouched.
 *
 * Runs in three places, so the published copy can never lag the data:
 *   - scripts/sync-projects.mjs, after it writes new Notion data (daily)
 *   - .github/workflows/deploy.yml, before the Jekyll build (every deploy)
 *   - by hand:   node scripts/render-rfs.mjs [--check]
 *
 * --check exits 1 without writing if either file is out of date.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['AGENTS.md', 'llms-full.txt'];
const DATA_PATH = resolve(ROOT, '_data', 'projects.json');

const START = '<!-- rfs:start — generated from _data/projects.json by scripts/render-rfs.mjs; edit Notion, not this -->';
const END = '<!-- rfs:end -->';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Same format as the page's Liquid `date: "%b %-d, %Y"`.
function fmtDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
    return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : '';
}

// One line, no stray Markdown structure: the data is prose from Notion.
function inline(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
}

export function renderSection(data) {
    const projects = data.projects || [];
    const latest = projects.map((p) => p.updated || '').sort().pop();
    const counts = data.theses
        .map((t) => [t.name, projects.filter((p) => p.thesis_slug === t.slug).length])
        .filter(([, n]) => n > 0)
        .map(([name, n]) => `${name} (${n})`);

    const out = [START, ''];
    out.push(
        `${projects.length} open problems${latest ? `, last updated ${fmtDate(latest)}` : ''}: ${counts.join(', ')}.`,
        '',
    );
    for (const t of data.theses) {
        const group = projects.filter((p) => p.thesis_slug === t.slug);
        if (group.length === 0) continue;
        out.push(`### ${t.name}`, '');
        for (const p of group) {
            out.push(`#### ${inline(p.name)}`, '');
            // Same choice as /request-for-startups/: Problem / Solution / Timing
            // when Notion has them, else the older One-liner / Wedge / Trigger.
            if (inline(p.problem)) {
                out.push(`- **Problem:** ${inline(p.problem)}`);
                if (inline(p.solution)) out.push(`- **Solution:** ${inline(p.solution)}`);
                if (inline(p.timing)) out.push(`- **Timing:** ${inline(p.timing)}`);
            } else {
                out.push(inline(p.one_liner), '');
                if (inline(p.wedge)) out.push(`- **First product:** ${inline(p.wedge)}`);
                if (inline(p.trigger)) {
                    const when = fmtDate(p.trigger_date);
                    out.push(`- **Why now:** ${inline(p.trigger)}${when ? ` (key date: ${when})` : ''}`);
                }
            }
            if (p.updated) out.push(`- **Updated:** ${fmtDate(p.updated)}`);
            out.push('');
        }
    }
    out.push(END);
    return out.join('\n');
}

export function renderRfs(markdown, data) {
    const a = markdown.indexOf(START.slice(0, 16));
    const b = markdown.indexOf(END);
    if (a === -1 || b === -1 || b < a) {
        throw new Error('missing the <!-- rfs:start … --> / <!-- rfs:end --> markers');
    }
    return markdown.slice(0, a) + renderSection(data) + markdown.slice(b + END.length);
}

// Render every target; returns the names that changed. Shared with sync-projects.mjs.
export function renderAll(data, { write = true } = {}) {
    const changed = [];
    for (const name of TARGETS) {
        const path = resolve(ROOT, name);
        const before = readFileSync(path, 'utf8');
        let after;
        try {
            after = renderRfs(before, data);
        } catch (err) {
            throw new Error(`${name}: ${err.message}`);
        }
        if (after === before) continue;
        changed.push(name);
        if (write) writeFileSync(path, after);
    }
    return changed;
}

function main() {
    const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    const check = process.argv.includes('--check');
    const changed = renderAll(data, { write: !check });
    if (check && changed.length) {
        console.error(`Out of date with _data/projects.json: ${changed.join(', ')} — run: node scripts/render-rfs.mjs`);
        process.exit(1);
    }
    console.log(`${TARGETS.join(', ')}: ${changed.length ? `updated ${changed.join(', ')}` : 'up to date'} (${data.projects.length} projects)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    try {
        main();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
