# canonical · fundmodeler

A free fund-modeling tool for VC GPs. Live at **[fundmodeler.canonical.cc](https://fundmodeler.canonical.cc)**.

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

## Deployment (GitHub Pages, one-time setup)

This repo deploys to `fundmodeler.canonical.cc` automatically on push to `main`.

**One-time setup after creating the GitHub repo:**

1. **Repo settings → Pages → Source:** select **GitHub Actions**.
2. **Repo settings → Pages → Custom domain:** enter `fundmodeler.canonical.cc` and click Save. (The `public/CNAME` file in this repo already declares it; this step triggers HTTPS cert provisioning.)
3. **DNS at your registrar** (one record):
   ```
   Type:  CNAME
   Name:  fundmodeler
   Value: <your-github-username>.github.io.
   TTL:   3600 (or registrar default)
   ```
   Propagation: 5–60 min. HTTPS becomes available ~15 min after DNS resolves.
4. Push to `main`. The Action runs tests, builds, and publishes.

After that, every push to `main` redeploys automatically.

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
