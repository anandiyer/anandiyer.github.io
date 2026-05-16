import { useState } from "react";
import type { FundInputs, YearRow } from "../model/types";

type Props = {
  inputs: FundInputs;
  years: YearRow[];
  onReset: () => void;
};

function toCSV(years: YearRow[], vintage: number): string {
  const header = [
    "year",
    "capital_called",
    "mgmt_fees",
    "deployed",
    "gross_distributions",
    "carry",
    "net_distributions",
    "nav",
    "cum_net_cashflow",
  ];
  const rows = years.map((r) => [
    vintage + r.year,
    r.capitalCalled.toFixed(0),
    r.mgmtFees.toFixed(0),
    r.deployedToCos.toFixed(0),
    r.grossDistributions.toFixed(0),
    r.carry.toFixed(0),
    r.netDistributions.toFixed(0),
    r.nav.toFixed(0),
    r.cumulativeNetCashflow.toFixed(0),
  ]);
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function Actions({ inputs, years, onReset }: Props) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const downloadCSV = () => {
    const csv = toCSV(years, inputs.vintageYear);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inputs.fundName.replace(/\s+/g, "_")}_cashflow.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-5 text-xs text-white/70">
      <button
        type="button"
        onClick={copyLink}
        className="hover:text-white transition"
      >
        {copied ? "Copied ✓" : "Share link"}
      </button>
      <button
        type="button"
        onClick={downloadCSV}
        className="hover:text-white transition"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm("Reset all inputs to defaults?")) onReset();
        }}
        className="hover:text-white transition"
      >
        Reset
      </button>
    </div>
  );
}
