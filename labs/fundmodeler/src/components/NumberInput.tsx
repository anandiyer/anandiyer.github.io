import { useState, useEffect, useRef } from "react";

type Variant = "money" | "pct" | "int" | "decimal" | "year";

export function NumberInput({
  value,
  onChange,
  variant = "decimal",
  min,
  max,
  step,
  label,
  prefix,
  suffix,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  variant?: Variant;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const toDisplay = (v: number) => {
    switch (variant) {
      case "money":
        return String(Math.round(v));
      case "pct":
        return String(parseFloat((v * 100).toFixed(4)));
      case "int":
      case "year":
        return String(Math.round(v));
      case "decimal":
        return String(v);
    }
  };

  const fromDisplay = (s: string): number => {
    const n = parseFloat(s);
    if (Number.isNaN(n)) return value;
    switch (variant) {
      case "pct":
        return n / 100;
      default:
        return n;
    }
  };

  const clamp = (n: number) => {
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return v;
  };

  const [display, setDisplay] = useState(() => toDisplay(value));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) {
      setDisplay(toDisplay(value));
    }
  }, [value, focused]);

  const commit = () => {
    const raw = fromDisplay(display);
    const clamped = clamp(raw);
    onChange(clamped);
    setDisplay(toDisplay(clamped));
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    paddingLeft: prefix ? "24px" : "8px",
    paddingRight: suffix ? "28px" : "8px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "13px",
    fontVariantNumeric: "tabular-nums",
    outline: "none",
    backgroundColor: "#fff",
    transition: "border-color 0.15s, box-shadow 0.15s",
    ...(focused
      ? {
          borderColor: "#2563eb",
          boxShadow: "0 0 0 2px rgba(37,99,235,0.15)",
        }
      : {}),
  };

  return (
    <div className={className}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: 500,
            color: "#64748b",
            marginBottom: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: "relative" }}>
        {prefix && (
          <span
            style={{
              position: "absolute",
              left: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "13px",
              color: "#94a3b8",
              pointerEvents: "none",
            }}
          >
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          type="number"
          value={display}
          step={step}
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onChange={(e) => setDisplay(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit();
              inputRef.current?.blur();
            }
          }}
        />
        {suffix && (
          <span
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "13px",
              color: "#94a3b8",
              pointerEvents: "none",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
