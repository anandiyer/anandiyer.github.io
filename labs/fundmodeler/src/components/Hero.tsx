import { useState } from "react";
import { fmtMoneyCompact, fmtMultiple, fmtPct } from "../lib/format";
import { Tip } from "./Tooltip";
import type { ModelResult } from "../model/types";

function verdict(tvpi: number): { label: string; color: string } {
  if (tvpi >= 3) return { label: "Exceptional", color: "#34d399" };
  if (tvpi >= 2) return { label: "Strong", color: "#6ee7b7" };
  if (tvpi >= 1.5) return { label: "Solid", color: "#a7f3d0" };
  if (tvpi >= 1) return { label: "Returning capital", color: "#fbbf24" };
  return { label: "Below water", color: "#f87171" };
}

export function Hero({
  fundName,
  fundSize,
  vintageYear,
  numInvestments,
  result,
  onRenameFund,
}: {
  fundName: string;
  fundSize: number;
  vintageYear: number;
  numInvestments: number;
  result: ModelResult;
  onRenameFund: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fundName);
  const v = verdict(result.netTVPI);

  return (
    <div className="mb-8">
      {/* Editable fund name */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft.trim()) onRenameFund(draft.trim());
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setEditing(false);
              if (draft.trim()) onRenameFund(draft.trim());
            }
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(fundName);
            }
          }}
          style={{
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(255,255,255,0.4)",
            color: "#fff",
            fontSize: "2rem",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            outline: "none",
            width: "100%",
            padding: "0 0 4px 0",
          }}
        />
      ) : (
        <h1
          onClick={() => {
            setEditing(true);
            setDraft(fundName);
          }}
          style={{
            fontSize: "2rem",
            fontWeight: 300,
            letterSpacing: "-0.02em",
            color: "#fff",
            cursor: "pointer",
            margin: 0,
          }}
          title="Click to rename"
        >
          {fundName}
        </h1>
      )}

      {/* Subtitle row */}
      <div
        className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        <span>{fmtMoneyCompact(fundSize)} fund</span>
        <span>&middot;</span>
        <span>{vintageYear} vintage</span>
        <span>&middot;</span>
        <span>{numInvestments} investments</span>
      </div>

      {/* Verdict badge */}
      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <span
          className="kpi-num"
          style={{ fontSize: "1.75rem", fontWeight: 400, color: "#fff" }}
        >
          {fmtMultiple(result.netTVPI)}
        </span>
        <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
          net TVPI
        </span>
        <span
          style={{
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.5)",
            marginLeft: "8px",
          }}
        >
          {fmtPct(result.netIRR)} net IRR
        </span>
        <span
          style={{
            display: "inline-block",
            padding: "2px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            fontWeight: 500,
            color: "#111",
            backgroundColor: v.color,
            marginLeft: "8px",
          }}
        >
          {v.label}
        </span>
        <Tip
          tip={
            <>
              <strong>Fund verdict.</strong> Based on net TVPI: Exceptional
              (3x+), Strong (2-3x), Solid (1.5-2x), Returning capital (1-1.5x),
              Below water (&lt;1x). Click the fund name above to rename it.
            </>
          }
        />
      </div>
    </div>
  );
}
