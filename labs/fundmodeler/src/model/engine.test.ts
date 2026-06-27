import { describe, expect, it } from "vitest";
import { runModel } from "./engine";
import { DEFAULT_INPUTS } from "./defaults";
import { irr } from "./irr";
import type { FundInputs } from "./types";

function withOutcomes(
  base: FundInputs,
  outcomes: { multiple: number; exitYear: number }[]
): FundInputs {
  const share = 1 / outcomes.length;
  return {
    ...base,
    outcomes: outcomes.map((o, i) => ({
      id: `b${i}`,
      label: `b${i}`,
      share,
      multiple: o.multiple,
      exitYear: o.exitYear,
    })),
  };
}

describe("irr", () => {
  it("returns ~0 for 1x return", () => {
    const r = irr([-100, 0, 0, 0, 100]);
    expect(r).not.toBeNull();
    expect(Math.abs(r!)).toBeLessThan(0.01);
  });

  it("computes ~24.6% IRR for 3x over 5 years", () => {
    const r = irr([-100, 0, 0, 0, 0, 300]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.2457, 2);
  });

  it("returns -1 for total loss", () => {
    const r = irr([-100, 0, 0, 0, 0]);
    expect(r).toBeNull();
  });

  it("handles a typical fund cashflow pattern", () => {
    const r = irr([-30, -30, -30, -10, 0, 50, 80, 60, 40, 30, 20]);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0);
    expect(r!).toBeLessThan(1);
  });
});

describe("runModel", () => {
  it("produces sensible defaults", () => {
    const result = runModel(DEFAULT_INPUTS);
    expect(result.totalCalled).toBeGreaterThan(0);
    expect(result.grossMOIC).toBeGreaterThan(0);
    expect(result.netMOIC).toBeLessThanOrEqual(result.grossMOIC);
    expect(result.netIRR).toBeLessThanOrEqual(result.grossIRR);
    expect(result.netTVPI).toBeGreaterThan(0);
  });

  it("MOIC ~= 0 when every co is a total loss", () => {
    const losses = withOutcomes(DEFAULT_INPUTS, [
      { multiple: 0, exitYear: 5 },
      { multiple: 0, exitYear: 6 },
      { multiple: 0, exitYear: 7 },
    ]);
    const r = runModel(losses);
    expect(r.grossMOIC).toBe(0);
    expect(r.netMOIC).toBe(0);
    expect(r.dpi).toBe(0);
  });

  it("MOIC ~= 1 when every co returns 1x at the same year", () => {
    const flat = withOutcomes(DEFAULT_INPUTS, [{ multiple: 1, exitYear: 6 }]);
    const r = runModel(flat);
    expect(r.grossMOIC).toBeCloseTo(1, 2);
  });

  it("higher fees reduce net TVPI", () => {
    const lowFee = { ...DEFAULT_INPUTS, mgmtFeePct: 0.005 };
    const highFee = { ...DEFAULT_INPUTS, mgmtFeePct: 0.025 };
    const a = runModel(lowFee);
    const b = runModel(highFee);
    expect(a.netTVPI).toBeGreaterThan(b.netTVPI);
  });

  it("carry kicks in only above 1x called", () => {
    const flat = withOutcomes(DEFAULT_INPUTS, [{ multiple: 1, exitYear: 6 }]);
    const r = runModel(flat);
    expect(r.totalCarry).toBeCloseTo(0, 2);
  });

  it("carry caps to carry% of profit", () => {
    const winner = withOutcomes(DEFAULT_INPUTS, [{ multiple: 3, exitYear: 6 }]);
    const r = runModel(winner);
    const profit = r.grossDistributions - r.totalCalled;
    expect(r.totalCarry).toBeLessThanOrEqual(profit * DEFAULT_INPUTS.carryPct + 0.01);
  });

  it("net IRR < gross IRR when fees are positive", () => {
    const r = runModel(DEFAULT_INPUTS);
    expect(r.netIRR).toBeLessThan(r.grossIRR);
  });

  it("J-curve starts negative (fees + deployment, no exits)", () => {
    const r = runModel(DEFAULT_INPUTS);
    expect(r.curve[0].dpi).toBe(0);
    expect(r.years[0].cumulativeNetCashflow).toBeLessThan(0);
  });
});
