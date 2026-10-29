# Thesis refresh + "Projects that excite us" — built 2026-10-28, not yet committed

## Open questions (blocking)

1. **Fourth thesis name.** Answered: **Frontier Systems** — Notion Areas Cybersecurity,
   Defense, Ocean, Space, and the remaining Other rows (see mapping rule).
2. **"Silicon Quantum"** — built as one area, "Silicon & Quantum".
3. **Sort key for "reverse chronological".** Built with `Last updated` (newest first, tie-break
   `createdTime`) is the proposal. `Trigger date` would put 2028 at the top, which is forward-
   looking, not reverse-chronological.

## 1. About — add quantum computing

`index.html:142`, second about paragraph. Rewrite the tail list:

> …across compute, data, agents, cryptographic coordination, robotics, **quantum computing**, and
> other primitives that will become steady-state in a post-AGI world.

Also fixes the "othe" typo. Add "quantum computing" to the JSON-LD `knowsAbout` list and the
`Service.description` at `index.html:82`.

## 2. Thesis — 6 → 4

Today the grid mixes three *areas* (Physical AI & Robotics, Silicon, Open Infrastructure) with
three *how-we-work* cards (Technical Depth, Long-term Alignment, Network Effects). Cutting to 4
means dropping the how-we-work cards — not lost, they belong in About or /faqs.

| # | Title | Body (draft) |
| --- | --- | --- |
| [00] | Physical AI & Robotics | keep current copy |
| [01] | Silicon & Quantum | Every layer of the AI stack runs on silicon, and the next one may run on qubits. We back founders rethinking compute and memory — novel architectures, packaging, and the classical control and error-correction layer fault-tolerant quantum machines need. |
| [02] | Open Infrastructure | keep current copy |
| [03] | **TBD** | per question 1 |

4 cards in a `minmax(350px,1fr)` auto-fit grid lands as 2×2 on desktop — cleaner than today's 3×2.

Below the grid, right-aligned like `View full portfolio →`, reuse `.portfolio-footer` /
`.portfolio-view-all-link`:

    Projects that excite us →        (href="/projects/")

## 3. New page — /projects/

### Data flow: build-time sync, not a live fetch

    Notion DB ──(GitHub Action, daily cron + manual dispatch)──▶ scripts/sync-projects.mjs
       ──▶ _data/projects.json (committed) ──▶ Jekyll renders cards server-side ──▶ deploy

Why this over fetching Notion from the browser or a Worker:
- No Notion token anywhere near the client; the token is a repo secret (`NOTION_TOKEN`).
- Static HTML means the page gets the Markdown twin, a sitemap entry and llms-full.txt for free.
- Mirrors the existing `refresh-quotes.yml` → `data.json` pattern.
- Gotcha: a push made with `GITHUB_TOKEN` does **not** trigger `deploy.yml`. The sync job must
  end with `gh workflow run deploy.yml` (dispatch is allowed) — check whether refresh-quotes has
  the same silent gap.

### What gets published — allowlist, not denylist

Row page bodies contain **Our pipeline** (named confidential teams, Granola citations) and
**Comparables**. The script reads **properties only** and never fetches page bodies, so neither
section can leak, now or when someone adds a new private heading later.

| Notion property | On card | Note |
| --- | --- | --- |
| Name | title | |
| One-liner | body | |
| Wedge | "First product" line | |
| Trigger + Trigger date | "Why now" footer | strip `[press]`-style bracket notes |
| Status | **not shown** | read only to drop `Cut` rows; never rendered (user, 2026-10-28) |
| Last updated | sort key + "Updated Oct 28" | |
| Area + Category | thesis tag + filter | via the mapping rule below |
| *new:* Site thesis (select, optional) | override | wins over the rule when set |
| *new:* Publish (checkbox) | gate | only checked rows ship |
| Link to doc, Number, page body | **never read** | Link to doc is an internal Notion URL |

### Thesis mapping rule (user: 4th thesis = Cybersecurity, Defense, Ocean, Space, Other*)

Applied in order; `Other*` = Area "Other" rows that don't fit the first three theses.

1. Area ∈ {Chips, Quantum} → **Silicon & Quantum**
2. Area ∈ {Cybersecurity, Defense, Ocean, Space} → **4th thesis (name TBD)**
3. Area = Other → by Category: Physical AI → **Physical AI & Robotics**; DeAI or Post-AGI
   infrastructure → **Open Infrastructure**; Energy or Bio → **4th thesis**

