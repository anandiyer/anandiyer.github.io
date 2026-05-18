import { NumberInput } from "./NumberInput";
import { Tip } from "./Tooltip";
import { fmtMoneyCompact } from "../lib/format";
import type { OutcomeBucket, BucketResult } from "../model/types";

export function OutcomesPanel({
  outcomes,
  buckets,
  lifeMax,
  canRemove,
  onSetOutcome,
  onAddOutcome,
  onRemoveOutcome,
}: {
  outcomes: OutcomeBucket[];
  buckets: BucketResult[];
  lifeMax: number;
  canRemove: boolean;
  onSetOutcome: (id: string, patch: Partial<OutcomeBucket>) => void;
  onAddOutcome: () => void;
  onRemoveOutcome: (id: string) => void;
}) {
  const totalShare = outcomes.reduce((s, o) => s + o.share, 0);
  const shareOk = Math.abs(totalShare - 1) <= 0.005;

  const totalCapital = buckets.reduce((s, b) => s + b.capitalInvested, 0);
  const totalExit = buckets.reduce((s, b) => s + b.exitValue, 0);

  const headerStyle: React.CSSProperties = {
    fontSize: "10px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#94a3b8",
    padding: "0 4px 8px",
  };

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
        Portfolio Outcomes
        <Tip
          tip={
            <>
              <strong>Portfolio outcomes.</strong> Define how your portfolio
              companies perform. Each bucket represents a group of companies with
              similar outcomes. Shares must sum to 100%. The model distributes
              your investments across these buckets to compute total returns.
            </>
          }
          below
        />
      </div>

      {!shareOk && (
        <div
          style={{
            fontSize: "12px",
            color: "#b45309",
            marginBottom: "12px",
            padding: "8px 12px",
            background: "linear-gradient(135deg, rgba(250,204,21,0.12), rgba(251,191,36,0.06))",
            border: "1px solid rgba(250,204,21,0.35)",
            borderRadius: "6px",
          }}
        >
          Shares sum to {(totalShare * 100).toFixed(1)}%, not 100%.
        </div>
      )}

      {/* Table header */}
      <div
        className="grid items-end"
        style={{
          gridTemplateColumns: "minmax(100px,1fr) 70px 70px 65px 90px 90px 32px",
          borderBottom: "1px solid #e2e8f0",
          gap: "0.5rem",
        }}
      >
        <div style={headerStyle}>Outcome</div>
        <div style={{ ...headerStyle, textAlign: "right" }}>
          <span className="flex items-center justify-end">
            Share
            <Tip
              tip={
                <>
                  <strong>Share %.</strong> What fraction of your portfolio
                  falls into this outcome bucket. Must sum to 100% across all
                  buckets.
                </>
              }
            />
          </span>
        </div>
        <div style={{ ...headerStyle, textAlign: "right" }}>
          <span className="flex items-center justify-end">
            Multiple
            <Tip
              tip={
                <>
                  <strong>Exit multiple.</strong> Return multiple on invested
                  capital for companies in this bucket. A 0x means total loss;
                  10x means the company returns 10x the capital invested in it.
                </>
              }
            />
          </span>
        </div>
        <div style={{ ...headerStyle, textAlign: "right" }}>
          <span className="flex items-center justify-end">
            Exit yr
            <Tip
              tip={
                <>
                  <strong>Exit year.</strong> When companies in this bucket
                  return capital. Earlier exits improve IRR; later exits produce
                  a deeper J-curve. Must be within fund life.
                </>
              }
            />
          </span>
        </div>
        <div style={{ ...headerStyle, textAlign: "right" }}>Capital</div>
        <div style={{ ...headerStyle, textAlign: "right" }}>Exit value</div>
        <div style={headerStyle}></div>
      </div>

      {/* Rows */}
      {outcomes.map((o, i) => {
        const b = buckets[i];
        return (
          <div
            key={o.id}
            className="grid items-center"
            style={{
              gridTemplateColumns:
                "minmax(100px,1fr) 70px 70px 65px 90px 90px 32px",
              padding: "6px 0",
              borderBottom: "1px solid #f1f5f9",
              gap: "0.5rem",
            }}
          >
            <input
              value={o.label}
              onChange={(e) => onSetOutcome(o.id, { label: e.target.value })}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "13px",
                color: "#111827",
                padding: "4px",
                outline: "none",
                width: "100%",
              }}
            />
            <NumberInput
              value={o.share}
              onChange={(v) => onSetOutcome(o.id, { share: v })}
              variant="pct"
              min={0}
              max={1}
            />
            <NumberInput
              value={o.multiple}
              onChange={(v) => onSetOutcome(o.id, { multiple: v })}
              variant="decimal"
              min={0}
              step={0.5}
            />
            <NumberInput
              value={o.exitYear}
              onChange={(v) => onSetOutcome(o.id, { exitYear: v })}
              variant="int"
              min={1}
              max={lifeMax}
            />
            <div
              className="tabular"
              style={{
                fontSize: "12px",
                color: "#64748b",
                textAlign: "right",
                paddingRight: "4px",
              }}
            >
              {b ? fmtMoneyCompact(b.capitalInvested) : "\u2014"}
            </div>
            <div
              className="tabular"
              style={{
                fontSize: "12px",
                color: "#64748b",
                textAlign: "right",
                paddingRight: "4px",
              }}
            >
              {b ? fmtMoneyCompact(b.exitValue) : "\u2014"}
            </div>
            <button
              onClick={() => onRemoveOutcome(o.id)}
              disabled={!canRemove}
              style={{
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                background: "transparent",
                color: canRemove ? "#94a3b8" : "#e2e8f0",
                cursor: canRemove ? "pointer" : "default",
                fontSize: "16px",
                borderRadius: "4px",
              }}
              title="Remove outcome"
            >
              &times;
            </button>
          </div>
        );
      })}

      {/* Totals row */}
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns:
            "minmax(100px,1fr) 70px 70px 65px 90px 90px 32px",
          padding: "8px 0 0",
          borderTop: "1px solid #e2e8f0",
          marginTop: "4px",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          Total
        </div>
        <div
          className="tabular"
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: shareOk ? "#475569" : "#b45309",
            textAlign: "right",
            paddingRight: "4px",
          }}
        >
          {(totalShare * 100).toFixed(0)}%
        </div>
        <div></div>
        <div></div>
        <div
          className="tabular"
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#475569",
            textAlign: "right",
            paddingRight: "4px",
          }}
        >
          {fmtMoneyCompact(totalCapital)}
        </div>
        <div
          className="tabular"
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#475569",
            textAlign: "right",
            paddingRight: "4px",
          }}
        >
          {fmtMoneyCompact(totalExit)}
        </div>
        <div></div>
      </div>

      {/* Add button */}
      <button
        onClick={onAddOutcome}
        style={{
          marginTop: "12px",
          fontSize: "12px",
          fontWeight: 500,
          color: "#2563eb",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        + Add outcome
      </button>
    </div>
  );
}
