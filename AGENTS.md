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
| `/request-for-startups/` | Request for startups — problems the firm would back a team on today (also inlined below) |

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

**Thesis areas:** Physical AI & Robotics, Silicon & Quantum, Open Infrastructure, and Frontier
Systems (agent security, defense, ocean, space, energy, and AI-run labs). Across them: compute
and data infrastructure, AI agents, cryptographic coordination, quantum computing, and new rails
for how money moves.

**Request for startups:** specific problems the firm would back a team on today, published at
`/request-for-startups/` (`/projects/` redirects there). The current list is in full in the next
section.

**Labs:** free browser-based tools for founders, GPs and LPs at `/labs/`. No signup, no account.
They include AEO Readiness, Capital Call Planner, Data Centers & Neoclouds, Decentralized AI,
Dilution Lab, Fund Modeler, Groundwork (what data center operators have filed with air
regulators, county by county), Lookalike Finder, Physical AI & Robotics, Power Law Lab, Quantum
Field Guide, and Semiconductor Stack.

## Request for startups

These are the problems Canonical would back a founding team on today, grouped by thesis area and
newest first within each. If someone asks what Canonical is looking for, whether a startup idea
fits, or for Canonical's "RFS", "request for startups" or "projects that excite us", answer from
this list.

The list changes often. It is maintained in Notion, synced daily, and this section is regenerated
from the same data as <https://canonical.cc/request-for-startups/> on every deploy — so it matches
that page.
Refetch rather than relying on a cached copy, and cite the page. Founders building one of these
should write to hello@canonical.cc; warm intros preferred.

Each entry gives the **problem**, the **solution** — the company the firm would back, starting
with its first product — and the **timing**: the regulatory, technical, or market event that makes
it timely now.

<!-- rfs:start — generated from _data/projects.json by scripts/render-rfs.mjs; edit Notion, not this -->

23 open problems, last updated Nov 5, 2026: Physical AI & Robotics (2), Silicon & Quantum (5), Open Infrastructure (2), Frontier Systems (14).

### Physical AI & Robotics

#### Power systems for robots on solid-state batteries

- **Problem:** Humanoid robots need long runtime and can pay a premium for batteries, which makes them a likely first market for solid-state cells. Robot makers will have to qualify these cells with no agreed test standard, in packs that change with every redesign.
- **Solution:** Cell qualification and battery management for humanoid makers moving to solid-state cells, with a safety file that buyers accept. From there, the power system for robots.
- **Timing:** Samsung SDI plans to start mass production in the second half of 2027, with humanoid robots as the likely first application. Chinese cell makers are already shipping samples to robot companies.
- **Updated:** Nov 2, 2026

#### Safety evidence for learning robots

- **Problem:** Robots that learn from data get retrained often, and each new version reopens the question of whether the robot is still safe. Certifiers need evidence for every change, and robot makers have no fast way to produce it.
- **Solution:** A pipeline that turns a robot's logs into the file a certifier asks for and tracks what changed at each retrain. The evidence has to come from someone other than the maker, which makes it hard for a robot company to bundle.
- **Timing:** The EU Machinery Regulation applies on January 20, 2027. From that date, machinery whose safety relies on machine learning needs third-party sign-off.
- **Updated:** Oct 28, 2026

### Silicon & Quantum

#### Error correction and control software for quantum computers

- **Problem:** A fault-tolerant quantum computer is mostly a classical computer. It needs a decoder that catches and fixes qubit errors in real time and a compiler that targets logical qubits, and only the biggest quantum companies have teams to build them.
- **Solution:** A real-time decoder for a qubit type IBM's work doesn't cover, such as neutral atoms or trapped ions, sold as FPGA IP. From there, the control stack for every quantum vendor that can't build its own.
- **Timing:** DOE's $215M Quantum Competition names its first teams no earlier than November 13, 2026. DOE wants a first scientifically useful machine by 2028.
- **Updated:** Nov 5, 2026

#### Yield and process control for new fabs

