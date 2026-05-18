import { fmtMultiple, fmtPct, fmtMoneyCompact } from "../lib/format";
import { Tip } from "./Tooltip";
import type { ModelResult } from "../model/types";

function KpiCard({
  label,
  value,
  hint,
  tip,
}: {
  label: string;
  value: string;
  hint?: string;
  tip?: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#64748b",
          marginBottom: "6px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {label}
        {tip && <Tip tip={tip} below alignLeft />}
      </div>
      <div
        className="kpi-num"
        style={{ fontSize: "1.5rem", fontWeight: 400, color: "#111827" }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function KpiRow({ result }: { result: ModelResult }) {
  return (
    <div
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      }}
    >
      <KpiCard
        label="Net TVPI"
        value={fmtMultiple(result.netTVPI)}
        hint={`${fmtMultiple(result.grossTVPI)} gross`}
        tip={
          <>
            <strong>Net TVPI.</strong> Total Value to Paid-In capital, net of
            fees and carry. The headline return multiple for LPs — how many
            dollars they get back per dollar committed. A 2.0x means LPs double
            their money.
          </>
        }
      />
      <KpiCard
        label="Net IRR"
        value={fmtPct(result.netIRR)}
        hint={`${fmtPct(result.grossIRR)} gross`}
        tip={
          <>
            <strong>Net IRR.</strong> Internal Rate of Return, net of fees and
            carry. Time-weighted return that accounts for when capital is called
            and distributed. A 25%+ net IRR is top-quartile for early-stage
            funds.
          </>
        }
      />
      <KpiCard
        label="DPI"
        value={fmtMultiple(result.dpi)}
        hint={`${fmtMoneyCompact(result.netDistributions)} distributed`}
        tip={
          <>
            <strong>DPI.</strong> Distributions to Paid-In — how much cash has
            actually been returned to LPs relative to what they put in. Unlike
            TVPI, DPI only counts realized returns (cash in hand), not
            unrealized NAV.
          </>
        }
      />
      <KpiCard
        label="Carry to GP"
        value={fmtMoneyCompact(result.totalCarry)}
        hint={`on ${fmtMoneyCompact(Math.max(0, result.grossDistributions - result.totalCalled))} profit`}
        tip={
          <>
            <strong>Carried interest.</strong> The GP's performance fee,
            calculated using European waterfall — carry is only paid on profits
            above the total capital called. Typically 20% of net profits.
          </>
        }
      />
    </div>
  );
}
