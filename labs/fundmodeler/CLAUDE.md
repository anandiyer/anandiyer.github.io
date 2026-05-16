# canonical-fund-modeler — Project notes

## What this is

A free, browser-only fund-modeling tool for VC GPs. Lives at `fundmodeler.canonical.cc`. Reference: Carta's Fund Forecasting tool.

## Stack

- Vite + React 19 + TypeScript + Tailwind v4
- Recharts for the J-curve
- Vitest for engine tests
- Deploys static to GitHub Pages on push to `main`

## Architecture

- **`src/model/engine.ts`** is the single source of truth for fund math. Pure function, no React. **All math changes go here.** Update `engine.test.ts` for any new behavior.
- **`src/model/types.ts`** — `FundInputs` is versioned (`SCENARIO_SCHEMA_VERSION`). Bump it on any breaking change so old URL-hash scenarios don't load garbage.
- **`src/store.ts`** — single `useReducer` store. Don't add Zustand/Redux/etc. unless we hit a real complexity wall.
- **`src/lib/url.ts`** — scenario encode/decode for URL sharing. Hash format: `#s=<base64url(JSON.stringify(FundInputs))>`.
- **`src/lib/storage.ts`** — localStorage with schema-version gating.

## Conventions

- Numbers in the UI: use `tabular` class (font-variant-numeric: tabular-nums) and the helpers in `src/lib/format.ts`. Never hand-format money/percentages inline.
- Inputs: percentages are stored as decimals (0.20 not 20). The `NumberInput` with `variant="pct"` displays as 20 and persists as 0.2.
- Outcome bucket shares must sum to 1 (100%). UI warns if not; engine warns too. Don't enforce — let the user explore.
- `runModel` should always return a complete result, even with garbage inputs. Use `clamp` and `safeDiv` from `engine.ts`. Append to `warnings[]` for anything off.

## Aesthetic

- Adapts canonical.cc tokens for a data-tool context. Navy (`#1e3a8a`) is the brand color, used only in the header.
- Body is warm off-white (`#fafaf7`), not pure white — easier on the eyes for dense tables.
- Inter (free, similar to Aeonik). If Anand obtains an Aeonik license, swap via the `--font-sans` token in `src/index.css`.
- Light font weights (300–400) carry the canonical editorial feel. Numbers can be heavier (kpi-num class uses regular weight with tight tracking).

## Testing

- `npm test` runs vitest on the engine. Engine tests are the only tests for now.
- For UI, manual QA via `npm run dev`.

## Deploy

- `.github/workflows/deploy.yml` is the source of truth. On push to `main`: runs tests, builds, publishes to Pages.
- `public/CNAME` must contain `fundmodeler.canonical.cc` exactly. Do not remove.
- DNS: CNAME `fundmodeler` → `<gh-user>.github.io.` at the registrar. Once.
