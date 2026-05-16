import { useEffect, useState } from "react";

type Variant = "money" | "pct" | "int" | "decimal" | "year";

type Props = {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
  variant?: Variant;
  step?: number;
  min?: number;
  max?: number;
};

function toDisplay(raw: number, variant: Variant): string {
  if (!Number.isFinite(raw)) return "";
  if (variant === "pct") return (raw * 100).toString();
  if (variant === "int" || variant === "year") return Math.round(raw).toString();
  return raw.toString();
}

function parse(value: string, variant: Variant): number | null {
  const cleaned = value.replace(/[,\s_]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return null;
  if (variant === "pct") return n / 100;
  return n;
}

export function NumberInput({
  label,
  hint,
  value,
  onChange,
  variant = "decimal",
  step,
  min,
  max,
}: Props) {
  const [text, setText] = useState(() => toDisplay(value, variant));

  useEffect(() => {
    const externallyChanged = toDisplay(value, variant);
    if (externallyChanged !== text) {
      const parsed = parse(text, variant);
      if (parsed === null || Math.abs((parsed ?? 0) - value) > 1e-9) {
        setText(externallyChanged);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, variant]);

  const commit = (raw: string) => {
    const parsed = parse(raw, variant);
    if (parsed === null) return;
    let n = parsed;
    if (typeof min === "number") n = Math.max(min, n);
    if (typeof max === "number") n = Math.min(max, n);
    onChange(n);
  };

  const prefix = variant === "money" ? "$" : null;
  const suffix = variant === "pct" ? "%" : null;

  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-ink-soft font-medium">{label}</span>
        {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
      </div>
      <div className="mt-1 flex items-center rounded-md border border-rule bg-white focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 transition">
        {prefix && (
          <span className="pl-2.5 text-ink-faint text-sm select-none">{prefix}</span>
        )}
        <input
          type="text"
          inputMode="decimal"
          className="tabular w-full bg-transparent px-2.5 py-1.5 text-sm text-ink-strong outline-none"
          value={text}
          step={step}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
          onBlur={(e) => {
            commit(e.target.value);
            setText(toDisplay(value, variant));
          }}
        />
        {suffix && (
          <span className="pr-2.5 text-ink-faint text-sm select-none">{suffix}</span>
        )}
      </div>
    </label>
  );
}
