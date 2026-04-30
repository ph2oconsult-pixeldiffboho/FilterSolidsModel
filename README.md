# SHC Comparison Tool — Dual & Triple Media RGFs

A focused web app for **comparing two design scenarios** for rapid gravity filters using the Solids Holding Capacity (SHC) model. Built for process engineers and designers — not for daily plant operations.

Built as a Next.js app — fully static / client-side, no backend. Deploys to Vercel in one click.

## What it does

A single-page comparison interface with:

- **Preset comparisons** — one-click setup for common design questions: alum vs ferric, alum vs PACl, conventional vs direct filtration, dual vs triple media, lime softening vs coagulation, summer vs winter, low vs high filtration rate, with vs without polymer.
- **Side-by-side bar chart** of the four key metrics: SHC_a, SHC_v, run length, UFRV.
- **Delta panel** — each output metric with absolute and percentage difference, colour-coded for direction (green = better, red = worse, grey = neutral). Highlights when the binding constraint changes between scenarios — a major design signal.
- **Two full input panels** below — every variable in the model can be edited per scenario (filter geometry, operation, full influent solids decomposition by chemical).
- **Editable scenario labels** for clean reporting.
- **Swap and reset** buttons for quick iteration.

Everything is reactive — change any input and chart, deltas, and result panels update instantly. All calculations run locally in the browser.

## Model basis

Implements the equations in `Solids Holding Capacity Model for Dual and Triple Media RGFs — v2`:

- Master equation: `SHC_a = η · (C_in − C_eff) · UFRV × 10⁻³`
- Three independent run-length predictions: head-loss limited (linear `dh/dUFRV` model), breakthrough limited (critical specific deposit σ_b), and time limited (t_max). The smallest governs.
- C_in is decomposed into individual solids (Al(OH)₃, PACl, Fe(OH)₃, CaCO₃, Ca(OH)₂, Mg(OH)₂, silt, algal organics) via stoichiometric yields from coagulant/lime doses plus turbidity-equivalent solids.
- Composition-weighted parameters: harmonic mean for ρ_d (deposit density), mass-weighted for σ_b and k_h.
- Temperature correction on k_h via viscosity ratio.

See the source: `lib/shc.ts`.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

### Option A — One click (recommended)

1. Push this folder to a GitHub repository.
2. Go to https://vercel.com/new and import the repo.
3. Vercel auto-detects Next.js. Click **Deploy**. No environment variables needed.

### Option B — Vercel CLI

```bash
npm install -g vercel
vercel         # follow prompts for first deploy
vercel --prod  # production deploy
```

That's it — the app is fully client-side so there's nothing else to configure.

## File structure

```
app/
  layout.tsx       Root layout
  page.tsx         Main page (single-view comparison)
  globals.css      Tailwind + minor tweaks
components/
  ui.tsx           Card, NumField, Select, Stat, SectionTitle
  InputPanel.tsx   The input form (filter, operation, C_in build-up)
  ResultPanel.tsx  Output stats display
  DeltaPanel.tsx   B - A delta table with binding-change alert
  CompareTab.tsx   Top-level comparison view (chart, delta, two scenarios)
  presets.ts       Eight preset design comparisons
lib/
  shc.ts           Pure-TS implementation of the SHC model
```

## Customising

- **Solids properties** — edit `SOLIDS` in `lib/shc.ts` to calibrate `rho_d`, `sigma_b`, `k_h` for site-specific data.
- **Presets** — append to `PRESET_PAIRS` in `components/presets.ts` to add new comparisons.

## Limitations

The model is a single-zone deposit accumulator (lumped, not depth-resolved). For depth-resolved Iwasaki simulation, the linear `dh/dUFRV` term would need replacing with a numerical solve of `∂C/∂z = -λ(σ)·C` and `∂σ/∂t = λ·v·C` — straightforward to add but not necessary for design-scale comparisons.

The default property values are engineering midpoints from the literature; site calibration against pilot or full-scale data is recommended for design work.

## License

MIT