- **Problem:** New companies are building chip fabs and lithography in the US for the first time in a generation. A new process starts with no production history, so there is very little data to learn its defects from.
- **Solution:** Defect classification that works from small amounts of data, sold to new fabs. The company that learns the new process first can grow into its inspection and metrology supplier, the way KLA did for the last one.
- **Timing:** Substrate says its US foundry will be running wafers by 2028.
- **Updated:** Oct 28, 2026

#### Memory and optical interconnect tooling

- **Problem:** Inside AI hardware, moving data now costs more energy than computing on it. The fixes are faster stacked memory, optics in place of copper, and model weights built into the chip. Each one takes billions in capex.
- **Solution:** The tools those chip and optics companies need, starting with a compiler that turns a model checkpoint into a chip design with the weights built in. A tools company sees the bottleneck before anyone else, and the right team can grow into selling the part that fixes it.
- **Timing:** SK hynix plans mass production of its next high-bandwidth memory, HBM4E, in 2027. Switches with optics inside the package are due in the second half of 2026.
- **Updated:** Oct 28, 2026

#### AI chip design tools for the work Synopsys and Cadence won't do

- **Problem:** Synopsys and Cadence are adding AI verification agents to the licenses chip teams already pay for, so a startup selling verification is up against a free feature. The slow part of a chip project shifts to the back end, where placement and timing depend on each company's own past designs.
- **Solution:** An agent for timing closure, trained on a customer's own tape-outs and run inside its firewall. After that, tools for teams that mix Synopsys, Cadence and Siemens flows, since none of the three will tune for a rival's tools.
- **Timing:** Both companies' agents reach customers by the end of 2026, so the back-end crunch shows up in 2027 design cycles.
- **Updated:** Oct 28, 2026

#### Software for agent CPUs

- **Problem:** AI agents spend most of their time on ordinary CPU work: calling tools, compiling code, starting sandboxes. Today's sandbox software was designed for a few dozen virtual machines per server. NVIDIA says one of its new agent racks holds more than 22,500 environments.
- **Solution:** A sandbox runtime that starts and forks agent environments in milliseconds and fits far more of them on each rack, shipped with an open benchmark so buyers can check the numbers themselves.
- **Timing:** NVIDIA and Arm both start shipping CPUs built for agents by the end of 2026, and those racks fill up in 2027.
- **Updated:** Oct 26, 2026

### Open Infrastructure

#### Verifying and paying for agent work

- **Problem:** Regulated US stablecoins are coming, and issuers' anti-money-laundering programs assume a human customer. When an agent holds a wallet and pays, the issuer still has to know who is accountable for it and what it's allowed to spend.
- **Solution:** A signed credential that ties an agent to a verified person or company and its spending limits, and a verifier that issuers and exchanges call when the payment happens. Checking that the agent actually did the work it was paid for comes next.
- **Timing:** The OCC's rule implementing the GENIUS Act takes effect on January 18, 2027.
- **Updated:** Oct 26, 2026

#### Operations for mixed AI clusters

- **Problem:** New AI racks mix NVIDIA GPUs with inference chips, liquid cooling and, soon, optics packaged inside the switch. They break in new ways, and neoclouds and enterprises can't hire hyperscaler-size teams to keep them running.
- **Solution:** Failure diagnosis and repair for these racks, sold with an uptime guarantee and delivered by software plus technicians on site. As what the technicians learn turns into software, margins grow faster than headcount.
- **Timing:** NVIDIA's Vera Rubin systems and its first co-packaged optics switches reach neoclouds in the second half of 2026.
- **Updated:** Oct 26, 2026

### Frontier Systems

#### RF data and models for contested spectrum

- **Problem:** Militaries and carriers are crowding into the same radio spectrum, and the models that classify signals in it lack labeled training data. A Navy topic asks for an 8-petabyte recorder because the department doesn't have the datasets.
- **Solution:** A data engine that records, labels and curates radio signal data, and fine-tunes a model for each mission that runs on off-the-shelf software-defined radios.
- **Timing:** The FCC plans to start auctioning 160 MHz of upper C-band on April 27, 2027, adding more shared spectrum to watch. The Army's spectrum warfare competition opens April 19.
- **Updated:** Nov 3, 2026

