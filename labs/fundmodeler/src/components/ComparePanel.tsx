import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { fmtInt, fmtMoneyCompact, fmtMultiple, fmtPct } from "../lib/format";
import type { FundInputs, ModelResult } from "../model/types";
import { SCENARIO_COLORS } from "../lib/scenarioColors";
import { Tip } from "./Tooltip";

type Kind = "multiple" | "pct" | "money" | "int";

type Row = {
  label: string;
  kind: Kind;
  a: number;
  b: number;
  /** Is a higher value better for LPs? Drives the arrow on the delta; undefined = neutral. */
  higherIsBetter?: boolean;
};

function fmt(kind: Kind, v: number): string {
  switch (kind) {
    case "multiple":
      return fmtMultiple(v);
    case "pct":
      return fmtPct(v);
    case "money":
      return fmtMoneyCompact(v);
    case "int":
      return fmtInt(v);
  }
}

function fmtDelta(kind: Kind, d: number): string {
  if (!Number.isFinite(d)) return "—";
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  const abs = Math.abs(d);
  switch (kind) {
    case "multiple":
      return `${sign}${fmtMultiple(abs)}`;
    case "pct":
      return `${sign}${(abs * 100).toFixed(1)} pts`;
    case "money":
      return `${sign}${fmtMoneyCompact(abs)}`;
    case "int":
      return `${sign}${fmtInt(abs)}`;
  }
}

const EPS = 1e-9;

function DeltaCell({ row }: { row: Row }) {
  const d = row.b - row.a;
  if (Math.abs(d) < EPS * Math.max(1, Math.abs(row.a))) {
    return <span style={{ color: "#94a3b8" }}>same</span>;
  }
  const better =
    row.higherIsBetter === undefined ? null : row.higherIsBetter ? d > 0 : d < 0;
  return (
    <span style={{ color: "#334155", fontWeight: better === null ? 400 : 500 }}>
      {better !== null && (
        <span
          aria-label={better ? "better for B" : "worse for B"}
          style={{ color: better ? "#047857" : "#b91c1c", marginRight: "4px", fontSize: "10px" }}
        >
          {better ? "▲" : "▼"}
        </span>
      )}
      {fmtDelta(row.kind, d)}
    </span>
  );
}

/** Human-readable list of the inputs that differ between A and B. */
function differingInputs(a: FundInputs, b: FundInputs): string[] {
  const out: string[] = [];
  const check = (label: string, x: unknown, y: unknown) => {
    if (x !== y) out.push(label);
  };
  check("fund size", a.fundSize, b.fundSize);
  check("# investments", a.numInvestments, b.numInvestments);
  check("initial check", a.avgInitialCheck, b.avgInitialCheck);
  check("entry round size", a.avgEntryRoundSize, b.avgEntryRoundSize);
  check("reserve ratio", a.reserveRatio, b.reserveRatio);
  check("follow-on multiplier", a.followOnMultiplier, b.followOnMultiplier);
  check("follow-on fraction", a.followOnFraction, b.followOnFraction);
  check("mgmt fee", a.mgmtFeePct, b.mgmtFeePct);
  check("carry", a.carryPct, b.carryPct);
  check("fund life", a.fundLife, b.fundLife);
  check("investment period", a.investmentPeriod, b.investmentPeriod);
  check("vintage", a.vintageYear, b.vintageYear);
  check("fee recycling", a.recycleFees, b.recycleFees);
  const sig = (i: FundInputs) =>
    JSON.stringify(i.outcomes.map((o) => [o.share, o.multiple, o.exitYear]));
  if (sig(a) !== sig(b)) out.push("outcome mix");
  return out;
}

function Swatch({ slot }: { slot: "a" | "b" }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        borderRadius: "3px",
        background: SCENARIO_COLORS[slot],
        marginRight: "6px",
        verticalAlign: "-1px",
      }}
    />
  );
}

