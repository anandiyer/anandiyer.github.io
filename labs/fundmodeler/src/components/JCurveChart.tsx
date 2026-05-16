import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CurvePoint } from "../model/types";

type Props = {
  curve: CurvePoint[];
  vintageYear: number;
  netTVPI: number;
};

export function JCurveChart({ curve, vintageYear, netTVPI }: Props) {
  const data = curve.map((p) => ({
    year: vintageYear + p.year,
    TVPI: Number(p.tvpi.toFixed(3)),
    DPI: Number(p.dpi.toFixed(3)),
  }));

  return (
    <section className="card p-6 sm:p-8">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-[11px] uppercase tracking-[0.16em] text-ink-muted" style={{ fontWeight: 500 }}>
          The path
        </h2>
        <div className="flex items-center gap-4 text-xs text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-px bg-accent" /> TVPI
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-px bg-positive" /> DPI
          </span>
        </div>
      </div>
      <p className="text-sm text-ink-soft mb-6 max-w-2xl">
        Net TVPI and realized DPI by year. The J-curve dips early — fees and
        deployment without exits — then climbs as winners mark up and exit.
        Target line at 1.0× shows when LPs are made whole.
      </p>
      <div className="h-[360px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="tvpiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dpiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}×`}
              width={44}
              domain={[0, Math.ceil(Math.max(netTVPI * 1.2, 2.5))]}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                fontSize: 12,
                padding: "8px 10px",
              }}
              labelStyle={{ color: "#475569", marginBottom: 4 }}
              formatter={(value, name) => [
                `${Number(value).toFixed(2)}×`,
                String(name),
              ]}
              labelFormatter={(label) => `Year ${label}`}
            />
            <ReferenceLine
              y={1}
              stroke="#cbd5e1"
              strokeDasharray="3 3"
              label={{
                value: "1.0× LPs made whole",
                position: "right",
                fill: "#94a3b8",
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="TVPI"
              stroke="#2563eb"
              strokeWidth={1.75}
              fill="url(#tvpiGrad)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="DPI"
              stroke="#059669"
              strokeWidth={1.75}
              fill="url(#dpiGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
