# Groundwork — working-backwards press release & FAQ

> **Note on provenance.** PRD Appendix B refers to a press-release draft written
> during the spec conversation. That draft was not in the build handoff, so this
> is a fresh draft written against the PRD and against what the pipeline
> actually produces. Treat it as a v1 to edit, not as the original.

---

## Canonical Labs publishes Groundwork, a public record of where AI data centers are actually being built — and what they are built on

**Palo Alto, CA** — Canonical today released **Groundwork**, a free, permanently-indexed directory of US AI data center sites, assembled entirely from mandatory public disclosures: state air permits, FEMA flood maps, WRI water-stress data, ISO interconnection queues and SEC filings. Not a single fact in it comes from a company announcement.

More than $690 billion has been committed to US AI data center construction. Flood exposure, water stress and grid position are still treated as secondary to power and land cost in how that capital is underwritten. Groundwork exists to make the first three checkable by anyone.

The first release covers Virginia — the densest data center market on earth, and the only state that publishes a data-center-specific permit list. It tracks **188 sites across 201 issued air permits in 19 localities**, including **more than 11,000 permitted backup generators**, a total that appears in no single filing because it only exists once someone adds up hundreds of individually unremarkable permits.

"The interesting number is never in one document," said Anand Iyer, who leads Canonical. "A permit for forty diesel generators in one county is routine. The same permit, times two hundred, across three counties, next to a river, is a financing question. Groundwork is the join that turns the first thing into the second."

Every field on every page carries its own confidence tier and its own citation. A flood zone read by point-in-polygon lookup against the effective FEMA map is marked **confirmed**. A street address recovered from the prose of a permit PDF is marked **probable**. An SEC full-text hit is marked **directional**. A site established by journalism but not yet by a filing is marked **reported**, and its page upgrades itself when a permit appears.

There is deliberately no blended Groundwork risk score. "A single number would hide which inputs came from a filing and which came from a fuzzy match," Iyer said. "That difference is the entire product."

Groundwork is aimed first at the people pricing this build-out — project-debt lenders, insurers, and LPs with AI-infrastructure exposure. It is public because the same record is what a county board or a local reporter needs, and there is no honest reason to charge one and not the other.

Groundwork is available now at **canonical.cc/labs/groundwork**. The underlying dataset is downloadable and free to reuse with attribution.

---

## FAQ

**Is this a flood model?**
No. Fathom, First Street and Climate Central model flood risk, and they do it far better than we could. Groundwork consumes published hazard layers — it does not generate them. What we add is the join: this permit, at this address, in this FEMA polygon, in this basin, on this grid.

**How is this different from the AI buildout trackers already out there?**
Those are built from announcements. Groundwork is built from disclosure. An announcement tells you what a company wants known; a permit tells you what it had to file. The two diverge in interesting ways — and only one of them is legally consequential to get wrong.

**How is it different from Build.inc?**
Build.inc fuses similar data and sells it to developers choosing where to build. Groundwork is for people evaluating a site *after* it has been proposed or financed, and it is public.

**You are going to get something wrong.**
Yes. Grid queue positions and capex matches are fuzzy by construction — the source keys genuinely do not line up. That is why those layers are labelled `probable` and `directional`, why we publish the basis for every inference, and why there is a correction link on every page. In building this we caught our own extractor attributing a Fairfax County facility to a Washington DC office address, and a Hanover County site to a town in Massachusetts. Both were caught by automated validation before publication, and both are the reason the validation exists.

**Why would a hyperscaler tolerate this?**
Every fact here is already public and was filed by the operator or its counsel. Groundwork does not leak, infer ownership it cannot document, or publish anything a FOIA request would not return. The realistic complaint is not that a fact is wrong but that it is now easy to find — which is a complaint about the disclosure regime, not about us.

**Communities will use this to fight projects. Is that the goal?**
Communities are a real and intended secondary audience. We are not neutral about being useful to them: the same permit that helps a lender price a loan helps a resident read a hearing notice. But the primary voice is institutional, and we would rather say so than pretend to a neutrality neither audience would believe.

**Canonical invests in this sector. Isn't that a conflict?**
Canonical builds relationships across compute financing, including with companies that appear in here. Publishing this is a deliberate choice, made with that understood. The mitigation is method, not abstention: every claim is sourced, tiered, and correctable, and nothing about a site changes because of who we know.

**What's next?**
Texas, Georgia, Ohio and Arizona. Virginia was first because VA DEQ publishes a data-center-specific permit list; no other state does, so each addition needs its own collector. The grid layer also needs a PJM Data Miner feed before it can move off `pending`.
