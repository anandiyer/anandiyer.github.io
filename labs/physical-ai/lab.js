/* Physical AI Capital Flow Map - interactive layer.
   Fetches /labs/physical-ai/data.json, renders:
     - Scene 1: valuation chasm horizontal bars
     - Scene 2: round velocity SVG scatter + mobile fallback list
     - Scene 3: US / China flow rows
     - Scene 4: defense unicorn SVG timeline
     - Explorer: 22 sub-sector cards with filter/sort and URL state
     - Detail drawer on card click with full company list, investors, POV, caveats
     - Scroll-spy sub-nav, ESC to close drawer, hover tooltips on hero scenes. */

(function () {
    'use strict';

    let DATA = null;
    const tip = document.getElementById('pai-tip');

    /* Static explanations for filter chips, TLDR stats, and key terms.
       Keep terse; the goal is to remove ambiguity, not to write paragraphs. */
    const EXPLAIN = {
        // hero / glossary terms
        'tam': '<strong>Total addressable market.</strong>Estimated total revenue opportunity for a category if a product captured 100% of demand. Used here to flag categories that are tiny in VC dollars but large in real-world demand (e.g. exoskeletons).',

        // layer chips
        'layer': '<strong>Layer</strong>Where the company sits in the physical-AI stack. Embodiment = the robot itself. Domain = the use case the robot serves. Stack = the underlying tech (silicon, models, simulation, perception, middleware).',
        'all-layers': '<strong>All layers</strong>Show every sub-sector regardless of where it sits in the stack. Default view.',
        'layer-embodiment': '<strong>Embodiment</strong>The physical robot. Humanoids, quadrupeds, warehouse mobile robots, drones, marine, surgical, exoskeletons. Capital flows here are about the form factor and the hardware.',
        'layer-domain': '<strong>Domain</strong>The use case the robot serves. Industrial automation, agriculture, construction, defense, healthcare, consumer, mobility. Capital flows here are about a specific end market.',
        'layer-stack': '<strong>Stack</strong>The underlying tech the embodiment runs on. Actuators, sensors, edge silicon, foundation models, simulation, fleet ops, teleop/data, safety. Picks-and-shovels.',

        // geo chips
        'geo': '<strong>Geography</strong>Filters to sub-sectors where the selected region has at least 10% of capital deployed. Useful for surfacing where China dominates (consumer, teleop data centers) vs where it is absent (defense, marine).',
        'geo-global': '<strong>Global</strong>All sub-sectors, all geographies. Default view.',
        'geo-us': '<strong>US</strong>Sub-sectors where US-domiciled companies have at least 10% of capital. Most of physical AI venture sits here.',
        'geo-china': '<strong>China</strong>Sub-sectors with material Chinese capital. Note: unit shipment share and dollar share diverge sharply; the drawer geo bar shows the dollar split.',
        'geo-eu': '<strong>EU</strong>Sub-sectors with material European capital. Strongest in exoskeletons and surgical robotics; nascent in defense via Helsing.',

        // sort chips
        'sort': '<strong>Sort</strong>Reorders the visible cards. Capital ranks by total dollars in 2024–25, YoY by year-over-year growth rate, Deals by number of rounds.',
        'sort-capital': '<strong>Sort by Capital</strong>Largest 2024–25 dollar volume first. Defense ($22B) and AV ($28B) lead.',
        'sort-yoy': '<strong>Sort by YoY</strong>Fastest growing first. Foundation models for robotics (+450%) and AV (+340%) lead. Negative YoY (consumer, warehouse) sinks to the bottom.',
        'sort-deals': '<strong>Sort by Deals</strong>Most rounds first. Defense (120+) and warehouse (70) lead by deal count even though warehouse is shrinking in dollars.',

        // TLDR stats
        'tldr-total': '<strong>$40.7B total robotics VC, 2025</strong>CB Insights wide-cut figure. PitchBook reports $27.6B with a narrower category definition. Both include venture and strategic capital; PitchBook’s separate $49.1B 2025 deal-value figure includes structured credit, so we keep equity-only here.',
        'tldr-concentration': '<strong>~80% of capital in 4 super-categories</strong>Humanoids ($5B), defense ($22B), AV ($28B), foundation models ($3.5B) account for roughly 4/5ths of physical-AI VC in 2024–25. The other ~20% is spread across 18 sub-sectors.',
        'tldr-defense': '<strong>2 → 22 defense unicorns</strong>In 2022, only Anduril and Shield AI were valued above $1B. By mid-2026 there are 22+. Anduril’s $61B post Series H is anchored by a $20B DoD enterprise agreement signed March 2026.',
        'tldr-chasm': '<strong>$56B+ in 4 humanoid valuations</strong>Figure ($39B), 1X ($10B, in talks), Apptronik ($5.4B), Agility ($2.1B) sum to ~$56B. Surgical + agricultural + construction + consumer + exoskeleton + quadruped venture combined: ~$3.7B. 15× ratio.',
    };

    function showTipFor(e, key) {
        const html = EXPLAIN[key];
        if (!html) return;
        showTip(e, html);
    }

    /* ---------- Utilities ---------- */
    function el(tag, attrs, ...kids) {
        const node = document.createElement(tag);
        if (attrs) {
            for (const k in attrs) {
                if (k === 'class') node.className = attrs[k];
                else if (k === 'html') node.innerHTML = attrs[k];
                else if (k.startsWith('on') && typeof attrs[k] === 'function') {
                    node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
                } else if (attrs[k] !== null && attrs[k] !== undefined) {
                    node.setAttribute(k, attrs[k]);
                }
            }
        }
        for (const kid of kids) {
            if (kid == null || kid === false) continue;
            node.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
        }
        return node;
    }

    function svg(tag, attrs, ...kids) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) {
            for (const k in attrs) {
                if (k === 'class') node.setAttribute('class', attrs[k]);
                else if (k.startsWith('on') && typeof attrs[k] === 'function') {
                    node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
                } else if (attrs[k] !== null && attrs[k] !== undefined) {
                    node.setAttribute(k, attrs[k]);
                }
            }
        }
        for (const kid of kids) {
            if (kid == null || kid === false) continue;
            node.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
        }
        return node;
    }

    function fmtB(m) {
        if (m == null) return '—';
        if (m >= 1000) return '$' + (m / 1000).toFixed(m >= 10000 ? 0 : 1) + 'B';
        if (m >= 100) return '$' + Math.round(m) + 'M';
        return '$' + m + 'M';
    }

    function fmtPct(n) {
        if (n == null) return '—';
        const sign = n > 0 ? '+' : '';
        return sign + n + '%';
    }

    /* ---------- Tooltip ---------- */
    function showTip(e, html) {
        tip.innerHTML = html;
        tip.classList.add('show');
        positionTip(e);
    }
    function moveTip(e) { if (tip.classList.contains('show')) positionTip(e); }
    function hideTip() { tip.classList.remove('show'); }
    function positionTip(e) {
        const pad = 14;
        const tr = tip.getBoundingClientRect();
        let x = e.clientX + pad;
        let y = e.clientY + pad;
        if (x + tr.width > window.innerWidth - 8) x = e.clientX - tr.width - pad;
        if (y + tr.height > window.innerHeight - 8) y = e.clientY - tr.height - pad;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
    }

    /* ---------- SCENE 1: Valuation Chasm ---------- */
    function renderChasm() {
        const container = document.getElementById('chasm-bars');
        if (!container) return;
        const s = DATA.scenes.valuation_chasm;
        container.innerHTML = '';

        const allVals = [...s.headline_bars.map(b => b.valuation_m), ...s.tail_bars.map(b => b.value_m)];
        const maxVal = Math.max(...allVals);

        s.headline_bars.forEach(b => container.appendChild(buildChasmRow(b, false, maxVal)));

        container.appendChild(el('div', { class: 'pai-chasm-divider' }, '— vs. six entire sub-sectors —'));

        s.tail_bars.forEach(b => container.appendChild(buildChasmRow({
            name: b.name,
            valuation_m: b.value_m,
            geo: '',
            round: b.note
        }, true, maxVal)));
    }

    function buildChasmRow(b, isTail, maxVal) {
        const pct = Math.max((b.valuation_m / maxVal) * 100, 0.5);
        const row = el('div', { class: 'pai-chasm-row' + (isTail ? ' pai-tail' : '') });
        if (b.flag) row.dataset.flag = b.flag;
        const name = el('span', { class: 'pai-chasm-name' });
        name.appendChild(document.createTextNode(b.name));
        if (b.geo || b.round) {
            const sub = el('span', { class: 'pai-chasm-sub' });
            sub.textContent = [b.geo, b.round].filter(Boolean).join(' · ');
            name.appendChild(sub);
        }
        const barWrap = el('div', { class: 'pai-chasm-bar' });
        const fill = el('div', { class: 'pai-chasm-fill' });
        fill.style.width = '0%';
        barWrap.appendChild(fill);
        setTimeout(() => { fill.style.width = pct + '%'; }, 80);

        const val = el('span', { class: 'pai-chasm-val' }, fmtB(b.valuation_m));

        row.appendChild(name);
        row.appendChild(barWrap);
        row.appendChild(val);

        row.addEventListener('mousemove', (e) => {
            const flag = b.flag ? '<em>' + b.flag.replace('-', ' ') + '</em>' : '';
            showTip(e, '<strong>' + b.name + '</strong>' + fmtB(b.valuation_m) +
                (b.round ? ' · ' + b.round : '') + (flag ? '<br/>' + flag : ''));
        });
        row.addEventListener('mouseleave', hideTip);
        return row;
    }

    /* ---------- SCENE 2: Round Velocity ---------- */
    function renderVelocity() {
        const host = document.getElementById('velocity-chart');
        const fallback = document.getElementById('velocity-fallback');
        if (!host) return;
        const points = DATA.scenes.round_velocity.data_points;

        // SVG version (hidden < 640px)
        host.innerHTML = '';
        const VB_W = 620, VB_H = 460;
        const PAD_L = 60, PAD_R = 30, PAD_T = 20, PAD_B = 60;
        const plotW = VB_W - PAD_L - PAD_R;
        const plotH = VB_H - PAD_T - PAD_B;

        // x: 0..24 months; y: 0..25x (log feel — use linear for now matching mockup)
        const xMax = 24;
        const yMax = 25;
        const xPos = m => PAD_L + (Math.min(m, xMax) / xMax) * plotW;
        const yPos = mult => PAD_T + plotH - (Math.min(mult, yMax) / yMax) * plotH;

        const root = svg('svg', { viewBox: `0 0 ${VB_W} ${VB_H}`, preserveAspectRatio: 'xMidYMid meet' });

        // grid
        const defs = svg('defs');
        const pattern = svg('pattern', { id: 'pai-vgrid', width: 40, height: 40, patternUnits: 'userSpaceOnUse' },
            svg('path', { d: 'M 40 0 L 0 0 0 40', fill: 'none', stroke: 'rgba(15,23,42,0.06)', 'stroke-width': 1 })
        );
        defs.appendChild(pattern);
        root.appendChild(defs);
        root.appendChild(svg('rect', { x: PAD_L, y: PAD_T, width: plotW, height: plotH, fill: 'url(#pai-vgrid)' }));

        // bubble zone overlay: months < 12, multiple > 3
        const bzX = PAD_L;
        const bzY = PAD_T;
        const bzW = xPos(12) - PAD_L;
        const bzH = yPos(3) - PAD_T;
        root.appendChild(svg('rect', { x: bzX, y: bzY, width: bzW, height: bzH, class: 'pai-bubble-zone' }));
        root.appendChild(svg('text', {
            x: bzX + bzW / 2, y: bzY + 32, 'text-anchor': 'middle', class: 'pai-bubble-zone-label'
        }, 'BUBBLE ZONE'));
        root.appendChild(svg('text', {
            x: bzX + bzW / 2, y: bzY + 46, 'text-anchor': 'middle',
            class: 'pai-bubble-zone-label', style: 'opacity:0.75; font-size:8px;'
        }, 'fast rounds, high multiples'));

        // axes
        root.appendChild(svg('line', { x1: PAD_L, y1: PAD_T + plotH, x2: PAD_L + plotW, y2: PAD_T + plotH, class: 'pai-axis-line' }));
        root.appendChild(svg('line', { x1: PAD_L, y1: PAD_T, x2: PAD_L, y2: PAD_T + plotH, class: 'pai-axis-line' }));

        // y-axis labels (multiples)
        const yTicks = [1, 3, 6, 10, 15, 22];
        yTicks.forEach(t => {
            root.appendChild(svg('text', { x: PAD_L - 10, y: yPos(t) + 4, class: 'pai-axis-text', 'text-anchor': 'end' }, t + '×'));
        });
        // x-axis labels (months)
        const xTicks = [0, 6, 12, 18, 24];
        xTicks.forEach(t => {
            root.appendChild(svg('text', { x: xPos(t), y: PAD_T + plotH + 20, class: 'pai-axis-text', 'text-anchor': 'middle' }, t));
        });
        root.appendChild(svg('text', {
            x: PAD_L + plotW / 2, y: VB_H - 18, 'text-anchor': 'middle', class: 'pai-axis-title'
        }, 'MONTHS BETWEEN ROUNDS'));
        const yTitle = svg('text', {
            x: 18, y: PAD_T + plotH / 2, 'text-anchor': 'middle', class: 'pai-axis-title',
            transform: `rotate(-90, 18, ${PAD_T + plotH / 2})`
        }, 'VALUATION MULTIPLE');
        root.appendChild(yTitle);

        // points
        points.forEach(p => {
            const cx = xPos(p.months_between);
            const cy = yPos(p.multiple);
            const cls = 'pai-point pai-point-' + (p.category === 'justified-by-revenue' ? 'justified' : p.category);
            const r = p.multiple >= 15 ? 9 : p.multiple >= 5 ? 8 : 7;
            const dot = svg('circle', {
                cx, cy, r,
                class: cls,
                stroke: 'white',
                'stroke-width': 2,
                'data-company': p.company
            });
            dot.addEventListener('mousemove', (e) => {
                showTip(e,
                    '<strong>' + p.company + '</strong>' +
                    fmtB(p.prev_val_m) + ' → ' + fmtB(p.new_val_m) +
                    ' · <em>' + p.multiple + '×</em>' +
                    '<br/>' + p.months_between + ' months · ' + p.category.replace(/-/g, ' ') +
                    (p.sub_sector ? '<br/><em>tap to view ' + p.sub_sector.replace(/-/g, ' ') + '</em>' : '')
                );
            });
            dot.addEventListener('mouseleave', hideTip);
            dot.addEventListener('click', () => {
                if (p.sub_sector) openSector(p.sub_sector);
            });
            root.appendChild(dot);

            // label placement: prefer right of point unless near right edge
            const labelRight = cx < PAD_L + plotW - 110;
            const lx = labelRight ? cx + 12 : cx - 12;
            const anchor = labelRight ? 'start' : 'end';
            root.appendChild(svg('text', {
                x: lx, y: cy - 4, class: 'pai-point-label', 'text-anchor': anchor
            }, p.company));
            root.appendChild(svg('text', {
                x: lx, y: cy + 9, class: 'pai-point-sub', 'text-anchor': anchor
            }, p.multiple + '×'));
        });

        host.appendChild(root);

        // Mobile fallback list (sorted by multiple desc)
        fallback.innerHTML = '';
        const sorted = [...points].sort((a, b) => b.multiple - a.multiple);
        sorted.forEach(p => {
            const cat = p.category === 'justified-by-revenue' ? 'justified' : p.category;
            const row = el('div', { class: 'pai-vf-row' },
                el('div', null,
                    el('div', { class: 'pai-vf-name' }, p.company),
                    el('div', { class: 'pai-vf-meta' }, fmtB(p.prev_val_m) + ' → ' + fmtB(p.new_val_m))
                ),
                el('div', { class: 'pai-vf-meta' }, p.months_between + 'mo'),
                el('div', { class: 'pai-vf-mult pai-vf-' + cat }, p.multiple + '×')
            );
            if (p.sub_sector) {
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => openSector(p.sub_sector));
            }
            fallback.appendChild(row);
        });
    }

    /* ---------- SCENE 3: US/China Flows ---------- */
    function renderFlows() {
        const us = document.getElementById('flow-us');
        const cn = document.getElementById('flow-china');
        if (!us || !cn) return;

        us.innerHTML = '';
        cn.innerHTML = '';

        DATA.scenes.us_china_flows.us_flows.forEach(f => {
            us.appendChild(buildFlowRow(f.investors, f.company));
        });
        DATA.scenes.us_china_flows.china_flows.forEach(f => {
            cn.appendChild(buildFlowRow(f.investors, f.company));
        });
    }

    function buildFlowRow(investors, company) {
        const actorText = investors.join(' + ');
        const row = el('div', { class: 'pai-flow-row' },
            el('span', { class: 'pai-flow-actor' }, actorText),
            el('span', { class: 'pai-flow-arrow' }, '→'),
            el('span', { class: 'pai-flow-target' }, company)
        );
        row.addEventListener('mousemove', (e) => {
            showTip(e, '<strong>' + company + '</strong>Backed by: <em>' + actorText + '</em>');
        });
        row.addEventListener('mouseleave', hideTip);
        return row;
    }

    /* ---------- SCENE 4: Defense Unicorn Timeline ---------- */
    function renderDefense() {
        const host = document.getElementById('defense-chart');
        if (!host) return;
        host.innerHTML = '';

        const VB_W = 720, VB_H = 490;
        const yearX = { 2022: 80, 2024: 240, 2025: 400, 2026: 560 };

        const root = svg('svg', { viewBox: `0 0 ${VB_W} ${VB_H}`, preserveAspectRatio: 'xMidYMid meet' });

        // year axis verticals
        root.appendChild(svg('line', { x1: 80, y1: 40, x2: 80, y2: 460, class: 'pai-d-year-axis' }));
        [240, 400, 560].forEach(x => {
            root.appendChild(svg('line', { x1: x, y1: 40, x2: x, y2: 460, class: 'pai-d-year-tick' }));
        });

        // year labels
        Object.keys(yearX).forEach(y => {
            root.appendChild(svg('text', {
                x: yearX[y], y: 478, class: 'pai-d-year-text', 'text-anchor': 'middle'
            }, y));
        });

        // baseline labels (top)
        root.appendChild(svg('text', {
            x: 80, y: 28, class: 'pai-d-baseline pai-d-year-text', 'text-anchor': 'middle',
            fill: '#94a3b8'
        }, '2 UNICORNS'));
        root.appendChild(svg('text', {
            x: 640, y: 28, class: 'pai-d-baseline', 'text-anchor': 'middle',
            fill: '#f97316', 'font-weight': '600'
        }, '22+ UNICORNS'));

        const rows = DATA.scenes.defense_unicorns.unicorns;
        const rowGap = 38;
        const startY = 60;

        rows.forEach((u, i) => {
            const y = startY + i * rowGap;
            const xStart = yearX[u.first_unicorn_year] || 80;
            const xEnd = u.first_unicorn_year < 2026 ? 640 : xStart + 80;

            // line from first year to latest
            if (u.first_unicorn_year < 2026 || u.highlight) {
                root.appendChild(svg('line', {
                    x1: xStart, y1: y, x2: u.highlight ? 640 : xEnd, y2: y, class: 'pai-d-line'
                }));
            }

            // first-cross dot
            root.appendChild(svg('circle', {
                cx: xStart, cy: y, r: u.highlight ? 5 : 4, fill: '#1e3a8a'
            }));

            // intermediate ticks for highlight (anduril)
            if (u.highlight) {
                root.appendChild(svg('circle', { cx: 240, cy: y, r: 5, fill: '#1e3a8a' }));
                root.appendChild(svg('circle', { cx: 400, cy: y, r: 6, fill: '#1e3a8a' }));
            }

            // latest valuation dot
            const latestX = u.highlight ? 640 : xEnd;
            const latestR = u.latest_val_m >= 30000 ? 11 : u.latest_val_m >= 10000 ? 9 : u.latest_val_m >= 4000 ? 7 : 6;
            const latestFill = u.highlight ? '#f97316' : '#1e3a8a';
            const latestDot = svg('circle', {
                cx: latestX, cy: y, r: latestR, fill: latestFill,
                stroke: 'white', 'stroke-width': 2, class: 'pai-d-dot',
                'data-name': u.name
            });
            latestDot.addEventListener('mousemove', (e) => {
                showTip(e,
                    '<strong>' + u.name + '</strong>' + fmtB(u.latest_val_m) +
                    '<br/><em>' + u.latest_round + '</em>' +
                    (u.structured_note ? '<br/>' + u.structured_note : '') +
                    (u.flag ? '<br/><em>' + u.flag + '</em>' : '')
                );
            });
            latestDot.addEventListener('mouseleave', hideTip);
            root.appendChild(latestDot);

            // name label (just past first-cross dot)
            root.appendChild(svg('text', {
                x: xStart + 14, y: y - 5, class: 'pai-d-name'
            }, u.name));

            // valuation label (right of latest dot)
            root.appendChild(svg('text', {
                x: latestX + 18, y: y - 4, class: 'pai-d-val',
                fill: u.highlight ? '#f97316' : '#0a0a0a'
            }, fmtB(u.latest_val_m)));
            root.appendChild(svg('text', {
                x: latestX + 18, y: y + 9, class: 'pai-d-meta'
            }, u.latest_round.length > 32 ? u.latest_round.slice(0, 30) + '…' : u.latest_round));
        });

        host.appendChild(root);
    }

    /* ---------- EXPLORER: Cards + Filters ---------- */
    const GEO_LABELS = { US: 'US', China: 'China', EU: 'EU', RoW: 'RoW' };

    function readFilters() {
        const p = new URLSearchParams(window.location.search);
        return {
            layer: p.get('layer') || 'all',
            geo: p.get('geo') || 'global',
            sort: p.get('sort') || 'capital',
            sector: p.get('sector') || null
        };
    }

    function writeFilters(f) {
        const p = new URLSearchParams();
        if (f.layer && f.layer !== 'all') p.set('layer', f.layer);
        if (f.geo && f.geo !== 'global') p.set('geo', f.geo);
        if (f.sort && f.sort !== 'capital') p.set('sort', f.sort);
        if (f.sector) p.set('sector', f.sector);
        const qs = p.toString();
        const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
        window.history.replaceState(null, '', url);
    }

    function syncChips() {
        const f = readFilters();
        document.querySelectorAll('.pai-chip-row').forEach(row => {
            const kind = row.dataset.filter;
            const want = f[kind] || (kind === 'geo' ? 'global' : kind === 'layer' ? 'all' : 'capital');
            row.querySelectorAll('.pai-chip').forEach(c => {
                c.classList.toggle('active', c.dataset.value === want);
            });
        });
    }

    function renderSectors() {
        const grid = document.getElementById('sector-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const f = readFilters();
        let list = DATA.subsectors.slice();

        if (f.layer && f.layer !== 'all') list = list.filter(s => s.layer === f.layer);
        if (f.geo && f.geo !== 'global') list = list.filter(s => (s.geo_split[f.geo] || 0) >= 10);

        if (f.sort === 'capital') list.sort((a, b) => (b.capital_2024_25_m || 0) - (a.capital_2024_25_m || 0));
        else if (f.sort === 'yoy') list.sort((a, b) => (b.yoy_growth_pct == null ? -9999 : b.yoy_growth_pct) - (a.yoy_growth_pct == null ? -9999 : a.yoy_growth_pct));
        else if (f.sort === 'deals') list.sort((a, b) => (b.deals_count || 0) - (a.deals_count || 0));

        const meta = document.getElementById('filter-meta');
        if (meta) {
            meta.textContent = list.length === DATA.subsectors.length
                ? 'Showing all ' + list.length + ' sub-sectors'
                : 'Showing ' + list.length + ' of ' + DATA.subsectors.length + ' sub-sectors';
        }

        if (list.length === 0) {
            grid.appendChild(el('div', { class: 'pai-card-empty' },
                'No sub-sectors match those filters. Try widening the geography or layer.'));
            return;
        }

        list.forEach(s => grid.appendChild(buildCard(s)));
    }

    function buildCard(s) {
        const top = el('div', { class: 'pai-card-top' },
            el('span', { class: 'pai-card-num' }, s.number),
            el('span', { class: 'pai-card-layer' }, s.layer)
        );

        const stats = el('div', { class: 'pai-card-stats' },
            buildStat('Capital ’24–’25', fmtB(s.capital_2024_25_m)),
            buildStat('YoY', s.yoy_growth_pct == null
                ? '<span class="pai-na">n/a</span>'
                : '<span class="' + (s.yoy_growth_pct >= 0 ? 'pai-up' : 'pai-down') + '">' + fmtPct(s.yoy_growth_pct) + '</span>'),
            buildStat('Deals', String(s.deals_count))
        );

        const topNames = s.top_companies.slice(0, 5).map(c => c.name).join(' · ');
        const companies = el('div', { class: 'pai-card-companies', html: 'Top: <em>' + topNames + '</em>' });

        const card = el('div', { class: 'pai-card' }, top, el('h3', null, s.name), stats, companies);
        card.dataset.id = s.id;
        card.addEventListener('click', () => openSector(s.id));

        const povPreview = s.canonical_pov.length > 240 ? s.canonical_pov.slice(0, 220).trim() + '…' : s.canonical_pov;
        card.addEventListener('mousemove', (e) => {
            showTip(e,
                '<strong>' + s.name + ' · Canonical POV</strong>' + povPreview +
                '<br/><em>click for full detail</em>'
            );
        });
        card.addEventListener('mouseleave', hideTip);
        return card;
    }

    function buildStat(label, valueHtml) {
        const v = el('div', { class: 'pai-card-stat-v', html: valueHtml });
        return el('div', null,
            el('div', { class: 'pai-card-stat-k' }, label),
            v
        );
    }

    /* ---------- DRAWER ---------- */
    const drawer = document.getElementById('drawer');
    const drawerInner = document.getElementById('drawer-inner');
    const drawerOverlay = document.getElementById('drawer-overlay');

    function openSector(id) {
        const s = DATA.subsectors.find(x => x.id === id);
        if (!s) return;
        const f = readFilters();
        f.sector = id;
        writeFilters(f);
        renderDrawer(s);
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        drawerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        drawerOverlay.classList.remove('open');
        document.body.style.overflow = '';
        const f = readFilters();
        f.sector = null;
        writeFilters(f);
    }

    function renderDrawer(s) {
        drawerInner.innerHTML = '';

        // close button
        const closeBtn = el('button', {
            class: 'pai-drawer-close',
            'aria-label': 'Close panel',
            onclick: closeDrawer
        }, '×');
        drawerInner.appendChild(closeBtn);

        // header
        const header = el('div', { class: 'pai-d-header' },
            el('div', { class: 'pai-d-meta-row' },
                el('span', { class: 'pai-d-num' }, '[' + s.number + ']'),
                el('span', { class: 'pai-card-layer' }, s.layer)
            ),
            el('h2', { class: 'pai-d-title', id: 'drawer-title' }, s.name)
        );
        drawerInner.appendChild(header);

        // stats row
        const stats = el('div', { class: 'pai-d-stats' });
        [
            ['Capital ’24–’25', fmtB(s.capital_2024_25_m)],
            ['YoY', s.yoy_growth_pct == null ? '—' : fmtPct(s.yoy_growth_pct)],
            ['Deals', String(s.deals_count)]
        ].forEach(([k, v]) => {
            stats.appendChild(el('div', null,
                el('div', { class: 'pai-d-stat-k' }, k),
                el('div', { class: 'pai-d-stat-v' }, v)
            ));
        });
        drawerInner.appendChild(stats);

        // POV
        drawerInner.appendChild(el('div', { class: 'pai-d-section' },
            el('div', { class: 'pai-d-section-label' }, 'Canonical POV'),
            el('div', { class: 'pai-d-pov-body' }, s.canonical_pov)
        ));

        // Geo split
        const geoSec = el('div', { class: 'pai-d-section' },
            el('div', { class: 'pai-d-section-label' }, 'Geographic split (% of capital)')
        );
        const geoBar = el('div', { class: 'pai-d-geo' });
        ['US', 'China', 'EU', 'RoW'].forEach(g => {
            const pct = s.geo_split[g] || 0;
            if (pct > 0) {
                const seg = el('div', { class: 'pai-d-geo-seg ' + g.toLowerCase() });
                seg.style.width = pct + '%';
                seg.title = g + ': ' + pct + '%';
                geoBar.appendChild(seg);
            }
        });
        geoSec.appendChild(geoBar);
        const legend = el('div', { class: 'pai-d-geo-legend' });
        ['US', 'China', 'EU', 'RoW'].forEach(g => {
            const pct = s.geo_split[g] || 0;
            if (pct > 0) {
                legend.appendChild(el('span', null,
                    el('i', { class: g.toLowerCase() }), g + ' ' + pct + '%'
                ));
            }
        });
        geoSec.appendChild(legend);
        drawerInner.appendChild(geoSec);

        // Companies table
        const compSec = el('div', { class: 'pai-d-section' },
            el('div', { class: 'pai-d-section-label' }, 'Top companies (' + s.top_companies.length + ')')
        );
        const table = el('table', { class: 'pai-d-table' });
        const thead = el('thead', null,
            el('tr', null,
                el('th', null, 'Company'),
                el('th', { class: 'pai-d-geo-col' }, 'Geo'),
                el('th', null, 'Last round'),
                el('th', { class: 'pai-d-val-col' }, 'Val')
            )
        );
        table.appendChild(thead);
        const tbody = el('tbody');
        s.top_companies.forEach(c => {
            const nameCell = el('td');
            nameCell.appendChild(document.createTextNode(c.name));
            if (c.flag) {
                const flagEl = el('span', { class: 'pai-d-flag' + (c.flag === 'public-market-cap' ? ' public' : '') }, c.flag.replace(/-/g, ' '));
                nameCell.appendChild(flagEl);
            }
            tbody.appendChild(el('tr', null,
                nameCell,
                el('td', { class: 'pai-d-geo-col' }, c.geo),
                el('td', null, c.last_round_label || '—'),
                el('td', { class: 'pai-d-val-col' }, fmtB(c.valuation_m))
            ));
        });
        table.appendChild(tbody);
        compSec.appendChild(table);
        drawerInner.appendChild(compSec);

        // Investors
        if (s.top_investors && s.top_investors.length) {
            const invSec = el('div', { class: 'pai-d-section' },
                el('div', { class: 'pai-d-section-label' }, 'Active investors')
            );
            const invList = el('div', { class: 'pai-d-investors' });
            s.top_investors.forEach(i => invList.appendChild(el('span', { class: 'pai-d-investor' }, i)));
            invSec.appendChild(invList);
            drawerInner.appendChild(invSec);
        }

        // Caveats
        if (s.caveats && s.caveats.length) {
            const cavSec = el('div', { class: 'pai-d-section' },
                el('div', { class: 'pai-d-section-label' }, 'Data caveats')
            );
            const list = el('ul', { class: 'pai-d-caveats' });
            s.caveats.forEach(c => list.appendChild(el('li', null, c)));
            cavSec.appendChild(list);
            drawerInner.appendChild(cavSec);
        }

        // Footer
        const updated = (DATA.meta && DATA.meta.updated) ? DATA.meta.updated : '';
        const sub = encodeURIComponent('Physical AI Map — ' + s.name);
        drawerInner.appendChild(el('div', { class: 'pai-d-footer' },
            el('span', null, 'Last updated ' + updated + ' · v' + (DATA.meta && DATA.meta.version || '0.1')),
            el('a', { href: 'mailto:hello@canonical.cc?subject=' + sub }, 'Discuss this sub-sector →')
        ));

        drawer.scrollTop = 0;
    }

    /* ---------- FILTER WIRE-UP ---------- */
    function bindFilters() {
        document.querySelectorAll('.pai-chip-row').forEach(row => {
            const kind = row.dataset.filter;
            row.addEventListener('click', (e) => {
                const chip = e.target.closest('.pai-chip');
                if (!chip) return;
                const f = readFilters();
                f[kind] = chip.dataset.value;
                writeFilters(f);
                syncChips();
                renderSectors();
            });
        });
    }

    /* ---------- SCROLL-SPY SUB-NAV ---------- */
    function bindScrollSpy() {
        const links = Array.from(document.querySelectorAll('.pai-subnav-list a'));
        const map = new Map();
        links.forEach(a => {
            const id = a.dataset.spy;
            const sec = document.getElementById(id);
            if (sec) map.set(id, { a, sec });
        });

        function update() {
            const y = window.scrollY + window.innerHeight * 0.35;
            let activeId = null;
            for (const [id, { sec }] of map) {
                if (sec.offsetTop <= y) activeId = id;
            }
            links.forEach(a => a.classList.toggle('active', a.dataset.spy === activeId));
        }

        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    /* ---------- INIT ---------- */
    async function init() {
        try {
            const res = await fetch('data.json', { cache: 'no-cache' });
            DATA = await res.json();
        } catch (err) {
            console.error('Failed to load data.json', err);
            document.getElementById('sector-grid').innerHTML =
                '<div class="pai-card-empty">Failed to load dataset. Reload the page or check the network tab.</div>';
            return;
        }

        // updated stamp
        const updatedEl = document.getElementById('pai-updated');
        if (updatedEl && DATA.meta && DATA.meta.updated) {
            const d = new Date(DATA.meta.updated + 'T00:00:00');
            updatedEl.textContent = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }

        renderChasm();
        renderVelocity();
        renderFlows();
        renderDefense();
        bindFilters();
        syncChips();
        renderSectors();
        bindScrollSpy();

        // global tip tracking (so tip follows cursor when over interactive elements that registered mousemove)
        document.addEventListener('mousemove', moveTip, { passive: true });

        // Delegated hover tooltips for any element with data-explain or data-term.
        // Lets us add explanatory copy by marking HTML without rebinding handlers.
        document.addEventListener('mouseover', (e) => {
            const t = e.target.closest('[data-explain], [data-term]');
            if (!t) return;
            const key = t.dataset.explain || t.dataset.term;
            showTipFor(e, key);
        });
        document.addEventListener('mouseout', (e) => {
            const t = e.target.closest('[data-explain], [data-term]');
            if (t) hideTip();
        });
        document.addEventListener('focusin', (e) => {
            const t = e.target.closest('[data-explain], [data-term]');
            if (!t) return;
            const key = t.dataset.explain || t.dataset.term;
            const html = EXPLAIN[key];
            if (!html) return;
            const r = t.getBoundingClientRect();
            tip.innerHTML = html;
            tip.classList.add('show');
            tip.style.left = (r.left + r.width / 2) + 'px';
            tip.style.top = (r.bottom + 8) + 'px';
        });
        document.addEventListener('focusout', hideTip);

        // open sector from URL if present
        const f = readFilters();
        if (f.sector) openSector(f.sector);

        // close drawer interactions
        drawerOverlay.addEventListener('click', closeDrawer);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
