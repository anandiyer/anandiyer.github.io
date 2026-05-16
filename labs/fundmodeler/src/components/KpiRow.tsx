import type { ModelResult } from "../model/types";
import { fmtMoneyCompact, fmtMultiple, fmtPct } from "../lib/format";

type Stat = {
  label: string;
  value: string;
  hint: string;
};

export function KpiRow({ result }: { result: ModelResult }) {
  const stats: Stat[] = [
    {
      label: "Net TVPI",
      value: fmtMultiple(result.netTVPI),
      hint: `gross ${fmtMultiple(result.grossTVPI)}`,
    },
    {
      label: "Net IRR",
      value: fmtPct(result.netIRR, 1),
      hint: `gross ${fmtPct(result.grossIRR, 1)}`,
    },
    {
      label: "DPI",
      value: fmtMultiple(result.dpi),
      hint: `${fmtMoneyCompact(result.netDistributions)} returned`,
    },
    {
      label: "Carry to GP",
      value: fmtMoneyCompact(result.totalCarry),
      hint: `on ${fmtMoneyCompact(Math.max(0, result.grossDistributions - result.totalCalled))} profit`,
    },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-x-10 gap-y-8 py-8 border-y border-white/15">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/55" style={{ fontWeight: 500 }}>
            {s.label}
          </div>
          <div className="kpi-num text-4xl sm:text-5xl text-white mt-2">
            {s.value}
          </div>
          <div className="text-xs text-white/55 mt-1 tabular">{s.hint}</div>
        </div>
      ))}
    </section>
  );
}