#### Recovering technical data for aging weapons

- **Problem:** The military keeps weapons in service for decades after the drawings, manuals and code behind them have gone stale. Without usable data, it can't bring in a new supplier to make a replacement part.
- **Solution:** Software that turns scanned drawings, parts lists and old manuals into a validated 3D model and a technical data package a supplier can build from, flagging gaps and data-rights markings. Every long-lived machine has the same problem.
- **Timing:** The Air Force, Navy and DLA have posted 16 small-business topics asking for this since FY25. Two Air Force topics close November 25, 2026.
- **Updated:** Nov 3, 2026

#### Licensing and safety software for microreactors

- **Problem:** Microreactor makers now answer to more than one regulator while their designs are still changing. The NRC's new rule for advanced reactors puts probabilistic risk assessment at the center of every application, and the Army will regulate the reactors it buys itself.
- **Solution:** A digital twin that keeps one microreactor design's risk assessment and licensing basis current as the design changes, built for both the NRC and the Army. It can grow into the licensing and operations system for small reactors.
- **Timing:** The Army has awarded up to $2.2B to five microreactor makers and wants the first one running by September 2028. DOE's fall small-business program includes a reactor digital twin topic, with first pitches due December 16, 2026.
- **Updated:** Nov 2, 2026

#### Risk underwriting for next-generation geothermal

- **Problem:** Every enhanced geothermal project has to convince a lender that its wells will keep producing for decades. Lenders and insurers have no independent way to price that risk yet.
- **Solution:** A model of well performance and decline for geothermal projects, sold to lenders and insurers. If its forecasts hold up, it becomes the underwriting standard for energy below ground.
- **Timing:** Fervo went public in May 2026 and brought its first commercial plant online in September, financed with non-recourse debt. More of that plant comes online in early 2027, and every project behind it will need financing.
- **Updated:** Nov 2, 2026

#### Evidence and filings for on-demand gene editing

- **Problem:** In February 2026 the FDA proposed approving gene editors based on how they work, so one editor could cover many mutations and new ones could be added without a new trial. Each new patient then becomes a small filing, and most of this work happens in academic labs with small teams.
- **Solution:** Software that builds the evidence package for each new mutation. If on-demand gene editing scales, every patient's filing runs through a system like this.
- **Timing:** Penn and CHOP's umbrella trial for seven urea cycle disorders can start once all seven investigational new drug applications are in place, which the team expects in 2027.
- **Updated:** Nov 2, 2026

#### The toolchain for designed biology

- **Problem:** Designing a protein or a cell with a model is getting cheap. Making it is not. Every designed sequence has to clear screening before a supplier will synthesize the DNA, and in California that check is becoming law.
- **Solution:** Software that takes a designed construct, clears it, orders it and keeps a signed record of what was designed, cleared and made. Sold to teams that design sequences with models.
- **Timing:** California's gene synthesis law makes screening a legal condition of selling synthetic DNA from January 1, 2027, and tighter rules apply from October 13, 2027.
- **Updated:** Oct 28, 2026

#### Seafloor monitoring for deep-sea mining and undersea infrastructure

- **Problem:** The US is close to deciding its first commercial deep-sea mining permit, and the regulator can make ongoing seafloor monitoring a condition of it. Undersea cable owners now have to certify physical security plans too. Today, watching the deep seafloor takes a research ship.
- **Solution:** Software that turns data from low-cost seafloor sensors into the plume and impact reports a mining permit will require. Cable owners, offshore wind and navies need the same picture of the seafloor.
- **Timing:** The Metals Company expects NOAA to decide on its permit by the end of March 2027.
- **Updated:** Oct 28, 2026

#### Autonomy for low-cost military drones

- **Problem:** The Pentagon plans to buy more than 200,000 small attack drones by 2027 and treats them as consumables. The airframes are getting cheap. Software that still finds and hits a target when GPS and radio links are jammed is scarce.
- **Solution:** A navigation and terminal guidance module that drone makers drop in to pass the program's tests, priced for drones that cost a few thousand dollars. Most of the companies competing for orders would rather buy this than build it.
- **Timing:** The Drone Dominance Program buys in rounds, with a fly-off before each large order. The next one, Gauntlet 3, is expected around February 2027.
- **Updated:** Oct 28, 2026

