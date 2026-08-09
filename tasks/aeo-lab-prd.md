# PRD — AEO Readiness Check (Canonical Labs)

**Slug:** `/labs/aeo/`
**Status:** Draft for approval
**Date:** 2026-08-08
**Owner:** Anand

---

## 1. Summary

A free tool at `canonical.cc/labs/aeo/` where any company pastes their URL and gets
back an **AEO readiness score (0–100, graded A–D)** plus **specific, copy-pasteable
fixes** — not "add schema markup," but the actual JSON-LD block for their product,
the actual `llms.txt` for their site, the actual rewritten opening paragraph.

The score is composite: half **site audit** (what we can deterministically check
about their site) and half **live AI visibility** (what five real answer engines
actually say when asked buyer-intent questions in their category).

**Scope is one site.** No competitor cohort, no comparison product, no email gate —
the report is free and fully ungated. Competitor analysis is explicitly deferred
(§11).

### Why this drives traffic to canonical.cc

Every founder currently has a nagging, unquantified worry that they're invisible on
ChatGPT. This turns that worry into a number, a grade, and a to-do list with the code
already written. The score is shareable and the fixes are forwardable — a founder
sends the report to their web dev, and the Canonical logo rides along. It's the same
mechanic that made Lookalike Finder work, aimed at a much larger audience: every
company has a website; not every company is hiring.

It also positions Canonical correctly. Grading *agent-readiness* — MCP endpoints,
Content Signals, machine-readable Markdown — is a statement about where the web is
going, from a firm that invests in that thesis.

---

## 2. Competitive read

Five reference sites, what they actually do:

| Site | What it is | Input → Output |
|---|---|---|
| **Framer** | Marketing page fronting a free scanner | One URL → readiness report in ~10s. Ungated. |
| **forkoff.xyz** | Real visibility audit | Brand + 10–50 buyer-intent queries + 3–5 competitors → citation share across ChatGPT/Perplexity/Claude/Gemini/Grok, per-LLM A–D bands, radar chart, snippet ownership, source freshness |
| **HubSpot** | Guide + separate AEO Grader | Brand → sentiment, recognition, competitive standing. "Brand Visibility Score" |
| **Webflow** | Enterprise product page | Four pillars (content, technical, authority, measurement). Audit panel checks alt text, meta titles/descriptions, schema |
| **Cloudflare** | Blog post, no tool | The agent-native frontier: robots.txt, sitemap, Content Signals, clean Markdown copies, `Link` headers, MCP, A2A agent cards, skills index, Web Bot Auth |

### Three gaps we exploit

**1. Nobody writes the fix.** All five stop at naming the gap. Webflow's audit panel
tells you schema is missing. None of them hand you the JSON-LD. This is the single
biggest differentiator and the reason to build.

**2. Nobody grades the agent layer.** Every grader stops at schema + content
structure — the 2024 checklist. Cloudflare wrote the 2026 checklist and shipped no
tool. Checking `llms.txt`, Content Signals, machine-readable Markdown, MCP endpoints,
and AI-bot allowlisting makes us the only scanner that measures agent-readiness.

**3. Nobody distinguishes training crawlers from answer crawlers.** Blocking `GPTBot`
is a legitimate, deliberate IP choice. Blocking `OAI-SearchBot` silently destroys your
ChatGPT citations. Most sites that block one block both by accident. Catching this is
a genuine "oh no" moment and costs us one file fetch.

### One thing we deliberately don't copy

forkoff makes the user supply 10–50 queries and a competitor list. That's an analyst
tool. For a free viral tool it's a conversion killer. **We auto-generate the query set
from the crawl and show the user what we picked, with an edit affordance.** Zero
friction, and showing our work is itself a credibility moment.

---

## 3. Goals / non-goals

**Goals**
- One input (a URL), one score, in under 90 seconds
- Every finding has a concrete artifact attached — code, file, or rewritten copy
- The report is a shareable, cacheable permalink
- Visually indistinguishable from the other Labs tools — specifically, built to the
  `labs/lookalike/` skeleton (§8)
- Marginal cost of a *shared* report is zero

**Non-goals (v1)**
- **Competitor cohort, side-by-side scorecards, or gap analysis** — deferred, §11
- **Email capture of any kind.** The gate decision was scoped to the competitor view;
  with that cut, v1 is fully ungated. Every finding is free.
