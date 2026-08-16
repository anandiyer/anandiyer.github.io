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

### Cloudflare (dashboard — no credentials on this machine)

- [ ] Enable **Markdown for Agents** (AI Crawl Control). Requires Pro
- [ ] Response Header Transform Rule — `Link` header on `/`
- [ ] `Content-Type: application/linkset+json` on `/.well-known/api-catalog`

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

Repo side is done and verified. Cloudflare side is not — it needs dashboard access this
machine does not have, and it is the half that carries `markdownNegotiation`, the only check
that moves the site to Level 3.

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

Jekyll itself could not be run locally (system Ruby 2.6, no jekyll gem), so the one thing still
unproven is whether Jekyll copies the `SKILL.md` files verbatim or converts them. That is
precisely what the new build guard fails on, so CI will answer it on the first deploy rather
than shipping it broken.

### Worth knowing

The reference implementation this standard ships from — isitagentready.com's own
`/.well-known/agent-skills/index.json` — has **six of six digests that do not match the bytes
it serves**. Verified by fetching each `SKILL.md` and hashing it. Their index has drifted from
their artifacts, which is exactly the failure the build guard here exists to prevent. Ours are
computed from the shipped bytes and re-checked on every deploy.

### Deliberately not done

`oauthDiscovery`, `oauthProtectedResource`, `authMd`, `a2aAgentCard`, `mcpServerCard`, `dnsAid`
— all remain failing, all on purpose. Each wants a discovery document for a server canonical.cc
does not run. Publishing them would raise the scan score by lying to agents. If an MCP server
over the portfolio and labs data is ever worth building, the cards follow from it — not before.

### Unrelated things noticed, not touched

- `sitemap.xml` publishes five URLs that should not be indexed: `partials/header.html`,
  `partials/footer.html`, `tasks/aeo-lab-prd.html`, `labs/dilutionlab/tests.html`, and the
  Google verification file. A short `exclude:` addition in `_config.yml` would fix it.
- Check size is stated two ways on the site: `/faqs` says "typically $1M first checks at
  pre-seed", `llms.txt` and the homepage `Service` schema say "$500K–$1.5M".
