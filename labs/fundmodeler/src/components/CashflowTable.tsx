import { useState } from "react";
import { Tip } from "./Tooltip";
import { fmtMoney } from "../lib/format";
import type { YearRow } from "../model/types";

export function CashflowTable({
  years,
  vintageYear,
}: {
  years: YearRow[];
  vintageYear: number;
}) {
  const [open, setOpen] = useState(true);

  const thStyle: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#94a3b8",
    padding: "8px 10px",
    textAlign: "right",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    fontSize: "12px",
    fontVariantNumeric: "tabular-nums",
    padding: "6px 10px",
    textAlign: "right",
    color: "#475569",
  };

  return (
    <div className="card" style={{ padding: "24px" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#475569",
            display: "flex",
            alignItems: "center",
          }}
        >
          Year-by-Year Cashflows
          <Tip
            tip={
              <>
                <strong>Cashflow table.</strong> Detailed breakdown of capital
                movements each year: what LPs pay in (capital calls), where it
                goes (fees + deployment), and what comes back (distributions net
                of carry). Cumulative net cashflow shows the J-curve in tabular
                form.
              </>
            }
            below
          />
        </span>
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>
          {open ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {open && (
        <div style={{ overflowX: "auto", marginTop: "16px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "700px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ ...thStyle, textAlign: "left" }}>Year</th>
                <th style={thStyle}>
                  <span className="inline-flex items-center justify-end">
                    Called
                    <Tip
                      tip={
                        <>
                          <strong>Capital called.</strong> Total capital drawn
                          from LPs this year (mgmt fees + deployment to
                          companies). This is cash leaving the LP's pocket.
                        </>
                      }
                    />
                  </span>
                </th>
                <th style={thStyle}>
                  <span className="inline-flex items-center justify-end">
                    Fees
                    <Tip
                      tip={
                        <>
                          <strong>Management fees.</strong> Annual fee on
                          committed capital. Covers fund operations, salaries,
                          and expenses.
                        </>
                      }
                    />
                  </span>
                </th>
                <th style={thStyle}>
                  <span className="inline-flex items-center justify-end">
                    Deployed
                    <Tip
                      tip={
                        <>
                          <strong>Deployed to companies.</strong> Capital
                          actually invested in portfolio companies this year
                          (initial checks + follow-ons).
                        </>
                      }
                    />
                  </span>
                </th>
                <th style={thStyle}>
                  <span className="inline-flex items-center justify-end">
                    Distributions
                    <Tip
                      tip={
                        <>
                          <strong>Net distributions.</strong> Cash returned to
                          LPs this year from exits, net of carried interest.
                          This is cash coming back to the LP.
                        </>
                      }
                    />
                  </span>
                </th>
                <th style={thStyle}>
                  <span className="inline-flex items-center justify-end">
                    Carry
                    <Tip
                      tip={
                        <>
                          <strong>Carried interest.</strong> GP's performance
                          fee on profits distributed this year. Only charged on
                          cumulative profits above total capital called
                          (European waterfall).
                        </>
                      }
                    />
                  </span>
                </th>
                <th style={thStyle}>
                  <span className="inline-flex items-center justify-end">
                    NAV
                    <Tip
                      tip={
                        <>
                          <strong>Net Asset Value.</strong> Estimated value of
                          remaining portfolio, net of expected carry. Linearly
                          ramps from cost basis to expected exit value. After a
                          company exits, it drops from NAV.
                        </>
                      }
                    />
                  </span>
                </th>
                <th style={thStyle}>
                  <span className="inline-flex items-center justify-end">
                    Cum Net CF
                    <Tip
                      tip={
                        <>
                          <strong>Cumulative net cashflow.</strong> Running
                          total of distributions minus capital calls. Negative
                          = LPs are underwater. Turns positive when cumulative
                          distributions exceed cumulative calls — the "break
                          even" point.
                        </>
                      }
                    />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {years.map((r) => (
                <tr
                  key={r.year}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      textAlign: "left",
                      fontWeight: 500,
                      color: "#111827",
                    }}
                  >
                    {vintageYear + r.year}
                  </td>
                  <td style={tdStyle}>{fmtMoney(r.capitalCalled)}</td>
                  <td style={tdStyle}>{fmtMoney(r.mgmtFees)}</td>
                  <td style={tdStyle}>{fmtMoney(r.deployedToCos)}</td>
                  <td style={tdStyle}>{fmtMoney(r.netDistributions)}</td>
                  <td style={tdStyle}>{fmtMoney(r.carry)}</td>
                  <td style={tdStyle}>{fmtMoney(r.nav)}</td>
                  <td
                    style={{
                      ...tdStyle,
                      color:
                        r.cumulativeNetCashflow >= 0 ? "#059669" : "#dc2626",
                      fontWeight: 500,
                    }}
                  >
                    {fmtMoney(r.cumulativeNetCashflow)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
