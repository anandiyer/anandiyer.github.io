import type { FundInputs } from "../model/types";
import { SCENARIO_SCHEMA_VERSION } from "../model/types";

function toBase64Url(s: string): string {
  const b64 = typeof window === "undefined" ? Buffer.from(s).toString("base64") : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return typeof window === "undefined"
    ? Buffer.from(padded, "base64").toString("utf-8")
    : decodeURIComponent(escape(atob(padded)));
}

export function encodeInputs(inputs: FundInputs): string {
  return toBase64Url(JSON.stringify(inputs));
}

export function decodeInputs(encoded: string): FundInputs | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schemaVersion !== SCENARIO_SCHEMA_VERSION) return null;
    return parsed as FundInputs;
  } catch {
    return null;
  }
}

export function readHashInputs(): FundInputs | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash.startsWith("#s=")) return null;
  return decodeInputs(hash.slice(3));
}

export function writeHashInputs(inputs: FundInputs): void {
  if (typeof window === "undefined") return;
  const next = `#s=${encodeInputs(inputs)}`;
  if (window.location.hash === next) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
}
