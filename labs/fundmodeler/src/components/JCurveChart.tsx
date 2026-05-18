import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { fmtMultiple } from "../lib/format";
import { Tip } from "./Tooltip";
import type { CurvePoint } from "../model/types";

export function JCurveChart({
  curve,
  vintageYear,
}: {
  curve: CurvePoint[];
  vintageYear: number;
  netTVPI?: number;
}) {
  const data = curve.map((p) => ({
    name: `Y${p.year}`,
    year: vintageYear + p.year,
    tvpi: parseFloat(p.tvpi.toFixed(3)),
    dpi: parseFloat(p.dpi.toFixed(3)),
  }));

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
        J-Curve &mdash; TVPI &amp; DPI over fund life
        <Tip
          tip={
            <>
              <strong>J-Curve.</strong> Shows how fund value (TVPI) and realized
              returns (DPI) evolve over the fund's life. The characteristic
              "J" shape occurs because early years show negative returns
              (fees + deployment) before exits ramp up. The dashed line marks
              1.0x — when LPs are made whole.
            </>
          }
          below
        />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="tvpiFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="dpiFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
            tickFormatter={(v: number) => `${v.toFixed(1)}\u00d7`}
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
            formatter={(v, name) => [
              fmtMultiple(Number(v)),
              String(name) === "tvpi" ? "TVPI" : "DPI",
            ]}
          />
          <ReferenceLine
            y={1}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{
              value: "1.0\u00d7 (LP break-even)",
              position: "insideTopLeft",
              fill: "#94a3b8",
              fontSize: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="tvpi"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#tvpiFill)"
          />
          <Area
            type="monotone"
            dataKey="dpi"
            stroke="#059669"
            strokeWidth={2}
            fill="url(#dpiFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div
        className="flex gap-6 mt-3 justify-center"
        style={{ fontSize: "11px", color: "#94a3b8" }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "3px",
              backgroundColor: "#2563eb",
              borderRadius: "2px",
              marginRight: "5px",
              verticalAlign: "middle",
            }}
          />
          TVPI
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "3px",
              backgroundColor: "#059669",
              borderRadius: "2px",
              marginRight: "5px",
              verticalAlign: "middle",
            }}
          />
          DPI
        </span>
      </div>
    </div>
  );
}
