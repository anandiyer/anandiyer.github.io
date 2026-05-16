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
