/* Lookalike Finder — frontend.
   Streams the Worker's pipeline over a fetch/ReadableStream SSE channel and
   renders the stepper, source profile, and match cards as events arrive. */

// Point this at your deployed Cloudflare Worker. Resolution order:
//   1. ?api=… query param (explicit override)
//   2. localhost → the local `wrangler dev` Worker (so no param needed in dev)
//   3. the deployed production Worker
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const ENDPOINT =
  new URLSearchParams(location.search).get("api") ||
  (LOCAL_HOSTS.includes(location.hostname)
    ? "http://localhost:8787"
    : "https://labs-api.canonical.cc");

const STEPS = [
  ["ingest", "Reconstructing profile"],
  ["traits", "Extracting traits"],
  ["queries", "Generating queries"],
  ["retrieve", "Searching the web"],
  // Label comes from COPY[currentEntity].scoreStep — see buildStepper().
  ["score", null],
  ["papers", "Finding research"],
  ["feed", "Gathering activity"],
];

/* Every string in the UI that reads wrong for the other kind of entity.
   The Worker keeps the same split in entity.js (PERSON / COMPANY) and owns the
   strings it sends — the results title, the profile prose. This is the half
   that lives in the page, and it exists so a company search never gets told
   about its career arc or its employer.

   Anything that reads fine both ways deliberately stays in the markup: the
   test for belonging here is "is this actively wrong for a company", not
   "does this mention a person". */
const COPY = {
  person: {
    scoreStep: "Scoring people",
    arcLabel: "Career arc",
    anchorLead: "We couldn't confirm this is the right person.",
    refineTitle: "Help us find the right person",
    wrongEntity: "Wrong person? Refine →",
    nameLabel: "Full name",
    knownForLabel: "Known for / role",
    knownForPlaceholder: "e.g. founder of Tubi, AI researcher at OpenAI",
    urlPlaceholder: "LinkedIn, personal site, podcast guest page…",
    feedbackPlaceholder:
      "What was off — or right — about this? (e.g. wrong person, missed a key role, great match)",
  },
  company: {
    scoreStep: "Scoring companies",
    arcLabel: "Background",
    anchorLead: "We couldn't confirm this is the right company.",
    refineTitle: "Help us find the right company",
    wrongEntity: "Wrong company? Refine →",
    nameLabel: "Company name",
    knownForLabel: "Known for / what they do",
    knownForPlaceholder: "e.g. developer-first payments API, open-source vector database",
    urlPlaceholder: "Homepage, LinkedIn company page, Crunchbase…",
    feedbackPlaceholder:
      "What was off — or right — about this? (e.g. wrong company, missed what they actually do, great match)",
  },
};

const ICONS = {
  linkedin:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8h4V24h-4V8zm7.5 0h3.8v2.2h.05c.53-1 1.83-2.2 3.77-2.2 4.03 0 4.78 2.65 4.78 6.1V24h-4v-7.1c0-1.7-.03-3.9-2.38-3.9-2.38 0-2.75 1.86-2.75 3.78V24h-4V8z"/></svg>',
  x:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 1.5h3.3l-7.2 8.24L23.7 22.5h-6.6l-5.18-6.77L5.99 22.5H2.68l7.7-8.8L2.3 1.5h6.77l4.68 6.19L18.9 1.5zm-1.16 19h1.83L7.34 3.38H5.38L17.74 20.5z"/></svg>',
  link:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};

// Thumbs-up / thumbs-down glyphs (Lucide) for the per-match feedback control.
const THUMB_UP =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>';
const THUMB_DOWN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3 3.88Z"/></svg>';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pct = (x) => Math.round((x || 0) * 100);

let running = false;
let lastInput = "";
let lastHints = null;
// Run id minted by the worker for the current search. Every thumbs vote carries
// it so the backend can tie the vote to the exact queries + source that
// produced the result. Reset at the start of each run; set on the `runid` event.
let currentRunId = null;
// Drives the person/company wording on the refine affordances. Defaults to
// person because that is what a run is until the classifier says otherwise.
let currentEntity = "person";
// AbortController for the in-flight SSE — lets the refine flow cancel the
// current bad run cleanly when the user submits hints mid-pipeline.
let inflight = null;
// We only auto-open the refine modal once per search session. If the user
// dismissed it (or already refined once), repeated anchor_unverified events
// only show the warning banner — the modal popping back open is hostile UX.
let modalAutoOpened = false;
// Set when the user submits the refine modal — they've actively acknowledged
// the warning and we're retrying for them, so subsequent anchor_unverified
// events during the refined run should NOT re-show the banner. Cleared only
// on a brand-new search (so a different bad input can warn again).
// Dismissing via X / Cancel / Esc does NOT set this — the warning stays.
let anchorWarningSuppressed = false;

