#!/usr/bin/env node
/**
 * Render the "Request for startups" section of AGENTS.md from
 * _data/projects.json — the same data /request-for-startups/ is built from.
 *
 * AGENTS.md is served as a static file (Jekyll can't Liquid-render a .md and
 * still ship it as Markdown), so the RFS list is written in here between two
 * marker comments instead. Everything outside the markers is hand-written and
 * left untouched.
 *
 * Runs in three places, so the published copy can never lag the data:
 *   - scripts/sync-projects.mjs, after it writes new Notion data (daily)
 *   - .github/workflows/deploy.yml, before the Jekyll build (every deploy)
 *   - by hand:   node scripts/render-agents-md.mjs [--check]
 *
 * --check exits 1 without writing if AGENTS.md is out of date.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AGENTS_PATH = resolve(ROOT, 'AGENTS.md');
const DATA_PATH = resolve(ROOT, '_data', 'projects.json');

const START = '<!-- rfs:start — generated from _data/projects.json by scripts/render-agents-md.mjs; edit Notion, not this -->';
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

export function renderAgentsMd(markdown, data) {
    const a = markdown.indexOf(START.slice(0, 16));
    const b = markdown.indexOf(END);
    if (a === -1 || b === -1 || b < a) {
        throw new Error('AGENTS.md is missing the <!-- rfs:start … --> / <!-- rfs:end --> markers');
    }
    return markdown.slice(0, a) + renderSection(data) + markdown.slice(b + END.length);
}

function main() {
    const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
    const before = readFileSync(AGENTS_PATH, 'utf8');
    const after = renderAgentsMd(before, data);
    if (process.argv.includes('--check')) {
        if (after !== before) {
            console.error('AGENTS.md is out of date with _data/projects.json — run: node scripts/render-agents-md.mjs');
            process.exit(1);
        }
        console.log('AGENTS.md is up to date.');
        return;
    }
    if (after !== before) writeFileSync(AGENTS_PATH, after);
    console.log(`AGENTS.md: ${after === before ? 'unchanged' : 'updated'} (${data.projects.length} projects)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    try {
        main();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
