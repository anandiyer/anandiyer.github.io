import { useState } from "react";
import { NumberInput } from "./NumberInput";
import { Tip } from "./Tooltip";
import { fmtMoneyCompact, fmtPct } from "../lib/format";
import type { FundInputs } from "../model/types";

function Label({
  text,
  tip,
  below,
}: {
  text: string;
  tip: React.ReactNode;
  below?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        fontSize: "11px",
        fontWeight: 500,
        color: "#64748b",
        marginBottom: "4px",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {text}
      <Tip tip={tip} below={below} />
    </div>
  );
}

export function InputsPanel({
  inputs,
  impliedOwnership,
  reserveAdequacy,
  totalFees,
  onSet,
}: {
  inputs: FundInputs;
  impliedOwnership: number;
  reserveAdequacy: number;
  totalFees: number;
  onSet: (patch: Partial<FundInputs>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card" style={{ padding: "24px" }}>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "#475569",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
        }}
      >
        Fund Parameters
        <Tip
          tip={
            <>
              <strong>Fund parameters.</strong> Configure the basic economics of
              your fund. Changes update all outputs in real-time. Use "Show
              advanced" for fee structure, follow-on strategy, and fund timing.
            </>
          }
          below
        />
      </div>

      {/* Main inputs — always visible */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}
      >
        <div>
          <Label
            text="Fund size ($)"
            tip={
              <>
                <strong>Fund size.</strong> Total capital committed by LPs. Drives
                every dollar-denominated number downstream — at the same number
                of investments and reserves, a bigger fund means bigger checks.
              </>
            }
            below
          />
          <NumberInput
            value={inputs.fundSize}
            onChange={(v) => onSet({ fundSize: v })}
            variant="money"
            prefix="$"
            min={0}
          />
        </div>
        <div>
          <Label
            text="# Investments"
            tip={
              <>
                <strong>Number of investments.</strong> Total portfolio companies
                the fund will back. More companies = more diversification but
                smaller checks. Typical seed funds: 20-40. Series A: 15-25.
              </>
            }
            below
          />
          <NumberInput
            value={inputs.numInvestments}
            onChange={(v) => onSet({ numInvestments: v })}
            variant="int"
            min={1}
            max={200}
          />
        </div>
        <div>
          <Label
            text="Initial check ($)"
            tip={
              <>
                <strong>Average initial check.</strong> First investment per
                company. Combined with entry round size, this determines your
                implied ownership at entry. The model deploys these evenly across
                the investment period.
              </>
            }
            below
          />
          <NumberInput
            value={inputs.avgInitialCheck}
            onChange={(v) => onSet({ avgInitialCheck: v })}
            variant="money"
            prefix="$"
            min={0}
          />
        </div>
        <div>
          <Label
            text="Reserve ratio"
            tip={
              <>
                <strong>Reserve ratio.</strong> Fraction of deployable capital
                set aside for follow-on investments. A 40% reserve means 60% is
                deployed in initial checks. Watch the reserve adequacy metric
                below — under 100% means you can't fully follow on.
              </>
            }
            below
          />
          <NumberInput
            value={inputs.reserveRatio}
            onChange={(v) => onSet({ reserveRatio: v })}
            variant="pct"
            suffix="%"
            min={0}
            max={0.9}
          />
        </div>
      </div>

      {/* Computed metrics */}
      <div
        className="flex flex-wrap"
        style={{ fontSize: "11px", color: "#64748b", columnGap: "1.5rem", rowGap: "0.25rem", marginTop: "1rem" }}
      >
        <span className="flex items-center">
          Entry ownership: {fmtPct(impliedOwnership, 1)}
          <Tip
            tip={
              <>
                <strong>Implied entry ownership.</strong> Your initial check
                divided by the entry round size. This is your pre-dilution
                ownership at entry — actual ownership will be diluted by
                subsequent rounds.
              </>
            }
          />
        </span>
        <span className="flex items-center">
          Total fees: {fmtMoneyCompact(totalFees)}
          <Tip
            tip={
              <>
                <strong>Total management fees.</strong> Mgmt fee % &times; fund
                size &times; fund life. These fees are deducted from committed
                capital before deployment, reducing the capital available for
                investments.
              </>
            }
          />
        </span>
        <span
          className="flex items-center"
          style={{
            color:
              reserveAdequacy < 0.8
                ? "#b45309"
                : reserveAdequacy < 1
                  ? "#64748b"
                  : "#059669",
          }}
        >
          Reserve adequacy: {fmtPct(reserveAdequacy, 0)}
          <Tip
            tip={
              <>
                <strong>Reserve adequacy.</strong> Ratio of actual reserves to
                expected follow-on demand. Below 100% means the fund can't fully
                follow on into every company at the planned rate. Below 80% is a
                warning — you may need to reduce follow-on size or increase
                reserves.
              </>
            }
          />
        </span>
      </div>

      {/* Expand/collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          marginTop: "16px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#2563eb",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {expanded ? "Hide advanced \u25B2" : "Show advanced \u25BC"}
      </button>

      {/* Advanced inputs */}
      {expanded && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            borderTop: "1px solid #e2e8f0",
            gap: "1rem",
            marginTop: "1rem",
            paddingTop: "1rem",
          }}
        >
          <div>
            <Label
              text="Vintage year"
              tip={
                <>
                  <strong>Vintage year.</strong> The year the fund begins
                  investing. Used for labeling the J-curve chart and cashflow
                  table — doesn't affect the math.
                </>
              }
              below
            />
            <NumberInput
              value={inputs.vintageYear}
              onChange={(v) => onSet({ vintageYear: v })}
              variant="year"
              min={2000}
              max={2050}
            />
          </div>
          <div>
            <Label
              text="Fund life (yrs)"
              tip={
                <>
                  <strong>Fund life.</strong> Total duration of the fund from
                  first close to final distribution. Typical VC funds: 10 years
                  with optional 1-2 year extensions. All exits must occur within
                  the fund life.
                </>
              }
              below
            />
            <NumberInput
              value={inputs.fundLife}
              onChange={(v) => onSet({ fundLife: v })}
              variant="int"
              min={1}
              max={20}
            />
          </div>
          <div>
            <Label
              text="Investment period"
              tip={
                <>
                  <strong>Investment period.</strong> Years during which the fund
                  makes new investments (typically 3-5 years). After this
                  period, capital is only deployed as follow-on investments.
                </>
              }
              below
            />
            <NumberInput
              value={inputs.investmentPeriod}
              onChange={(v) => onSet({ investmentPeriod: v })}
              variant="int"
              min={1}
              max={inputs.fundLife}
            />
          </div>
          <div>
            <Label
              text="Entry round size ($)"
              tip={
                <>
                  <strong>Average entry round size.</strong> The total round size
                  when you invest. Your initial check divided by this gives your
                  implied ownership percentage at entry.
                </>
              }
              below
            />
            <NumberInput
              value={inputs.avgEntryRoundSize}
              onChange={(v) => onSet({ avgEntryRoundSize: v })}
              variant="money"
              prefix="$"
              min={0}
            />
          </div>
          <div>
            <Label
              text="Mgmt fee"
              tip={
                <>
                  <strong>Management fee.</strong> Annual fee charged on
                  committed capital to cover fund operations. Typically 2% for
                  VC. Reduces capital available for investments. Charged every
                  year for the full fund life.
                </>
              }
              below
            />
            <NumberInput
              value={inputs.mgmtFeePct}
              onChange={(v) => onSet({ mgmtFeePct: v })}
              variant="pct"
              suffix="%"
              min={0}
              max={0.1}
            />
          </div>
          <div>
            <Label
              text="Carry"
              tip={
                <>
                  <strong>Carried interest.</strong> GP's share of fund profits,
                  calculated using European waterfall — carry is only paid after
                  all committed capital has been returned to LPs. Typically 20%.
                </>
              }
              below
            />
            <NumberInput
              value={inputs.carryPct}
              onChange={(v) => onSet({ carryPct: v })}
              variant="pct"
              suffix="%"
              min={0}
              max={0.5}
            />
          </div>
          <div>
            <Label
              text="Follow-on multiplier"
              tip={
                <>
                  <strong>Follow-on multiplier.</strong> How much follow-on
                  capital to deploy per company, expressed as a multiple of the
                  initial check. A 1.5x multiplier on a $1M initial check means
                  $1.5M in follow-on capital per company.
                </>
              }
              below
            />
            <NumberInput
              value={inputs.followOnMultiplier}
              onChange={(v) => onSet({ followOnMultiplier: v })}
              variant="decimal"
              suffix="\u00d7"
              min={0}
              step={0.1}
            />
          </div>
          <div>
            <Label
              text="Follow-on fraction"
              tip={
                <>
                  <strong>Follow-on fraction.</strong> What fraction of portfolio
                  companies receive follow-on funding. 50% means half the
                  companies get follow-on checks. Typical range: 30-60%.
                </>
              }
              below
            />
            <NumberInput
              value={inputs.followOnFraction}
              onChange={(v) => onSet({ followOnFraction: v })}
              variant="pct"
              suffix="%"
              min={0}
              max={1}
            />
          </div>
        </div>
      )}
    </div>
  );
}
