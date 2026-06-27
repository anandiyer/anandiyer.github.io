# canonical · fundmodeler

A free fund-modeling tool for VC GPs. Live at **[canonical.cc/labs/fundmodeler](https://canonical.cc/labs/fundmodeler/)**.

Built by [Canonical](https://canonical.cc).

## What it does

Type your fund parameters — size, check sizes, reserves, outcome distribution — and get:

- Net & gross TVPI, DPI, MOIC, IRR
- J-curve over the fund's life
- Year-by-year cash flow (calls, fees, deployments, distributions, NAV)
- Portfolio outcome contribution (which buckets drive returns)
- Reserve adequacy check

Scenarios save to your browser and share via URL. No accounts, no backend, no tracking.

## Local development

```bash
npm install
npm run dev          # localhost:5173
npm test             # vitest on the math engine
npm run build        # static dist/
```

## Deployment

The SPA is built and merged into the canonical.cc Jekyll site by the repo-root workflow at `.github/workflows/deploy.yml`. On push to `master`, that workflow:

1. Builds the Jekyll site to `_site/`.
2. Runs `npm ci && npm test && npm run build` in this directory, producing `labs/fundmodeler/dist/`.
3. Copies `dist/*` into `_site/labs/fundmodeler/`.
4. Uploads `_site/` as the Pages artifact and deploys.

Vite is configured with `base: '/labs/fundmodeler/'` so the built asset paths resolve under that subpath.

**One-time setup, the first time this workflow ships:**

1. **Repo Settings → Pages → Build and deployment → Source:** switch from "Deploy from a branch" to "GitHub Actions". (Until you toggle this, the workflow file exists but Pages keeps building from `master` directly via the legacy Jekyll build, so the SPA won't be merged in.)
2. **Cloudflare:** remove the page rule that 301-redirects `canonical.cc/labs/fundmodeler/*` → `fundmodeler.canonical.cc/*`. With this gone, the same path now serves directly from the Jekyll deployment.
3. (Optional) The legacy `canonical-fund-modeler` repo can be archived — it's no longer the source of truth.

## Architecture

- **Vite + React + TypeScript + Tailwind v4** — pure static SPA, no server.
- **`src/model/engine.ts`** — single source of truth for fund math. Pure function `runModel(inputs) → result`. Fully unit-tested.
- **`src/store.ts`** — single `useReducer` store. Debounces saves to `localStorage` and writes a `#s=<base64>` URL hash for sharing.
- **No backend, no auth, no tracking.** All scenarios live in the browser.

## Math notes

- **European waterfall carry**: paid only after cumulative distributions exceed cumulative called capital, then on the marginal profit per year.
- **Mgmt fees**: charged flat on committed capital across the full fund life. Toggle `recycleFees` to recycle fees back into deployable capital (v1 approximation).
- **NAV**: present value of bucket exits scheduled after year Y, net of pro-rata carry.
- **IRR**: Newton-Raphson with bisection fallback.

See `src/model/engine.test.ts` for the sanity tests.

## Roadmap

- Multi-scenario comparison (side-by-side)
- Monte Carlo over outcome buckets
- American (deal-by-deal) carry waterfall
- Hurdle rate + GP catch-up
- Tiered carry (e.g., 20%/30% above 3x)
- LP-class differentiation
