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
  ['Vantage Data Centers', /\bvantage\b/i],
  ['NTT Global Data Centers', /\bntt\b/i],
  ['STACK Infrastructure', /\bstack infrastructure\b/i],
  ['Aligned Data Centers', /\baligned\b/i],
  ['CloudHQ', /\bcloud\s?hq\b/i],
  ['Compass Datacenters', /\bcompass\b/i],
  ['CoreSite', /\bcoresite\b/i],
  ['Cologix', /\bcologix\b/i],
  ['DataBank', /\bdatabank\b/i],
  ['Iron Mountain', /\biron mountain\b/i],
  ['H5 Data Centers', /\bh5\b/i],
  ['Chirisa', /\bchirisa\b/i],
  ['TECfusions', /\btecfusions\b/i],
  ['Yondr', /\byondr\b/i],
  ['Sentinel Data Centers', /\bsentinel\b/i],
  ['Clean Arc Data Centers', /\bclean arc\b/i],
  ['DP Facilities', /\bdp facilities\b/i],
  ['Peak 10', /\bpeak 10\b/i],
  ['Zayo', /\bzayo\b/i],
  ['Lumen (Level 3)', /\blevel 3\b/i],
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
  ['Sabey Data Centers', /\bintergate\b/i],
  ['Hayden Technologies', /\bhayden\b/i],
  ['Scout Development', /\bscout development\b/i],
  ['StratCap', /\bstratcap\b/i],
  ['RREEF (DWS)', /\brreef\b/i],
  ['Cardinal Energy', /\bcardinal energy\b/i],
];

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
