import type {
  BucketResult,
  CurvePoint,
  FundInputs,
  ModelResult,
  YearRow,
} from "./types";
import { irr } from "./irr";

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function safeDiv(a: number, b: number): number {
  if (b === 0 || !Number.isFinite(b)) return 0;
  return a / b;
}

export function runModel(inputs: FundInputs): ModelResult {
  const warnings: string[] = [];

  const fundSize = Math.max(0, inputs.fundSize);
  const life = Math.max(1, Math.min(20, Math.round(inputs.fundLife)));
  const invPeriod = Math.max(1, Math.min(life, Math.round(inputs.investmentPeriod)));
  const numCos = Math.max(1, Math.round(inputs.numInvestments));
  const initialCheck = Math.max(0, inputs.avgInitialCheck);
  const roundSize = Math.max(initialCheck, inputs.avgEntryRoundSize);
  const reserveRatio = clamp(inputs.reserveRatio, 0, 0.9);
  const followOnMult = Math.max(0, inputs.followOnMultiplier);
  const followOnFrac = clamp(inputs.followOnFraction, 0, 1);
  const feePct = clamp(inputs.mgmtFeePct, 0, 0.1);
  const carryPct = clamp(inputs.carryPct, 0, 0.5);
  const recycle = !!inputs.recycleFees;

  const impliedEntryOwnership = safeDiv(initialCheck, roundSize);

  const grossOutcomeShare = inputs.outcomes.reduce((s, o) => s + o.share, 0);
  if (Math.abs(grossOutcomeShare - 1) > 0.005) {
    warnings.push(
      `Outcome shares sum to ${(grossOutcomeShare * 100).toFixed(1)}%, not 100%. Results use the actual sum.`
    );
  }

  const initialPool = numCos * initialCheck;
  const impliedFollowOnPerCo = followOnMult * initialCheck * followOnFrac;
  const expectedFollowOnDemand = numCos * impliedFollowOnPerCo;

  const totalFees = fundSize * feePct * life;
  const totalDeployable = recycle ? fundSize : Math.max(0, fundSize - totalFees);
  const initialBudget = Math.max(0, totalDeployable * (1 - reserveRatio));
  const reserveBudget = Math.max(0, totalDeployable * reserveRatio);

  const reserveAdequacy = safeDiv(reserveBudget, expectedFollowOnDemand);

  const usedInitial = Math.min(initialBudget, initialPool);
  if (initialPool > initialBudget * 1.001) {
    warnings.push(
      "Initial check plan exceeds available capital after fees & reserves — model scales down initial deployment to fit."
    );
  }
  const initialPerCo = safeDiv(usedInitial, numCos);

  const usedReserves = Math.min(reserveBudget, expectedFollowOnDemand);
  if (expectedFollowOnDemand > reserveBudget * 1.001) {
    warnings.push(
      "Planned follow-ons exceed reserves — model deploys reserves only up to the reserve budget."
    );
  }
  const reservePerCo = safeDiv(usedReserves, numCos);
  const avgCheckPerCo = initialPerCo + reservePerCo;

  const years: YearRow[] = [];
  for (let y = 0; y <= life; y++) {
    years.push({
      year: y,
      capitalCalled: 0,
      mgmtFees: 0,
      deployedToCos: 0,
      grossDistributions: 0,
      carry: 0,
      netDistributions: 0,
      nav: 0,
      cumulativeNetCashflow: 0,
      cumulativeCalled: 0,
      cumulativeDistributed: 0,
    });
  }

  // Mgmt fees spread evenly across years 0..life-1
  for (let y = 0; y < life; y++) {
    years[y].mgmtFees = fundSize * feePct;
  }

  // Initial deployment over years 0..invPeriod-1
  const initialPerYear = safeDiv(usedInitial, invPeriod);
  for (let y = 0; y < invPeriod; y++) {
    years[y].deployedToCos += initialPerYear;
  }
  // Follow-on deployment over years 1..min(invPeriod+1, life-1)
  const followOnEnd = Math.min(invPeriod + 2, life);
  const followOnWindow = Math.max(1, followOnEnd - 1);
  const followOnPerYear = safeDiv(usedReserves, followOnWindow);
  for (let y = 1; y < followOnEnd; y++) {
    years[y].deployedToCos += followOnPerYear;
  }

  // Capital calls = mgmt fees + deployments (simple just-in-time model)
  for (let y = 0; y < life; y++) {
    years[y].capitalCalled = years[y].mgmtFees + years[y].deployedToCos;
  }

  // Outcome bucket results
  const buckets: BucketResult[] = inputs.outcomes.map((o) => {
    const nCos = numCos * o.share;
    const capital = nCos * avgCheckPerCo;
    const exit = capital * o.multiple;
    return {
      id: o.id,
      label: o.label,
      share: o.share,
      numCompanies: nCos,
      capitalInvested: capital,
      exitValue: exit,
      multiple: o.multiple,
      exitYear: clamp(Math.round(o.exitYear), 1, life),
      contributionToMOIC: 0,
    };
  });

  // Gross distributions by year
  let grossDistributions = 0;
  for (const b of buckets) {
    years[b.exitYear].grossDistributions += b.exitValue;
    grossDistributions += b.exitValue;
  }

  const totalCalled = years.reduce((s, r) => s + r.capitalCalled, 0);
  const totalDeployed = years.reduce((s, r) => s + r.deployedToCos, 0);

  // European waterfall carry
  let cumDistGross = 0;
  let totalCarry = 0;
  for (let y = 0; y <= life; y++) {
    const before = cumDistGross;
    cumDistGross += years[y].grossDistributions;
    const beforeProfit = Math.max(0, before - totalCalled);
    const afterProfit = Math.max(0, cumDistGross - totalCalled);
    const profitInYear = Math.max(0, afterProfit - beforeProfit);
    const carryY = profitInYear * carryPct;
    years[y].carry = carryY;
    years[y].netDistributions = years[y].grossDistributions - carryY;
    totalCarry += carryY;
  }

  // NAV at year Y: for each not-yet-exited bucket, value linearly ramps from cost
  // (at investment midpoint) to exit value (at exit year). After exit: 0.
  // Apply a pro-rata carry haircut so reported NAV is LP-side (net of expected carry).
  const totalGrossProfit = Math.max(0, grossDistributions - totalCalled);
  const totalGrossCarry = totalGrossProfit * carryPct;
  const effectiveCarryRate = safeDiv(totalGrossCarry, grossDistributions);
  const invMidpoint = invPeriod / 2;

  for (let y = 0; y <= life; y++) {
    let navGross = 0;
    for (const b of buckets) {
      if (b.exitYear <= y) continue; // distributed
      if (y < invMidpoint) {
        // Pre-investment-midpoint: mark portion already deployed at cost.
        const deployedShare = Math.max(0, Math.min(1, y / Math.max(invMidpoint, 0.0001)));
        navGross += b.capitalInvested * deployedShare;
      } else {
        // Post-deployment: linear ramp from cost to exit value.
        const denom = Math.max(b.exitYear - invMidpoint, 0.0001);
        const progress = Math.max(0, Math.min(1, (y - invMidpoint) / denom));
        const value = b.capitalInvested + (b.exitValue - b.capitalInvested) * progress;
        navGross += value;
      }
    }
    years[y].nav = navGross * (1 - effectiveCarryRate);
  }

  // Cumulative flows
  let cumCalled = 0;
  let cumNetDist = 0;
  let cumNetCash = 0;
  for (let y = 0; y <= life; y++) {
    cumCalled += years[y].capitalCalled;
    cumNetDist += years[y].netDistributions;
    cumNetCash += years[y].netDistributions - years[y].capitalCalled;
    years[y].cumulativeCalled = cumCalled;
    years[y].cumulativeDistributed = cumNetDist;
    years[y].cumulativeNetCashflow = cumNetCash;
  }

  const netDistributions = grossDistributions - totalCarry;
  const residualValue = 0; // all exits resolved by end of fund life by construction

  const grossMOIC = safeDiv(grossDistributions, totalDeployed);
  const netMOIC = safeDiv(netDistributions, totalDeployed);
  const grossTVPI = safeDiv(grossDistributions + residualValue, totalCalled);
  const netTVPI = safeDiv(netDistributions + residualValue, totalCalled);
  const dpi = safeDiv(netDistributions, totalCalled);
  const rvpi = safeDiv(residualValue, totalCalled);

  // IRR
  const netCashSeries: number[] = years.map(
    (r) => r.netDistributions - r.capitalCalled
  );
  const grossCashSeries: number[] = years.map(
    (r) => r.grossDistributions - r.deployedToCos
  );
  const netIRR = irr(netCashSeries) ?? 0;
  const grossIRR = irr(grossCashSeries) ?? 0;

  // Bucket contribution to MOIC
  for (const b of buckets) {
    b.contributionToMOIC = safeDiv(b.exitValue, totalDeployed);
  }

  // J-curve: cumulative TVPI / DPI / RVPI by year
  const curve: CurvePoint[] = years.map((r) => {
    const tvpi = safeDiv(r.cumulativeDistributed + r.nav, r.cumulativeCalled);
    const dpiY = safeDiv(r.cumulativeDistributed, r.cumulativeCalled);
    const rvpiY = safeDiv(r.nav, r.cumulativeCalled);
    return { year: r.year, tvpi, dpi: dpiY, rvpi: rvpiY };
  });

  return {
    inputs,
    totalCalled,
    totalDeployed,
    totalReserves: usedReserves,
    totalFees,
    grossDistributions,
    netDistributions,
    totalCarry,
    residualValue,
    grossMOIC,
    netMOIC,
    grossTVPI,
    netTVPI,
    dpi,
    rvpi,
    grossIRR,
    netIRR,
    impliedEntryOwnership,
    reserveAdequacy,
    years,
    buckets,
    curve,
    warnings,
  };
}