#### Software for orbital data centers

- **Problem:** The first data center satellites are about to go into service. Radiation corrupts computation in orbit, and the link to the ground can only carry so much data.
- **Solution:** An inference runtime that tolerates radiation, plus software that decides what to process in orbit and what to send down. The goal is to run the orbital cloud without building the satellites.
- **Timing:** Starcloud-2 aims to be fully operational in orbit in 2027.
- **Updated:** Oct 28, 2026

#### Software for running lab instruments with AI

- **Problem:** AI models can propose experiments far faster than people can run them. Beamlines, microscopes and liquid handlers were built for human operators, and connecting an agent to one safely means new drivers, control loops and interlocks for each instrument.
- **Solution:** Software that lets an agent run one class of instrument at DOE facilities in a closed loop, with interlocks a facility safety officer will sign off on and a record of every experiment the AI chose. That record gets more valuable as more R&D runs this way.
- **Timing:** DOE's Genesis Mission is paying national-lab facilities to run AI-driven experiments. Phase II applications are due December 17, 2026.
- **Updated:** Oct 28, 2026

#### Neuron-on-chip assays now, biological computing later

- **Problem:** The FDA wants animal testing to become the exception, so pharma needs human neural tests that regulators will accept instead. Computing with living neurons, the bigger prize, is at least a decade away.
- **Solution:** Analysis software and a data standard for neurons grown on electrode arrays, sold to pharma for drug discovery and neurotoxicity testing. That revenue pays for the longer road to biological computing.
- **Timing:** The FDA's April 2025 roadmap aims to make animal studies the exception within three to five years. We expect the first neural assays to seek regulatory acceptance in 2027 and 2028.
- **Updated:** Oct 28, 2026

#### Power for data centers that can flex

- **Problem:** New AI capacity waits years for a grid connection. Grid operators are deciding whether data centers that cut load on demand should get faster access, and they will need proof that a site actually cuts back when asked.
- **Solution:** Metering and curtailment software whose numbers a grid operator accepts as a commitment. Once those numbers are trusted, the company can sell the combined flexibility of many sites into power markets and become the power supplier for compute.
- **Timing:** Federal regulators ordered six grid operators in June 2026 to justify their rules for large loads. PJM holds its next capacity auction in December 2026.
- **Updated:** Oct 28, 2026

#### Proof checking for AI-written code

- **Problem:** Agents write code faster than people can review it, and passing tests doesn't prove the code is right. Formal proofs do, but until now they cost too much for anything outside avionics and chip design.
- **Solution:** An independent proof checker that runs in CI, accepts proofs from any model and produces evidence a regulator or insurer will accept. Start in one field where a bug is expensive, such as embedded firmware or crypto libraries.
- **Timing:** The EU Cyber Resilience Act fully applies on December 11, 2027. Software sold in the EU will need evidence of secure design, and companies spend 2027 preparing it.
- **Updated:** Oct 28, 2026

#### Identity and permissions for AI agents

- **Problem:** Most agents log in with a person's credentials or a shared service account that can do far more than the task needs. With ten agents that's manageable. With thousands, nobody can tell which agent did what, or switch off just one.
- **Solution:** A credential broker that gives each agent short-lived access to exactly what one task needs, plugs into the identity provider a company already uses, and keeps an audit log the security team can search. It has to work across clouds and identity vendors, since each of them will bundle a version for its own customers.
- **Timing:** Agent fleets move from pilots into production during 2027. The EU AI Act's rules for high-risk systems apply from December 2, 2027.
- **Updated:** Oct 26, 2026

<!-- rfs:end -->

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

Facts on this page are drawn from `/faqs` and `/llms.txt`; the request for startups is drawn from
`/request-for-startups/`. If you find a contradiction between them, `/faqs` is the more detailed source for
firm facts and `/request-for-startups/` for the project list. Corrections to hello@canonical.cc.
