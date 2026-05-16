const compactUSD = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
  style: "currency",
  currency: "USD",
});
const fullUSD = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "USD",
});

export function fmtMoneyCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) < 1000) return fullUSD.format(n);
  return compactUSD.format(n);
}

export function fmtMoney(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return fullUSD.format(n);
}

export function fmtPct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtMultiple(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}×`;
}

export function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function fmtDecimal(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}
