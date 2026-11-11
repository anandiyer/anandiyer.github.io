import type { FundInputs } from "../model/types";
import { SCENARIO_SCHEMA_VERSION } from "../model/types";

const KEY = "fundmodeler:current";

export function saveInputs(inputs: FundInputs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(inputs));
  } catch {
    /* noop — quota or private mode */
  }
}

export function loadInputs(): FundInputs | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== SCENARIO_SCHEMA_VERSION) return null;
    return parsed as FundInputs;
  } catch {
    return null;
  }
}

export function clearInputs(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

const WS_KEY = "fundmodeler:workspace";

export type StoredWorkspace = { a: FundInputs; b: FundInputs | null };

export function saveWorkspace(ws: StoredWorkspace): void {
  try {
    localStorage.setItem(WS_KEY, JSON.stringify(ws));
    localStorage.setItem(KEY, JSON.stringify(ws.a)); // keep the single-scenario key current
  } catch {
    /* noop — quota or private mode */
  }
}

export function loadWorkspace(): StoredWorkspace | null {
  try {
    const raw = localStorage.getItem(WS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const okA = parsed?.a?.schemaVersion === SCENARIO_SCHEMA_VERSION;
      const okB = parsed?.b == null || parsed.b.schemaVersion === SCENARIO_SCHEMA_VERSION;
      if (okA) return { a: parsed.a as FundInputs, b: okB ? (parsed.b as FundInputs | null) : null };
    }
  } catch {
    /* fall through */
  }
  const single = loadInputs();
  return single ? { a: single, b: null } : null;
}

export function clearWorkspace(): void {
  try {
    localStorage.removeItem(WS_KEY);
  } catch {
    /* noop */
  }
}
