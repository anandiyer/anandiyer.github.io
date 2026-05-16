/* Power Law Outlier Lab — simulation + UI */
(function () {
    'use strict';

    // ---------- State ----------
    const DEFAULTS = {
        fundSize: 50,
        N: 25,
        reserves: 40,
        ownership: 1.0,
        followon: 'prorata',
        lossRate: 50,
        alpha: 1.2,
        tailCap: 500,
        mgmtFee: 2.0,
        carry: 20,
        life: 10,
        trials: 10000
    };

    const PRESETS = {
        seed:    { fundSize: 50,  N: 25, reserves: 40, ownership: 1.0, followon: 'prorata', lossRate: 50, alpha: 1.20, tailCap: 500, mgmtFee: 2.0, carry: 20, life: 10, trials: 10000 },
        seriesA: { fundSize: 150, N: 18, reserves: 50, ownership: 1.0, followon: 'prorata', lossRate: 35, alpha: 1.50, tailCap: 120, mgmtFee: 2.0, carry: 20, life: 10, trials: 10000 },
        growth:  { fundSize: 400, N: 12, reserves: 35, ownership: 1.0, followon: 'prorata', lossRate: 15, alpha: 1.80, tailCap: 30,  mgmtFee: 2.0, carry: 20, life: 8,  trials: 10000 },
        custom:  null
    };

    const SCENARIOS = [
        {
            id: 'n-debate',
            num: '01',
            title: 'The N debate',
            tagline: 'Same fund size, same outcome shape. Index 50 names — watch the tail die.',
            full: true,
            preset: { ...PRESETS.seed, N: 50, reserves: 25, followon: 'prorata' },
            narrative: [
                'Set N to 15 — the classic concentrated seed strategy — and you get fat upside and the variance to match. Slide N to 50 and the histogram visibly narrows. Same fund size. Same outcome distribution. Same expected per-company multiple. What changes is the chance that a power-law winner shows up <em>somewhere</em> in your portfolio.',
                'The trap is intuitive: more names feels safer. And it is, if you measure "safety" as a tighter distribution around the median. But the median in venture is bad. LPs are paying for the right tail. Index a power law and you pay for the tail in fees while squeezing it out of your portfolio. The N debate is really a debate about whether you want to hold a fund that <em>could</em> return 5x, or one that almost certainly returns 1.5x.'
            ]
        },
        {
            id: 'followon',
            num: '02',
            title: 'Follow-on math',
            tagline: 'Pro-rata everywhere vs. super pro-rata into winners only. Same dollars. Different fund.',
            full: true,
            preset: { ...PRESETS.seed, followon: 'superprorata' },
            narrative: [
                'Toggle follow-on between <strong>Pro-rata</strong> and <strong>Super pro-rata</strong>. Both spend the same reserve pool. Pro-rata splits the reserves evenly across the portfolio; super pro-rata loads them into the realized winners. Median TVPI moves materially. So does P(&gt;5x).',
                'The reason: power-law math compounds. A 30x company that receives an additional follow-on dollar at a marked-up price still returns more capital than spreading that dollar across 25 average outcomes. Reserves are not a hedge — they are a second swing at the same pitch. The discipline is to put reserves where the data says, not where the relationships say.'
            ]
        },
        {
            id: 'ownership',
            num: '03',
            title: 'Ownership matters more than you think',
            tagline: 'Same outcomes. Move ownership from 0.5x to 2.0x. The effect is linear and obvious.',
            full: false,
            preset: { ...PRESETS.seed, ownership: 1.5 }
        },
        {
            id: 'seed-vs-growth',
            num: '04',
            title: 'Why seed beats growth at the fund level',
            tagline: 'Identical capital. Different outcome shapes. Thinner tails cap your TVPI.',
            full: false,
            preset: { ...PRESETS.growth }
        },
        {
            id: '1-over-n',
            num: '05',
            title: 'The 1/N illusion',
            tagline: 'Uniform check sizes vs. concentration. Identical winners. Different fund returns.',
            full: false,
            preset: { ...PRESETS.seed, reserves: 10, N: 30 }
        },
        {
            id: 'survivorship',
            num: '06',
            title: 'Survivorship in your memory',
            tagline: 'Replay "Sequoia 1995" thousands of times. Most runs of identical strategy are mediocre.',
            full: false,
            preset: { ...PRESETS.seed, alpha: 1.10, tailCap: 1000, lossRate: 65 }
        }
    ];

    let state = { ...DEFAULTS };
    let lastResult = null;
    let renderTimer = null;

    // ---------- URL state ----------
    function encodeState(s) {
        const params = new URLSearchParams();
        Object.keys(s).forEach(k => params.set(k, String(s[k])));
        return params.toString();
    }
    function decodeState() {
        if (!location.hash || location.hash.length < 2) return null;
        const params = new URLSearchParams(location.hash.slice(1));
        const out = {};
        for (const [k, v] of params.entries()) {
            if (k in DEFAULTS) {
                const def = DEFAULTS[k];
                out[k] = (typeof def === 'number') ? Number(v) : v;
            }
        }
        return Object.keys(out).length ? out : null;
    }
    function updateHash() {
        history.replaceState(null, '', '#' + encodeState(state));
    }

    // ---------- Simulation ----------

    // Truncated Pareto sampler. alpha > 0, xMin >= 1, xMax > xMin.
    function sampleTruncatedPareto(alpha, xMin, xMax) {
        // F(x) = 1 - (xMin/x)^alpha. To truncate at xMax, sample u in [0, Fmax).
        const ratio = xMin / xMax;
        const uMax = 1 - Math.pow(ratio, alpha);
        const u = Math.random() * uMax;
        return xMin / Math.pow(1 - u, 1 / alpha);
    }

    // Analytic mean of truncated Pareto with xMin=1, shape alpha>1.
    // E[X] = alpha/(alpha-1) * (1 - cap^(1-alpha)) / (1 - cap^(-alpha))
    function meanTruncatedPareto(alpha, xMax) {
        if (Math.abs(alpha - 1) < 1e-6) {
            // alpha == 1 → E[X] = ln(xMax) / (1 - 1/xMax)
            return Math.log(xMax) / (1 - 1 / xMax);
        }
        const num = (1 - Math.pow(xMax, 1 - alpha));
        const den = (1 - Math.pow(xMax, -alpha));
        return (alpha / (alpha - 1)) * (num / den);
    }

    function meanPerCompany(lossRate01, alpha, tailCap) {
        return (1 - lossRate01) * meanTruncatedPareto(alpha, tailCap);
    }

    // One trial: returns { tvpi, top1Share, top3Share, top10Share, withoutTop1TVPI }
    function runTrial(p) {
        const N = p.N;
        const reserves01 = p.reserves / 100;
        const lossRate01 = p.lossRate / 100;
        const alpha = p.alpha;
        const tailCap = p.tailCap;
        const ownership = p.ownership;

        const initialCapital = p.fundSize * (1 - reserves01);  // $M deployed at entry
        const reserveCapital = p.fundSize * reserves01;        // $M reserved
        const initialCheck = initialCapital / N;               // $M per initial check

        // Draw per-company multiples
        const multiples = new Array(N);
        for (let i = 0; i < N; i++) {
            if (Math.random() < lossRate01) {
                multiples[i] = 0;
            } else {
                multiples[i] = sampleTruncatedPareto(alpha, 1, tailCap);
            }
        }

        // Determine follow-on allocation per company
        let followOn = new Array(N).fill(0);
        if (p.followon === 'prorata') {
            const perCo = reserveCapital / N;
            for (let i = 0; i < N; i++) followOn[i] = perCo;
        } else if (p.followon === 'superprorata') {
            // Top 30% of companies (by realized multiple) get all reserves, equally
            const idxs = multiples
                .map((m, i) => ({ m, i }))
                .sort((a, b) => b.m - a.m);
            const k = Math.max(1, Math.round(0.3 * N));
            const perCo = reserveCapital / k;
            for (let j = 0; j < k; j++) followOn[idxs[j].i] = perCo;
        } else {
            // 'none' — reserves returned at 1.0x, no follow-on
        }

        // Per-company gross return (apply ownership multiplier to outcome)
        const grossPerCo = new Array(N);
        for (let i = 0; i < N; i++) {
            const invested = initialCheck + followOn[i];
            grossPerCo[i] = invested * multiples[i] * ownership;
        }

        // If no follow-on, reserves come back as $reserveCapital * 1.0
        const reservesReturned = (p.followon === 'none') ? reserveCapital : 0;

        // Total invested across portfolio (initial + deployed reserves)
        const totalInvested = initialCapital + (p.followon === 'none' ? 0 : reserveCapital);

        let grossReturn = grossPerCo.reduce((a, b) => a + b, 0) + reservesReturned;

        // Fees: mgmt fee per year over total fund
        const totalMgmtFee = (p.mgmtFee / 100) * p.life * p.fundSize;

        // Net pre-carry = gross - fees (fees come from LP commitments effectively)
        let netPreCarry = grossReturn - totalMgmtFee;

        // Carry on profits over 1.0x committed
        let netToLP = netPreCarry;
        if (netPreCarry > p.fundSize) {
            const profit = netPreCarry - p.fundSize;
            netToLP -= profit * (p.carry / 100);
        }

        const tvpi = netToLP / p.fundSize;

        // Sources of return — by gross contribution, sorted desc
        const sorted = grossPerCo.slice().sort((a, b) => b - a);
        const totalCo = sorted.reduce((a, b) => a + b, 0) || 1; // avoid div0
        const top1Share = sorted[0] / totalCo;
        const top3Share = sorted.slice(0, 3).reduce((a, b) => a + b, 0) / totalCo;
        const top10Share = sorted.slice(0, Math.min(10, N)).reduce((a, b) => a + b, 0) / totalCo;

        // "Without top 1": recompute TVPI removing top company's gross
        const grossNoTop = grossReturn - sorted[0];
        let netNoTop = grossNoTop - totalMgmtFee;
        if (netNoTop > p.fundSize) {
            netNoTop -= (netNoTop - p.fundSize) * (p.carry / 100);
        }
        const tvpiNoTop = netNoTop / p.fundSize;

        return { tvpi, top1Share, top3Share, top10Share, tvpiNoTop };
    }

    function runSimulation(p) {
        const t0 = performance.now();
        const trials = p.trials;
        const tvpis = new Float64Array(trials);
        let sumTop1 = 0, sumTop3 = 0, sumTop10 = 0, sumNoTop = 0;

        for (let i = 0; i < trials; i++) {
            const r = runTrial(p);
            tvpis[i] = r.tvpi;
            sumTop1 += r.top1Share;
            sumTop3 += r.top3Share;
            sumTop10 += r.top10Share;
            sumNoTop += r.tvpiNoTop;
        }

        const sortedTVPI = Array.from(tvpis).sort((a, b) => a - b);
        const q = (frac) => sortedTVPI[Math.max(0, Math.min(trials - 1, Math.floor(frac * trials)))];
        const mean = Array.from(tvpis).reduce((a, b) => a + b, 0) / trials;

        const countAbove = (thresh) => {
            let c = 0;
            for (let i = 0; i < trials; i++) if (tvpis[i] >= thresh) c++;
            return c / trials;
        };

        return {
            tvpis: Array.from(tvpis),
            mean,
            quantiles: {
                p10: q(0.10), p25: q(0.25), p50: q(0.50), p75: q(0.75), p90: q(0.90),
                p95: q(0.95), p99: q(0.99)
            },
            pAbove3x: countAbove(3),
            pAbove5x: countAbove(5),
            avgTop1Share: sumTop1 / trials,
            avgTop3Share: sumTop3 / trials,
            avgTop10Share: sumTop10 / trials,
            avgTVPINoTop: sumNoTop / trials,
            timeMs: performance.now() - t0
        };
    }

    function pLoss(tvpis) {
        let c = 0;
        for (let i = 0; i < tvpis.length; i++) if (tvpis[i] < 1.0) c++;
        return c / tvpis.length;
    }

    // ---------- D3 histogram ----------
    const histEl = document.getElementById('histogram');
    let histSvg = null;

    function colorBucket(x) {
        if (x < 1) return 'loss';
        if (x < 3) return 'mediocre';
        if (x < 10) return 'winner';
        return 'outlier';
    }

    function renderHistogram(result) {
        if (!window.d3) return;

        const rect = histEl.getBoundingClientRect();
        const width = rect.width;
        const height = 360;
        const margin = { top: 28, right: 16, bottom: 36, left: 40 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;

        const tvpis = result.tvpis;
        // Show out to ~p99 so the outlier bucket is visible. Clamp to a humane range.
        const xMax = Math.max(5, Math.min(30, result.quantiles.p99 * 1.1));

        // Build bins. Use 36 fixed-width bins.
        const numBins = 36;
        const binSize = xMax / numBins;
        const bins = new Array(numBins).fill(0);
        let overflow = 0;
        for (let i = 0; i < tvpis.length; i++) {
            const v = tvpis[i];
            if (v < 0) {
                bins[0]++;
            } else if (v >= xMax) {
                overflow++;
            } else {
                const idx = Math.min(numBins - 1, Math.floor(v / binSize));
                bins[idx]++;
            }
        }
        // Add overflow to last bin for display
        bins[numBins - 1] += overflow;

        const total = tvpis.length;
        const yMax = d3.max(bins) / total;

        const x = d3.scaleLinear().domain([0, xMax]).range([0, innerW]);
        const y = d3.scaleLinear().domain([0, yMax * 1.1]).range([innerH, 0]);

        // Create / reuse SVG
        let svg = d3.select(histEl).select('svg');
        if (svg.empty()) {
            svg = d3.select(histEl).append('svg')
                .attr('viewBox', `0 0 ${width} ${height}`)
                .attr('preserveAspectRatio', 'none');
        } else {
            svg.attr('viewBox', `0 0 ${width} ${height}`);
        }
        let g = svg.select('g.root');
        if (g.empty()) {
            g = svg.append('g').attr('class', 'root').attr('transform', `translate(${margin.left},${margin.top})`);
            g.append('g').attr('class', 'bars');
            g.append('g').attr('class', 'x-axis hist-axis').attr('transform', `translate(0,${innerH})`);
            g.append('g').attr('class', 'y-axis hist-axis');
            g.append('g').attr('class', 'quantiles');
        } else {
            g.attr('transform', `translate(${margin.left},${margin.top})`);
        }

        // Bars
        const barW = innerW / numBins;
        const barData = bins.map((c, i) => {
            const midX = (i + 0.5) * binSize;
            return { i, count: c, frac: c / total, cls: colorBucket(midX) };
        });

        const bars = g.select('.bars').selectAll('rect.hist-bar').data(barData);

        bars.exit().remove();

        const barsEnter = bars.enter().append('rect')
            .attr('class', d => `hist-bar ${d.cls}`)
            .attr('x', d => d.i * barW + 1)
            .attr('width', Math.max(1, barW - 2))
            .attr('y', innerH)
            .attr('height', 0);

        bars.merge(barsEnter)
            .attr('class', d => `hist-bar ${d.cls}`)
            .transition().duration(180).ease(d3.easeCubicOut)
            .attr('x', d => d.i * barW + 1)
            .attr('width', Math.max(1, barW - 2))
            .attr('y', d => y(d.frac))
            .attr('height', d => innerH - y(d.frac));

        // Axes
        const xAxis = d3.axisBottom(x)
            .ticks(8)
            .tickFormat(d => d + 'x');
        const yAxis = d3.axisLeft(y)
            .ticks(5)
            .tickFormat(d => Math.round(d * 100) + '%');
        g.select('.x-axis').transition().duration(180).call(xAxis);
        g.select('.y-axis').transition().duration(180).call(yAxis);

        // Quantile markers
        const quantiles = [
            { key: 'p10', val: result.quantiles.p10 },
            { key: 'p25', val: result.quantiles.p25 },
            { key: 'p50', val: result.quantiles.p50 },
            { key: 'p75', val: result.quantiles.p75 },
            { key: 'p90', val: result.quantiles.p90 }
        ].filter(d => d.val <= xMax);

        const qG = g.select('.quantiles');
        const qLines = qG.selectAll('g.quantile').data(quantiles, d => d.key);

        qLines.exit().remove();

        const qEnter = qLines.enter().append('g').attr('class', 'quantile');
        qEnter.append('line').attr('class', 'quantile-line').attr('y1', 0).attr('y2', innerH);
        qEnter.append('rect').attr('class', 'quantile-label-bg').attr('rx', 3);
        qEnter.append('text').attr('class', 'quantile-label');

        const merged = qLines.merge(qEnter);
        merged.transition().duration(180)
            .attr('transform', d => `translate(${x(d.val)}, 0)`);

        merged.select('line').attr('y1', 0).attr('y2', innerH);
        merged.select('text')
            .attr('y', -10)
            .text(d => `${d.key.toUpperCase()} ${d.val.toFixed(2)}x`);
        // Position label background after text renders
        merged.each(function () {
            const sel = d3.select(this);
            const textNode = sel.select('text').node();
            if (!textNode) return;
            try {
                const bb = textNode.getBBox();
                sel.select('rect')
                    .attr('x', bb.x - 4)
                    .attr('y', bb.y - 1)
                    .attr('width', bb.width + 8)
                    .attr('height', bb.height + 2);
            } catch (e) { /* getBBox can throw on hidden elements */ }
        });
    }

    // ---------- UI wiring ----------

    const ctlIds = {
        fundSize: 'ctl-fundSize',
        N: 'ctl-N',
        reserves: 'ctl-reserves',
        ownership: 'ctl-ownership',
        followon: 'ctl-followon',
        lossRate: 'ctl-lossRate',
        alpha: 'ctl-alpha',
        tailCap: 'ctl-tailCap',
        mgmtFee: 'ctl-mgmtFee',
        carry: 'ctl-carry',
        life: 'ctl-life',
        trials: 'ctl-trials'
    };

    const valIds = {
        fundSize: 'val-fundSize',
        N: 'val-N',
        reserves: 'val-reserves',
        ownership: 'val-ownership',
        lossRate: 'val-lossRate',
        alpha: 'val-alpha',
        tailCap: 'val-tailCap',
        mgmtFee: 'val-mgmtFee',
        carry: 'val-carry',
        life: 'val-life',
        trials: 'val-trials',
        checkSize: 'val-checkSize',
        evMultiple: 'val-evMultiple'
    };

    function fmtUSD(M) {
        if (M >= 1000) return `$${(M / 1000).toFixed(1)}B`;
        return `$${M}M`;
    }
    function fmtCheck(M) {
        if (M < 1) return `$${(M * 1000).toFixed(0)}K`;
        return `$${M.toFixed(1)}M`;
    }
    function fmtPct(p, digits = 0) {
        return `${(p * 100).toFixed(digits)}%`;
    }
    function fmtMultiple(x, digits = 2) {
        return `${x.toFixed(digits)}x`;
    }

    function readControlsToState() {
        state.fundSize = +document.getElementById(ctlIds.fundSize).value;
        state.N = +document.getElementById(ctlIds.N).value;
        state.reserves = +document.getElementById(ctlIds.reserves).value;
        state.ownership = +document.getElementById(ctlIds.ownership).value;
        state.followon = document.getElementById(ctlIds.followon).value;
        state.lossRate = +document.getElementById(ctlIds.lossRate).value;
        state.alpha = +document.getElementById(ctlIds.alpha).value;
        state.tailCap = +document.getElementById(ctlIds.tailCap).value;
        state.mgmtFee = +document.getElementById(ctlIds.mgmtFee).value;
        state.carry = +document.getElementById(ctlIds.carry).value;
        state.life = +document.getElementById(ctlIds.life).value;
        state.trials = +document.getElementById(ctlIds.trials).value;
    }

    function writeStateToControls() {
        document.getElementById(ctlIds.fundSize).value = state.fundSize;
        document.getElementById(ctlIds.N).value = state.N;
        document.getElementById(ctlIds.reserves).value = state.reserves;
        document.getElementById(ctlIds.ownership).value = state.ownership;
        document.getElementById(ctlIds.followon).value = state.followon;
        document.getElementById(ctlIds.lossRate).value = state.lossRate;
        document.getElementById(ctlIds.alpha).value = state.alpha;
        document.getElementById(ctlIds.tailCap).value = state.tailCap;
        document.getElementById(ctlIds.mgmtFee).value = state.mgmtFee;
        document.getElementById(ctlIds.carry).value = state.carry;
        document.getElementById(ctlIds.life).value = state.life;
        document.getElementById(ctlIds.trials).value = state.trials;
    }

    function refreshLabels() {
        document.getElementById(valIds.fundSize).textContent = fmtUSD(state.fundSize);
        document.getElementById(valIds.N).textContent = state.N;
        document.getElementById(valIds.reserves).textContent = `${state.reserves}%`;
        document.getElementById(valIds.ownership).textContent = `${state.ownership.toFixed(2)}x`;
        document.getElementById(valIds.lossRate).textContent = `${state.lossRate}%`;
        document.getElementById(valIds.alpha).textContent = state.alpha.toFixed(2);
        document.getElementById(valIds.tailCap).textContent = `${state.tailCap}x`;
        document.getElementById(valIds.mgmtFee).textContent = `${state.mgmtFee.toFixed(1)}%`;
        document.getElementById(valIds.carry).textContent = `${state.carry}%`;
        document.getElementById(valIds.life).textContent = state.life;
        document.getElementById(valIds.trials).textContent = state.trials.toLocaleString();

        // Derived: initial check size
        const reserves01 = state.reserves / 100;
        const initialCheck = state.fundSize * (1 - reserves01) / state.N;
        document.getElementById(valIds.checkSize).textContent = fmtCheck(initialCheck);

        // Derived: E[per-co multiple]
        const ev = meanPerCompany(state.lossRate / 100, state.alpha, state.tailCap);
        document.getElementById(valIds.evMultiple).textContent = fmtMultiple(ev, 2);
    }

    function refreshKPIs(result) {
        const mean = result.mean;
        const q = result.quantiles;
        document.getElementById('kpi-mean').textContent = fmtMultiple(mean);
        document.getElementById('kpi-p50').textContent = fmtMultiple(q.p50);
        document.getElementById('kpi-p3x').textContent = fmtPct(result.pAbove3x, 0);
        document.getElementById('kpi-p5x').textContent = fmtPct(result.pAbove5x, 0);
        document.getElementById('kpi-ploss').textContent = fmtPct(pLoss(result.tvpis), 0);
        document.getElementById('kpi-time').textContent = `${result.timeMs.toFixed(0)} ms`;

        // Sources
        document.getElementById('src-top1').textContent = fmtPct(result.avgTop1Share, 0);
        document.getElementById('src-top3').textContent = fmtPct(result.avgTop3Share, 0);
        document.getElementById('src-top10').textContent = fmtPct(result.avgTop10Share, 0);
        document.getElementById('src-notop').textContent = fmtMultiple(result.avgTVPINoTop);

        // Trial count label
        document.getElementById('hist-trial-count').textContent = state.trials.toLocaleString();
    }

    function rerun() {
        refreshLabels();
        const result = runSimulation(state);
        lastResult = result;
        refreshKPIs(result);
        renderHistogram(result);
        updateHash();
    }

    function scheduleRerun() {
        if (renderTimer) clearTimeout(renderTimer);
        renderTimer = setTimeout(rerun, 80);
    }

    function applyPreset(name) {
        if (name === 'custom' || !PRESETS[name]) return;
        state = { ...DEFAULTS, ...PRESETS[name] };
        writeStateToControls();
        rerun();
    }

    function setActiveChip(name) {
        document.querySelectorAll('.preset-chip').forEach(el => {
            el.classList.toggle('active', el.dataset.preset === name);
        });
    }

    function detectActivePreset() {
        // Match state against known presets (lossless for the values we track)
        for (const [name, preset] of Object.entries(PRESETS)) {
            if (!preset) continue;
            let match = true;
            for (const k of Object.keys(preset)) {
                if (state[k] !== preset[k]) { match = false; break; }
            }
            if (match) return name;
        }
        return 'custom';
    }

    function bindControls() {
        // Range and select inputs
        Object.values(ctlIds).forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const evt = el.tagName === 'SELECT' ? 'change' : 'input';
            el.addEventListener(evt, () => {
                readControlsToState();
                setActiveChip(detectActivePreset());
                refreshLabels();
                scheduleRerun();
            });
        });

        // Preset chips
        document.querySelectorAll('.preset-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const name = chip.dataset.preset;
                if (name === 'custom') {
                    setActiveChip('custom');
                    return;
                }
                applyPreset(name);
                setActiveChip(name);
            });
        });

        // Buttons
        document.getElementById('btn-rerun').addEventListener('click', rerun);
        document.getElementById('btn-reset').addEventListener('click', () => {
            applyPreset('seed');
            setActiveChip('seed');
            hideScenarioCallout();
        });
        document.getElementById('btn-share').addEventListener('click', () => {
            updateHash();
            const url = location.href;
            navigator.clipboard.writeText(url).then(() => {
                const btn = document.getElementById('btn-share');
                const orig = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = orig; }, 1400);
            }).catch(() => {
                window.prompt('Copy this URL:', url);
            });
        });

        // Scenario dismiss
        document.getElementById('scenario-dismiss').addEventListener('click', hideScenarioCallout);
    }

    // ---------- Scenarios ----------
    function renderScenarioCards() {
        const grid = document.getElementById('scenarios-grid');
        grid.innerHTML = SCENARIOS.map(s => `
            <button class="scenario-card" data-id="${s.id}">
                <div class="scenario-card-num">SCENARIO ${s.num}</div>
                <div class="scenario-card-title">${s.title}</div>
                <div class="scenario-card-tagline">${s.tagline}</div>
                <div class="scenario-card-cta">Load scenario <span>&rarr;</span></div>
            </button>
        `).join('');

        grid.querySelectorAll('.scenario-card').forEach(card => {
            card.addEventListener('click', () => loadScenario(card.dataset.id));
        });
    }

    function showScenarioCallout(scn) {
        const co = document.getElementById('scenario-callout');
        document.getElementById('scenario-title').textContent = `${scn.num} · ${scn.title}`;
        const bodyEl = document.getElementById('scenario-body');
        if (scn.full && scn.narrative) {
            bodyEl.innerHTML = scn.narrative.map(p => `<p>${p}</p>`).join('');
        } else {
            bodyEl.innerHTML = `<p>${scn.tagline}</p><p style="color: rgba(255,255,255,0.55); font-style: italic;">Full narrative coming soon. Play with the sliders — see what changes.</p>`;
        }
        co.classList.remove('hidden');
    }

    function hideScenarioCallout() {
        document.getElementById('scenario-callout').classList.add('hidden');
    }

    function loadScenario(id) {
        const scn = SCENARIOS.find(s => s.id === id);
        if (!scn) return;
        state = { ...DEFAULTS, ...scn.preset };
        writeStateToControls();
        setActiveChip(detectActivePreset());
        showScenarioCallout(scn);
        rerun();
        // Scroll to the lab so the user sees the result
        document.querySelector('.lab-main').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---------- Tooltip portaling ----------
    // Tooltips inside the scrolling .lab-controls panel get clipped by its
    // overflow. On hover/focus, switch the tooltip to position:fixed and
    // compute coordinates from the trigger's viewport rect. Reset on leave.
    function positionFloatingTooltip(wrap) {
        const content = wrap.querySelector(':scope > .tip-content');
        if (!content) return;
        const rect = wrap.getBoundingClientRect();
        const isBelow = content.classList.contains('tip-content--below');
        content.classList.add('floating');
        // Measure after switch so we know the tooltip's height.
        const ttRect = content.getBoundingClientRect();
        const margin = 10;
        let top;
        if (isBelow) {
            top = rect.bottom + margin;
        } else {
            top = rect.top - ttRect.height - margin;
            if (top < 8) top = rect.bottom + margin; // flip if no room above
        }
        // Horizontal: prefer left-aligned with the trigger; clamp to viewport.
        let left = rect.left;
        const vw = window.innerWidth;
        if (left + ttRect.width > vw - 8) left = vw - ttRect.width - 8;
        if (left < 8) left = 8;
        content.style.top = top + 'px';
        content.style.left = left + 'px';
    }
    function clearFloatingTooltip(wrap) {
        const content = wrap.querySelector(':scope > .tip-content');
        if (!content) return;
        content.classList.remove('floating');
        content.style.top = '';
        content.style.left = '';
    }
    function bindTooltipPortals() {
        document.querySelectorAll('.tip-wrap').forEach(wrap => {
            wrap.addEventListener('mouseenter', () => positionFloatingTooltip(wrap));
            wrap.addEventListener('focusin', () => positionFloatingTooltip(wrap));
            wrap.addEventListener('mouseleave', () => clearFloatingTooltip(wrap));
            wrap.addEventListener('focusout', () => clearFloatingTooltip(wrap));
        });
        // When the controls panel scrolls or the page scrolls, blur any active
        // tooltip so it doesn't detach from its trigger.
        const onScroll = () => {
            document.querySelectorAll('.tip-content.floating').forEach(c => {
                c.classList.remove('floating');
                c.style.top = '';
                c.style.left = '';
            });
        };
        const panel = document.querySelector('.lab-controls');
        if (panel) panel.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
    }

    // ---------- Init ----------
    function init() {
        // Apply URL state if present, otherwise seed preset
        const fromHash = decodeState();
        if (fromHash) {
            state = { ...DEFAULTS, ...fromHash };
        } else {
            state = { ...DEFAULTS, ...PRESETS.seed };
        }
        writeStateToControls();
        setActiveChip(detectActivePreset());
        bindControls();
        renderScenarioCards();
        bindTooltipPortals();
        rerun();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