export function ComparePanel({
  a,
  b,
  ra,
  rb,
}: {
  a: FundInputs;
  b: FundInputs;
  ra: ModelResult;
  rb: ModelResult;
}) {
  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Returns to LPs",
      rows: [
        { label: "Net TVPI", kind: "multiple", a: ra.netTVPI, b: rb.netTVPI, higherIsBetter: true },
        { label: "Gross TVPI", kind: "multiple", a: ra.grossTVPI, b: rb.grossTVPI, higherIsBetter: true },
        { label: "Net IRR", kind: "pct", a: ra.netIRR, b: rb.netIRR, higherIsBetter: true },
        { label: "DPI", kind: "multiple", a: ra.dpi, b: rb.dpi, higherIsBetter: true },
        { label: "Net distributions", kind: "money", a: ra.netDistributions, b: rb.netDistributions, higherIsBetter: true },
      ],
    },
    {
      title: "GP economics",
      rows: [
        { label: "Carry to GP", kind: "money", a: ra.totalCarry, b: rb.totalCarry },
        { label: "Management fees", kind: "money", a: ra.totalFees, b: rb.totalFees },
      ],
    },
    {
      title: "Portfolio construction",
      rows: [
        { label: "Fund size", kind: "money", a: a.fundSize, b: b.fundSize },
        { label: "# Investments", kind: "int", a: a.numInvestments, b: b.numInvestments },
        { label: "Initial check", kind: "money", a: a.avgInitialCheck, b: b.avgInitialCheck },
        { label: "Entry ownership", kind: "pct", a: ra.impliedEntryOwnership, b: rb.impliedEntryOwnership },
        { label: "Reserve ratio", kind: "pct", a: a.reserveRatio, b: b.reserveRatio },
        { label: "Reserves deployed", kind: "money", a: ra.totalReserves, b: rb.totalReserves },
        { label: "Reserve adequacy", kind: "pct", a: ra.reserveAdequacy, b: rb.reserveAdequacy },
      ],
    },
  ];

  const years = Math.max(ra.curve.length, rb.curve.length);
  const data = Array.from({ length: years }, (_, i) => ({
    name: `Y${i}`,
    tvpiA: ra.curve[i] ? +ra.curve[i].tvpi.toFixed(3) : null,
    tvpiB: rb.curve[i] ? +rb.curve[i].tvpi.toFixed(3) : null,
    dpiA: ra.curve[i] ? +ra.curve[i].dpi.toFixed(3) : null,
    dpiB: rb.curve[i] ? +rb.curve[i].dpi.toFixed(3) : null,
  }));
  const seriesName: Record<string, string> = {
    tvpiA: `A · TVPI`,
    tvpiB: `B · TVPI`,
    dpiA: `A · DPI`,
    dpiB: `B · DPI`,
  };

  const diffs = differingInputs(a, b);
  const d = rb.netTVPI - ra.netTVPI;
  const headline =
    Math.abs(d) < 0.005
      ? "Both scenarios land at the same net TVPI."
      : `Scenario ${d > 0 ? "B" : "A"} (${d > 0 ? b.fundName : a.fundName}) returns ${fmtMultiple(Math.abs(d))} more net TVPI to LPs: ${fmtMultiple(ra.netTVPI)} for A vs ${fmtMultiple(rb.netTVPI)} for B.`;

  const th: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#64748b",
    padding: "8px 10px",
    textAlign: "right",
    borderBottom: "1px solid #e2e8f0",
  };
  const td: React.CSSProperties = {
    padding: "7px 10px",
    textAlign: "right",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "13px",
    color: "#111827",
  };

  return (
    <div className="card" style={{ padding: "24px", marginBottom: "2rem" }}>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "#475569",
          marginBottom: "6px",
          display: "flex",
          alignItems: "center",
        }}
      >
        Scenario comparison
        <Tip
          tip={
            <>
              <strong>A vs B.</strong> Both scenarios run through the same
              engine. The delta column is B minus A; ▲/▼ marks whether that is
              better or worse for LPs. Use Share link to send both scenarios in
              one URL.
            </>
          }
          below
        />
      </div>
      <div style={{ fontSize: "15px", color: "#111827", marginBottom: "4px" }}>{headline}</div>
      <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "18px" }}>
        {diffs.length === 0
          ? "B is currently identical to A. Select tab B above and change its inputs."
          : `Inputs that differ: ${diffs.join(", ")}.`}
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "2rem" }}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="tabular" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left" }}></th>
                <th style={th}>
                  <Swatch slot="a" />A
                </th>
                <th style={th}>
                  <Swatch slot="b" />B
                </th>
                <th style={th}>B − A</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => [
                <tr key={s.title}>
                  <td
                    colSpan={4}
                    style={{
                      ...td,
                      textAlign: "left",
                      fontSize: "10px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#94a3b8",
                      paddingTop: "14px",
                    }}
                  >
                    {s.title}
                  </td>
                </tr>,
                ...s.rows.map((r) => (
                  <tr key={r.label}>
                    <td style={{ ...td, textAlign: "left", color: "#475569" }}>{r.label}</td>
                    <td style={td}>{fmt(r.kind, r.a)}</td>
                    <td style={td}>{fmt(r.kind, r.b)}</td>
                    <td style={td}>
                      <DeltaCell row={r} />
                    </td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>

        <div>
          <div style={{ fontSize: "12px", color: "#475569", marginBottom: "8px" }}>
            J-curve, A vs B (solid = TVPI, dashed = DPI)
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(1)}×`}
                width={45}
              />
              <RTooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(v, name) => [fmtMultiple(Number(v)), seriesName[String(name)] ?? String(name)]}
              />
              <ReferenceLine y={1} stroke="#94a3b8" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="tvpiA" stroke={SCENARIO_COLORS.a} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="tvpiB" stroke={SCENARIO_COLORS.b} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="dpiA" stroke={SCENARIO_COLORS.a} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
              <Line type="monotone" dataKey="dpiB" stroke={SCENARIO_COLORS.b} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <div
            className="flex flex-wrap justify-center"
            style={{ fontSize: "11px", color: "#64748b", gap: "1.25rem", marginTop: "0.5rem" }}
          >
            <span>
              <Swatch slot="a" />A · {a.fundName}
            </span>
            <span>
              <Swatch slot="b" />B · {b.fundName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
