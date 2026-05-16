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
    let INVESTORS = null;  // Map<normalizedKey, { display, sectors: Set<id>, companies: Set<string>, annotations: Set<string> }>
    let LIVE_QUOTES = null;  // ticker → { price, change_pct, date }. Populated from data.live_quotes if present.
    const tip = document.getElementById('pai-tip');

    /* Investor name aliases — collapse known variants so a single click finds everything.
       Keep the right-hand side as the canonical display form. */
    const INVESTOR_ALIASES = {
        'eclipse': 'Eclipse Ventures',
        'khosla': 'Khosla Ventures',
        'lux': 'Lux Capital',
        'bezos': 'Bezos Expeditions',
        'nvidia': 'Nvidia NVentures',
        'a16z (18 deals)': 'a16z',
        'blackstone (preferred)': 'Blackstone'
    };
    const BLACKLIST_INVESTORS = new Set(['state-backed china funds']);  // generic placeholder, not a focusable entity

    /* Company → official corporate URL. Source of truth for outbound links.
       Keep aligned with names in data.json scenes + subsectors[].top_companies.
       Used by companyLink() everywhere a company is rendered.

       Canonical portfolio companies are linked to their corporate domains here
       (for outbound SEO juice). The CANONICAL pill rendered next to the name
       links to the internal /companies/<slug>.html page for engagement. */
    const COMPANY_URLS = {
        // Canonical portfolio
        'Haptic': 'https://hapticlabs.ai',
        'Robo': 'https://robo.inc',
        'Nirvana AI': 'https://nrvana.ai',
        'Eastworlds (Virtuals)': 'https://eastworlds.io',
        'Eastworlds': 'https://eastworlds.io',
        // Humanoid robotics
        'Figure AI': 'https://www.figure.ai',
        'Figure': 'https://www.figure.ai',
        'Apptronik': 'https://apptronik.com',
        'Agility Robotics': 'https://agilityrobotics.com',
        'Agility': 'https://agilityrobotics.com',
        '1X Technologies': 'https://www.1x.tech',
        '1X': 'https://www.1x.tech',
        '1X NEO': 'https://www.1x.tech',
        'Unitree': 'https://www.unitree.com',
        'Unitree (quadruped legacy)': 'https://www.unitree.com',
        'AgiBot (Zhiyuan)': 'https://www.zhiyuan-robot.com',
        'AgiBot': 'https://www.zhiyuan-robot.com',
        'Fourier': 'https://fourier.com',
        'Neura Robotics': 'https://neura-robotics.com',
        'Galbot': 'https://www.galbot.com',
        'Robot Era': 'https://www.robotera.com',
        'EngineAI': 'https://www.engineai.com',
        'LimX': 'https://www.limxdynamics.com',
        'Leju': 'https://www.lejurobot.com',
        'X Square': 'https://x2.ai',
        'Spirit AI': 'https://www.spiritai.com',

        // Quadrupeds
        'Boston Dynamics': 'https://bostondynamics.com',
        'ANYbotics': 'https://www.anybotics.com',
        'Deep Robotics': 'https://www.deeprobotics.cn',
        'Ghost Robotics': 'https://www.ghostrobotics.io',

        // Wheeled / warehouse
        'Symbotic': 'https://www.symbotic.com',
        'Locus Robotics': 'https://locusrobotics.com',
        'Geek+': 'https://www.geekplus.com',
        'GreyOrange': 'https://www.greyorange.com',
        'AutoStore': 'https://www.autostoresystem.com',
        'Exotec': 'https://www.exotec.com',

        // Aerial / drones
        'Skydio': 'https://www.skydio.com',
        'Zipline': 'https://www.flyzipline.com',
        'Brinc Drones': 'https://www.brincdrones.com',
        'Brinc': 'https://www.brincdrones.com',
        'Wingtra': 'https://wingtra.com',
        'Quantum Systems': 'https://www.quantum-systems.com',

        // Marine / underwater
        'Saronic': 'https://www.saronic.com',
        'Saildrone': 'https://www.saildrone.com',
        'Anduril Dive-LD/XL': 'https://www.anduril.com',
        'Anduril Dive': 'https://www.anduril.com',
        'HavocAI': 'https://www.havocai.com',
        'Vatn Systems': 'https://www.vatnsystems.com',
        'Vatn': 'https://www.vatnsystems.com',

        // Surgical
        'CMR Surgical': 'https://cmrsurgical.com',
        'Distalmotion': 'https://www.distalmotion.com',
        'Moon Surgical': 'https://www.moonsurgical.com',
        'Surgerii': 'https://www.surgerii.com',
        'MMI': 'https://www.mmimicro.com',

        // Exoskeletons / wearable
        'German Bionic': 'https://www.germanbionic.com',
        'Wandercraft': 'https://www.wandercraft.eu',
        'Ekso Bionics': 'https://www.eksobionics.com',
        'Roam Robotics': 'https://www.roamrobotics.com',

        // Industrial / manufacturing
        'Mind Robotics': 'https://www.mindrobotics.com',
        'Hadrian': 'https://www.hadrian.co',
        'FieldAI': 'https://fieldai.com',
        'VulcanForms': 'https://vulcanforms.com',
        'Path Robotics': 'https://www.path-robotics.com',
        'Covariant': 'https://covariant.ai',
        'Covariant (Amazon acquihire)': 'https://covariant.ai',

        // Agricultural
        'Monarch Tractor': 'https://www.monarchtractor.com',
        'Carbon Robotics': 'https://carbonrobotics.com',
        'Inari': 'https://inari.com',
        'Burro': 'https://burro.ai',
        'Ecorobotix': 'https://ecorobotix.com',

        // Construction
        'Bedrock Robotics': 'https://bedrockrobotics.com',
        'Dusty Robotics': 'https://www.dustyrobotics.com',
        'Canvas': 'https://canvas.build',
        'Built Robotics': 'https://www.builtrobotics.com',

        // Defense / dual-use
        'Anduril': 'https://www.anduril.com',
        'Shield AI': 'https://shield.ai',
        'Helsing': 'https://helsing.ai',
        'CHAOS Industries': 'https://chaos.com',
        'Onebrief': 'https://www.onebrief.com',
        'Castelion': 'https://www.castelion.com',
        'Hermeus': 'https://www.hermeus.com',
        'True Anomaly': 'https://www.trueanomaly.space',
        'Forterra': 'https://forterrarobotics.com',

        // Healthcare (non-surgical)
        'Diligent Robotics (Moxi)': 'https://www.diligentrobots.com',
        'Diligent Robotics': 'https://www.diligentrobots.com',
        'Aethon (TUG)': 'https://aethon.com',
        'Cyberdyne': 'https://www.cyberdyne.jp',
        'Omnicell (pharmacy)': 'https://www.omnicell.com',
        'Omnicell': 'https://www.omnicell.com',

        // Consumer
        'iRobot': 'https://www.irobot.com',
        'Roborock': 'https://us.roborock.com',
        'Ecovacs': 'https://www.ecovacs.com',
        'Matic Robotics': 'https://maticrobots.com',

        // Mobility / AV
        'Waymo': 'https://waymo.com',
        'Wayve': 'https://wayve.ai',
        'Pony.ai': 'https://www.pony.ai',
        'WeRide': 'https://www.weride.ai',
        'Applied Intuition': 'https://www.appliedintuition.com',
        'Aurora Innovation': 'https://aurora.tech',
        'Aurora': 'https://aurora.tech',
        'Nuro': 'https://www.nuro.ai',
        'Waabi': 'https://waabi.ai',

        // Hardware / actuation
        'Harmonic Drive Systems': 'https://www.hds.co.jp',
        'Nabtesco': 'https://www.nabtesco.com',
        'Schaeffler': 'https://www.schaeffler.com',

        // Sensors / perception
        'Hesai': 'https://www.hesaitech.com',
        'RoboSense': 'https://www.robosense.ai',
        'Ouster': 'https://ouster.com',
        'Ouster (post-Stereolabs)': 'https://ouster.com',
        'Luminar': 'https://www.luminartech.com',
        'Prophesee': 'https://www.prophesee.ai',

        // Edge silicon
        'Hailo': 'https://hailo.ai',
        'Tenstorrent': 'https://tenstorrent.com',
        'Axelera AI': 'https://www.axelera.ai',
        'Nvidia Jetson Thor': 'https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-thor',
        'Rebellions': 'https://rebellions.ai',

        // Foundation models for robotics
        'Skild AI': 'https://www.skild.ai',
        'Skild': 'https://www.skild.ai',
        'Physical Intelligence': 'https://www.physicalintelligence.company',
        'Project Prometheus': 'https://www.physicalintelligence.company',
        'World Labs (Fei-Fei Li)': 'https://www.worldlabs.ai',
        'World Labs': 'https://www.worldlabs.ai',
        'Dyna Robotics': 'https://www.dyna.co',

        // Simulation / synthetic data
        'Foretellix': 'https://www.foretellix.com',
        'Nvidia Omniverse + Cosmos': 'https://www.nvidia.com/en-us/omniverse',
        'Parallel Domain': 'https://paralleldomain.com',
        'Cognata': 'https://www.cognata.com',

        // Fleet ops / middleware
        'Foxglove': 'https://foxglove.dev',
        'Formant': 'https://formant.io',
        'Intrinsic': 'https://www.intrinsic.ai',
        'Roboflow': 'https://roboflow.com',

        // Teleop / data collection
        'Dexterity': 'https://dexterity.ai',
        'Reflex Robotics': 'https://reflexrobotics.com',
        'Sanctuary AI': 'https://www.sanctuary.ai',

        // Safety / verification
        'Edge Case Research': 'https://www.edge-case-research.com',
        'Inverted AI': 'https://www.inverted.ai',
        'Monolith AI': 'https://www.monolithai.com'
    };

    /* Returns an anchor element for a company name if a URL is mapped, else a plain text node.
       Uses target=_blank with rel=noopener; SEO-friendly (no nofollow) so we pass juice. */
    function companyLink(name, opts) {
        const url = COMPANY_URLS[name];
        if (!url) return document.createTextNode(name);
        const a = el('a', {
            href: url,
            target: '_blank',
            rel: 'noopener',
            class: 'pai-co-link' + (opts && opts.className ? ' ' + opts.className : '')
        }, name);
        // Prevent click from bubbling to a card click handler when the link is inside a clickable card
        a.addEventListener('click', (e) => e.stopPropagation());
        return a;
    }

    /* Build a "Top: a · b · c" line as a fragment with company links where known. */
    function companyListInline(names, separator) {
        const sep = separator || ' · ';
        const frag = document.createDocumentFragment();
        names.forEach((name, i) => {
            if (i > 0) frag.appendChild(document.createTextNode(sep));
            frag.appendChild(companyLink(name));
        });
        return frag;
    }

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

    function fmtPriceUSD(n) {
        if (n == null || isNaN(n)) return '—';
        return '$' + n.toFixed(2);
    }

    function fmtSignedPct1(n) {
        if (n == null || isNaN(n)) return '—';
        const sign = n > 0 ? '+' : '';
        return sign + n.toFixed(2) + '%';
    }

    /* ---------- LIVE QUOTES ----------
       Browser CORS blocks Stooq/Yahoo direct, so we don't fetch client-side.
       Instead, a daily GitHub Action (see .github/workflows/refresh-quotes.yml)
       fetches close prices server-side and commits them to data.json under
       `live_quotes.quotes`. The JS here just reads what's there. */
    function tickerExchangeUrl(ticker) {
        if (!ticker) return null;
        if (/\.HK$/i.test(ticker)) {
            const num = ticker.replace(/\.HK$/i, '');
            return 'https://www.google.com/finance/quote/' + num + ':HKG';
        }
        return 'https://www.google.com/finance/quote/' + encodeURIComponent(ticker) + ':NASDAQ';
    }
    function tickerExchangeLabel(ticker) {
        if (!ticker) return '';
        if (/\.HK$/i.test(ticker)) return 'HKEX: ' + ticker.replace(/\.HK$/i, '');
        return 'NASDAQ: ' + ticker;
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

        container.appendChild(el('div', { class: 'pai-chasm-divider' }, '— vs. 6 entire sub-sectors —'));

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
        // Wrap top-4 humanoid headline names in outbound links. Tail bars are sub-sector
        // category names ("Surgical robotics") — those stay as plain text.
        name.appendChild(isTail ? document.createTextNode(b.name) : companyLink(b.name));
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
            const companyUrl = COMPANY_URLS[p.company];
            const labelText = svg('text', {
                x: lx, y: cy - 4, class: 'pai-point-label', 'text-anchor': anchor
            }, p.company);
            if (companyUrl) {
                const a = svg('a', { href: companyUrl, target: '_blank', rel: 'noopener', class: 'pai-svg-co-link' });
                a.setAttributeNS('http://www.w3.org/1999/xlink', 'href', companyUrl);
                a.appendChild(labelText);
                root.appendChild(a);
            } else {
                root.appendChild(labelText);
            }
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
            const nameEl = el('div', { class: 'pai-vf-name' });
            nameEl.appendChild(companyLink(p.company));
            const row = el('div', { class: 'pai-vf-row' },
                el('div', null,
                    nameEl,
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
        const actor = el('span', { class: 'pai-flow-actor' });
        investors.forEach((inv, i) => {
            const norm = normalizeInvestorKey(inv);
            if (norm) {
                actor.appendChild(el('button', {
                    class: 'pai-flow-actor-link',
                    onclick: (e) => { e.stopPropagation(); openInvestor(norm.key); }
                }, inv));
            } else {
                actor.appendChild(document.createTextNode(inv));
            }
            if (i < investors.length - 1) {
                actor.appendChild(document.createTextNode(' + '));
            }
        });
        const actorText = investors.join(' + ');
        // Flow targets are company names — wrap in outbound link when known.
        // Some entries have multiple companies separated by " · " (e.g. "EngineAI · LimX").
        const targetEl = el('span', { class: 'pai-flow-target' });
        const parts = company.split(' · ');
        parts.forEach((p, i) => {
            if (i > 0) targetEl.appendChild(document.createTextNode(' · '));
            targetEl.appendChild(companyLink(p.trim()));
        });
        const row = el('div', { class: 'pai-flow-row' },
            actor,
            el('span', { class: 'pai-flow-arrow' }, '→'),
            targetEl
        );
        row.addEventListener('mousemove', (e) => {
            showTip(e, '<strong>' + company + '</strong>Backed by: ' + actorText +
                '<br/><em>click any investor for their coverage</em>');
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

            // name label (just past first-cross dot) — wrap in SVG anchor for SEO crawler + click
            const nameLabel = svg('text', {
                x: xStart + 14, y: y - 5, class: 'pai-d-name'
            }, u.name);
            const url = COMPANY_URLS[u.name];
            if (url) {
                const a = svg('a', { target: '_blank', rel: 'noopener' });
                a.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
                a.setAttribute('href', url);
                a.appendChild(nameLabel);
                root.appendChild(a);
            } else {
                root.appendChild(nameLabel);
            }

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
            sector: p.get('sector') || null,
            investor: p.get('investor') || null
        };
    }

    function writeFilters(f) {
        const p = new URLSearchParams();
        if (f.layer && f.layer !== 'all') p.set('layer', f.layer);
        if (f.geo && f.geo !== 'global') p.set('geo', f.geo);
        if (f.sort && f.sort !== 'capital') p.set('sort', f.sort);
        if (f.sector) p.set('sector', f.sector);
        if (f.investor) p.set('investor', f.investor);
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
        const portfolioCompanies = (s.top_companies || []).filter(c => c.canonical_portfolio);
        const hasPortfolio = portfolioCompanies.length > 0;

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

        // For the card preview, surface our portfolio companies first regardless of valuation rank,
        // then fill with the next 4 (or however many) non-portfolio names.
        const portfolioNames = portfolioCompanies.map(c => c.name);
        const nonPortfolio = (s.top_companies || []).filter(c => !c.canonical_portfolio).slice(0, 5 - portfolioNames.length).map(c => c.name);
        const topNames = portfolioNames.concat(nonPortfolio);

        const companies = el('div', { class: 'pai-card-companies' });
        companies.appendChild(document.createTextNode('Top: '));
        const emWrap = el('em');
        // Inline rendering with star prefix for portfolio company names
        topNames.forEach((name, i) => {
            if (i > 0) emWrap.appendChild(document.createTextNode(' · '));
            const isPortfolio = portfolioNames.includes(name);
            if (isPortfolio) {
                const wrap = el('span', { class: 'pai-card-portfolio-name' });
                wrap.appendChild(document.createTextNode('★ '));
                wrap.appendChild(companyLink(name));
                emWrap.appendChild(wrap);
            } else {
                emWrap.appendChild(companyLink(name));
            }
        });
        companies.appendChild(emWrap);

        const card = el('div', { class: 'pai-card' + (hasPortfolio ? ' pai-card-has-portfolio' : '') }, top, el('h3', null, s.name), stats, companies);
        if (hasPortfolio) {
            // Floating corner indicator for sectors with Canonical portfolio coverage
            card.appendChild(el('span', {
                class: 'pai-card-portfolio-badge',
                title: portfolioCompanies.map(c => c.name).join(', ') + ' — Canonical portfolio'
            }, '★'));
        }
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

    /* ---------- INVESTOR INDEX ---------- */
    function normalizeInvestorKey(rawName) {
        if (!rawName) return null;
        // Strip parentheticals; lowercase; collapse whitespace
        const stripped = rawName.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
        if (!stripped) return null;
        if (BLACKLIST_INVESTORS.has(stripped)) return null;
        // Apply alias map (against full original lowercased form first, then stripped)
        const fullLower = rawName.toLowerCase().trim();
        const aliasFull = INVESTOR_ALIASES[fullLower];
        const aliasStripped = INVESTOR_ALIASES[stripped];
        const display = aliasFull || aliasStripped || rawName.replace(/\s*\([^)]*\)\s*$/, '').trim();
        return { key: display.toLowerCase(), display };
    }

    function splitInvestorString(s) {
        // Handle multi-investor entries like "Microsoft + Amazon + OpenAI" or "Alibaba, Geely"
        return s.split(/\s*(?:\+|,|&)\s*/).map(x => x.trim()).filter(Boolean);
    }

    function buildInvestorIndex() {
        const idx = new Map();
        function add(rawName, sectorId, companyName) {
            const norm = normalizeInvestorKey(rawName);
            if (!norm) return;
            if (!idx.has(norm.key)) {
                idx.set(norm.key, {
                    display: norm.display,
                    sectors: new Set(),
                    companies: new Set(),
                    annotations: new Set()
                });
            }
            const entry = idx.get(norm.key);
            if (sectorId) entry.sectors.add(sectorId);
            if (companyName) entry.companies.add(companyName);
            // Pull annotation from parens if any
            const annMatch = rawName.match(/\(([^)]+)\)\s*$/);
            if (annMatch) entry.annotations.add(annMatch[1].trim());
        }
        DATA.subsectors.forEach(s => {
            (s.top_investors || []).forEach(inv => {
                splitInvestorString(inv).forEach(part => add(part, s.id, null));
            });
        });
        const flows = DATA.scenes.us_china_flows;
        if (flows) {
            (flows.us_flows || []).concat(flows.china_flows || []).forEach(f => {
                f.investors.forEach(inv => add(inv, null, f.company));
            });
        }
        return idx;
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
        f.investor = null;
        writeFilters(f);
        renderDrawer(s);
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        drawerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function openInvestor(key) {
        if (!INVESTORS) return;
        const lookupKey = key.toLowerCase();
        const entry = INVESTORS.get(lookupKey);
        if (!entry) return;
        const f = readFilters();
        f.investor = entry.display;
        f.sector = null;
        writeFilters(f);
        renderInvestor(entry);
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
        f.investor = null;
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
        let anyLive = false;
        s.top_companies.forEach(c => {
            const nameCell = el('td');
            if (c.canonical_portfolio) nameCell.classList.add('pai-d-portfolio-row');
            nameCell.appendChild(companyLink(c.name));
            if (c.flag) {
                const flagEl = el('span', { class: 'pai-d-flag' + (c.flag === 'public-market-cap' ? ' public' : '') }, c.flag.replace(/-/g, ' '));
                nameCell.appendChild(flagEl);
            }
            // Canonical portfolio pill — links to the internal /companies/<slug>.html page
            if (c.canonical_portfolio && c.portfolio_url) {
                nameCell.appendChild(el('a', {
                    class: 'pai-d-flag pai-d-flag-canonical',
                    href: c.portfolio_url,
                    title: 'A Canonical portfolio company'
                }, '★ Canonical'));
            }
            // Ticker row: always show for public-market-cap companies. Add live price if available.
            if (c.ticker) {
                const live = LIVE_QUOTES && LIVE_QUOTES[c.ticker];
                const meta = el('div', { class: 'pai-live-meta' });
                meta.appendChild(el('a', {
                    class: 'pai-live-ticker',
                    href: tickerExchangeUrl(c.ticker),
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    title: 'View ' + c.ticker + ' on Google Finance'
                }, tickerExchangeLabel(c.ticker)));
                if (live && live.price != null) {
                    anyLive = true;
                    meta.appendChild(el('span', { class: 'pai-live-dot', title: 'Daily close · ' + (live.date || '') }));
                    meta.appendChild(el('span', { class: 'pai-live-price' }, fmtPriceUSD(live.price)));
                    if (live.change_pct != null) {
                        meta.appendChild(el('span', {
                            class: 'pai-live-delta ' + (live.change_pct >= 0 ? 'pai-live-up' : 'pai-live-down')
                        }, fmtSignedPct1(live.change_pct)));
                    }
                }
                nameCell.appendChild(meta);
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
        if (anyLive && DATA.live_quotes && DATA.live_quotes.updated) {
            compSec.appendChild(el('div', { class: 'pai-live-footnote' },
                'Daily-refreshed close prices via Stooq, last updated ' + DATA.live_quotes.updated +
                '. Stored Val column is the point-in-time market cap from data.json (quarterly refresh).'
            ));
        } else if (s.top_companies.some(c => c.ticker)) {
            compSec.appendChild(el('div', { class: 'pai-live-footnote pai-live-footnote-stale' },
                'Live daily-refresh pending. Click any ticker symbol above for the current price on Google Finance.'
            ));
        }
        drawerInner.appendChild(compSec);

        // Investors
        if (s.top_investors && s.top_investors.length) {
            const invSec = el('div', { class: 'pai-d-section' },
                el('div', { class: 'pai-d-section-label' }, 'Active investors')
            );
            const invList = el('div', { class: 'pai-d-investors' });
            s.top_investors.forEach(rawEntry => {
                // Each top_investors entry might be a single name or a + separated group.
                // Render each name as a clickable pill that opens that investor's coverage view.
                const parts = splitInvestorString(rawEntry);
                parts.forEach(part => {
                    const norm = normalizeInvestorKey(part);
                    if (!norm) {
                        invList.appendChild(el('span', { class: 'pai-d-investor' }, part));
                        return;
                    }
                    // Display: if the part has a parenthetical annotation, preserve it
                    const annMatch = part.match(/\(([^)]+)\)\s*$/);
                    const label = annMatch ? norm.display + ' (' + annMatch[1] + ')' : norm.display;
                    invList.appendChild(el('button', {
                        class: 'pai-d-investor pai-d-investor-btn',
                        onclick: (e) => { e.stopPropagation(); openInvestor(norm.key); }
                    }, label));
                });
            });
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

    function renderInvestor(entry) {
        drawerInner.innerHTML = '';

        drawerInner.appendChild(el('button', {
            class: 'pai-drawer-close',
            'aria-label': 'Close panel',
            onclick: closeDrawer
        }, '×'));

        // Resolve sectors and aggregate
        const sectors = Array.from(entry.sectors).map(id => DATA.subsectors.find(s => s.id === id)).filter(Boolean);
        sectors.sort((a, b) => (b.capital_2024_25_m || 0) - (a.capital_2024_25_m || 0));

        const totalCapital = sectors.reduce((sum, s) => sum + (s.capital_2024_25_m || 0), 0);
        const layerBreakdown = { embodiment: 0, domain: 0, stack: 0 };
        sectors.forEach(s => { layerBreakdown[s.layer] = (layerBreakdown[s.layer] || 0) + 1; });

        // Header
        const header = el('div', { class: 'pai-d-header' },
            el('div', { class: 'pai-d-meta-row' },
                el('span', { class: 'pai-card-layer pai-investor-label' }, 'INVESTOR'),
                entry.annotations.size
                    ? el('span', { class: 'pai-d-num pai-investor-ann' }, Array.from(entry.annotations).join(' · '))
                    : null
            ),
            el('h2', { class: 'pai-d-title', id: 'drawer-title' }, entry.display)
        );
        drawerInner.appendChild(header);

        // Stats: # sub-sectors, # named companies, layer breakdown
        const stats = el('div', { class: 'pai-d-stats' });
        stats.appendChild(el('div', null,
            el('div', { class: 'pai-d-stat-k' }, 'Sub-sectors'),
            el('div', { class: 'pai-d-stat-v' }, String(sectors.length))
        ));
        stats.appendChild(el('div', null,
            el('div', { class: 'pai-d-stat-k' }, 'Sector capital total'),
            el('div', { class: 'pai-d-stat-v' }, fmtB(totalCapital))
        ));
        stats.appendChild(el('div', null,
            el('div', { class: 'pai-d-stat-k' }, 'Layer mix'),
            el('div', { class: 'pai-d-stat-v pai-investor-layers' },
                (layerBreakdown.embodiment ? layerBreakdown.embodiment + 'E ' : '') +
                (layerBreakdown.domain ? layerBreakdown.domain + 'D ' : '') +
                (layerBreakdown.stack ? layerBreakdown.stack + 'S' : '')
            )
        ));
        drawerInner.appendChild(stats);

        // Reading
        drawerInner.appendChild(el('div', { class: 'pai-d-section' },
            el('div', { class: 'pai-d-section-label' }, 'How to read this'),
            el('div', { class: 'pai-d-pov-body' },
                entry.display + ' shows up as a top-named investor in the sub-sectors below. ' +
                'Sector capital total is the sum of all 2024–25 venture into those sub-sectors, not ' +
                entry.display + '\'s own check size. Use it as a coverage map, not a deployment ledger.'
            )
        ));

        // Sub-sectors list
        if (sectors.length) {
            const secList = el('div', { class: 'pai-d-section' },
                el('div', { class: 'pai-d-section-label' }, 'Sub-sectors (' + sectors.length + ')')
            );
            const grid = el('div', { class: 'pai-investor-sector-grid' });
            sectors.forEach(s => {
                const card = el('div', { class: 'pai-investor-sector-card', onclick: () => openSector(s.id) },
                    el('div', { class: 'pai-investor-sector-top' },
                        el('span', { class: 'pai-card-num' }, s.number),
                        el('span', { class: 'pai-card-layer' }, s.layer)
                    ),
                    el('div', { class: 'pai-investor-sector-name' }, s.name),
                    el('div', { class: 'pai-investor-sector-stat' },
                        fmtB(s.capital_2024_25_m) + ' · ' + s.deals_count + ' deals'
                    )
                );
                grid.appendChild(card);
            });
            secList.appendChild(grid);
            drawerInner.appendChild(secList);
        }

        // Named companies (from us_china_flows)
        if (entry.companies.size) {
            const compSec = el('div', { class: 'pai-d-section' },
                el('div', { class: 'pai-d-section-label' }, 'Named portfolio companies (' + entry.companies.size + ')'),
                el('div', { class: 'pai-d-section-note' },
                    'Pulled from the US/China humanoid flows scene. Other portfolio investments live in the sub-sector cards.')
            );
            const list = el('div', { class: 'pai-d-investors' });
            Array.from(entry.companies).forEach(c => {
                const url = COMPANY_URLS[c];
                if (url) {
                    list.appendChild(el('a', {
                        class: 'pai-d-investor pai-d-investor-co',
                        href: url, target: '_blank', rel: 'noopener'
                    }, c));
                } else {
                    list.appendChild(el('span', { class: 'pai-d-investor' }, c));
                }
            });
            compSec.appendChild(list);
            drawerInner.appendChild(compSec);
        }

        // Footer
        const sub = encodeURIComponent('Physical AI Map — ' + entry.display);
        drawerInner.appendChild(el('div', { class: 'pai-d-footer' },
            el('span', null, 'Coverage view · v' + (DATA.meta && DATA.meta.version || '0.1')),
            el('a', { href: 'mailto:hello@canonical.cc?subject=' + sub }, 'Discuss ' + entry.display + ' →')
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

        INVESTORS = buildInvestorIndex();

        // Live quotes are populated server-side by a daily GitHub Action (see
        // .github/workflows/refresh-quotes.yml) and committed to data.live_quotes.quotes.
        // We just read what's in the file; no client-side fetching (browser CORS blocks Stooq/Yahoo).
        if (DATA.live_quotes && DATA.live_quotes.quotes) {
            LIVE_QUOTES = DATA.live_quotes.quotes;
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

        // open sector or investor from URL if present (sector wins if both present)
        const f = readFilters();
        if (f.sector) openSector(f.sector);
        else if (f.investor) openInvestor(f.investor);

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
