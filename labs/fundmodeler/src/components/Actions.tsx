import type { FundInputs, YearRow } from "../model/types";

function exportCsv(years: YearRow[], vintageYear: number) {
  const header =
    "Year,Called,Fees,Deployed,Gross Dist,Carry,Net Dist,NAV,Cum Net CF";
  const rows = years.map(
    (r) =>
      `${vintageYear + r.year},${r.capitalCalled.toFixed(0)},${r.mgmtFees.toFixed(0)},${r.deployedToCos.toFixed(0)},${r.grossDistributions.toFixed(0)},${r.carry.toFixed(0)},${r.netDistributions.toFixed(0)},${r.nav.toFixed(0)},${r.cumulativeNetCashflow.toFixed(0)}`
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fund-model.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function shareLink() {
  navigator.clipboard.writeText(window.location.href).catch(() => {});
}

const btnStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 500,
  padding: "4px 12px",
  borderRadius: "6px",
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.75)",
  cursor: "pointer",
  transition: "all 0.15s",
};

export function Actions({
  inputs,
  years,
  onReset,
}: {
  inputs: FundInputs;
  years: YearRow[];
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        style={btnStyle}
        onClick={shareLink}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.15)";
          e.currentTarget.style.color = "rgba(255,255,255,0.95)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.color = "rgba(255,255,255,0.75)";
        }}
      >
        Share link
      </button>
      <button
        style={btnStyle}
        onClick={() => exportCsv(years, inputs.vintageYear)}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.15)";
          e.currentTarget.style.color = "rgba(255,255,255,0.95)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.color = "rgba(255,255,255,0.75)";
        }}
      >
        Export CSV
      </button>
      <button
        style={btnStyle}
        onClick={() => {
          if (window.confirm("Reset all inputs to defaults?")) onReset();
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.15)";
          e.currentTarget.style.color = "rgba(255,255,255,0.95)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          e.currentTarget.style.color = "rgba(255,255,255,0.75)";
        }}
      >
        Reset
      </button>
    </div>
  );
}