function buildStepper() {
  const wrap = $("stepper");
  wrap.innerHTML = "";
  STEPS.forEach(([id, label], i) => {
    const text = label ?? COPY[currentEntity].scoreStep;
    const s = el("div", "step", `<span class="dot">${i + 1}</span><span class="step-label">${text}</span>`);
    s.id = "step-" + id;
    wrap.appendChild(s);
  });
}

// Active step → yellow (with number); earlier steps → grey with a ✓; later → faint.
function setStep(id, state) {
  if (!$("step-" + id)) return;
  let passed = false;
  STEPS.forEach(([sid], i) => {
    const n = $("step-" + sid);
    const dot = n.querySelector(".dot");
    if (sid === id) {
      passed = true;
      const done = state === "done";
      n.className = "step " + (done ? "done" : "active");
      dot.textContent = done ? "✓" : String(i + 1);
    } else if (!passed) {
      n.className = "step done";
      dot.textContent = "✓";
    } else {
      n.className = "step";
      dot.textContent = String(i + 1);
    }
  });
}

// Tag outbound links so the destination's analytics attribute the click to
// canonical.cc. Only decorates http(s) URLs and never double-adds the param.
function withRef(href) {
  const s = String(href || "");
  if (!/^https?:\/\//i.test(s)) return s;
  if (/[?&]ref=canonicalcc(?:&|$)/.test(s)) return s;
  return s + (s.includes("?") ? "&" : "?") + "ref=canonicalcc";
}

/* Last line of defence before a model-supplied string becomes a clickable
   link. The Worker already drops anything that isn't http(s) and wasn't in the
   retrieved corpus, but rendering is where a bad URL actually causes harm, so
   the check is repeated here rather than assumed. esc() stops attribute
   breakout; it does NOT stop `javascript:` from running on click. */
function safeHref(href) {
  const s = String(href || "").trim();
  return /^https?:\/\//i.test(s) ? s : null;
}

// LinkedIn / X / source link buttons for any profile object.
function linkBtn(href, kind, label) {
  const safe = safeHref(href);
  if (!safe) return "";
  return `<a class="link-btn" href="${esc(withRef(safe))}" target="_blank" rel="noopener">${ICONS[kind]}<span>${label}</span></a>`;
}
function renderLinks(container, obj) {
  const parts = [];
  if (obj.linkedin) parts.push(linkBtn(obj.linkedin, "linkedin", "LinkedIn"));
  if (obj.x) parts.push(linkBtn(obj.x, "x", "X"));
  if (!obj.linkedin && !obj.x && obj.url) parts.push(linkBtn(obj.url, "link", "Source"));
  container.innerHTML = parts.join("");
  container.style.display = parts.length ? "" : "none";
}

// Animated circular score gauge.
function scoreRing(score) {
  const p = pct(score);
  const r = 24;
  const c = 2 * Math.PI * r;
  const off = c * (1 - p / 100);
  const wrap = el(
    "div",
    "score",
    `<svg viewBox="0 0 58 58">
       <circle class="ring-bg" cx="29" cy="29" r="${r}" stroke-width="5"></circle>
       <circle class="ring-fg" cx="29" cy="29" r="${r}" stroke-width="5"
         stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${c.toFixed(1)}"></circle>
     </svg>
     <div class="pct">${p}%</div>`
  );
  const fg = wrap.querySelector(".ring-fg");
  requestAnimationFrame(() => (fg.style.strokeDashoffset = off.toFixed(1)));
  return wrap;
}

// One POST to the worker's /feedback endpoint. Fire-and-forget by default; the
// caller decides whether to await for UI confirmation.
function postFeedback(payload) {
  return fetch(ENDPOINT + "/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// Comment-only feedback affordance (used on the SOURCE profile card, where a
// thumbs verdict doesn't make sense — "wrong person" is handled by Refine).
function renderFeedback(container, target) {
  container.innerHTML =
    `<button class="fb-toggle" type="button">✎ Feedback on this result</button>
     <div class="fb-form is-hidden">
       <textarea placeholder="${esc(COPY[currentEntity].feedbackPlaceholder)}"></textarea>
       <div class="fb-actions">
         <button class="fb-send" type="button">Send feedback</button>
         <button class="fb-cancel" type="button">Cancel</button>
       </div>
     </div>`;
  const toggle = container.querySelector(".fb-toggle");
  const form = container.querySelector(".fb-form");
  const ta = container.querySelector("textarea");
  const send = container.querySelector(".fb-send");
  const cancel = container.querySelector(".fb-cancel");

  toggle.addEventListener("click", () => {
    form.classList.toggle("is-hidden");
    if (!form.classList.contains("is-hidden")) ta.focus();
  });
  cancel.addEventListener("click", () => { form.classList.add("is-hidden"); ta.value = ""; });
  send.addEventListener("click", async () => {
    const comment = ta.value.trim();
    if (!comment) return ta.focus();
    send.disabled = true;
    send.textContent = "Sending…";
    try {
      await postFeedback({ runId: currentRunId, input: lastInput, target, comment });
      container.innerHTML = `<span class="fb-thanks">✓ Thanks — your feedback was recorded.</span>`;
    } catch {
      send.disabled = false;
      send.textContent = "Send feedback";
      ta.insertAdjacentHTML("afterend", `<span class="fb-thanks" style="color:#dc2626">Couldn't send — try again.</span>`);
    }
  });
}

// Per-match feedback: one-click 👍/👎 (revealed on card hover via CSS). A 👎
// auto-expands an optional comment box for the "why". Every vote carries the
// runId + result URL so the worker can feed it back into Exa retrieval.
function renderMatchFeedback(container, match) {
  const resultUrl = match.linkedin || match.x || match.url || "";
  container.innerHTML =
    `<div class="fb-vote" role="group" aria-label="Was this a good match?">
       <button class="fb-thumb up" type="button" aria-label="Good match" title="Good match">${THUMB_UP}</button>
       <button class="fb-thumb down" type="button" aria-label="Bad match" title="Bad match">${THUMB_DOWN}</button>
       <span class="fb-vote-thanks" aria-live="polite"></span>
     </div>
     <div class="fb-form is-hidden">
       <textarea placeholder="What was off about this match? (optional — helps us fix it)"></textarea>
       <div class="fb-actions">
         <button class="fb-send" type="button">Send</button>
         <button class="fb-cancel" type="button">Skip</button>
       </div>
     </div>`;
  const up = container.querySelector(".fb-thumb.up");
  const down = container.querySelector(".fb-thumb.down");
  const thanks = container.querySelector(".fb-vote-thanks");
  const form = container.querySelector(".fb-form");
  const ta = container.querySelector("textarea");
  const send = container.querySelector(".fb-send");
  const cancel = container.querySelector(".fb-cancel");
  let verdict = null;

  function vote(v, comment) {
    verdict = v;
    up.classList.toggle("is-active", v === "up");
    down.classList.toggle("is-active", v === "down");
    postFeedback({
      runId: currentRunId,
      resultUrl,
      resultName: match.name,
      verdict: v,
      input: lastInput,
      ...(comment ? { comment } : {}),
    }).catch(() => {});
  }

  up.addEventListener("click", () => {
    vote("up");
    form.classList.add("is-hidden");
    thanks.textContent = "✓ Thanks";
  });
  down.addEventListener("click", () => {
    vote("down");
    thanks.textContent = "";
    form.classList.remove("is-hidden"); // auto-expand the "why" on a downvote
    ta.focus();
  });
  cancel.addEventListener("click", () => { form.classList.add("is-hidden"); thanks.textContent = "✓ Thanks"; });
  send.addEventListener("click", () => {
    // The downvote is already recorded; this just attaches the optional comment.
    vote(verdict || "down", ta.value.trim());
    form.classList.add("is-hidden");
    thanks.textContent = "✓ Thanks — recorded.";
  });
}

function renderProfile(p) {
  $("src-name").textContent = p.name || "Profile";
  $("src-sub").textContent = [p.current_role, p.current_company, p.location].filter(Boolean).join(" · ");
  $("src-arc").textContent = p.arc || p.company_description || "";
  const chips = $("src-traits");
  chips.innerHTML = "";
  (p.traits || []).forEach((t) => {
    const w = t.weight != null ? `<span class="w">${pct(t.weight)}</span>` : "";
    chips.appendChild(el("span", "chip", `${esc(t.value || t)}${w}`));
  });
  renderLinks($("src-links"), p);
  renderFeedback($("src-fb"), `source: ${p.name || lastInput}`);
  $("source").classList.remove("is-hidden");
}

function renderMatches(matches) {
  const grid = $("results");
  grid.innerHTML = "";
  matches.forEach((m, i) => {
    const card = el("div", "card match" + (i === 0 ? " top" : ""));
    card.style.animationDelay = i * 0.08 + "s";

    if (i === 0) card.appendChild(el("div", "match-badge", "★ Top match"));

    const head = el("div", "match-head");
    head.appendChild(
      el("div", null,
        `<h3 class="match-name">${esc(m.name)}</h3>
         <p class="match-role">${esc([m.role, m.company].filter(Boolean).join(" · "))}</p>`)
    );
    head.appendChild(scoreRing(m.score));
    card.appendChild(head);

    if (m.arc) card.appendChild(el("p", "match-arc", esc(m.arc)));

    if (m.axes && m.axes.length) {
      const axes = el("div", "axes");
      m.axes.forEach((a) => {
        const row = el("div", "axis");
        row.appendChild(el("div", "axis-top", `<span>${esc(a.axis)}</span><span>${pct(a.score)}</span>`));
        const bar = el("div", "axis-bar");
        const fill = el("div", "axis-fill");
        bar.appendChild(fill);
        row.appendChild(bar);
        axes.appendChild(row);
        requestAnimationFrame(() => (fill.style.width = pct(a.score) + "%"));
      });
      card.appendChild(axes);
    }

    if (m.note) card.appendChild(el("p", "match-note", `<b>Why:</b> ${esc(m.note)}`));

    const links = el("div", "links");
    renderLinks(links, m);
    card.appendChild(links);

    const fb = el("div", "fb");
    renderMatchFeedback(fb, m);
    card.appendChild(fb);

    grid.appendChild(card);
  });
  $("results-wrap").classList.remove("is-hidden");
}

function showNotice(html, isError) {
  const n = $("notice");
  n.innerHTML = html;
  n.className = "notice" + (isError ? " error" : "");
}

function handleEvent(ev) {
  switch (ev.type) {
    case "runid": currentRunId = ev.runId || null; break;
    case "stage": setStep(ev.step, ev.state || "active"); break;
    case "status": $("status").textContent = ev.text || ""; break;
    case "profile": renderProfile(ev.profile); break;
    case "classified":
      applyEntityCopy(ev.entity);
      renderEntityNote(ev);
      break;
    case "cached":
      /* Same input, same answer. The pipeline can't be made reproducible —
         model-written queries into neural search give a different candidate
         pool each time — so the result is rolled once and kept. Say so, and
         make refreshing an explicit choice rather than a silent re-roll. */
      $("cached-note").innerHTML =
        `Showing a saved report from ${esc(String(ev.cachedAt || "").slice(0, 10))} — repeat searches are free and don't use your quota. ` +
        `<button type="button" class="link-button" id="refresh-run">Run it again</button>`;
      $("cached-note").classList.remove("is-hidden");
      $("refresh-run").addEventListener("click", () => run(lastInput, null, { refresh: true }));
      break;
    case "page":
      // This search now has a permanent, shareable, indexable home.
      $("permalink").innerHTML =
        `Permanent link: <a href="${esc(ev.url)}">${esc(ev.url.replace(/^https?:\/\//, ""))}</a>`;
      $("permalink").classList.remove("is-hidden");
      {
        const path = entityPath(ev.url);
        if (path && path !== location.pathname) {
          history.pushState({ lookalikeEntity: path }, "", path);
        }
      }
      break;
    case "papers":
      renderPapers(ev);
      break;
    case "feed":
      renderFeed(ev);
      break;
    case "results":
      setResultsTitle(ev.title);
      renderMatches(ev.matches || []);
      // After the first successful result-set lands, prompt the user to share.
      // The widget guards on sessionStorage so it only fires once per session.
      if ((ev.matches || []).length > 0 && window.canonicalShare && typeof window.canonicalShare.showLookalikeModal === "function") {
        setTimeout(function () { window.canonicalShare.showLookalikeModal(); }, 1400);
      }
      break;
    case "quota":
      if (ev.remaining != null)
        $("quota").textContent = `${ev.remaining} lookup${ev.remaining === 1 ? "" : "s"} left today`;
      break;
    case "anchor_unverified":
      // The worker couldn't confirm the reconstructed profile matches the
      // input. Surface a warning banner. Auto-open the refine modal ONLY the
      // first time per session — after that the user knows where the refine
      // affordance is, and re-popping the modal is hostile.
      showAnchorWarning(ev.reason);
      if (!modalAutoOpened) {
        modalAutoOpened = true;
        openRefineModal({ auto: true });
      }
      break;
    case "error":
      $("spinner").style.display = "none";
      $("status").textContent = "";
      showNotice(`<b>Couldn't finish:</b> ${esc(ev.message)}`, true);
      break;
  }
}

function showAnchorWarning(msg) {
  // Suppressed once the user has submitted hints — they're actively trying to
  // correct it and don't need the warning replayed during the retry.
  if (anchorWarningSuppressed) return;
  const el = $("anchor-warning");
  if (msg) $("anchor-warning-msg").textContent = msg;
  el.classList.remove("is-hidden");
}
function hideAnchorWarning() {
  $("anchor-warning").classList.add("is-hidden");
}

/* Client-side mirror of worker/src/safety.js validateInput().
   Deliberately a SUBSET: this exists to give an instant, specific error
   instead of a wasted round-trip, and it is never the security boundary —
   the Worker re-runs every one of these rules and more. Anything this misses
   is caught there; anything this rejects would have been rejected there. */
function validateEntry(raw) {
  const s = String(raw || "").trim();
  if (!s) return { ok: false, reason: "Paste a LinkedIn URL, a company website, or an @handle." };
  if (s.length > 2048) return { ok: false, reason: "That's too long to be a profile or company URL." };
  if (/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uFEFF]/.test(s)) {
    return { ok: false, reason: "That contains invisible characters — paste the plain URL." };
  }
  if (/^@\w{1,15}$/.test(s)) return { ok: true };

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : "https://" + s;
  let u;
  try { u = new URL(withScheme); } catch { return { ok: false, reason: "That isn't a valid URL or @handle." }; }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, reason: "Only http and https links are accepted." };
  }
  if (u.username || u.password) return { ok: false, reason: "URLs with embedded credentials aren't accepted." };
  if (!u.hostname.includes(".")) return { ok: false, reason: "That isn't a valid public domain." };
  return { ok: true };
}

