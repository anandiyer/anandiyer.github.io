import { useState } from "react";
import type { FundInputs } from "../model/types";
import { NumberInput } from "./NumberInput";
import { fmtMoneyCompact, fmtPct } from "../lib/format";

type Props = {
  inputs: FundInputs;
  impliedOwnership: number;
  reserveAdequacy: number;
  totalFees: number;
  onSet: (patch: Partial<FundInputs>) => void;
};

export function InputsPanel({
  inputs,
  impliedOwnership,
  reserveAdequacy,
  totalFees,
  onSet,
}: Props) {
  const [showMore, setShowMore] = useState(false);

  return (
    <section className="card p-6 sm:p-8">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-[11px] uppercase tracking-[0.16em] text-ink-muted" style={{ fontWeight: 500 }}>
          The fund
        </h2>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-xs text-accent hover:text-accent-hover"
        >
          {showMore ? "Less" : "More options"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5">
        <NumberInput
          label="Fund size"
          variant="money"
          value={inputs.fundSize}
          onChange={(n) => onSet({ fundSize: n })}
          min={0}
        />
        <NumberInput
          label="Investments"
          variant="int"
          value={inputs.numInvestments}
          onChange={(n) => onSet({ numInvestments: n })}
          min={1}
          max={500}
        />
        <NumberInput
          label="Initial check"
          variant="money"
          value={inputs.avgInitialCheck}
          onChange={(n) => onSet({ avgInitialCheck: n })}
          min={0}
        />
        <NumberInput
          label="Reserves"
          hint="of fund"
          variant="pct"
          value={inputs.reserveRatio}
          onChange={(n) => onSet({ reserveRatio: n })}
          min={0}
          max={0.8}
        />
      </div>

      {showMore && (
        <div className="mt-8 pt-8 border-t border-rule grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5">
          <NumberInput
            label="Vintage year"
            variant="year"
            value={inputs.vintageYear}
            onChange={(n) => onSet({ vintageYear: n })}
            min={1980}
            max={2100}
          />
          <NumberInput
            label="Fund life"
            hint="years"
            variant="int"
            value={inputs.fundLife}
            onChange={(n) => onSet({ fundLife: n })}
            min={3}
            max={20}
          />
          <NumberInput
            label="Investment period"
            hint="years"
            variant="int"
            value={inputs.investmentPeriod}
            onChange={(n) => onSet({ investmentPeriod: n })}
            min={1}
            max={inputs.fundLife}
          />
          <NumberInput
            label="Avg entry round"
            variant="money"
            value={inputs.avgEntryRoundSize}
            onChange={(n) => onSet({ avgEntryRoundSize: n })}
            min={0}
          />
          <NumberInput
            label="Mgmt fee"
            hint="/yr"
            variant="pct"
            value={inputs.mgmtFeePct}
            onChange={(n) => onSet({ mgmtFeePct: n })}
            min={0}
            max={0.05}
          />
          <NumberInput
            label="Carry"
            variant="pct"
            value={inputs.carryPct}
            onChange={(n) => onSet({ carryPct: n })}
            min={0}
            max={0.5}
          />
          <NumberInput
            label="Follow-on size"
            hint="× initial"
            variant="decimal"
            value={inputs.followOnMultiplier}
            onChange={(n) => onSet({ followOnMultiplier: n })}
            min={0}
            max={10}
          />
          <NumberInput
            label="% cos w/ follow-on"
            variant="pct"
            value={inputs.followOnFraction}
            onChange={(n) => onSet({ followOnFraction: n })}
            min={0}
            max={1}
          />
        </div>
      )}

      <div className="mt-6 text-xs text-ink-faint tabular flex flex-wrap gap-x-6 gap-y-1">
        <span>
          Entry ownership ≈{" "}
          <span className="text-ink-soft">{fmtPct(impliedOwnership)}</span>
        </span>
        <span>
          Fees over life:{" "}
          <span className="text-ink-soft">{fmtMoneyCompact(totalFees)}</span>
        </span>
        <span
          className={
            reserveAdequacy < 0.95 ? "text-warning" : "text-ink-faint"
          }
        >
          Reserves cover{" "}
          <span
            className={
              reserveAdequacy < 0.95 ? "text-warning" : "text-ink-soft"
            }
          >
            {fmtPct(reserveAdequacy)}
          </span>{" "}
          of planned follow-ons
        </span>
      </div>
    </section>
  );
}