- Ongoing monitoring, tracking over time, or alerting — this is a point-in-time scan
- Accounts, dashboards, saved history
- Auto-applying fixes to the user's site
- Google AI Overviews (see §6)
- Grading anything but the primary domain

**In scope, and worth not confusing with a competitor product:** the engine answers
inevitably name other brands. Reporting "these brands got cited on queries where you
didn't" is a free byproduct of data we already hold and is actionable feedback about
*your* site. It is shown plainly and ungated. What's deferred is scoring *them* —
crawling competitor sites, building cohorts, and side-by-side comparison.

---

## 4. Scoring model

Total **100 points** across five pillars. Grade bands: **A** 85+, **B** 70–84,
**C** 50–69, **D** <50. Each pillar also gets its own sub-score and band so the report
can show where the damage is.

### Pillar A — Retrievability & Agent Access (20 pts)

Can answer engines physically get the content?

| Check | Notes |
|---|---|
| AI crawler allowlist in `robots.txt` | Split into **answer crawlers** (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`, `meta-externalagent`) and **training crawlers** (`GPTBot`, `ClaudeBot`, `CCBot`). Blocking training = neutral, user's call. Blocking answer crawlers = severe penalty. |
| Content present without JS | Fetch raw HTML, compare text volume vs. rendered DOM. AI crawlers largely don't execute JS. A React SPA that ships an empty `<div id="root">` scores zero here — and this is frequently the single highest-impact finding. |
| XML sitemap present, valid, fresh | Also check `lastmod` recency |
| No paywall / cookie-wall / interstitial on primary content | |
| Clean HTTP: 200s, no redirect chains, canonical set | |
| TTFB and page weight | Slow pages get partially crawled |

### Pillar B — Structured Meaning (20 pts)

Can engines parse what the content *is*?

| Check | Notes |
|---|---|
| `Organization` JSON-LD with `sameAs` | The identity anchor. Most-missed high-value item. |
| `Product` / `Service` / `SoftwareApplication` JSON-LD | |
| `FAQPage` JSON-LD | |
| `Article` with `author`, `datePublished`, `dateModified` | |
| `BreadcrumbList` | |
| Title + meta description quality | Length, uniqueness, keyword shape |
| OpenGraph / Twitter card completeness | |
| Heading hierarchy | Exactly one `h1`, logical `h2`/`h3` nesting |
| Image alt-text coverage | % of content images |

### Pillar C — Answer-Shaped Content (25 pts)

Is the content written the way answer engines like to quote?

| Check | Notes |
|---|---|
| Direct answer in first 40–60 words | Both Framer and HubSpot name this explicitly. Requires an LLM pass. |
| Definitional opener | "Acme is a ___ that ___" — gives the engine a clean sentence to lift |
| Question-shaped `h2`s | |
| Self-contained sections | Readable without surrounding context |
| Scannable structures | Tables, lists, comparison grids |
| **First-party comparison pages exist** | "X vs Y", "alternatives to X". forkoff's top recommendation; almost nobody has these. |
| Pricing stated in text on a pricing page | Not in an image, not behind "contact us" — a huge citation blocker for "how much does X cost" |
| Quotable claim density | Named stats, original research, specific numbers |
| Freshness signals visible | Update dates, author bylines |

### Pillar D — Agent-Native Readiness (10 pts) — *the wedge*

Is the site ready for agents, not just answer engines?

| Check | Notes |
|---|---|
| `llms.txt` / `llms-full.txt` | |
| Machine-readable Markdown | `.md` variants or `Accept: text/markdown` content negotiation |
| Content Signals in `robots.txt` | Cloudflare's usage-permissions syntax |
| MCP endpoint / `.well-known` discovery | |
| A2A agent card | |
| `Link` headers for structure discovery | |

Scored generously — almost every site will score near zero today. Framed in the
report as **"Ahead of the curve"** rather than as failure, with the artifacts to fix
it. This is the section people screenshot precisely because it's unfamiliar.

### Pillar E — Live AI Visibility (25 pts)

What the engines actually say. See §6 for mechanics.

| Metric | Weight |
|---|---|
| **Mention rate** — % of queries where the brand is named | 10 |
| **Citation rate** — % where the brand is named *with a link* | 8 |
| **Share of voice** — brand mentions ÷ all brand mentions across the query set | 4 |
| **Sentiment** — positive / neutral / negative when named | 3 |

Also reported (not scored, but shown): **per-engine grade bands**, **snippet
ownership** (owned domain / partner / third-party), and **source freshness** of what
got cited.

---

## 5. Query generation

1. Crawl home, `/about`, `/pricing`, `/products`, plus the top nav links (≤10 pages).
2. One LLM pass extracts: category, what they sell, ICP, named competitors, geography.
3. Generate **12 buyer-intent queries** across fixed shapes so coverage is comparable
   between runs:
   - `best {category} for {ICP}` ×3
   - `{brand} alternatives` / `{brand} vs {competitor}` ×2
   - `how much does {category} cost` ×2
   - `is {brand} any good` / `{brand} reviews` ×2
   - `how do I {job-to-be-done}` ×3
4. **Show the queries in the UI** as chips before the engine phase runs. Let the user
   edit and re-run — a re-run with edited queries counts against quota.

12 is the cost lever. 12 queries × 5 engines = 60 engine calls per run. See §10.

---

## 6. Answer engines

Five, run in parallel — **all five reachable through the existing OpenRouter key.**
No new secrets required.

| Engine | Route | Native search? |
|---|---|---|
| ChatGPT | OpenRouter → OpenAI | Yes |
| Claude | OpenRouter → Anthropic | Yes |
| Gemini | OpenRouter → Google | Yes |
| Perplexity | OpenRouter → Sonar | Yes |
| Grok | OpenRouter → xAI | Yes |

### The implementation landmine — read this before writing the adapter

OpenRouter's web plugin defaults to a **hybrid** strategy: native search where the
provider supports it, **falling back to Exa otherwise**. If we accept the default and
any engine silently falls back, that engine gets Exa-retrieved context instead of its
own retrieval — and if several fall back, they're all reading the *same* injected
context. The per-engine radar chart would then be measuring nothing but model
personality, while looking exactly like a real comparison.

**Every engine call must set `"engine": "native"` explicitly.** All five of our
providers (Anthropic, Google, OpenAI, Perplexity, xAI) are on OpenRouter's
native-supported list, so this is a one-line requirement, not a constraint. Any engine
that errors under `native` gets dropped from the run with a visible note in the report
— never silently downgraded to Exa. A fake comparison is worse than a missing column.

**Google AI Overviews is excluded from v1.** No API — needs SerpApi or equivalent
scraping, which adds per-run cost and a dependency that breaks without warning.
Revisit in v2. This follows directly from the "every engine with a real API" decision.

### Honesty requirement

API results are not identical to what a human sees in the consumer product —
different system prompts, no personalization, no memory. **We say so plainly, in the
report, near the visibility score.** Every competitor has this problem and none of
them disclose it. Saying it out loud costs us nothing and buys credibility with
exactly the technical reader who'd otherwise catch it and dismiss the whole tool.

---

## 7. The fixes — output spec

This is the product. For every failed or partial check, emit a fix card:

```
[SEVERITY]  What's wrong                          → which URL
            Why it matters (one sentence, plain)
            ┌──────────────────────────────────┐
            │  the actual artifact             │  [Copy]
            └──────────────────────────────────┘
            Where to put it: <specific location>
```

**Severity:** Critical / High / Medium / Ahead-of-curve. Sorted by score impact, so
the top of the report is always the highest-leverage fix.

### Artifact types

| Trigger | Artifact |
|---|---|
| Missing `Organization` schema | Complete JSON-LD, populated with their real name, logo URL, and social profiles found during the crawl |
| Missing `Product`/`FAQPage` schema | Complete JSON-LD built from their actual product copy and real on-site questions |
| No `llms.txt` | The full file, generated from their sitemap and nav structure |
| Blocked answer crawlers | Exact `robots.txt` lines to add, shown as a diff against their current file |
| Weak opening paragraph | Their paragraph rewritten to lead with a direct answer, shown side-by-side with the original |
| No FAQ section | 5–8 Q&As drawn from **the queries where they lost**, with drafted answers — closes the loop between the visibility half and the fix half |
| No comparison page | Page outline + H2 structure for the competitors that beat them |
| Missing Content Signals / MCP | The config block, with a short note on what it does |

### Grounding rule — non-negotiable

Every generated artifact is built **only** from content actually crawled. No invented
facts, prices, claims, or credentials. Anything we can't source is emitted as an
obvious `{{PLACEHOLDER}}` with a note. A fabricated stat inside a JSON-LD block that a
founder pastes onto their live site is a serious failure mode, and the artifact
generator's system prompt must treat it as such.

---

## 8. UX & page spec

Follows `labs/lookalike/` exactly: three flat files, no build step.

```
labs/aeo/
  index.html
  style.css      ← same :root tokens as labs/lookalike/style.css, verbatim
  app.js
```

- Global `canonical.cc/css/style.css?v=` loads first, lab CSS second
- Global header/footer markup copied verbatim, with `AEO Readiness` added to the LABS
  dropdown (and to `labs/index.html`, and to every other lab's dropdown — the nav is
  hand-maintained in each file)
- Blue gradient background, white cards, `--card-accent-bright` amber for the score
  ring, yellow `--active` for the in-progress stepper

### Flow — mapped 1:1 onto Lookalike's DOM skeleton

Lookalike's section order is reused verbatim, with AEO content swapped in. Same class
names wherever the role is the same, so `style.css` is largely inherited rather than
rewritten.

| Lookalike | AEO equivalent |
|---|---|
| `header#header` global nav | identical, verbatim (+ `AEO Readiness` in the LABS dropdown) |
| `header.hero` | eyebrow `CANONICAL LABS · AEO READINESS`, h1, one-line explainer |
| `section.search` — input + btn + `.search-hint` + `.quota` | URL field + `Check my AEO →`; hint names the five engines; quota pill unchanged |
| `section.stage` → `.stepper` + `.run-status` | 6 steps: `Fetching site` → `Auditing structure` → `Generating queries` → `Asking 5 engines` → `Scoring` → `Writing fixes` |
| `.anchor-warning` (couldn't confirm person) | **`.audit-warning`** — couldn't fetch, JS-only shell, or domain didn't resolve. Same banner mechanics, same one-time-per-session rule. |
| `.card.source-card` (the resolved profile) | **Score card** — big number, grade band, five pillar bars. Occupies the same "here's what we found about you" slot. |
| `#results-wrap` → `.results` grid | **Fix list** — severity-sorted cards with copy buttons. Same grid, different card. |
| per-card `.fb` feedback thumbs | identical, reuse the existing `/feedback` endpoint |
| `.notice` (errors / rate limit) | identical |
| `.modal-overlay` refine modal | **Query-edit modal** — same markup pattern, fields swapped for the 12 editable queries |
| `section.method` — "How it works", 5 numbered steps | same section, 6 steps describing the AEO pipeline |
| `footer.footer` | identical, verbatim |
| inline mobile-nav toggle script | identical, verbatim |

Two additions with no Lookalike analogue, both slotting between the score card and the
fix list:

- **Query chips** — the 12 generated queries, rendered like Lookalike's `.chips` trait
  pills, appearing after step 3 with an `Edit` affordance. Gives the user something to
  read during the slowest phase and shows our work.
- **Engine grid** — 5 columns, per-engine grade band and mention/citation rate.

And one at the end of the fix list:

- **Who else got cited** — a plain line naming the brands that appeared on queries
  where the user's didn't. Ungated, unblurred (§3).

The 60–90s runtime is why the SSE stepper matters rather than Framer's spinner. That
pattern already exists in `app.js` and works — `handleEvent()` switches on
`stage`/`status`/`quota`/`error`, and we extend the same switch (§9).

---

## 9. Architecture

### Prior art — `anandiyer/canonical-lookalike`

The Lookalike Worker is at **`anandiyer/canonical-lookalike`**, `worker/`. What it
establishes, and what we inherit:

| Convention | Value |
|---|---|
| Repo layout | `site/` (deploys to `/labs/<name>/`) + `worker/` + `tasks/todo.md` |
| One repo per lab | `canonical-lookalike`, `canonical-capital-call`, `canonical-fund-modeler`, `dilution-lab` |
| Secrets | **`OPENROUTER_API_KEY` + `EXA_API_KEY` only** — never in the static page |
| Model routing | `MODEL_CHEAP` (`google/gemini-2.5-flash`) for mechanical steps, `MODEL_STRONG` (`anthropic/claude-sonnet-4.5`) for reasoning steps |
| Rate limiting | KV namespace bound as `RL`, `DAILY_LIMIT = "3"` per IP per UTC day |
| CORS | `ALLOWED_ORIGIN` allowlist var |
| Analytics | `FEEDBACK_WEBHOOK` / `SEARCH_WEBHOOK` → Slack `#hack-central` |
| Transport | POST → SSE stream, stepper driven by `stage`/`status` events |

**Three things this resolves outright:**

1. **No new API keys — and v1 needs only one.** OpenRouter covers all five answer
   engines natively (§6), which is the entire external dependency. `EXA_API_KEY` stays
   provisioned but is never called (§11). Milestone 3 shrinks accordingly — it's
   adapter code, not procurement.
2. **`DAILY_LIMIT` is already `3`.** The quota decision in §9 matches the deployed
   default exactly. No change.
3. **The `MODEL_CHEAP`/`MODEL_STRONG` split maps cleanly onto our pipeline.** CHEAP →
   query generation and answer parsing. STRONG → content-shape analysis and fix
   artifacts.

### Deployment — decision needed

`labs-api.canonical.cc` is a **`custom_domain` route on a Worker named `lookalike`**.
A hostname can only belong to one Worker, so we can't stand up a second Worker on it.

**Recommended: new repo `canonical-aeo`, new Worker, custom domain
`aeo-api.canonical.cc`.** Matches the one-repo-per-lab convention every other lab
follows, and isolates blast radius — the AEO tool makes ~60 external calls per run,
and a bug or a runaway loop in it shouldn't be able to take Lookalike down with it.
Separate KV, separate rate-limit counters, separate deploy cadence. Cost is
duplicating ~100 lines of CORS/SSE/rate-limit scaffolding, which is a copy-paste.

*Alternative:* add `/aeo` routes to the existing `lookalike` Worker. One deploy, shared
secrets, no new DNS — but couples the two labs' uptime and blurs the repo convention.
The `labs-api` hostname hints this was the original intent; the Worker being *named*
`lookalike` hints otherwise. Your call.

### Endpoints

```
POST /aeo          → SSE stream (mirrors /lookalike)
GET  /aeo/:domain  → cached report JSON, or 404
POST /feedback     → existing endpoint, reused unchanged
```

**Exa is not used in v1.** It was only required for the deferred competitor cohort.
v1 runs on `OPENROUTER_API_KEY` alone — `EXA_API_KEY` stays provisioned for §11 but is
never called.

**SSE event contract** — extends the existing vocabulary (`stage`, `status`, `quota`,
`error`) with:

| Event | Payload |
|---|---|
| `queries` | `{ queries: string[] }` |
| `audit` | `{ pillar, score, max, checks[] }` — streams per pillar as each completes |
| `engine` | `{ engine, mentionRate, citationRate, band }` — streams as each returns |
| `score` | `{ total, band, pillars[] }` |
| `fixes` | `{ fixes[] }` |
| `also_cited` | `{ brands: [{ name, queryCount }] }` — who else showed up |

**Pipeline:** fetch & crawl (≤10 pages, parallel, 8s budget) → deterministic audit
(pure JS, no LLM) → LLM query generation → 60 engine calls in parallel → deterministic
scoring → LLM fix-artifact generation.

Pillars A, B, D are **pure deterministic JS** — no LLM, no cost, fully reproducible.
Only C (content shape), the query generation, and the fix artifacts need a model. That
keeps the audit half cheap and the score stable between runs on an unchanged site,
which matters: a score that drifts on re-run destroys trust.

### Caching & quota

- **Second KV namespace bound as `CACHE`**, separate from `RL`. Key = normalized apex
  domain, **7-day TTL**. Kept separate because the TTLs differ by an order of
  magnitude (rate-limit keys expire daily) and because blowing the report cache during
  debugging shouldn't reset everyone's quota.
- Permalink `/labs/aeo/?d=example.com` serves from cache instantly and **free**
- **3 fresh runs/day per IP** — inherits the deployed `DAILY_LIMIT = "3"`. Cached reads
  are unlimited and don't decrement.
- `?refresh=1` forces a re-run and costs quota

Caching-by-domain is what makes sharing free. A viral report costs one run, not one
run per visitor — the opposite of the naive design.

---

## 10. Cost

Per fresh run:

| Item | Est. |
|---|---|
| Page fetches (≤10) | ~$0 |
| Query generation (1 LLM call) | ~$0.01 |
| 60 engine calls (12 queries × 5) | $0.60–1.50 |
| Answer parsing / sentiment | ~$0.05 |
| Fix artifacts (~5 calls) | ~$0.10 |
| **Total** | **~$0.75–1.65** |

At 3 runs/day/IP and heavy cache hits, budget **~$150–400/mo** for meaningful traffic.

**Levers if that runs hot:** drop to 8 queries (−33%), use each provider's cheap tier
for engine calls (they only need "answer this with web search"), or extend cache TTL
to 14 days. Recommend shipping at 12 queries and watching real numbers before cutting.

---

## 11. Deferred — competitor analysis

**Explicitly out of scope.** Recorded here so the v1 build doesn't foreclose it, not
as committed work.

Nothing in v1 needs to change to enable this later. The bridge is already built and
free: the `also_cited` event (§9) tells us which brands are winning the user's queries,
derived from data we hold anyway. If we ever build it:

1. **Exa** finds the true competitor cohort (similarity search from their domain, the
   same move Lookalike Finder makes), reconciled against who actually got cited
2. Run the **same audit** on the top 5 competitors — the pipeline is already
   domain-parameterized
3. **Side-by-side scorecard** — your 5 pillars vs. theirs
4. **Gap analysis** — "Competitor X wins 8 of your 12 queries because they have
   comparison pages and you don't"

Two v1 decisions keep this cheap to add later, and neither costs anything now: the
audit pipeline takes a domain as its only argument (so pointing it at a competitor is
free), and `EXA_API_KEY` stays provisioned in the Worker even though v1 never calls it.

**If this ships, revisit the email gate** — it was scoped to exactly this feature, and
v1 is ungated as a direct result of deferring it.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| **Score instability** — same site, different score on re-run | 65 of 100 points are deterministic. Cache 7 days. Fix `temperature: 0` on the content-shape pass. |
| **Hallucinated fix artifacts** | Hard grounding rule (§7). Explicit `{{PLACEHOLDER}}` for anything unsourced. |
| **API results ≠ consumer results** | Disclose plainly in-report (§6). |
| **Cost spike from abuse** | Domain cache + 3/day. Add Turnstile if abused. |
| **Engine API drift** | Each engine adapter isolated; a failed engine degrades to 4/5 with a visible note rather than failing the run. |
| **We score badly on our own tool** | Run it on canonical.cc before launch and fix what it finds. This is non-optional — it's both a QA pass and the launch story. |
| **SPA sites score near-zero on Pillar A** | Correct behavior, but needs careful copy so it reads as diagnosis rather than insult. |

---

## 13. Open questions

1. ~~Where does the Worker source live?~~ **Resolved:** `anandiyer/canonical-lookalike`,
   `worker/`. See §9.
2. ~~Which API keys exist?~~ **Resolved:** `OPENROUTER_API_KEY` + `EXA_API_KEY`, and
   both are sufficient. No new secrets needed.
3. **New Worker or extend `lookalike`?** See §9 — recommending a new `canonical-aeo`
   repo on `aeo-api.canonical.cc`. Needs a decision before milestone 1.
4. **Name.** `AEO Readiness Check` is the working title. Alternatives: `Answer
   Readiness`, `AI Visibility Check`, `Can AI Find You?`. URL is
   `canonical.cc/labs/aeo/` regardless — confirmed.
5. ~~Where does the phase-2 email go?~~ **Moot** — competitor view deferred, v1 is
   ungated and captures no email.
6. **Does `site/` sync to `anandiyer.github.io/labs/` manually?** Lookalike exists in
   both repos with identical files. Worth knowing whether that's a copy step or
   something scripted, so AEO follows the same path.

---

## 14. Milestones

| # | Deliverable |
|---|---|
| 0 | Scaffold `canonical-aeo` from `canonical-lookalike` — repo layout, CORS/SSE/rate-limit plumbing, `wrangler.toml`, KV namespaces, secrets |
| 1 | Worker: crawler + deterministic audit (Pillars A, B, D). Testable via curl, no UI, no LLM. |
| 2 | Frontend shell: page, styles, stepper, score card wired to milestone 1 |
| 3 | Query generation + 5 engine adapters (`engine: "native"`, §6) + Pillar E scoring |
| 4 | Pillar C content analysis |
| 5 | Fix artifact generation — the differentiator, deserves its own milestone |
| 6 | Cache, quota, permalinks, `also_cited` line, query-edit modal |
| 7 | Run on canonical.cc, fix our own findings, nav + labs index, ship |

Milestones 1–2 are independently shippable as a fast deterministic-only scanner if we
want something live sooner.
