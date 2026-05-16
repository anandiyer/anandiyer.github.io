import type { ModelResult } from "../model/types";
import { fmtMultiple, fmtPct } from "../lib/format";

type Props = {
  fundName: string;
  fundSize: number;
  vintageYear: number;
  numInvestments: number;
  result: ModelResult;
  onRenameFund: (name: string) => void;
};

function fmtFundSize(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${(n / 1000).toFixed(0)}K`;
}

export function Hero({
  fundName,
  fundSize,
  vintageYear,
  numInvestments,
  result,
  onRenameFund,
}: Props) {
  const tvpi = result.netTVPI;
  const verdict =
    tvpi >= 3 ? "an outstanding fund" :
    tvpi >= 2.5 ? "a top-quartile fund" :
    tvpi >= 2 ? "a solid fund" :
    tvpi >= 1.5 ? "a modest fund" :
    tvpi >= 1 ? "capital preserved" :
    "below-water";

  return (
    <>
      <section className="pt-2 pb-10 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl text-white tracking-tight leading-[1.05]">
          Model your venture fund.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-white/75 leading-relaxed">
          A free, browser-only fund model for VC GPs. Plug in your fund size,
          check sizes, reserves, and outcome distribution — and watch TVPI, DPI,
          IRR, and the J-curve update live. Scenarios save to the URL so you
          can share them; nothing leaves your device.
        </p>
      </section>

      <section className="pb-8 pt-6 border-t border-white/15 max-w-3xl">
        <div
          className="text-[11px] uppercase tracking-[0.18em] text-white/55 mb-3"
          style={{ fontWeight: 500 }}
        >
          Your scenario
        </div>
        <input
          type="text"
          value={fundName}
          onChange={(e) => onRenameFund(e.target.value)}
          aria-label="Fund name"
          className="block w-full text-3xl sm:text-4xl tracking-tight text-white bg-transparent border-b border-transparent hover:border-white/30 focus:border-white/60 focus:outline-none -ml-1 px-1"
        />
        <p className="mt-4 text-base sm:text-lg leading-relaxed text-white/80">
          A {fmtFundSize(fundSize)} fund, {vintageYear} vintage,{" "}
          {numInvestments} investments. Modeled return:{" "}
          <span className="text-white kpi-num">{fmtMultiple(tvpi)}</span> net to
          LPs at{" "}
          <span className="text-white kpi-num">
            {fmtPct(result.netIRR, 1)}
          </span>{" "}
          IRR
          <span className="text-white/55"> — {verdict}.</span>
        </p>
      </section>
    </>
  );
}
