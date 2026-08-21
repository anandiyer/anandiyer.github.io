/* Operator resolution.

   Permits are filed by whatever legal entity holds the air permit, which for
   data centers is very often a single-purpose LLC named after the parcel
   ("21110 Ridgetop Circle LLC") or an opaque holding vehicle ("Darab Ventures
   One, Two, Six LLC"). Resolving those to a recognisable operator is the
   single most useful join Groundwork performs — and the easiest place to be
   confidently wrong. So resolution is tiered:

     confirmed   — the permittee name contains the operator's own brand.
     probable    — the permittee is a known corporate alias or naming series
                   documented in a permit we have actually read.
     unresolved  — an SPV with no public link. Shown as unresolved, not guessed.

   Every `probable` alias below carries a `basis` string that is surfaced on
   the site page, so a reader can judge the inference themselves. */

/* Brand tokens: a case-insensitive match in the permittee name is confirmation. */
const BRANDS = [
  ['Amazon', /\bamazon\b|\bamazon data services\b/i],
  ['Microsoft', /\bmicrosoft\b/i],
  ['Google', /\bgoogle\b/i],
  ['Meta', /\bmeta platforms\b|\bfacebook\b/i],
  ['Equinix', /\bequinix\b/i],
  ['Digital Realty', /\bdigital realty\b/i],
  ['QTS', /\bqts\b/i],
  ['CyrusOne', /\bcyrusone\b/i],
  /* "AG VANTAGE FS INC - ALDEN" is an Iowa farm co-operative, and sixteen of its
     grain and fertiliser sites were published here as Vantage data centers —
     which is where most of Iowa's count came from. The bare token is too
     generic; anything prefixed "Ag " is not this company. */
  ['Vantage Data Centers', /(?<!\bag[\s-])\bvantage\b/i],
  ['NTT Global Data Centers', /\bntt\b/i],
  ['STACK Infrastructure', /\bstack infrastructure\b/i],
  ['Aligned Data Centers', /\baligned\b/i],
  ['CloudHQ', /\bcloud\s?hq\b/i],
  ['Compass Datacenters', /\bcompass\b/i],
  ['CoreSite', /\bcoresite\b/i],
  ['Cologix', /\bcologix\b/i],
  ['DataBank', /\bdatabank\b/i],
  ['Iron Mountain', /\biron mountain\b/i],
  ['H5 Data Centers', /\bh5 data\b/i],
  ['Chirisa', /\bchirisa\b/i],
  ['TECfusions', /\btecfusions\b/i],
  ['Yondr', /\byondr\b/i],
  ['Sentinel Data Centers', /\bsentinel\b/i],
  ['Clean Arc Data Centers', /\bclean arc\b/i],
  ['DP Facilities', /\bdp facilities\b/i],
  ['Peak 10', /\bpeak 10\b/i],
  ['Zayo', /\bzayo\b/i],
  ['Lumen (Level 3)', /\blevel 3\b|\blumen\b|\bcenturylink\b|\bqwest\b/i],
  ['Verizon', /\bverizon\b/i],
  ['VeriSign', /\bverisign\b/i],
  ['Comcast', /\bcomcast\b/i],
  ['Yahoo (Oath)', /\boath, inc\b/i],
  ['Capital One', /\bcapital one\b/i],
  ['Bank of America', /\bbank of america\b/i],
  ['Visa', /\bvisa usa\b/i],
  ['Freddie Mac', /\bfreddie mac\b/i],
  ['Northrop Grumman', /\bnorthrop grumman\b/i],
  ['The Aerospace Corporation', /\baerospace (corporation|data facility)\b/i],
  ['Inova Health', /\binova\b/i],
  ['Sentara Healthcare', /\bsentara\b/i],
  ['George Washington University', /\bgeorge washington university\b/i],
  ['U.S. Customs and Border Protection', /\bcustoms and border protection\b/i],
  ['COPT Defense Properties', /\bcorporate office properties\b/i],
  ['Sabey Data Centers', /\bintergate\b|\bsabey\b/i],
  ['Hayden Technologies', /\bhayden\b/i],
  ['Scout Development', /\bscout development\b/i],
  ['StratCap', /\bstratcap\b/i],
  ['RREEF (DWS)', /\brreef\b/i],
  ['Cardinal Energy', /\bcardinal energy\b/i],
  /* Colocation and wholesale operators. Until August 2026 these were queried
     in `09-echo-national.mjs` but not listed here, so an ECHO hit survived
     only if the facility name happened to contain the words "data center" —
     EdgeConneX and Cyxtera published zero sites for exactly that reason.
     Querying for a name and then discarding the answer is the worst of both. */
  ['Flexential', /\bflexential\b/i],
  ['TierPoint', /\btierpoint\b/i],
  ['EdgeConneX', /\bedgeconnex\b/i],
  ['Cyxtera', /\bcyxtera\b/i],
  ['Stream Data Centers', /\bstream data\b/i],
  ['Prime Data Centers', /\bprime data\b/i],
  ['Novva Data Centers', /\bnovva\b/i],
  ['T5 Data Centers', /\bt5\s*@|\bt5 data\b/i],
  ['Cogent Communications', /\bcogent communications\b/i],
  ['American Tower', /\bamerican tower\b/i],
  ['Csquare', /\bcsquare\b/i],
  ['Edgecore Digital Infrastructure', /\bedgecore\b/i],
  ['Corscale Data Centers', /\bcorscale\b/i],
  ['PowerHouse Data Centers', /\bpowerhouse data\b/i],
  ['Skybox Datacenters', /\bskybox data\b/i],
  ['Element Critical', /\belement critical\b/i],

  /* AI-era operators. Newer estates, so thinner in ECHO, but the ones whose
     sites Groundwork most exists to document. */
  ['Crusoe Energy', /\bcrusoe\b/i],
  ['Applied Digital', /\bapplied digital\b/i],
  ['CoreWeave', /\bcoreweave\b/i],
  /* "Oracle" is a town in Arizona and a common oil-well name — the bare token
     matched a Marathon well ("ORACLE 21 FEDERAL 3H") and an El Paso Natural Gas
     compressor station. Same for "Colossus". Both keep the corporate form, and
     otherwise require the record to say data center. */
  ['Oracle', /\boracle america\b|\boracle\b(?=.*\bdata\s*cent)/i],
  ['Apple', /\bapple inc\b/i],
  ['xAI', /\bx\.?ai\b|\bcolossus\b(?=.*\bdata\s*cent)/i],

  /* `switch` is a word that appears in half the telephone-exchange permits in
     the country ("MOBILE SWITCHING CENTER"), so Switch Inc. is matched on its
     corporate suffix and its campus brand only, never on the bare word. */
  ['Switch', /\bswitch,? (inc|ltd)\b|\bsupernap\b/i],

  /* Tract is a land developer, and "tract" is also ordinary parcel language —
     "EAST TRACT PARK OK" is a Verizon site. Matched on the full brand only. */
  ['Tract', /\btract data\b/i],
];

