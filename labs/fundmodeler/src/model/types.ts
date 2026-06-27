export const SCENARIO_SCHEMA_VERSION = 1;

export type OutcomeBucket = {
  id: string;
  label: string;
  share: number;
  multiple: number;
  exitYear: number;
};

export type FundInputs = {
  schemaVersion: number;

  fundName: string;
  fundSize: number;
  vintageYear: number;
  fundLife: number;
  investmentPeriod: number;
  gpCommitPct: number;
  mgmtFeePct: number;
  carryPct: number;
  recycleFees: boolean;

  numInvestments: number;
  avgInitialCheck: number;
  avgEntryRoundSize: number;
  reserveRatio: number;
  followOnMultiplier: number;
  followOnFraction: number;

  outcomes: OutcomeBucket[];
};

export type YearRow = {
  year: number;
  capitalCalled: number;
  mgmtFees: number;
  deployedToCos: number;
  grossDistributions: number;
  carry: number;
  netDistributions: number;
  nav: number;
  cumulativeNetCashflow: number;
  cumulativeCalled: number;
  cumulativeDistributed: number;
};

export type BucketResult = {
  id: string;
  label: string;
  share: number;
  numCompanies: number;
  capitalInvested: number;
  exitValue: number;
  multiple: number;
  exitYear: number;
  contributionToMOIC: number;
};

export type CurvePoint = {
  year: number;
  tvpi: number;
  dpi: number;
  rvpi: number;
};

export type ModelResult = {
  inputs: FundInputs;

  totalCalled: number;
  totalDeployed: number;
  totalReserves: number;
  totalFees: number;
  grossDistributions: number;
  netDistributions: number;
  totalCarry: number;
  residualValue: number;

  grossMOIC: number;
  netMOIC: number;
  grossTVPI: number;
  netTVPI: number;
  dpi: number;
  rvpi: number;
  grossIRR: number;
  netIRR: number;

  impliedEntryOwnership: number;
  reserveAdequacy: number;

  years: YearRow[];
  buckets: BucketResult[];
  curve: CurvePoint[];

  warnings: string[];
};
