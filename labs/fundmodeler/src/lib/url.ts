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

/* ---------- Two-scenario workspace (A vs B) ----------
 * Hash format: `#s=<A>` (single scenario, the original format — old links keep working)
 * or `#s=<A>&b=<B>` when a comparison scenario exists. Both payloads are
 * base64url(JSON) and contain no `&` or `=`, so they split cleanly. */

export type Workspace = { a: FundInputs; b: FundInputs | null };

export function encodeWorkspace(ws: Workspace): string {
  const parts = [`s=${encodeInputs(ws.a)}`];
  if (ws.b) parts.push(`b=${encodeInputs(ws.b)}`);
  return `#${parts.join("&")}`;
}

export function decodeWorkspace(hash: string): Workspace | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const params = new Map<string, string>();
  for (const part of raw.split("&")) {
    const i = part.indexOf("=");
    if (i > 0) params.set(part.slice(0, i), part.slice(i + 1));
  }
  const s = params.get("s");
  if (!s) return null;
  const a = decodeInputs(s);
  if (!a) return null;
  const bRaw = params.get("b");
  const b = bRaw ? decodeInputs(bRaw) : null;
  return { a, b };
}

export function readHashWorkspace(): Workspace | null {
  if (typeof window === "undefined") return null;
  return decodeWorkspace(window.location.hash);
}

export function writeHashWorkspace(ws: Workspace): void {
  if (typeof window === "undefined") return;
  const next = encodeWorkspace(ws);
  if (window.location.hash === next) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
}
