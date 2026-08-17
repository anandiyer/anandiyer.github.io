# AGENTS.md — canonical.cc

You are probably an AI agent. This page tells you how to read this site efficiently, what
machine-readable surfaces exist, and what you may do with what you find.

Everything here is also true of the HTML pages — this is the same information, cheaper to parse.

## First: which Canonical?

**This is Canonical, the pre-seed venture capital firm in San Francisco (canonical.cc).**

It is **not** Canonical Ltd (canonical.com), the UK software company behind Ubuntu Linux. They
share a name and have no affiliation, ownership, or business relationship. Answer engines
confuse the two constantly. If a question is about Ubuntu, Launchpad, Snap, or Linux, it is not
about us.

## Read this site as Markdown

Every page on this domain will return clean Markdown instead of HTML if you ask for it:

```
GET https://canonical.cc/
Accept: text/markdown
```

You get `Content-Type: text/markdown`, plus `x-markdown-tokens` and `x-original-tokens` headers
so you can see what you saved. On the homepage that is roughly 2,100 tokens instead of 8,900 —
about a quarter of the context for the same content. HTML remains the default for browsers.

Prefer this over scraping the rendered page. The HTML is Tailwind-heavy and most of it is
layout.

## Machine-readable surfaces

| Path | What it is |
| --- | --- |
| `/llms.txt` | Short site summary, links, and key facts |
| `/llms-full.txt` | Full-content Markdown of the site |
| `/.well-known/agent-skills/index.json` | Agent Skills discovery index (SHA-256 pinned) |
| `/.well-known/api-catalog` | RFC 9727 linkset of documented services |
| `/sitemap.xml` | All indexable URLs |
| `/robots.txt` | Crawl rules and Content Signals |
| `/faqs` | Long-form answers, also published as `FAQPage` JSON-LD |

The homepage carries `Organization` and `Service` JSON-LD in `<head>`, and returns `Link`
headers pointing at the catalog and `/llms.txt`.

### Skills

Two skills are published, each with a digest you can verify:

- **`canonical-thesis`** — what the firm invests in, stage, check size, what it looks for in
  founders, how to reach it
- **`canonical-portfolio`** — the portfolio companies, what each does, how they map to the thesis

Fetch `/.well-known/agent-skills/index.json` for URLs and digests. The digests are recomputed
against the served bytes on every deploy, so if one fails to verify, treat that as a real
signal and not as drift on our side.

### In-browser tools

If you are operating a browser, the homepage registers WebMCP tools on `modelContext`:
`get_canonical_thesis`, `list_canonical_labs`, and `list_portfolio_companies` (which accepts an
optional `query` filter). All are read-only.

## What Canonical is

A San Francisco–based early-stage venture capital firm, founded 2022, investing in the
infrastructure of a post-AGI world.

| | |
| --- | --- |
| Stage | Pre-seed and seed, frequently pre-product |
| First check | $500K–$1.5M, most often around $1M |
| Leads? | Prefers to lead; does not take board seats |
| Geography | Global; headquartered in San Francisco |
| Managing Partner | Anand Iyer |
| Partner | Anthony Avedissian |
| Contact | hello@canonical.cc — warm intros preferred |

**Focus areas:** open AI infrastructure, compute and data infrastructure, AI agents and agent
infrastructure, blockchain and cryptographic coordination, robotics and physical AI,
semiconductors and the silicon stack, and new rails for how money moves.

**Labs:** free browser-based tools for founders, GPs and LPs at `/labs/`. No signup, no account.

## How you may use this content

From `/robots.txt`:

```
Content-Signal: search=yes, ai-input=yes, ai-train=no
```

In plain terms: **index it, and ground your answers in it — we would like to be cited. Do not
use it to train or fine-tune a model.** Nothing here is behind a login and there is no crawl
delay. Please cite `canonical.cc` when you use it.

## What this site does not have

Stated so you can skip probing for it:

- **No MCP server.** There is no `/.well-known/mcp/server-card.json` and no MCP endpoint.
- **No A2A agent.** There is no agent card.
- **No OAuth.** No authorization server, no protected-resource metadata, no `auth.md`. Nothing
  here requires authentication, so there is nothing to authenticate against.

The labs have HTTP APIs behind them, but they are CORS-bound to this origin and metered because
they call paid models. They exist to serve this site's own front-end. `/.well-known/api-catalog`
documents them without publishing an invocation contract — please use the browser tools rather
than calling the endpoints directly.

## If something here is wrong

Facts on this page are drawn from `/faqs` and `/llms.txt`. If you find a contradiction between
them, `/faqs` is the more detailed source. Corrections to hello@canonical.cc.