Result on today's 16 non-Cut rows:

| Thesis | Rows |
| --- | --- |
| Silicon & Quantum (5) | Yield for new fabs · Memory and optical interconnect · Agent CPUs · Chip design tools · Quantum error correction |
| 4th thesis (8) | Orbital data centers · Proof checking for AI code · Agent identity · Seafloor monitoring · Drone autonomy · Neuron-on-chip assays · AI lab instruments · Flexible data-center power |
| Open Infrastructure (2) | Verifying and paying for agent work · Ops for mixed AI clusters |
| Physical AI & Robotics (1) | Safety evidence for learning robots |

Drone autonomy and seafloor monitoring are Category "Physical AI" but land in the 4th thesis
because Area wins — matches the user's list. Agent identity and proof checking are agent
infrastructure but Area = Cybersecurity, so also 4th. Override with `Site thesis` if wrong.

Two new Notion properties are the one schema change. Proposed default mapping for Site thesis:
Physical AI → Physical AI & Robotics; Silicon, Area=Quantum → Silicon & Quantum; DeAI,
Post-AGI infrastructure → Open Infrastructure; Energy, Bio → TBD / unpublished.

Script also: fails the job (leaving the old JSON) if the API errors or returns 0 publishable
rows, and HTML-escapes every field (Liquid `| escape`).

### Page layout

- Hero, same as /portfolio: "Projects that excite us" + subtitle "Problems we'd back a team
  on today. If you're building one, we'd like to hear from you."
- Filter chips: All · Physical AI & Robotics · Silicon & Quantum · Open Infrastructure · [4th].
  Progressive enhancement — all cards render without JS; chips just toggle `hidden`.
- Grid: `.portfolio-grid` (3-col → 2 → 1), new `.project-card` modifier.
- Card: thesis tag / title / one-liner / "First product: <wedge>" / divider /
  "Why now: <trigger> · <date>" / "Updated <date>". Not clickable in v1 (no detail pages).