/* Brands whose estate is mostly NOT data centers.

   A telco's air permits are overwhelmingly central offices, mobile switching
   centres and cell sites, all of which have a backup generator and none of
   which is a data center. Matching the brand alone published 157 Lumen
   telephone exchanges in Iowa and 183 bare "AMERICAN TOWER" cell sites — and a
   directory of permitted data centers that is half cell towers is worse than
   one that is smaller. For these operators the brand is not identification on
   its own; the record must also say data center. Every other brand still
   qualifies on the name alone, because Equinix does not own anything else.

   `11-tceq-sites.mjs` already draws this distinction for Texas
   (`DC_CUSTOMER` vs `DC_BRAND`); this is the same idea for the national spine. */
export const NEEDS_DC_SIGNAL = new Set([
  /* telecoms and towers */
  'Lumen (Level 3)', 'Verizon', 'Comcast', 'Zayo', 'Cogent Communications',
  'American Tower', 'Crusoe Energy',
  /* mixed-estate operators: offices, labs, warehouses */
  'Amazon', 'Google', 'Apple', 'Meta', 'Microsoft', 'Oracle',
]);

/* Aliases: entity names that do not carry the brand but are documented as
   belonging to it. `basis` is published alongside the attribution. */
const ALIASES = [
  {
    operator: 'Amazon',
    test: /\bvadata\b/i,
    basis: 'VADATA, Inc. is Amazon Web Services’ long-standing data-center holding entity; it files alongside Amazon Data Services permits in the same localities.',
  },
  {
    operator: 'CloudHQ',
    test: /\b(abteen|bourzou|manuchehr|iskander|jamshid|kaveh|lohrasp|darab)\s+ventures?\b/i,
    basis: 'VA DEQ permit 74107 (Cloud HQ) names Abteen Ventures LLC, Bourzou Ventures LLC and Manuchehr Ventures LLC as the permit holders for a Cloud HQ facility. The same Persian-name LLC series (Iskander, Jamshid, Kaveh, Lohrasp, Darab) appears on Loudoun campus building permits LC-1A/LC-1B/LC2/LC3.',
  },
  {
    operator: 'STACK Infrastructure',
    test: /\bSI\s+NVA\d/i,
    basis: 'The "SI NVA##" entity series is STACK Infrastructure’s Northern Virginia naming convention; one permit in this series is filed as "STACK Infrastructure Data Center - SI NVA06A LLC".',
  },
  {
    operator: 'QTS',
    test: /\bqts investment properties\b|\bASH2 Lockridge\b/i,
    basis: 'QTS Investment Properties entities file under the QTS brand elsewhere in the same listing.',
  },
  {
    operator: 'Digital Realty',
    test: /\bdigital (loudoun|filigree|western lands|third second|carver)\b/i,
    basis: 'The "Digital <place>" LLC series are Digital Realty property entities; several file explicitly as "Digital Realty" in this listing.',
  },
];

