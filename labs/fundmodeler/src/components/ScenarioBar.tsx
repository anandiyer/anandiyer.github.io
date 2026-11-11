import type { FundInputs } from "../model/types";
import type { Slot } from "../store";
import { Tip } from "./Tooltip";
import { SCENARIO_COLORS } from "../lib/scenarioColors";


const tabBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.2)",
  cursor: "pointer",
  transition: "all 0.15s",
  maxWidth: "280px",
};

const linkBtn: React.CSSProperties = {
  fontSize: "12px",
  padding: "6px 10px",
  borderRadius: "6px",
  border: "none",
  background: "transparent",
  color: "rgba(255,255,255,0.7)",
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
};

function Tab({
  slot,
  name,
  active,
  onClick,
}: {
  slot: Slot;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        ...tabBase,
        background: active ? "#fff" : "rgba(255,255,255,0.08)",
        color: active ? "#111827" : "rgba(255,255,255,0.8)",
        borderColor: active ? "#fff" : "rgba(255,255,255,0.2)",
      }}
    >
      <span
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "3px",
          background: SCENARIO_COLORS[slot],
          flexShrink: 0,
        }}
      />
      <span style={{ fontWeight: 600 }}>{slot.toUpperCase()}</span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontWeight: 400,
        }}
      >
        {name}
      </span>
    </button>
  );
}

export function ScenarioBar({
  a,
  b,
  active,
  onSelect,
  onAddB,
  onRemoveB,
  onCopyAtoB,
  onSwap,
}: {
  a: FundInputs;
  b: FundInputs | null;
  active: Slot;
  onSelect: (slot: Slot) => void;
  onAddB: () => void;
  onRemoveB: () => void;
  onCopyAtoB: () => void;
  onSwap: () => void;
}) {
  if (!b) {
    // Single-scenario mode: keep the original experience; just offer a quiet entry point.
    return (
      <div className="flex items-center" style={{ marginTop: "-1rem", marginBottom: "1.5rem", gap: "0.25rem" }}>
        <button
          onClick={onAddB}
          style={{ ...linkBtn, paddingLeft: 0, color: "rgba(255,255,255,0.8)" }}
        >
          + Compare with a second scenario
        </button>
        <Tip
          tip={
            <>
              <strong>Compare scenarios.</strong> Adds a scenario B, starting
              as a copy of this fund, so you can change one thing (reserves,
              check size, # of investments) and see A vs B side by side. Share
              link captures both.
            </>
          }
          below
          alignLeft
        />
      </div>
    );
  }
  return (
    <div style={{ marginBottom: "2rem" }}>
      <div
        className="flex flex-wrap items-center"
        style={{ gap: "0.5rem" }}
        role="group"
        aria-label="Scenarios"
      >
        <Tab slot="a" name={a.fundName} active={active === "a"} onClick={() => onSelect("a")} />
        {b ? (
          <Tab slot="b" name={b.fundName} active={active === "b"} onClick={() => onSelect("b")} />
        ) : (
          <button
            onClick={onAddB}
            style={{
              ...tabBase,
              background: "transparent",
              color: "rgba(255,255,255,0.85)",
              borderStyle: "dashed",
            }}
          >
            + Compare with scenario B
          </button>
        )}
        <Tip
          tip={
            <>
              <strong>Scenarios.</strong> Model two versions of a fund side by
              side, e.g. many small checks vs. a concentrated portfolio, or 20%
              vs. 50% reserves. Scenario B starts as a copy of A. The inputs
              below edit whichever scenario is selected. Share link captures
              both.
            </>
          }
          below
          alignLeft
        />
        {b && (
          <div className="flex flex-wrap items-center" style={{ gap: "0.25rem", marginLeft: "auto" }}>
            <button style={linkBtn} onClick={onSwap}>
              Swap A ↔ B
            </button>
            <button style={linkBtn} onClick={onCopyAtoB}>
              Reset B to A
            </button>
            <button
              style={linkBtn}
              onClick={() => {
                if (window.confirm(`Remove scenario B (${b.fundName})?`)) onRemoveB();
              }}
            >
              Remove B
            </button>
          </div>
        )}
      </div>
      {b && (
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "0.6rem" }}>
          Editing scenario {active.toUpperCase()}. Click a tab to switch.
        </div>
      )}
    </div>
  );
}
