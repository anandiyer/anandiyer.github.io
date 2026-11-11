import { useEffect, useMemo, useReducer } from "react";
import { DEFAULT_INPUTS } from "./model/defaults";
import { runModel } from "./model/engine";
import type { FundInputs, OutcomeBucket } from "./model/types";
import { loadWorkspace, saveWorkspace } from "./lib/storage";
import { readHashWorkspace, writeHashWorkspace } from "./lib/url";

export type Slot = "a" | "b";

/** Edits to one scenario's inputs. Dispatched against whichever scenario is active. */
type InputAction =
  | { type: "set"; patch: Partial<FundInputs> }
  | { type: "setOutcome"; id: string; patch: Partial<OutcomeBucket> }
  | { type: "addOutcome" }
  | { type: "removeOutcome"; id: string }
  | { type: "replace"; inputs: FundInputs }
  | { type: "reset" };

/** Workspace-level actions: managing scenario A and the optional comparison scenario B. */
type WorkspaceAction =
  | { type: "select"; slot: Slot }
  | { type: "addB" } // create B as a copy of A and switch to it
  | { type: "removeB" }
  | { type: "copyAtoB" }
  | { type: "swap" };

export type Action = InputAction | WorkspaceAction;

export type WorkspaceState = {
  a: FundInputs;
  b: FundInputs | null;
  active: Slot;
};

function freshDefaults(): FundInputs {
  return { ...DEFAULT_INPUTS, outcomes: DEFAULT_INPUTS.outcomes.map((o) => ({ ...o })) };
}

function clone(inputs: FundInputs): FundInputs {
  return { ...inputs, outcomes: inputs.outcomes.map((o) => ({ ...o })) };
}

function inputsReducer(state: FundInputs, action: InputAction): FundInputs {
  switch (action.type) {
    case "set":
      return { ...state, ...action.patch };
    case "setOutcome":
      return {
        ...state,
        outcomes: state.outcomes.map((o) =>
          o.id === action.id ? { ...o, ...action.patch } : o
        ),
      };
    case "addOutcome": {
      const newId = `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      return {
        ...state,
        outcomes: [
          ...state.outcomes,
          {
            id: newId,
            label: "New outcome",
            share: 0.05,
            multiple: 2,
            exitYear: Math.max(2, Math.min(state.fundLife, 7)),
          },
        ],
      };
    }
    case "removeOutcome": {
      if (state.outcomes.length <= 1) return state;
      return {
        ...state,
        outcomes: state.outcomes.filter((o) => o.id !== action.id),
      };
    }
    case "replace":
      return action.inputs;
    case "reset":
      return freshDefaults();
  }
}

export function workspaceReducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "select":
      if (action.slot === "b" && !state.b) return state;
      return { ...state, active: action.slot };
    case "addB":
      return {
        ...state,
        b: { ...clone(state.a), fundName: `${state.a.fundName} (alt)` },
        active: "b",
      };
    case "removeB":
      return { ...state, b: null, active: "a" };
    case "copyAtoB":
      if (!state.b) return state;
      return { ...state, b: { ...clone(state.a), fundName: state.b.fundName } };
    case "swap":
      if (!state.b) return state;
      return { a: state.b, b: state.a, active: state.active === "a" ? "b" : "a" };
    case "reset":
      // Reset clears the comparison too, returning to a single default scenario.
      return { a: freshDefaults(), b: null, active: "a" };
    default: {
      const slot = state.active === "b" && state.b ? "b" : "a";
      const current = slot === "b" ? (state.b as FundInputs) : state.a;
      return { ...state, [slot]: inputsReducer(current, action) };
    }
  }
}

function initial(): WorkspaceState {
  const fromHash = readHashWorkspace();
  if (fromHash) return { a: fromHash.a, b: fromHash.b, active: "a" };
  const fromStorage = loadWorkspace();
  if (fromStorage) return { a: fromStorage.a, b: fromStorage.b, active: "a" };
  return { a: freshDefaults(), b: null, active: "a" };
}

export function useFundStore() {
  const [state, dispatch] = useReducer(workspaceReducer, undefined, initial);
  const resultA = useMemo(() => runModel(state.a), [state.a]);
  const resultB = useMemo(() => (state.b ? runModel(state.b) : null), [state.b]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      saveWorkspace({ a: state.a, b: state.b });
      writeHashWorkspace({ a: state.a, b: state.b });
    }, 250);
    return () => window.clearTimeout(id);
  }, [state.a, state.b]);

  const active: Slot = state.active === "b" && state.b ? "b" : "a";
  const inputs = active === "b" ? (state.b as FundInputs) : state.a;
  const result = active === "b" && resultB ? resultB : resultA;

  return { state, active, inputs, result, resultA, resultB, dispatch };
}
