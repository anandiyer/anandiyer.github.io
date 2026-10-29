/* Quantum Field Guide: interactive experiments and charts. Canvas only, no dependencies. */
(function () {
    'use strict';

    var C = {
        accent: '#8b6fe8', accentDeep: '#5b3fc4', accentSoft: '#c4b5fd',
        classical: '#d06a14', ink: '#0f172a', muted: '#475569', faint: '#94a3b8',
        grid: 'rgba(15,23,42,0.08)', line: 'rgba(15,23,42,0.18)', bg: '#f7f7fb'
    };
    var SANS = "'Aeonik Regular', system-ui, -apple-system, sans-serif";
    var MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";
    var $ = function (id) { return document.getElementById(id); };
    var fmt = function (n) { return n.toLocaleString('en-US'); };
    var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setup(c) {
        var r = window.devicePixelRatio || 1, w = c.clientWidth, h = +c.getAttribute('height');
        c.style.height = h + 'px'; c.width = Math.round(w * r); c.height = Math.round(h * r);
        var g = c.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0);
        return { g: g, w: w, h: h };
    }

    /* 2.1 Two-slit */
    var slit = $('slit'), watch = $('watch');
    var hits = [], bins = new Array(72).fill(0), queue = 0;
    function intensity(y, watched) {
        if (watched) return 1.9 * (Math.exp(-Math.pow((y + 0.2) / 0.12, 2)) + Math.exp(-Math.pow((y - 0.2) / 0.12, 2)));
        return 4 * Math.exp(-Math.pow(y / 0.3, 2)) * Math.pow(Math.cos(Math.PI * y / 0.115), 2);
    }
    function sample(watched) {
        for (;;) { var y = Math.random() * 1.2 - 0.6; if (Math.random() * 4.2 < intensity(y, watched)) return y; }
    }
    function drawSlit() {
        if (!slit) return;
        var s = setup(slit), g = s.g, w = s.w, h = s.h;
        g.clearRect(0, 0, w, h);
        var wallX = w * 0.22, scrX = w * 0.62, scrW = w * 0.1, histX = w * 0.76;
        g.fillStyle = C.muted; g.beginPath(); g.arc(w * 0.05, h / 2, 7, 0, 7); g.fill();
        g.fillStyle = C.ink;
        var s1 = h / 2 - h * 0.162, s2 = h / 2 + h * 0.162;
        g.fillRect(wallX, 0, 8, s1 - 10); g.fillRect(wallX, s1 + 10, 8, s2 - s1 - 20); g.fillRect(wallX, s2 + 10, 8, h - s2 - 10);
        if (watch.checked) {
            g.fillStyle = C.classical;
            g.beginPath(); g.arc(wallX - 18, s1, 6, 0, 7); g.fill();
            g.beginPath(); g.arc(wallX - 18, s2, 6, 0, 7); g.fill();
            g.font = '600 12px ' + SANS; g.textAlign = 'right';
            g.fillText('detector', wallX - 30, s1 + 4);
            g.textAlign = 'left';
        }
        g.strokeStyle = C.line; g.strokeRect(scrX, 6, scrW, h - 12);
        var toY = function (y) { return h / 2 + y * (h - 20) / 1.2; };
        g.fillStyle = C.accentDeep; g.globalAlpha = hits.length > 1500 ? 0.45 : 0.85;
        var d = hits.length > 500 ? 1.5 : 2.5;
        for (var i = 0; i < hits.length; i++) g.fillRect(scrX + hits[i][1] * scrW, toY(hits[i][0]), d, d);
        g.globalAlpha = 1;
        var mx = Math.max.apply(null, bins.concat([1])), bh = (h - 12) / bins.length;
        g.fillStyle = C.accent;
        bins.forEach(function (v, j) { g.fillRect(histX, 6 + j * bh, (w * 0.22) * (v / mx), Math.max(1, bh - 0.6)); });
        g.fillStyle = C.muted; g.font = '12px ' + SANS;
        g.fillText('source', Math.max(2, w * 0.05 - 18), h / 2 + 24);
        g.fillText('screen', scrX + 4, h - 10);
        g.textAlign = 'right'; g.fillText('pile-up', w - 8, h - 10); g.textAlign = 'left';
    }
    function fire(n) {
        for (var i = 0; i < n; i++) {
            var y = sample(watch.checked); hits.push([y, Math.random()]);
            var b = Math.floor((y + 0.6) / 1.2 * bins.length); if (b >= 0 && b < bins.length) bins[b]++;
        }
        $('count').textContent = fmt(hits.length) + (hits.length === 1 ? ' electron' : ' electrons');
        drawSlit();
    }
    function burst(n) {
        queue += n;
        if (reduceMotion) { fire(queue); queue = 0; return; }
        var step = function () {
            var k = Math.min(queue, Math.max(4, Math.ceil(n / 60)));
            fire(k); queue -= k; if (queue > 0) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
    function clearSlit() { hits = []; bins.fill(0); queue = 0; fire(0); }
    if (slit) {
        $('f1').onclick = function () { fire(1); };
        $('f100').onclick = function () { burst(100); };
        $('f2000').onclick = function () { burst(2000); };
        $('frst').onclick = clearSlit;
        watch.onchange = function () { clearSlit(); burst(2000); };
    }

    /* 2.2 Phase */
    var wv = $('waves'), ph = $('ph');
    function drawWaves() {
        if (!wv) return;
        var s = setup(wv), g = s.g, w = s.w, h = s.h, phi = ph.value * Math.PI / 180;
        var rows = [h * 0.18, h * 0.45, h * 0.8], A = h * 0.09;
        g.clearRect(0, 0, w, h);
        var line = function (y0, amp, off, col, lw) {
            g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
            for (var x = 0; x <= w; x += 2) { var y = y0 - amp * Math.sin(x / w * 4 * Math.PI + off); if (x) g.lineTo(x, y); else g.moveTo(x, y); }
            g.stroke();
        };
        g.strokeStyle = C.grid; g.lineWidth = 1;
        rows.forEach(function (y) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
        line(rows[0], A, 0, C.faint, 2);
        line(rows[1], A, phi, C.faint, 2);
        line(rows[2], 2 * A * Math.abs(Math.cos(phi / 2)), phi / 2, C.accent, 3);
        g.fillStyle = C.muted; g.font = '12px ' + SANS;
        g.fillText('Route 1', 6, 14); g.fillText('Route 2', 6, rows[1] - A - 8); g.fillText('Combined', 6, rows[2] - 2 * A - 6);
        $('phv').textContent = ph.value + '°';
        $('php').textContent = Math.round(Math.pow(Math.cos(phi / 2), 2) * 100) + '%';
    }
    if (ph) ph.oninput = drawWaves;

    /* 2.3 Scaling */
    var nq = $('nq');
    function drawScale() {
        if (!nq) return;
        var n = +nq.value, e = n * Math.log10(2), ex = Math.floor(e), m = Math.pow(10, e - ex);
        $('nqv').textContent = n;
        $('nqo').innerHTML = n <= 20 ? fmt(Math.pow(2, n)) : (m.toFixed(1) + ' × 10<sup>' + ex + '</sup>');
        var c = 'possibilities in play';
        if (n >= 266) c += ', more than the atoms in the observable universe';
        else if (n >= 50) c += ', more than any supercomputer could store';
        else if (n >= 30) c += ', about the limit a laptop can simulate';
        $('nqc').textContent = c;
    }
    if (nq) nq.oninput = drawScale;

    /* 2.4 Errors */
    var acc = $('acc'), ops = $('ops');
    function drawErr() {
        if (!acc) return;
        var p = +acc.value, N = Math.round(Math.pow(10, +ops.value)), s = Math.exp(N * Math.log1p(-p)), pct = s * 100;
        $('opv').textContent = N >= 1e9 ? (N / 1e9).toFixed(1).replace('.0', '') + ' billion'
            : N >= 1e6 ? (N / 1e6).toFixed(1).replace('.0', '') + ' million' : fmt(N);
        $('succ').textContent = pct >= 99.95 ? '>99.9%' : pct < 0.1 ? '<0.1%' : (pct < 10 ? pct.toFixed(1) : Math.round(pct)) + '%';
        $('succbar').style.width = pct.toFixed(1) + '%';
    }
    if (acc) { acc.onchange = drawErr; ops.oninput = drawErr; }

    /* 3.1 Falling estimate vs built */
    var NEED = [
        { x: 2012, v: 1e9, t: '~1 billion', s: 'Fowler et al.', pos: 'below' },
        { x: 2019, v: 2e7, t: '20 million', s: 'Gidney & Ekerå', pos: 'above' },
        { x: 2025, v: 1e6, t: '<1 million', s: 'Gidney', pos: 'above' },
        { x: 2026, v: 1e5, t: '<100,000', s: 'preprint, unreviewed', hollow: true, pos: 'right' }
    ];
    var BUILT = [
        { x: 2016, v: 5, t: '5', s: 'IBM', pos: 'right' },
        { x: 2019, v: 53, t: '53', s: 'Google Sycamore', pos: 'below' },
        { x: 2021, v: 127, t: '127', s: 'IBM Eagle', pos: 'below' },
        { x: 2022, v: 433, t: '433', s: 'IBM Osprey', pos: 'below', minor: true },
        { x: 2023, v: 1121, t: '1,121', s: 'IBM Condor', pos: 'above' },
        { x: 2025, v: 6100, t: '6,100', s: 'Caltech atoms', hollow: true, pos: 'right' }
    ];
    var trend = $('trend');
    function drawTrend() {
        if (!trend) return;
        var s = setup(trend), g = s.g, w = s.w, h = s.h, narrow = w < 560;
        var L = narrow ? 40 : 64, R = w - (narrow ? 84 : 120), T = 26, B = h - 34;
        var x0 = 2011, x1 = 2026.6, lo = -0.3, hi = 9.5;
        var X = function (x) { return L + (x - x0) / (x1 - x0) * (R - L); };
        var Y = function (v) { return B - (Math.log10(v) - lo) / (hi - lo) * (B - T); };
        g.clearRect(0, 0, w, h);
        g.font = '11px ' + MONO; g.lineWidth = 1;
        var ticks = narrow ? [1, 1e3, 1e6, 1e9] : [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
        ticks.forEach(function (v) {
            var y = Y(v); g.strokeStyle = C.grid; g.beginPath(); g.moveTo(L, y); g.lineTo(w - 8, y); g.stroke();
            g.fillStyle = C.faint; g.textAlign = 'right';
            g.fillText(v >= 1e9 ? (v / 1e9) + 'B' : v >= 1e6 ? (v / 1e6) + 'M' : v >= 1e3 ? (v / 1e3) + 'k' : '' + v, L - 8, y + 4);
        });
        g.textAlign = 'center';
        for (var yr = 2012; yr <= 2026; yr += narrow ? 7 : 2) { g.fillStyle = C.faint; g.fillText('' + yr, X(yr), B + 22); }

        function series(pts, col) {
            g.strokeStyle = col; g.lineWidth = 2.5; g.setLineDash([]);
            g.beginPath();
            pts.forEach(function (p, i) { if (i) g.lineTo(X(p.x), Y(p.v)); else g.moveTo(X(p.x), Y(p.v)); });
            g.stroke();
            pts.forEach(function (p) {
                var px = X(p.x), py = Y(p.v);
                g.beginPath(); g.arc(px, py, 5.5, 0, 7);
                if (p.hollow) { g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2; g.strokeStyle = col; g.stroke(); }
                else { g.fillStyle = col; g.fill(); }
                if (narrow && p.minor) return;
                var showSrc = !narrow, tx, ty, ty2;
                if (p.pos === 'right') { g.textAlign = 'left'; tx = px + 11; ty = py + (showSrc ? -1 : 4); ty2 = py + 13; }
                else if (p.pos === 'above') { g.textAlign = narrow ? 'right' : 'center'; tx = narrow ? px - 8 : px; ty = py - 12; ty2 = py - 26; }
                else { g.textAlign = 'center'; tx = px; ty = py + 22; ty2 = py + 36; }
                g.fillStyle = C.ink; g.font = '600 12px ' + MONO; g.fillText(p.t, tx, ty);
                if (showSrc) { g.fillStyle = C.muted; g.font = '11px ' + SANS; g.fillText(p.s, tx, ty2); }
            });
        }
        series(NEED, C.classical);
        series(BUILT, C.accent);

        g.textAlign = 'left'; g.font = '600 12px ' + SANS;
        g.fillStyle = C.classical; g.fillText(narrow ? 'Needed' : 'Needed to break RSA-2048', X(2013.6), Y(narrow ? 1e6 : 2.5e7));
        g.fillStyle = C.accentDeep; g.fillText(narrow ? 'Built' : 'Largest machine built', X(2012.2), Y(300));
        g.textAlign = 'left';
    }

    /* 3.2 Built vs needed bars */
    var gap = $('gapc');
    var GAP = [
        ['Quantinuum Helios', 98, 'b', '98'], ['Google Willow', 105, 'b', '105'], ['IBM Nighthawk', 120, 'b', '120'],
        ['IBM Condor', 1121, 'b', '1,121'], ['Caltech atom array', 6100, 'b', '6,100'],
        ['Break 256-bit elliptic-curve keys', 500000, 'n', '< 500,000', 'ECC-256'],
        ['Break RSA-2048', 1000000, 'n', '< 1 million', 'RSA-2048'],
        ['Simulate FeMoco catalyst', 2700000, 'n', '~2.7 million', 'FeMoco']
    ];
    function drawGap() {
        if (!gap) return;
        var s = setup(gap), g = s.g, w = s.w, h = s.h, narrow = w < 560;
        var L = narrow ? 104 : 230, R = w - (narrow ? 70 : 100), top = 8, rh = (h - 40) / GAP.length;
        g.clearRect(0, 0, w, h);
        var lx = function (v) { return L + (Math.log10(v) - 1) / (7.5 - 1) * (R - L); };
        g.font = '11px ' + MONO; g.strokeStyle = C.grid; g.lineWidth = 1;
        (narrow ? [10, 1e3, 1e5, 1e7] : [10, 100, 1e3, 1e4, 1e5, 1e6, 1e7]).forEach(function (v) {
            var x = lx(v); g.beginPath(); g.moveTo(x, top); g.lineTo(x, h - 28); g.stroke();
            g.fillStyle = C.faint; g.textAlign = 'center';
            g.fillText(v >= 1e6 ? (v / 1e6) + 'M' : v >= 1e3 ? (v / 1e3) + 'k' : '' + v, x, h - 12);
        });
        GAP.forEach(function (r, i) {
            var y = top + i * rh + rh * 0.18, bh = rh * 0.62;
            g.fillStyle = r[2] === 'b' ? C.accent : C.classical;
            g.fillRect(L, y, Math.max(2, lx(r[1]) - L), bh);
            g.textAlign = 'right'; g.fillStyle = C.ink; g.font = (narrow ? '12px ' : '13px ') + SANS;
            var label = narrow ? (r[4] || r[0].replace('Quantinuum ', '').replace('Caltech atom array', 'Caltech atoms')) : r[0];
            g.fillText(label, L - 8, y + bh * 0.72);
            g.textAlign = 'left'; g.font = (narrow ? '600 11px ' : '600 12px ') + MONO;
            g.fillText(narrow ? r[3].replace(' million', 'M').replace('500,000', '500k') : r[3], lx(r[1]) + 6, y + bh * 0.72);
        });
        g.textAlign = 'left';
    }

    /* 4.1 Mosca */
    var MX = $('x'), MY = $('y'), MZ = $('z'), mc = $('moscac');
    function drawMosca() {
        if (!mc) return;
        var x = +MX.value, y = +MY.value, z = +MZ.value;
        $('xv').textContent = x; $('yv').textContent = y; $('zv').textContent = z;
        var s = setup(mc), g = s.g, w = s.w, h = s.h, span = Math.max(x + y, z, 1) * 1.08;
        var sx = function (v) { return 10 + v / span * (w - 20); };
        g.clearRect(0, 0, w, h);
        g.fillStyle = C.classical; g.fillRect(sx(0), 18, sx(y) - sx(0), 28);
        g.fillStyle = C.accent; g.fillRect(sx(y), 18, sx(y + x) - sx(y), 28);
        g.fillStyle = 'rgba(15,23,42,0.14)'; g.fillRect(sx(0), 84, sx(z) - sx(0), 28);
        g.strokeStyle = C.ink; g.lineWidth = 1; g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(sx(z), 8); g.lineTo(sx(z), 122); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.muted; g.font = '12px ' + SANS; g.textAlign = 'left';
        g.fillText('Migrate (orange), then keep secret (violet)', 10, 64);
        g.fillText('Until a code-breaking machine', 10, 132);
        var exp = x + y - z, mv = $('mv');
        if (exp > 0) {
            mv.className = 'qtm-verdict bad';
            mv.textContent = 'Already at risk: ' + exp + (exp === 1 ? ' year' : ' years') + ' of data you encrypt today could be read before it expires.';
        } else {
            mv.className = 'qtm-verdict good';
            mv.textContent = 'Safe for now, with ' + (-exp) + (exp === -1 ? ' year' : ' years') + ' to spare. Start migrating anyway.';
        }
    }
    [MX, MY, MZ].forEach(function (e) { if (e) e.oninput = drawMosca; });

    function all() { drawSlit(); drawWaves(); drawScale(); drawErr(); drawTrend(); drawGap(); drawMosca(); }
    function init() {
        all();
        if (slit) { fire(0); burst(3000); }
        // Redraw once web fonts land so canvas labels use them.
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(all);
    }
    var t;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(all, 120); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