- Footer CTA: "Building one of these? hello@canonical.cc — warm intros preferred."
- Header nav: no new item (it's reached from Thesis); `active` stays unset.

## Review (2026-10-28)

- `_data/projects.json` was seeded from the same Notion rows via `--rows`, so the page works
  before the token exists. 16 projects: Frontier Systems 8, Silicon & Quantum 5, Open
  Infrastructure 2, Physical AI & Robotics 1.
- Full `github-pages build` (needs `LANG=en_US.UTF-8` locally) + `check-built-site.sh` pass,
  including skill digests. `/projects/` is in the sitemap.
- Leak grep on the built page for pipeline/comparables/granola/notion.com/status words: the only
  hit is "pipeline" inside one wedge ("Log-to-conformity-file pipeline"). No status labels.
- Browser: 16 cards, filter shows 5 for Silicon & Quantum, no horizontal scroll at 375px;
  homepage thesis is a 2×2 grid with the link beneath.
- Not verified: a live Notion API call (no token locally) and the workflow run itself.
- Found in passing: `scripts/refresh-quotes.mjs` reads `labs/physical-ai/data.json`, which no
  longer exists (moved to `physical-ai-robotics/`), and its push can't trigger a deploy either.

## Knock-on files (thesis wording must agree everywhere)

- `index.html` — about, thesis grid, link, JSON-LD, meta keywords
- `AGENTS.md`, `llms.txt`, `llms-full.txt` — focus areas list; add `/projects/` row
- `faqs.html` + its FAQPage JSON-LD
- `.well-known/agent-skills/canonical-thesis/SKILL.md` — digest recomputes on deploy
- `js/webmcp.js` — `get_canonical_thesis` payload
- `css/style.css` — `.project-card`, chips; bump `asset_version`

## Build steps (after the questions are answered)

- [ ] (user) Share the Notion DB with a read-only integration; add `NOTION_TOKEN` repo
      secret. Optional: `Site thesis` (select) and `Publish` (checkbox) properties — the script
      honours them when present. Adding Publish hides every unticked row.
- [x] About copy + JSON-LD
- [x] Thesis grid → 4 cards + "Projects that excite us →" link
- [x] `scripts/sync-projects.mjs` + `.github/workflows/sync-projects.yml`
- [x] `projects/index.html` + CSS (`asset_version` → 20261028a)
- [x] Knock-on files (AGENTS.md, llms.txt, llms-full.txt, faqs.html, canonical-thesis SKILL.md + digest)
- [x] Verify: local Jekyll build, grep `_site/projects/` for "pipeline", "Comparables",
      "Granola", "notion.com" → must be zero; `check-built-site.sh`; mobile width

---

# Agent readiness — reach Level 3 without fabricating infrastructure

## What prompted this

A scan from [isitagentready.com](https://isitagentready.com) rates www.canonical.cc at
**Level 2 "Bot-Aware"**. Passing already: `robots.txt`, `sitemap.xml`, AI bot rules, Content
Signals. Eleven checks fail, and exactly one of them — `markdownNegotiation` — is what stands
between us and **Level 3 "Agent-Readable"**.

Baseline captured 2026-08-16T17:03:52Z.

## The judgement call

Most of the failing checks describe discovery documents for infrastructure canonical.cc does
not have. An OAuth discovery document for a site with no authorization server, or an MCP server
card for a server that does not exist, does not make the site more agent-ready — it makes it
*lie* to the first agent that trusts it and tries to connect. Those are skipped on purpose.

| Check | Doing | Why |
| --- | --- | --- |
| `markdownNegotiation` | yes | The Level 3 blocker. Cloudflare edge conversion, zero code |
| `linkHeaders` | yes | Cheap, real, nothing to maintain |
| `apiCatalog` | yes, documentation-only | Passes without advertising the metered lab endpoints |
| `agentSkills` | yes | Two skills grounded entirely in `/faqs` and `llms.txt` |
| `webMcp` | yes | Client-side only, no server required |
| `oauthDiscovery`, `oauthProtectedResource`, `authMd` | **no** | There is no authorization server to describe |
| `a2aAgentCard`, `mcpServerCard` | **no** | There is no A2A agent and no MCP server |
| `dnsAid` | **no** | SVCB records need an agent endpoint to point at |
| `webBotAuth` | **no** | Scanner marks it informational, not a failure |

The `apiCatalog` restraint is deliberate. `canonical-aeo/worker/wrangler.toml` records ~$1.35
per AEO run against a ~$75/day ceiling, and both lab APIs are CORS-bound to canonical.cc
because they exist to serve our own front-end. The catalog therefore lists `service-doc` links
to the human lab pages and carries **no `service-desc`, no endpoint hostnames, no invocation
contract** — discoverable, not directly billable.

## Tasks

### Repo

- [x] `_config.yml` — `include: ['.well-known']` so Jekyll stops skipping the dot-directory
- [x] `.well-known/api-catalog` — RFC 9727 linkset, documentation-only
- [x] `.well-known/agent-skills/canonical-thesis/SKILL.md`
- [x] `.well-known/agent-skills/canonical-portfolio/SKILL.md`
- [x] `.well-known/agent-skills/index.json` — discovery index with SHA-256 digests
- [x] `js/webmcp.js` — register tools on `navigator.modelContext`
- [x] `index.html` — load `js/webmcp.js`
- [x] `scripts/check-built-site.sh` — fail the build when a digest drifts

### Cloudflare

- [x] Enable **Markdown for Agents** (AI Crawl Control). Pro purchased for this
- [x] Response Header Transform Rule — `Link` header on `/`
- [x] `Content-Type: application/linkset+json` on `/.well-known/api-catalog`

Both transform rules live in the zone's `http_response_headers_transform` ruleset
(`9532212070684a4394d34b854e45cb60`).

## Two things worth knowing

**Digests are the fragile part.** `index.json` pins a SHA-256 of each `SKILL.md`. Edit a skill
without regenerating the digest and the document is silently wrong — an agent that verifies
will reject it, and nothing else in the site would notice. That is why the build guard
recomputes them; drift becomes a failed deploy rather than a quiet lie.

**Jekyll and `.md` files.** The comment at `index.html:106` records that an `index.md` at the
repo root once silently replaced the rendered homepage. The skills are `.md` files, so the same
converter is in play. They carry no YAML front matter, which should make Jekyll treat them as
static files and copy them verbatim — and the build guard verifies that by checking the files
still exist at their published paths in `_site` before it checks their digests.

**Check-size wording.** `/faqs` says "typically writes $1M first checks at pre-seed"; `llms.txt`
and the homepage `Service` schema say "$500K–$1.5M". Both are on the site. The skills say
"$500K–$1.5M, most often around $1M at pre-seed", which is faithful to both rather than picking
a winner. Worth reconciling at source sometime.

## Review

**Done. Level 2 "Bot-Aware" → Level 4 "Agent-Integrated"**, clearing Level 3 outright.

| Check | Before | After |
| --- | --- | --- |
| `markdownNegotiation` | fail | **pass** |
| `linkHeaders` | fail | **pass** |
| `apiCatalog` | fail | **pass** |
| `agentSkills` | fail | **pass** |
| `webMcp` | fail | **pass** |

The homepage now serves 2,145 tokens of Markdown to agents against 8,893 tokens of HTML — a
4× reduction, which is the whole point of the exercise.

### The transform rules were saved wrong, twice

Both rules deployed "successfully" from the dashboard and did nothing. Reading them back over
the API showed why:

```
(http.request.full_uri wildcard r#"(http.host in {"canonical.cc" ...} and ...)"#)
```

The form was in **wildcard-pattern mode**, not the raw expression editor, so the expression was
stored as a literal URL pattern to string-match against. Nothing matches the characters
`(http.host in {`. This also explains the "your DNS may not be proxying traffic for
`(http.request.uri.path eq "`" warning the dashboard threw on both rules — it was reading the
expression as a hostname and truncating it at the first `/`. The warning was a symptom, not a
DNS problem; canonical.cc was proxied the whole time.

Fixed by `PUT`ing the ruleset with real expressions. If these ever need editing again, edit
them over the API, or in the dashboard make sure the match section is switched to **Custom
filter expression → Edit expression** before pasting anything.

One aside worth remembering: after the fix, `Content-Type` took effect within seconds while
`Link` took a minute or so. Same ruleset, same deploy. Don't conclude a rule failed from one
early curl — that nearly sent this down a wrong path.

### What was verified, and how

The build guard was exercised against a simulated `_site` in five states, all behaving:

| Case | Result |
| --- | --- |
| Everything correct | passes |
| A `SKILL.md` edited, digest left stale | fails, prints both hashes and the fix command |
| A `SKILL.md` rendered to HTML by Jekyll | fails, names the front-matter cause |
| `.well-known` missing entirely | fails — this one was a hole in the first draft, which reported "digests match" while publishing nothing |
| `index.json` malformed | fails |

`js/webmcp.js` was run in a `vm` sandbox against the real page data — the JSON-LD parsed out of
`index.html`, the nav links out of `_includes/header.html`, the array out of `js/script.js`.
All three tools registered with an `AbortSignal`, returned serializable objects, and reported
10 labs and 17 portfolio companies. The `query` filter narrows correctly ("robot" → Robo,
Nirvana AI).

Jekyll could not be run locally (system Ruby 2.6, no jekyll gem), so whether it copies the
`SKILL.md` files verbatim or converts them was left to CI. **Answered on deploy: it copies
them.** The build printed `✓ check-built-site: … skill digests match`, and both digests were
then re-verified against the bytes the live site serves through Cloudflare.

### Worth knowing

The reference implementation this standard ships from — isitagentready.com's own
`/.well-known/agent-skills/index.json` — has **six of six digests that do not match the bytes
it serves**. Verified by fetching each `SKILL.md` and hashing it. Their index has drifted from
their artifacts, which is exactly the failure the build guard here exists to prevent. Ours are
computed from the shipped bytes and re-checked on every deploy.

### Deliberately not done

`oauthDiscovery`, `oauthProtectedResource`, `authMd`, `a2aAgentCard`, `mcpServerCard`, `dnsAid`
— all remain failing, all on purpose. Each wants a discovery document for a server canonical.cc
does not run. Publishing them would raise the scan score by lying to agents.

The scanner now names `authMd`, `mcpServerCard` and `a2aAgentCard` as the requirements for
Level 5 "Agent-Native". That is a real project, not a config change: an MCP server over the
portfolio, labs and thesis data — which we already have clean structured sources for in
`js/script.js` and `/faqs` — with the A2A and auth documents following from it. Worth doing
only if we want agents *calling* Canonical rather than just reading it. The cards come after
the server, never before.

### Unrelated things noticed, not touched

- `sitemap.xml` publishes five URLs that should not be indexed: `partials/header.html`,
  `partials/footer.html`, `tasks/aeo-lab-prd.html`, `labs/dilutionlab/tests.html`, and the
  Google verification file. A short `exclude:` addition in `_config.yml` would fix it.
- Check size is stated two ways on the site: `/faqs` says "typically $1M first checks at
  pre-seed", `llms.txt` and the homepage `Service` schema say "$500K–$1.5M".
