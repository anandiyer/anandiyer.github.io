import { useEffect, useMemo, useReducer } from "react";
import { DEFAULT_INPUTS } from "./model/defaults";
import { runModel } from "./model/engine";
import type { FundInputs, OutcomeBucket } from "./model/types";
import { loadInputs, saveInputs } from "./lib/storage";
import { readHashInputs, writeHashInputs } from "./lib/url";

type Action =
  | { type: "set"; patch: Partial<FundInputs> }
  | { type: "setOutcome"; id: string; patch: Partial<OutcomeBucket> }
  | { type: "addOutcome" }
  | { type: "removeOutcome"; id: string }
  | { type: "replace"; inputs: FundInputs }
  | { type: "reset" };

function reducer(state: FundInputs, action: Action): FundInputs {
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
      return { ...DEFAULT_INPUTS, outcomes: DEFAULT_INPUTS.outcomes.map((o) => ({ ...o })) };
  }
}

function initial(): FundInputs {
  const fromHash = readHashInputs();
  if (fromHash) return fromHash;
  const fromStorage = loadInputs();
  if (fromStorage) return fromStorage;
  return { ...DEFAULT_INPUTS, outcomes: DEFAULT_INPUTS.outcomes.map((o) => ({ ...o })) };
}

export function useFundStore() {
  const [inputs, dispatch] = useReducer(reducer, undefined, initial);
  const result = useMemo(() => runModel(inputs), [inputs]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      saveInputs(inputs);
      writeHashInputs(inputs);
    }, 250);
    return () => window.clearTimeout(id);
  }, [inputs]);

  return { inputs, result, dispatch };
}