function showFieldError(reason) {
  const box = $("input");
  box.classList.add("is-invalid");
  box.setAttribute("aria-invalid", "true");
  const msg = $("input-error");
  msg.textContent = reason;
  msg.classList.remove("is-hidden");
}

function clearFieldError() {
  const box = $("input");
  box.classList.remove("is-invalid");
  box.removeAttribute("aria-invalid");
  $("input-error").classList.add("is-hidden");
}

/* What the classifier decided. Shown only when it wasn't already obvious from
   the URL, so a LinkedIn lookup doesn't get a redundant line, but an X handle
   read as a company does. A wrong call should be visible, not silent — the
   same principle as the anchor warning. */
/* Swap every person/company string at once.

   One function rather than a fix at each call site: these strings sit across
   the stepper, the source card, the warning banner and the refine modal, and a
   user meets them within seconds of each other. Correcting them piecemeal
   doesn't make the copy right, it just moves the wrong noun one step later.

   Safe to call before buildStepper() — the step label falls back to
   COPY[currentEntity] at build time, and this only touches it if it exists. */
function applyEntityCopy(entity) {
  currentEntity = entity === "company" ? "company" : "person";
  const c = COPY[currentEntity];

  $("wrong-person").textContent = c.wrongEntity;
  $("refine-title").textContent = c.refineTitle;
  $("anchor-warning-lead").textContent = c.anchorLead;
  $("src-arc-label").textContent = c.arcLabel;
  $("refine-name-label").textContent = c.nameLabel;
  $("refine-knownfor-label").textContent = c.knownForLabel;

  const form = $("refine-form");
  form.querySelector('input[name="known_for"]').placeholder = c.knownForPlaceholder;
  form.querySelector('input[name="url"]').placeholder = c.urlPlaceholder;

  /* The employer field is person-only. Clearing it on the way out matters:
     hiding alone would leave a stale value from an earlier person search still
     in the FormData, and it would be sent as a hint for a company. */
  const employerField = $("refine-employer-field");
  const isCompany = currentEntity === "company";
  employerField.classList.toggle("is-hidden", isCompany);
  if (isCompany) form.querySelector('input[name="employer"]').value = "";

  const stepLabel = $("step-score")?.querySelector(".step-label");
  if (stepLabel) stepLabel.textContent = c.scoreStep;

  /* The source card's feedback box is built when `profile` renders. Today the
     worker sends `classified` first, so it would already read the right copy —
     but that's an ordering guarantee from another repo, and the cost of not
     depending on it is one line. */
  const srcFb = $("src-fb").querySelector("textarea");
  if (srcFb) srcFb.placeholder = c.feedbackPlaceholder;
}

