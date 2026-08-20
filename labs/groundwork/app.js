/* Groundwork finder: a map you can zoom and click, plus an autocompleting
   search box. Discovery is spatial first — a 191-row list is unreadable, and
   the community use case ("is anything near me") starts from a place, not a
   name.

   Two map layers, swapped by zoom:
     zoomed out  — one bubble per county, sized by site count. An aggregate
                   marker at a county centroid, not a claim about any site.
     zoomed in   — individual sites at their validated coordinates only.

   Sites with no verified coordinate never appear on the map at any zoom, but
   they are in the autocomplete, so they stay findable.

   The per-site pages are static HTML and do not depend on this file. */

(function () {
  'use strict';

  var DATA_URL = '/labs/groundwork/data/sites.json';
  /* Three tiers, because a US-wide view of 22 counties in one metro is an
     unreadable pile of overlapping bubbles: states → counties → sites. */
  var COUNTY_ZOOM = 6;
  var SITE_ZOOM = 9;
  var US_VIEW = { center: [39.5, -96.5], zoom: 4 };

  var el = {
    map: document.getElementById('gw-map'),
    q: document.getElementById('gw-q'),
    ac: document.getElementById('gw-ac'),
    rows: document.getElementById('gw-rows'),
    count: document.getElementById('gw-count'),
    title: document.getElementById('gw-panel-title'),
    reset: document.getElementById('gw-reset')
  };

  var sites = [], counties = [], located = [], states = [];
  var map, stateLayer, countyLayer, siteLayer, index = [], acItems = [], acActive = -1;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function siteColor(s) { return s.in_sfha ? '#b91c1c' : '#f97316'; }

  var STATE_NAMES = { VA: 'Virginia', TX: 'Texas', CA: 'California', GA: 'Georgia', OH: 'Ohio', AZ: 'Arizona', MD: 'Maryland', WA: 'Washington' };

  /* Roll counties up to states, positioning each bubble at the site-weighted
     centre of its counties rather than the geographic centre of the state —
     it should sit where the build-out actually is. */
  function buildStates() {
    var by = {};
    counties.forEach(function (c) {
      var st = by[c.state] || (by[c.state] = { state: c.state, name: STATE_NAMES[c.state] || c.state, sites: 0, permits: 0, generators: 0, lat: 0, lon: 0, w: 0 });
      st.sites += c.sites; st.permits += c.permits; st.generators += c.generators;
      st.lat += c.lat * c.sites; st.lon += c.lon * c.sites; st.w += c.sites;
    });
    states = Object.keys(by).map(function (k) {
      var st = by[k];
      st.lat /= st.w; st.lon /= st.w;
      return st;
    });
  }

  function bubble(layer, lat, lon, count, max, tooltip, onClick) {
    var r = 12 + 26 * Math.sqrt(count / max);
    var m = L.circleMarker([lat, lon], {
      radius: r, color: '#fff', weight: 2, fillColor: '#1e3a8a', fillOpacity: 0.85
    });
    m.bindTooltip(tooltip, { direction: 'top' });
    m.on('click', onClick);
    layer.addLayer(m);
    layer.addLayer(L.marker([lat, lon], {
      interactive: false,
      icon: L.divIcon({ className: 'gw-bubble-label', html: String(count), iconSize: [r * 2, 16], iconAnchor: [r, 8] })
    }));
  }

  function drawStates() {
    if (stateLayer) return;
    stateLayer = L.layerGroup();
    var max = states.reduce(function (m, s) { return Math.max(m, s.sites); }, 1);
    states.forEach(function (st) {
      bubble(stateLayer, st.lat, st.lon, st.sites, max,
        '<strong>' + esc(st.name) + '</strong><br>' + st.sites + ' site' + (st.sites === 1 ? '' : 's') +
        ' · ' + st.permits + ' permit' + (st.permits === 1 ? '' : 's') +
        (st.generators ? '<br>' + st.generators.toLocaleString() + ' permitted generators' : '') +
        '<br><em>Click to open the state</em>',
        function () { map.flyTo([st.lat, st.lon], COUNTY_ZOOM + 1, { duration: 0.8 }); });
    });
    stateLayer.addTo(map);
  }

  /* ---------------------------------------------------------------- map --- */

  function drawCounties() {
    if (countyLayer) return;
    countyLayer = L.layerGroup();
    var max = counties.reduce(function (m, c) { return Math.max(m, c.sites); }, 1);
    counties.forEach(function (c) {
      bubble(countyLayer, c.lat, c.lon, c.sites, max,
        '<strong>' + esc(c.name) + '</strong><br>' + c.sites + ' site' + (c.sites === 1 ? '' : 's') +
        ' · ' + c.permits + ' permit' + (c.permits === 1 ? '' : 's') +
        (c.generators ? '<br>' + c.generators.toLocaleString() + ' permitted generators' : '') +
        '<br><em>Click to see individual sites</em>',
        function () { focusCounty(c); });
    });
    countyLayer.addTo(map);
  }

  function drawSites() {
    if (siteLayer) return;
    siteLayer = L.layerGroup();
    located.forEach(function (s) {
      var m = L.circleMarker([s.lat, s.lon], {
        radius: 7, color: '#fff', weight: 1.5, fillColor: siteColor(s), fillOpacity: 0.95
      });
      m.bindPopup(
        '<strong>' + esc(s.name) + '</strong><br>' +
        (s.address ? esc(s.address) + '<br>' : '') + esc(s.locality) +
        '<br>' + (s.flood_zone ? 'FEMA Zone ' + esc(s.flood_zone) + (s.in_sfha ? ' — Special Flood Hazard Area' : '') : 'Flood zone pending') +
        (s.water_stress ? '<br>Water stress: ' + esc(s.water_stress) : '') +
        '<br><a href="/labs/groundwork/site/' + esc(s.slug) + '/">Open the record →</a>'
      );
      s._marker = m;
      siteLayer.addLayer(m);
    });
    siteLayer.addTo(map);
  }

  /* Swap layers on zoom so no view is a pile of overlapping dots. */
  function syncLayers() {
    drawStates(); drawCounties(); drawSites();
    var z = map.getZoom();
    var want = z >= SITE_ZOOM ? siteLayer : (z >= COUNTY_ZOOM ? countyLayer : stateLayer);
    [stateLayer, countyLayer, siteLayer].forEach(function (layer) {
      if (layer === want) { if (!map.hasLayer(layer)) map.addLayer(layer); }
      else if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    el.reset.hidden = z <= US_VIEW.zoom;
    updatePanel();
  }

  function focusCounty(c) {
    map.flyTo([c.lat, c.lon], 10, { duration: 0.8 });
  }

  function focusSite(s) {
    map.flyTo([s.lat, s.lon], 13, { duration: 0.8 });
    map.once('moveend', function () { if (s._marker) s._marker.openPopup(); });
  }

  /* -------------------------------------------------------------- panel --- */

  function visibleSites() {
    if (!map || map.getZoom() < SITE_ZOOM) return [];
    var b = map.getBounds();
    return located.filter(function (s) { return b.contains([s.lat, s.lon]); });
  }

  function renderRows(list, title) {
    el.title.textContent = title;
    el.count.textContent = list.length ? list.length + ' shown' : '';
    if (!list.length) {
      el.rows.innerHTML = '<p class="gw-explorer-empty">' +
        (map.getZoom() < SITE_ZOOM
          ? 'Click a bubble to zoom in, or search for a place, to see individual sites.'
          : 'No tracked sites in this view. Groundwork covers Virginia so far — an empty area is not evidence that nothing is there.') +
        '</p>';
      return;
    }
    el.rows.innerHTML = list.slice(0, 60).map(function (s) {
      return '<a class="gw-row" href="/labs/groundwork/site/' + esc(s.slug) + '/">' +
        '<div><div class="gw-row-name">' + esc(s.name) + '</div><div class="gw-row-sub">' +
        (s.address ? esc(s.address) + ', ' : '') + esc(s.locality) + '</div></div>' +
        '<div class="gw-row-cell"><span class="k">Operator</span>' + esc(s.operator || 'Unresolved') + '</div>' +
        '<div class="gw-row-cell"><span class="k">Flood</span>' + (s.flood_zone ? 'Zone ' + esc(s.flood_zone) : 'Pending') + '</div>' +
        '<div class="gw-row-cell"><span class="gw-conf ' + esc(s.operator_confidence || 'pending') + '">' + esc(s.operator_confidence || 'pending') + '</span></div>' +
        '</a>';
    }).join('') + (list.length > 60 ? '<p class="gw-ev-basis">Showing 60 of ' + list.length + ' — zoom in to narrow.</p>' : '');
  }

  function updatePanel() {
    var v = visibleSites();
    renderRows(v, v.length ? 'Sites in view' : 'Zoom in or search to see sites');
  }

  /* ------------------------------------------------------- autocomplete --- */

  function buildIndex() {
    index = [];
    counties.forEach(function (c) {
      index.push({ kind: 'county', label: c.name + ', ' + c.state, sub: c.sites + ' sites · ' + c.permits + ' permits', key: (c.name + ' ' + c.state).toLowerCase(), county: c });
    });
    var ops = {};
    sites.forEach(function (s) { if (s.operator) ops[s.operator] = (ops[s.operator] || 0) + 1; });
    Object.keys(ops).forEach(function (o) {
      index.push({ kind: 'operator', label: o, sub: ops[o] + ' site' + (ops[o] === 1 ? '' : 's'), key: o.toLowerCase(), operator: o });
    });
    sites.forEach(function (s) {
      index.push({
        kind: 'site', label: s.name,
        sub: (s.address ? s.address + ', ' : '') + s.locality + (s.lat ? '' : ' · not mapped'),
        key: [s.name, s.address, s.locality, s.operator].join(' ').toLowerCase(),
        site: s
      });
    });
  }

  function search(q) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var order = { county: 0, operator: 1, site: 2 };
    return index
      .filter(function (i) { return terms.every(function (t) { return i.key.indexOf(t) !== -1; }); })
      .sort(function (a, b) {
        var pa = a.key.indexOf(terms[0]) === 0 ? 0 : 1, pb = b.key.indexOf(terms[0]) === 0 ? 0 : 1;
        return pa - pb || order[a.kind] - order[b.kind] || a.label.length - b.label.length;
      })
      .slice(0, 8);
  }

  function closeAc() {
    el.ac.hidden = true; el.ac.innerHTML = ''; acItems = []; acActive = -1;
    el.q.setAttribute('aria-expanded', 'false');
  }

  function showAc(q) {
    acItems = search(q);
    if (!acItems.length) { closeAc(); return; }
    el.ac.innerHTML = acItems.map(function (i, n) {
      return '<li class="gw-ac-item" role="option" id="gw-ac-' + n + '" data-n="' + n + '">' +
        '<span class="gw-ac-kind">' + esc(i.kind) + '</span>' +
        '<span class="gw-ac-label">' + esc(i.label) + '</span>' +
        '<span class="gw-ac-sub">' + esc(i.sub) + '</span></li>';
    }).join('');
    el.ac.hidden = false;
    el.q.setAttribute('aria-expanded', 'true');
    acActive = -1;
  }

  function choose(item) {
    if (!item) return;
    closeAc();
    el.q.value = item.label;
    if (item.kind === 'county') { focusCounty(item.county); return; }
    if (item.kind === 'site') {
      if (item.site.lat) focusSite(item.site);
      else {
        renderRows([item.site], 'Not mapped — no verified coordinate');
        el.title.textContent = 'Not on the map — open the record for what is known';
      }
      return;
    }
    /* operator: show its sites and frame them */
    var list = sites.filter(function (s) { return s.operator === item.operator; });
    var pts = list.filter(function (s) { return s.lat; }).map(function (s) { return [s.lat, s.lon]; });
    if (pts.length) map.flyToBounds(pts, { padding: [40, 40], maxZoom: 12, duration: 0.8 });
    renderRows(list, item.operator + ' — all tracked sites');
  }

  function bindSearch() {
    el.q.addEventListener('input', function () {
      var v = el.q.value.trim();
      if (v.length < 2) { closeAc(); return; }
      showAc(v);
    });
    el.q.addEventListener('keydown', function (e) {
      if (el.ac.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        acActive += e.key === 'ArrowDown' ? 1 : -1;
        if (acActive < 0) acActive = acItems.length - 1;
        if (acActive >= acItems.length) acActive = 0;
        [].forEach.call(el.ac.children, function (li, n) { li.classList.toggle('active', n === acActive); });
        el.q.setAttribute('aria-activedescendant', 'gw-ac-' + acActive);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        choose(acItems[acActive >= 0 ? acActive : 0]);
      } else if (e.key === 'Escape') {
        closeAc();
      }
    });
    el.ac.addEventListener('mousedown', function (e) {
      var li = e.target.closest('.gw-ac-item');
      if (li) { e.preventDefault(); choose(acItems[Number(li.dataset.n)]); }
    });
    document.addEventListener('click', function (e) {
      if (!el.ac.contains(e.target) && e.target !== el.q) closeAc();
    });
  }

  /* ---------------------------------------------------------------- init -- */

  fetch(DATA_URL)
    .then(function (r) { return r.json(); })
    .then(function (db) {
      sites = db.sites || [];
      counties = db.counties || [];
      located = sites.filter(function (s) { return s.lat && s.lon; });

      buildStates();
      buildIndex();
      bindSearch();

      map = L.map('gw-map', { scrollWheelZoom: false, zoomControl: true })
        .setView(US_VIEW.center, US_VIEW.zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
      }).addTo(map);

      /* Frame the data rather than a fixed US box: at a tall viewport a plain
         zoom-4 view of the lower 48 also shows South America. */
      var extent = counties.map(function (c) { return [c.lat, c.lon]; });
      if (extent.length) map.fitBounds(extent, { padding: [50, 50], maxZoom: 6 });
      US_VIEW.center = map.getCenter();
      US_VIEW.zoom = map.getZoom();

      map.on('zoomend moveend', syncLayers);
      syncLayers();

      el.reset.addEventListener('click', function () {
        el.q.value = '';
        map.flyTo(US_VIEW.center, US_VIEW.zoom, { duration: 0.8 });
      });
    })
    .catch(function () {
      if (el.map) el.map.innerHTML = '<p class="gw-ev-basis" style="padding:1.5rem">The map index could not be loaded. Every site page is still reachable directly, and the county and operator tables below are unaffected.</p>';
    });
})();
