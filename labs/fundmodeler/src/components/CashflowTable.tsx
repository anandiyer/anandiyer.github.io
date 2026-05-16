import type { YearRow } from "../model/types";
import { fmtMoneyCompact } from "../lib/format";

type Props = {
  years: YearRow[];
  vintageYear: number;
};

export function CashflowTable({ years, vintageYear }: Props) {
  return (
    <section className="card p-6 sm:p-8">
      <details className="group">
        <summary className="cursor-pointer list-none flex items-baseline justify-between mb-2 select-none">
          <h2
            className="text-[11px] uppercase tracking-[0.16em] text-ink-muted"
            style={{ fontWeight: 500 }}
          >
            Year by year
          </h2>
          <span className="text-xs text-accent group-open:text-ink-faint">
            <span className="group-open:hidden">Show detail</span>
            <span className="hidden group-open:inline">Hide detail</span>
          </span>
        </summary>
        <p className="text-sm text-ink-soft mb-6 mt-2 max-w-2xl">
          Capital calls, fees, deployments, distributions, and NAV by year.
        </p>
        <div className="overflow-x-auto -mx-2">
          <table className="min-w-full text-sm tabular">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-ink-faint border-b border-rule">
                <th className="text-left font-medium py-2 px-2">Year</th>
                <th className="text-right font-medium py-2 px-3">Called</th>
                <th className="text-right font-medium py-2 px-3">Fees</th>
                <th className="text-right font-medium py-2 px-3">Deployed</th>
                <th className="text-right font-medium py-2 px-3">Dist.</th>
                <th className="text-right font-medium py-2 px-3">Carry</th>
                <th className="text-right font-medium py-2 px-3">NAV</th>
                <th className="text-right font-medium py-2 px-2">Cum net</th>
              </tr>
            </thead>
            <tbody>
              {years.map((r) => (
                <tr key={r.year} className="border-b border-rule/50 last:border-0">
                  <td className="py-2 px-2 text-ink-soft">{vintageYear + r.year}</td>
                  <td className="text-right py-2 px-3 text-ink-strong">
                    {r.capitalCalled > 0 ? fmtMoneyCompact(r.capitalCalled) : "—"}
                  </td>
                  <td className="text-right py-2 px-3 text-ink-muted">
                    {r.mgmtFees > 0 ? fmtMoneyCompact(r.mgmtFees) : "—"}
                  </td>
                  <td className="text-right py-2 px-3 text-ink-muted">
                    {r.deployedToCos > 0 ? fmtMoneyCompact(r.deployedToCos) : "—"}
                  </td>
                  <td className="text-right py-2 px-3 text-positive">
                    {r.grossDistributions > 0
                      ? fmtMoneyCompact(r.grossDistributions)
                      : "—"}
                  </td>
                  <td className="text-right py-2 px-3 text-ink-muted">
                    {r.carry > 0 ? fmtMoneyCompact(r.carry) : "—"}
                  </td>
                  <td className="text-right py-2 px-3 text-ink-muted">
                    {r.nav > 0 ? fmtMoneyCompact(r.nav) : "—"}
                  </td>
                  <td
                    className={`text-right py-2 px-2 ${
                      r.cumulativeNetCashflow >= 0
                        ? "text-positive"
                        : "text-negative"
                    }`}
                  >
                    {fmtMoneyCompact(r.cumulativeNetCashflow)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