const SPV_HINT = /^\d+[- ]|\bventures?\b|\bowner,? llc\b|\bproperty owner\b|\bholdings?\b|\bpartners\b|\brealty\b|\bfarms\b|\bcapital\b/i;

export function resolveOperator(facilityName) {
  const name = String(facilityName || '').trim();

  for (const [operator, re] of BRANDS) {
    if (re.test(name)) {
      return { operator, confidence: 'confirmed', basis: `Permit is held in the name of ${operator}.` };
    }
  }
  for (const a of ALIASES) {
    if (a.test.test(name)) {
      return { operator: a.operator, confidence: 'probable', basis: a.basis };
    }
  }
  return {
    operator: null,
    confidence: 'unresolved',
    basis: SPV_HINT.test(name)
      ? 'Permit is held by a single-purpose entity with no publicly disclosed parent. Groundwork does not guess at ownership.'
      : 'No operator could be resolved from the permittee name.',
  };
}

/* A facility name identifies a data center outright. Kept here, next to the
   brands, because two collectors now apply this same test (`09` national,
   `12` California) and a copy in each is a copy that drifts. */
export const DC_NAME = /data\s*-?\s*cent(er|re)|datacenter|\bdata\s+hall\b|colocation|\bcolo\b/i;

/* The naming conventions that mark a *data-center subsidiary* rather than the
   parent. Amazon's data centers are permitted to Amazon Data Services or
   VADATA; its fulfilment centres and delivery stations are permitted to
   Amazon.com Services. Both are "Amazon" to a brand matcher, and only one of
   them is a data center. */
export const DC_ENTITY = /\bdata\s+(?:services|svcs)\b|\bvadata\b|\bdata\s+centers?\b|\bdata\s+cent(?:er|re)s?\b/i;

/* Operators with a large estate that is NOT data centers.

   Two kinds end up here. Telcos and tower companies, whose permits are
   overwhelmingly central offices and cell sites. And the hyperscalers, whose
   offices, laboratories, fulfilment centres and delivery stations all hold
   generator permits under the same brand as their data centers — invisible in
   Virginia, where the only reason Amazon holds an air permit is a data center,
   and overwhelming in California, where Google, Apple and Meta between them
   run dozens of permitted office buildings and Amazon runs the warehouses.

   For these the brand is a lead, not an identification: the record must also
   carry a data-center signal, either in the facility name or in the subsidiary
   it is permitted to. Every other brand still qualifies on the name alone,
   because Equinix and CyrusOne build nothing else. */

/* The single identification decision, shared by every registry collector.

   A registry row becomes a published site when something in it actually says
   data center: the facility's own name, or an operator that builds nothing
   else. Self-reported industry codes are not enough on their own — SIC 7374
   and NAICS 518210 are full of office buildings with a backup generator — so a
   row that carries only the code is counted and reported, never published. */
export function identify(facilityName) {
  const op = resolveOperator(facilityName);
  const n = String(facilityName || '');
  const byName = DC_NAME.test(n) || DC_ENTITY.test(n);
  const byBrand = op.confidence === 'confirmed' || op.confidence === 'probable';

  if (byBrand && !byName && NEEDS_DC_SIGNAL.has(op.operator)) {
    return { publish: false, reason: 'brand_without_dc_signal', operator: op };
  }
  if (!byName && !byBrand) {
    return { publish: false, reason: 'unidentified', operator: op };
  }
  return {
    publish: true,
    reason: null,
    identified_by: byName && byBrand ? 'name+operator' : byName ? 'name' : 'operator',
    operator: op,
  };
}
