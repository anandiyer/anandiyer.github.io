# Records requests — what to ask for, and who to ask

Groundwork's depth is capped by what each agency publishes, not by what it
holds. Every agency below maintains a database that would answer the question
directly; most publish only a rendered subset of it. These are the requests
that would change the product most, in priority order.

Ask for a **database extract in CSV or Excel**, never PDFs. Agencies usually
have one and will send it; asking for "the permits" gets you scanned documents.

---

## 1. TCEQ (Texas) — highest value

**Why:** Texas is the largest gap. Its emissions inventory contains almost no
data centers, ERCOT's queue has no county detail, and the permit search is an
application rather than a dataset. But TCEQ holds all of it in a database.

**Who:** TCEQ Public Information Request coordinator — `pir@tceq.texas.gov`.
Texas Public Information Act requires a response within 10 business days.
Before filing, it is worth emailing the Air Permits Division data steward
directly; agencies often send an extract without a formal request.

**Ask for:**

> Under the Texas Public Information Act, I request an electronic copy, in CSV
> or Excel format, of records from the New Source Review air permitting
> database for facilities whose primary activity is data processing, hosting,
> or data center operation (NAICS 518210), or whose regulated entity or project
> name contains "data center", for permits and registrations issued or amended
> from January 1, 2015 to the present.
>
> For each record please include: regulated entity name and RN number; customer
> name and CN number; permit or registration number; permit type; project type
> and status; physical address, county, and latitude/longitude; date received
> and date issued; the permitted emission rates by contaminant in tons per year,
> in particular nitrogen oxides; and the number and rated capacity of stationary
> internal combustion engines authorised at the site.
>
> I am requesting the underlying data extract rather than copies of the permit
> documents. If any portion is withheld, please identify the exemption claimed
> and release the remainder.

## 2. VA DEQ (Virginia) — small ask, removes a whole failure mode

**Why:** Virginia already publishes the permit list, but as an HTML table with
no addresses; addresses and emissions are currently read out of permit PDFs,
which is where Groundwork's `probable` tier and its worst error risk come from.
DEQ obviously maintains this as a spreadsheet.

**Who:** The contact named on the data center permit page, or DEQ's FOIA
officer. Virginia FOIA requires a response within five working days.

**Ask for:** the source spreadsheet behind the "Issued Air Permits for Data
Centers" page, including any columns not shown publicly — facility street
address, latitude/longitude, permitted NOx tons per year, and engine counts.
Sixteen of the 201 permits are scanned images with no text layer; ask whether
machine-readable copies exist for those.

## 3. Georgia EPD, Ohio EPA, Arizona ADEQ — cheap, fast, unknown

**Why:** These are the next-densest markets after Virginia and Texas. Nobody
has checked whether they publish like Virginia (a list) or like Texas (an app).
A single phone call answers it, and if one of them publishes a list, that state
becomes as deep as Virginia in a day.

**Ask:** "Do you publish a list of issued air permits for data centers, or can
you provide an extract of permits by NAICS code 518210?"

## 4. ERCOT / PUCT (Texas grid) — for the queue, if it is wanted

**Why:** The ~1,800 projects paused in August 2026 sit in ERCOT's large-load
queue, which is published only as a statewide aggregate. County-level detail
would let Groundwork answer "what is queued near me", which nothing currently
does.

**Note:** PUCT's Interchange docket system is public, and the filings generated
by the governor's directive should appear there. That is worth exhausting
before asking anyone for anything.

---

## Two conversations worth having

**Public Evidence Project** (publicevidence.org) — the closest precedent to this
work, doing parcel-level permit crosswalks with confidence staging. Worth asking
whether to share method and data rather than building the same thing twice.

**Heatmap News** — published the polling showing support for nearby data centers
collapsing. They have the demand signal; Groundwork has the county-level record
behind it. A reporter who can cite a permit is more useful than one who can cite
a poll.
