// Compute annualized IRR for a sequence of yearly cashflows starting at year 0.
// Negative = outflow (call), positive = inflow (distribution).
// Uses Newton-Raphson with bisection fallback for robustness.
export function irr(
  cashflows: number[],
  guess = 0.1,
  tolerance = 1e-7,
  maxIter = 200
): number | null {
  if (cashflows.length < 2) return null;

  const hasOutflow = cashflows.some((c) => c < 0);
  const hasInflow = cashflows.some((c) => c > 0);
  if (!hasOutflow || !hasInflow) return null;

  const npv = (rate: number) => {
    let sum = 0;
    for (let t = 0; t < cashflows.length; t++) {
      sum += cashflows[t] / Math.pow(1 + rate, t);
    }
    return sum;
  };

  const dnpv = (rate: number) => {
    let sum = 0;
    for (let t = 1; t < cashflows.length; t++) {
      sum -= (t * cashflows[t]) / Math.pow(1 + rate, t + 1);
    }
    return sum;
  };

  let rate = guess;
  for (let i = 0; i < maxIter; i++) {
    const f = npv(rate);
    if (Math.abs(f) < tolerance) return rate;
    const fp = dnpv(rate);
    if (fp === 0) break;
    const next = rate - f / fp;
    if (!Number.isFinite(next) || next <= -0.9999) break;
    if (Math.abs(next - rate) < tolerance) return next;
    rate = next;
  }

  // Bisection fallback over a wide bracket
  let lo = -0.99;
  let hi = 10;
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < tolerance) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}