function renderEntityNote(ev) {
  const note = $("entity-note");
  if (ev.confidence >= 1) { note.classList.add("is-hidden"); return; }
  const label = ev.entity === "company" ? "a company" : "a person";
  note.innerHTML = ev.uncertain
    ? `Read as <b>${label}</b>, though we weren't certain. ${esc(ev.why || "")}`
    : `Read as <b>${label}</b>. ${esc(ev.why || "")}`;
  note.classList.remove("is-hidden");
}

function setResultsTitle(title) {
  if (title) $("results-title").textContent = title;
}

/* arXiv papers.

   The empty state is a real state, not a hidden block. arXiv is rich for an AI
   infrastructure company and genuinely empty for a payments company; saying so
   is more useful than omitting the section silently or padding it with
   loosely-related work that implies a research connection there isn't. */
function renderPapers(ev) {
  const wrap = $("papers-wrap");
  const list = $("papers");
  const sub = $("papers-sub");
  list.innerHTML = "";

  if (!ev.papers || !ev.papers.length) {
    sub.textContent = ev.reason
      ? `No related research found — ${ev.reason}.`
      : "No related research found.";
    wrap.classList.remove("is-hidden");
    return;
  }

  sub.textContent = ev.topics && ev.topics.length
    ? `Papers on ${ev.topics.join(", ")} — who else is working on this.`
    : "Who else is working on this.";

  for (const p of ev.papers) {
    const href = safeHref(p.url);
    const shown = (p.authors || []).slice(0, 3).join(", ");
    const more = p.authorCount > 3 ? ` +${p.authorCount - 3}` : "";
    const card = document.createElement("div");
    card.className = "card paper";
    card.innerHTML =
      `<div class="paper-meta">` +
        (p.category ? `<span class="paper-cat">${esc(p.category)}</span>` : "") +
        (p.year ? `<span>${esc(p.year)}</span>` : "") +
      `</div>` +
      `<h3 class="paper-title">${esc(p.title)}</h3>` +
      (shown ? `<p class="paper-authors">${esc(shown + more)}</p>` : "") +
      (p.summary ? `<p class="paper-summary">${esc(p.summary)}</p>` : "") +
      (href ? `<div class="links">${linkBtn(href, "link", "Read on arXiv")}</div>` : "");
    list.appendChild(card);
  }
  wrap.classList.remove("is-hidden");
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/** "2026-08" → "August 2026". Input is already validated as YYYY-MM by the worker. */
function monthLabel(key) {
  const [y, m] = String(key).split("-");
  return `${MONTHS[Number(m) - 1] || ""} ${y}`.trim();
}

function feedRow(item) {
  const href = safeHref(item.url);
  const title = href
    ? `<a href="${esc(withRef(href))}" target="_blank" rel="noopener">${esc(item.title)}</a>`
    : esc(item.title);
  const meta = [item.source, item.about, item.author].filter(Boolean).map(esc).join(" · ");
  return `<div class="feed-item">` +
    `<div class="feed-item-head"><h3 class="feed-title">${title}</h3>` +
    (item.date ? `<span class="feed-date">${esc(item.date)}</span>` : "") +
    `</div>` +
    (meta ? `<p class="feed-meta">${meta}</p>` : "") +
    (item.snippet ? `<p class="feed-snippet">${esc(item.snippet)}</p>` : "") +
    `</div>`;
}

/* Reverse-chronological activity, grouped by month.

   Undated items render in their own block BELOW the timeline rather than being
   slotted into it. The worker deliberately refuses to guess a date, and putting
   them anywhere in the ordering would re-introduce exactly the claim it avoided. */
function renderFeed(ev) {
  const wrap = $("feed-wrap");
  const list = $("feed");
  const sub = $("feed-sub");
  const undatedWrap = $("feed-undated");
  list.innerHTML = "";
  $("feed-undated-list").innerHTML = "";
  undatedWrap.classList.add("is-hidden");

  const items = ev.items || [];
  const undated = ev.undated || [];

  if (!items.length && !undated.length) {
    sub.textContent = ev.reason ? `No recent activity found — ${ev.reason}.` : "No recent activity found.";
    wrap.classList.remove("is-hidden");
    return;
  }

  const sources = (ev.sources || []).slice(0, 6).join(", ");
  sub.innerHTML =
    `Newest first, across this ${currentEntity} and its top matches` +
    (sources ? ` — ${esc(sources)}` : "") +
    `. <span class="feed-caveat">Dates are publisher estimates and may be approximate.</span>`;

  let currentMonth = null;
  for (const item of items) {
    const key = String(item.date || "").slice(0, 7);
    if (key && key !== currentMonth) {
      currentMonth = key;
      const h = document.createElement("p");
      h.className = "feed-month";
      h.textContent = monthLabel(key);
      list.appendChild(h);
    }
    const row = document.createElement("div");
    row.className = "card feed-card";
    row.innerHTML = feedRow(item);
    list.appendChild(row);
  }

  if (undated.length) {
    for (const item of undated) {
      const row = document.createElement("div");
      row.className = "card feed-card";
      row.innerHTML = feedRow(item);
      $("feed-undated-list").appendChild(row);
    }
    undatedWrap.classList.remove("is-hidden");
  }

  wrap.classList.remove("is-hidden");
}

/* The results ARE this entity's page, so the address bar should say so.

   pushState rather than a redirect: the report has just finished streaming and
   navigating would throw it away to re-fetch the same content. Reloading or
   sharing the URL then hits the server-rendered page, which carries the same
   report — so the two never disagree.

   Returns null for a cross-origin URL, which is what makes this safe in local
   dev: the worker always emits a www.canonical.cc URL, so on localhost there is
   simply no navigation rather than a pushState to a path that 404s on reload. */
function entityPath(url) {
  try {
    const u = new URL(url, location.href);
    return u.origin === location.origin ? u.pathname : null;
  } catch {
    return null;
  }
}

const LAB_ROOT_RE = /\/(people|companies)\//;
// Strips an entity segment back to the lab root: /labs/lookalike/companies/x → /labs/lookalike/
const ENTITY_PATH_RE = /\/(people|companies)\/.*$/;

/* Back button. Without this the URL returns to the lab root while the results
   stay on screen, which reads as a page that ignored you. */
window.addEventListener("popstate", () => {
  if (LAB_ROOT_RE.test(location.pathname)) return;
  if (running && inflight) inflight.abort();
  $("stage").classList.add("is-hidden");
  for (const id of ["permalink", "cached-note", "entity-note", "notice"]) {
    $(id).classList.add("is-hidden");
  }
  $("input").focus();
});

async function run(input, hints, opts) {
  if (running || !input.trim()) return;

  // Validate before spending a lookup or a round-trip. Refines reuse the
  // already-accepted input, so they skip straight through.
  if (!hints) {
    const check = validateEntry(input);
    if (!check.ok) {
      showFieldError(check.reason);
      $("input").focus();
      return;
    }
    clearFieldError();
  }
  // If a refine fires mid-stream, cancel the in-flight reader cleanly.
  if (inflight) inflight.abort();
  running = true;
  lastInput = input.trim();
  lastHints = hints || null;
  currentRunId = null; // cleared until the worker emits a fresh runid this run
  inflight = new AbortController();
  // Fresh search (no hints) resets the session guards so a new input can
  // re-warn / re-pop the modal. Refines keep them set — once the user has
  // seen the modal for this input and acted on it, the banner shouldn't
  // come back while we retry for them.
  if (!hints) {
    modalAutoOpened = false;
    anchorWarningSuppressed = false;
  }

  /* A new search starts from the lab's own URL, so the address bar never shows
     the previous entity while different results render. replaceState, not push:
     an in-flight search isn't a place worth going back to. */
  if (LAB_ROOT_RE.test(location.pathname)) {
    history.replaceState({}, "", location.pathname.replace(ENTITY_PATH_RE, "/"));
  }

  const go = $("go");
  go.disabled = true;
  go.classList.add("loading");
  $("go-label").textContent = hints ? "Retrying…" : "Finding…";
  $("notice").className = "notice is-hidden";
  hideAnchorWarning();
  $("source").classList.add("is-hidden");
  $("results-wrap").classList.add("is-hidden");
  $("papers-wrap").classList.add("is-hidden");
  $("feed-wrap").classList.add("is-hidden");
  $("permalink").classList.add("is-hidden");
  $("cached-note").classList.add("is-hidden");
  $("entity-note").classList.add("is-hidden");
  if (!hints) applyEntityCopy("person");
  $("stage").classList.remove("is-hidden");
  $("spinner").style.display = "";
  buildStepper();
  $("status").textContent = hints
    ? "Retrying with your hints — re-reading the open web…"
    : "Starting — reconstructing the profile from the open web…";
  // Stay anchored at the search box — the stage renders directly below it, so
  // progress is visible without yanking the viewport down as results stream in.

  try {
    const res = await fetch(ENDPOINT + "/lookalike", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: lastInput, ...(hints ? { hints } : {}), ...(opts?.refresh ? { refresh: true } : {}) }),
      signal: inflight.signal,
    });

    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      $("stage").classList.add("is-hidden");
      showNotice(
        `<b>${hints ? "Refine limit reached." : "Daily limit reached."}</b> ${
          hints
            ? "You've used your refine attempts for today."
            : "You've used your lookups for today"
        }${body.resetHint ? " — " + esc(body.resetHint) : ""}. This keeps the lab free for everyone. Come back tomorrow.`
      );
      return;
    }
    // The Worker re-validates everything the client checked, and rejects more
    // besides (private hosts, reserved paths, injection patterns). Surface its
    // reason on the field rather than as a generic failure — a caller who
    // bypassed the client validator should still get a precise answer.
    if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      $("stage").classList.add("is-hidden");
      if (body.reason) {
        showFieldError(body.reason);
        $("input").focus();
      } else {
        showNotice(`<b>Couldn't start:</b> ${esc(body.error || "that input wasn't accepted")}.`, true);
      }
      return;
    }
    if (!res.ok || !res.body) throw new Error(`Server returned ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop();
      for (const part of parts) {
        const line = part.replace(/^data:\s?/, "").trim();
        if (!line) continue;
        try { handleEvent(JSON.parse(line)); } catch (_) {}
      }
    }
    $("spinner").style.display = "none";
    if (!$("results-wrap").classList.contains("is-hidden")) {
      $("status").textContent = "Done — your closest matches are below.";
    } else {
      $("status").textContent = "";
    }
  } catch (err) {
    // Abort = user kicked off a refine; don't show an error for that.
    if (err.name === "AbortError") return;
    showNotice(
      `<b>Something went wrong:</b> ${esc(err.message)}. The Worker may be down or not yet configured.`,
      true
    );
  } finally {
    // Only clear running state if this is still the active run (abort means a
    // new run has already taken over and we don't want to step on its state).
    if (!inflight || !inflight.signal.aborted) {
      running = false;
      const go = $("go");
      go.disabled = false;
      go.classList.remove("loading");
      $("go-label").textContent = "Find Lookalikes →";
      $("spinner").style.display = "none";
    }
  }
}

// ── refine modal ───────────────────────────────────────────────────────
function openRefineModal({ auto } = {}) {
  const modal = $("refine-modal");
  modal.classList.remove("is-hidden");
  // Pre-fill any URL hint from the last input if it looks like one — saves
  // the user retyping if they corrected themselves in the modal.
  if (auto) $("refine-form").reset();
  // Focus the first field for keyboard users.
  setTimeout(() => modal.querySelector('input[name="full_name"]')?.focus(), 30);
}
function closeRefineModal() {
  $("refine-modal").classList.add("is-hidden");
}

function readRefineForm() {
  const form = $("refine-form");
  const data = new FormData(form);
  const hints = {};
  for (const key of ["full_name", "employer", "known_for", "url"]) {
    const v = String(data.get(key) || "").trim();
    if (v) hints[key] = v;
  }
  return Object.keys(hints).length ? hints : null;
}

$("refine-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const hints = readRefineForm();
  if (!hints) {
    // Nothing entered — nudge the user to fill at least one field.
    const first = $("refine-form").querySelector('input[name="full_name"]');
    first?.focus();
    return;
  }
  // User actively acknowledged the warning by giving us hints. Clear the
  // banner now and suppress it for the rest of this refine session — the
  // retry might re-fire anchor_unverified, and we don't want the same
  // dismissed warning to reappear during their fix-up attempt.
  hideAnchorWarning();
  anchorWarningSuppressed = true;
  closeRefineModal();
  // Allow the next run() to proceed even though `running` is still true from
  // the in-flight one — run() itself aborts the in-flight reader.
  running = false;
  run(lastInput, hints);
});
$("refine-cancel").addEventListener("click", closeRefineModal);
$("refine-close").addEventListener("click", closeRefineModal);
$("refine-modal").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) closeRefineModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("refine-modal").classList.contains("is-hidden")) closeRefineModal();
});
$("wrong-person").addEventListener("click", () => openRefineModal({ auto: false }));
$("anchor-warning-refine").addEventListener("click", () => openRefineModal({ auto: false }));

$("go").addEventListener("click", () => run($("input").value));
$("input").addEventListener("input", clearFieldError);
$("input").addEventListener("keydown", (e) => { if (e.key === "Enter") run($("input").value); });
