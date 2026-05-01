"use client";
import React from "react";
import { Card, CardBody, CardHeader, NumField, Select, SectionTitle } from "./ui";
import { CinComponents, FilterType, ShcInputs, SolidsKey, SolidsFraction, SOLIDS,
  defaultLeffFactor, computeCin, MediaLayer, defaultLayers, MEDIA_PROPS,
  CoagulationRegime, DOSE_CONV, UpstreamStage, LimeMode } from "@/lib/shc";

export type DoseBasis = "product" | "metal";

export interface PanelState {
  // filter
  filterType: FilterType;
  porosity: number;
  L_eff_factor: number;
  layers: MediaLayer[]; // per-layer breakdown drives totalDepth and L/d

  // operation
  velocity: number;
  C_eff: number;
  // Terminal head loss limit (m) — total filter head loss at which the run is
  // declared over. The model computes clean-bed h₀ from filter geometry and
  // subtracts it to get the floc-accumulation budget (dh = h_T − h₀).
  // Typical engineering values: 2.0 m (dual media), 2.5–3.0 m (triple media).
  h_T_total: number;
  t_max: number;
  eta: number;
  temperature: number;

  // C_in components
  c: CinComponents;

  // Coagulant dose display basis for stream A.
  // 'product' (default): doses are mg/L of supplied product (alum 14·H₂O,
  //   PACl product, FeCl₃ anhydrous) — what plants meter.
  // 'metal': doses are mg/L as the trivalent metal (Al³⁺ for alum and PACl,
  //   Fe³⁺ for ferric) — common in research and lab reporting.
  // Internally the model always stores 'product' basis; this is a display-
  // and-input toggle only.
  doseBasisA: DoseBasis;

  // Optional two-stream blend mode. When blend.enabled is true, the C_in is
  // computed as a flow-weighted blend of two streams (e.g. lime-softened well
  // water + alum-clarified surface water joining ahead of common filters).
  // Stream A is `c` above; Stream B is `blend.cB`. fractionA is 0–1.
  blend: {
    enabled: boolean;
    fractionA: number;     // 0–1 — flow share of stream A
    labelA: string;
    labelB: string;
    cB: CinComponents;     // dose set for stream B
    doseBasisB: DoseBasis; // basis for displaying / inputting stream B doses
  };

  // Optional filter area (m²) — display-only, does not affect any model
  // calculation. When set, "Plant totals" are derived from the per-area
  // results: total flow, mass captured per run, wet-gel volume per run,
  // approximate backwash water. Leave blank to keep all output specific.
  filterArea_m2?: number;

  // optional measured SHC for flagging
  measuredShcA?: number;
}

export function defaultPanelState(): PanelState {
  return {
    filterType: "dual",
    porosity: 0.45,
    L_eff_factor: 0.8,
    layers: defaultLayers("dual"),
    velocity: 8,
    C_eff: 0.15,
    h_T_total: 2.05,
    t_max: 24,
    eta: 0.99,
    temperature: 15,
    c: {
      influent_NTU: 2,
      ntu_to_mgL: 1.5,
      alum_mgL: 35,
      pacl_mgL: 0,
      ferric_mgL: 0,
      lime_caco3_mgL: 0,
      lime_mgoh2_mgL: 0,
      polymer_mgL: 0.1,
      pac_mgL: 0,
      regime: "sweep",
      lime_mode: "ca_only",
      upstream: { mode: "direct" },
    },
    doseBasisA: "product",
    blend: {
      enabled: false,
      fractionA: 0.5,
      labelA: "Stream A (clarifier)",
      labelB: "Stream B (softener)",
      cB: {
        influent_NTU: 0.5,
        ntu_to_mgL: 1.5,
        alum_mgL: 0,
        pacl_mgL: 0,
        ferric_mgL: 0,
        lime_caco3_mgL: 60,
        lime_mgoh2_mgL: 40,
        polymer_mgL: 0,
        pac_mgL: 0,
        regime: "sweep",
        lime_mode: "partial_mg",
        upstream: { mode: "direct" },
      },
      doseBasisB: "product",
    },
    measuredShcA: undefined,
  };
}

export function panelToInputs(s: PanelState): {
  inputs: ShcInputs;
  cinTotal: number;
  cinA?: number;
  cinB?: number;
  cinWarnings: string[];
} {
  const A = computeCin(s.c);

  // Compute the effective C_in and composition reaching the filter.
  // - Single stream: A directly.
  // - Blend mode: flow-weighted blend of A and B.
  let total: number;
  let fractions: SolidsFraction[];
  let polymer_mgL: number;
  let cinB: number | undefined;
  const cinWarnings: string[] = [...(A.warnings ?? [])];

  if (s.blend.enabled) {
    const B = computeCin(s.blend.cB);
    cinB = B.total;
    cinWarnings.push(...(B.warnings ?? []).map(w => `Stream B: ${w}`));
    // Tag stream A warnings as such
    for (let i = 0; i < (A.warnings?.length ?? 0); i++) {
      cinWarnings[i] = `Stream A: ${cinWarnings[i]}`;
    }
    const fA = Math.max(0, Math.min(1, s.blend.fractionA));
    const fB = 1 - fA;
    total = fA * A.total + fB * B.total;

    // Flow-weighted mass per solid type
    const mass: Record<string, number> = {};
    for (const f of A.fractions) {
      mass[f.solid] = (mass[f.solid] ?? 0) + fA * A.total * f.fraction;
    }
    for (const f of B.fractions) {
      mass[f.solid] = (mass[f.solid] ?? 0) + fB * B.total * f.fraction;
    }
    fractions = total > 0
      ? Object.entries(mass)
          .filter(([_, m]) => m > 0)
          .map(([solid, m]) => ({ solid: solid as SolidsKey, fraction: m / total }))
      : [];

    // Polymer dose at the filter is the flow-weighted average of the two streams
    polymer_mgL = fA * s.c.polymer_mgL + fB * s.blend.cB.polymer_mgL;
  } else {
    total = A.total;
    fractions = A.fractions;
    polymer_mgL = s.c.polymer_mgL;
  }

  const totalDepth = s.layers.reduce((a, l) => a + Math.max(0, l.depth), 0);
  const inputs: ShcInputs = {
    filter: {
      type: s.filterType,
      totalDepth,
      porosity: s.porosity,
      L_eff_factor: s.L_eff_factor,
      layers: s.layers,
    },
    operation: {
      velocity: s.velocity,
      C_in: total,
      C_eff: s.C_eff,
      h_T_total: s.h_T_total,
      t_max: s.t_max,
      eta: s.eta,
      temperature: s.temperature,
    },
    composition: fractions,
    polymer_mgL,
  };
  return { inputs, cinTotal: total, cinA: A.total, cinB, cinWarnings };
}

export function InputPanel({
  state, onChange, includeMeasured = false, title = "Inputs",
  lockFilterAndOperation = false,
}: {
  state: PanelState;
  onChange: (s: PanelState) => void;
  includeMeasured?: boolean;
  title?: string;
  // When true, filter geometry and operating-parameter fields are read-only.
  // Used in CompareTab when "Link filter & operation" is on for Scenario B.
  lockFilterAndOperation?: boolean;
}) {
  const set = <K extends keyof PanelState>(k: K, v: PanelState[K]) => onChange({ ...state, [k]: v });
  const setC = <K extends keyof CinComponents>(k: K, v: CinComponents[K]) =>
    onChange({ ...state, c: { ...state.c, [k]: v } });

  const onFilterTypeChange = (t: FilterType) => {
    // Reload default layers for the new type
    onChange({ ...state, filterType: t, L_eff_factor: defaultLeffFactor(t), layers: defaultLayers(t) });
  };

  const setLayer = (i: number, patch: Partial<MediaLayer>) => {
    const newLayers = state.layers.map((l, idx) => idx === i ? { ...l, ...patch } : l);
    onChange({ ...state, layers: newLayers });
  };

  const setBlend = <K extends keyof PanelState["blend"]>(k: K, v: PanelState["blend"][K]) =>
    onChange({ ...state, blend: { ...state.blend, [k]: v } });

  const setCB = <K extends keyof CinComponents>(k: K, v: CinComponents[K]) =>
    onChange({ ...state, blend: { ...state.blend, cB: { ...state.blend.cB, [k]: v } } });

  const totalDepth = state.layers.reduce((a, l) => a + Math.max(0, l.depth), 0);

  // Compute the C_in summary that will be used by the model.
  const A = computeCin(state.c);
  const B = state.blend.enabled ? computeCin(state.blend.cB) : null;
  const fA = Math.max(0, Math.min(1, state.blend.fractionA));
  const total = state.blend.enabled && B
    ? fA * A.total + (1 - fA) * B.total
    : A.total;
  // For the displayed composition use the same flow-weighted blend as
  // panelToInputs(), so the user sees exactly what feeds the model.
  const fractions: SolidsFraction[] = (() => {
    if (!state.blend.enabled || !B) return A.fractions;
    const mass: Record<string, number> = {};
    for (const f of A.fractions) mass[f.solid] = (mass[f.solid] ?? 0) + fA * A.total * f.fraction;
    for (const f of B.fractions) mass[f.solid] = (mass[f.solid] ?? 0) + (1 - fA) * B.total * f.fraction;
    return total > 0
      ? Object.entries(mass).filter(([, m]) => m > 0).map(([solid, m]) => ({ solid: solid as SolidsKey, fraction: m / total }))
      : [];
  })();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </CardHeader>
      <CardBody className="space-y-5">

        {lockFilterAndOperation && (
          <div className="bg-slate-100 border border-slate-300 rounded px-3 py-2 text-[11px] text-slate-700 flex items-start gap-2">
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <span>
              <span className="font-medium">Filter &amp; operation linked.</span> These fields mirror Scenario A — edit them there, or unlink at the top of the page to compare a different filter design. Chemistry and upstream stage stay independent.
            </span>
          </div>
        )}

        <div>
          <SectionTitle>Filter configuration</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select<FilterType>
              label="Filter type"
              value={state.filterType}
              onChange={onFilterTypeChange}
              disabled={lockFilterAndOperation}
              options={[
                { value: "dual", label: "Dual media (anthracite/sand)" },
                { value: "triple", label: "Triple media (anthracite/sand/garnet)" },
                { value: "monomedia", label: "Monomedia sand" },
              ]}
            />
            <NumField label="L_eff factor" step={0.05} min={0.4} max={1.0}
              value={state.L_eff_factor} onChange={v => set("L_eff_factor", v)}
              disabled={lockFilterAndOperation}
              hint="Depth utilisation · 0.6 mono / 0.8 dual / 0.85 triple" />
          </div>

          <div className="mt-3">
            <div className="text-xs font-medium text-slate-600 mb-1.5">
              Media layers (top → bottom)
            </div>
            <div className="space-y-2">
              {state.layers.map((layer, i) => (
                <div key={i} className={`border rounded p-2 ${lockFilterAndOperation ? "border-slate-200 bg-slate-100/40" : "border-slate-200 bg-slate-50/30"}`}>
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-3">
                      <span className="block text-[11px] font-medium text-slate-700">{layer.label}</span>
                      <span className="block text-[10px] text-slate-400">layer {i + 1}</span>
                    </div>
                    <div className="col-span-6 sm:col-span-4">
                      <NumField label="Depth" unit="m" step={0.05} min={0.05} max={3}
                        value={layer.depth} onChange={v => setLayer(i, { depth: v })}
                        disabled={lockFilterAndOperation} />
                    </div>
                    <div className="col-span-6 sm:col-span-5">
                      <NumField label="d_e" unit="mm" step={0.05} min={0.1} max={3}
                        value={layer.d_e} onChange={v => setLayer(i, { d_e: v })}
                        disabled={lockFilterAndOperation} />
                    </div>
                  </div>
                  <details className="mt-2" {...(lockFilterAndOperation ? { open: false } : {})}>
                    <summary className={`text-[11px] select-none ${lockFilterAndOperation ? "text-slate-400 cursor-not-allowed pointer-events-none" : "text-slate-500 cursor-pointer hover:text-brand"}`}>
                      Advanced properties (UC, ψ, SG, ε)
                    </summary>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pl-2 border-l-2 border-slate-200">
                      {(() => {
                        const ref = MEDIA_PROPS[layer.key];
                        const refLabel = ref.label.split(" ")[0].toLowerCase();
                        return <>
                          <NumField label="UC" step={0.05} min={1.0} max={2.5}
                            value={layer.uc} onChange={v => setLayer(i, { uc: v })}
                            disabled={lockFilterAndOperation}
                            hint={`d60/d10 · ${refLabel} ${ref.uc_range[0].toFixed(1)}–${ref.uc_range[1].toFixed(1)}`} />
                          <NumField label="Sphericity ψ" step={0.01} min={0.3} max={1.0}
                            value={layer.sphericity} onChange={v => setLayer(i, { sphericity: v })}
                            disabled={lockFilterAndOperation}
                            hint={`${refLabel} ≈ ${ref.sphericity.toFixed(2)}`} />
                          <NumField label="SG" step={0.05} min={1.0} max={5.0}
                            value={layer.sg} onChange={v => setLayer(i, { sg: v })}
                            disabled={lockFilterAndOperation}
                            hint={`${refLabel} ≈ ${ref.sg.toFixed(2)}`} />
                          <NumField label="Porosity ε" step={0.01} min={0.3} max={0.6}
                            value={layer.porosity} onChange={v => setLayer(i, { porosity: v })}
                            disabled={lockFilterAndOperation}
                            hint={`${refLabel} ≈ ${ref.porosity.toFixed(2)}`} />
                        </>;
                      })()}
                    </div>
                  </details>
                </div>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Total depth: <span className="font-medium tabular-nums text-slate-700">{totalDepth.toFixed(2)} m</span>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle>Operation</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumField label="Filtration velocity" unit="m/h" step={0.5} min={0.1} max={30}
              value={state.velocity} onChange={v => set("velocity", v)}
              disabled={lockFilterAndOperation} />
            <NumField label="Terminal head loss limit (h_T)" unit="m" step={0.1} min={0.1} max={6}
              value={state.h_T_total} onChange={v => set("h_T_total", v)}
              disabled={lockFilterAndOperation}
              hint="Total filter head loss at backwash trigger. Typical: 2.0 m dual / 2.5–3.0 m triple. Model subtracts clean-bed h₀ to get floc budget." />
            <NumField label="Filtrate target C_eff" unit="mg/L" step={0.05} min={0} max={5}
              value={state.C_eff} onChange={v => set("C_eff", v)}
              disabled={lockFilterAndOperation}
              hint="0.10 NTU ≈ 0.15 mg/L" />
            <NumField label="Max run time t_max" unit="h" step={1} min={1} max={168}
              value={state.t_max} onChange={v => set("t_max", v)}
              disabled={lockFilterAndOperation} />
            <NumField label="Removal efficiency η" step={0.01} min={0.5} max={1.0}
              value={state.eta} onChange={v => set("eta", v)}
              disabled={lockFilterAndOperation}
              hint="0.95–0.995 typical" />
            <NumField label="Water temperature" unit="°C" step={1} min={0} max={40}
              value={state.temperature} onChange={v => set("temperature", v)}
              disabled={lockFilterAndOperation}
              hint="Cold water → higher k_h" />
          </div>

          <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-2">
            <div className="text-[11px] font-medium text-amber-900 mb-1">
              Optional: filter area for plant totals
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
              <NumField label="Filter area (per cell)" unit="m²" step={1} min={0} max={500}
                value={state.filterArea_m2 ?? 0}
                onChange={v => set("filterArea_m2", v > 0 ? v : undefined)}
                disabled={lockFilterAndOperation}
                hint="Leave 0 to keep results per m² only" />
              <div className="text-[11px] text-amber-800 leading-tight">
                The model is per m² of filter area (SHC kg/m², UFRV m³/m²). Enter an area to also display plant-total flow, mass captured per run, and backwash water.
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <SectionTitle>Influent solids C_in build-up</SectionTitle>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={state.blend.enabled}
                onChange={e => setBlend("enabled", e.target.checked)}
                className="w-3 h-3 accent-brand"
              />
              Two-stream blend
            </label>
          </div>

          {state.blend.enabled && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-600 mb-1">
                    Stream A flow share: {(fA * 100).toFixed(0)} %
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={state.blend.fractionA}
                    onChange={e => setBlend("fractionA", parseFloat(e.target.value))}
                    className="w-full accent-brand"
                  />
                </div>
                <div className="text-[11px] text-slate-500">
                  Streams blend ahead of common filters. Filter sees flow-weighted average of both.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input type="text" value={state.blend.labelA} onChange={e => setBlend("labelA", e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white w-full" placeholder="Stream A label" />
                <input type="text" value={state.blend.labelB} onChange={e => setBlend("labelB", e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white w-full" placeholder="Stream B label" />
              </div>
            </div>
          )}

          {/* Stream A (always shown) */}
          {state.blend.enabled && (
            <div className="text-[11px] font-medium text-blue-800 mb-1.5">
              {state.blend.labelA} ({(fA * 100).toFixed(0)} %)
            </div>
          )}
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-2">
            <div className="text-[11px] font-medium text-amber-900 mb-1.5">
              Upstream stage — what reaches the filter
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
              <Select<UpstreamStage>
                label="Upstream stage"
                value={state.c.upstream?.mode ?? "direct"}
                onChange={v => setC("upstream", { ...(state.c.upstream ?? { mode: "direct" }), mode: v })}
                options={[
                  { value: "direct", label: "Direct / in-line filtration" },
                  { value: "clarifier", label: "Clarifier upstream (% removal)" },
                  { value: "measured_inlet", label: "Measured filter-inlet turbidity" },
                ]}
                hint={
                  (state.c.upstream?.mode ?? "direct") === "direct"
                    ? "All applied doses reach the filter (no upstream removal)."
                    : (state.c.upstream?.mode === "clarifier")
                      ? "Apply % removal to coagulant/lime/silt; polymer below is filter aid (post-clarifier)."
                      : "Settled-water turbidity is entered directly; coagulant doses ignored."
                }
              />
              {state.c.upstream?.mode === "clarifier" && (
                <NumField label="Clarifier removal" unit="%" step={1} min={0} max={100}
                  value={state.c.upstream?.removal_pct ?? 92}
                  onChange={v => setC("upstream", { mode: "clarifier", removal_pct: v })}
                  hint="Conventional clarifier 90–98%; DAF 92–98%; tube settler 88–95%" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <Select<CoagulationRegime>
              label="Coagulation regime"
              value={state.c.regime ?? "sweep"}
              onChange={v => setC("regime", v)}
              options={[
                { value: "sweep", label: "Sweep flocculation" },
                { value: "charge_neutralisation", label: "Charge neutralisation" },
              ]}
              hint="Defines floc morphology — sweep typical pH 6.5–8 / dose >10 mg/L; CN typical pH 5–6 / lower dose."
            />
            <Select<DoseBasis>
              label="Coagulant dose basis"
              value={state.doseBasisA}
              onChange={v => set("doseBasisA", v)}
              options={[
                { value: "product", label: "as product (alum-14, PACl, FeCl₃)" },
                { value: "metal",   label: "as metal (mg/L Al³⁺ or Fe³⁺)" },
              ]}
              hint={state.doseBasisA === "metal"
                ? "1 mg Al = 11.0 mg alum-14 = 18.9 mg PACl (10% Al₂O₃); 1 mg Fe = 2.90 mg FeCl₃"
                : "Switch to metal basis to compare alum, PACl, ferric on like-for-like Al³⁺ / Fe³⁺ basis"}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumField
              label={
                state.c.upstream?.mode === "measured_inlet"
                  ? "Filter-inlet turbidity (settled)"
                  : state.c.upstream?.mode === "clarifier"
                    ? "Raw water turbidity (pre-clarifier)"
                    : "Filter influent turbidity"
              }
              unit="NTU" step={0.1} min={0} max={500}
              value={state.c.influent_NTU} onChange={v => setC("influent_NTU", v)} />
            <NumField label="Turbidity → TSS" unit="mg/L per NTU" step={0.1} min={0.1} max={5}
              value={state.c.ntu_to_mgL} onChange={v => setC("ntu_to_mgL", v)}
              hint="1.0–2.5 typical" />
            {state.c.upstream?.mode !== "measured_inlet" && (<>
              {state.doseBasisA === "product" ? (
                <NumField label="Alum (14·H₂O) dose" unit="mg/L product" step={1} min={0} max={500}
                  value={state.c.alum_mgL} onChange={v => setC("alum_mgL", v)} />
              ) : (
                <NumField label="Alum dose" unit="mg/L as Al" step={0.1} min={0} max={50}
                  value={state.c.alum_mgL / DOSE_CONV.alum_mgPerMgAl}
                  onChange={v => setC("alum_mgL", v * DOSE_CONV.alum_mgPerMgAl)}
                  hint={`= ${state.c.alum_mgL.toFixed(1)} mg/L alum-14`} />
              )}
              {state.doseBasisA === "product" ? (
                <NumField label="PACl dose" unit="mg/L product" step={1} min={0} max={500}
                  value={state.c.pacl_mgL} onChange={v => setC("pacl_mgL", v)} />
              ) : (
                <NumField label="PACl dose" unit="mg/L as Al" step={0.1} min={0} max={50}
                  value={state.c.pacl_mgL / DOSE_CONV.pacl_mgPerMgAl}
                  onChange={v => setC("pacl_mgL", v * DOSE_CONV.pacl_mgPerMgAl)}
                  hint={`= ${state.c.pacl_mgL.toFixed(1)} mg/L PACl (10% Al₂O₃ basis)`} />
              )}
              {state.doseBasisA === "product" ? (
                <NumField label="Ferric chloride dose" unit="mg/L product" step={1} min={0} max={500}
                  value={state.c.ferric_mgL} onChange={v => setC("ferric_mgL", v)} />
              ) : (
                <NumField label="Ferric dose" unit="mg/L as Fe" step={0.1} min={0} max={50}
                  value={state.c.ferric_mgL / DOSE_CONV.ferric_mgPerMgFe}
                  onChange={v => setC("ferric_mgL", v * DOSE_CONV.ferric_mgPerMgFe)}
                  hint={`= ${state.c.ferric_mgL.toFixed(1)} mg/L FeCl₃`} />
              )}
            </>)}
            {state.c.upstream?.mode !== "measured_inlet" && (
              <div className="sm:col-span-2 bg-emerald-50 border border-emerald-200 rounded p-2 -mx-px">
                <div className="text-[11px] font-medium text-emerald-900 mb-1.5">
                  Lime softening (optional)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <Select<LimeMode>
                    label="Lime softening mode"
                    value={state.c.lime_mode ?? "ca_only"}
                    onChange={v => {
                      // When switching to ca_only, force Mg-path to 0
                      const next = { ...state.c, lime_mode: v };
                      if (v === "ca_only") next.lime_mgoh2_mgL = 0;
                      onChange({ ...state, c: next });
                    }}
                    options={[
                      { value: "ca_only", label: "Ca removal only (pH ~9.5–10)" },
                      { value: "partial_mg", label: "Partial Mg removal (pH 10.5–11)" },
                      { value: "excess_mg", label: "Max Mg removal / excess lime (pH 11–11.3)" },
                    ]}
                    hint={
                      state.c.lime_mode === "excess_mg"
                        ? "Excess lime — both Ca and Mg fully removed; floc has voluminous Mg(OH)₂"
                        : state.c.lime_mode === "partial_mg"
                          ? "Mid-pH softening — some Mg precipitates alongside CaCO₃"
                          : "Selective Ca softening — Mg-path stays soluble"
                    }
                  />
                  <div /> {/* spacer */}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <NumField label="Lime → CaCO₃ path" unit="mg/L lime" step={1} min={0} max={500}
                    value={state.c.lime_caco3_mgL} onChange={v => setC("lime_caco3_mgL", v)}
                    hint="Ca-hardness fraction" />
                  {(state.c.lime_mode ?? "ca_only") !== "ca_only" && (
                    <NumField label="Lime → Mg(OH)₂ path" unit="mg/L lime" step={1} min={0} max={500}
                      value={state.c.lime_mgoh2_mgL} onChange={v => setC("lime_mgoh2_mgL", v)}
                      hint="Mg path also yields CaCO₃" />
                  )}
                </div>
              </div>
            )}
            <NumField
              label={state.c.upstream?.mode === "clarifier" || state.c.upstream?.mode === "measured_inlet"
                ? "Filter aid (post-clarifier)"
                : "Polymer / coagulant aid"}
              unit="mg/L" step={0.05} min={0} max={5}
              value={state.c.polymer_mgL} onChange={v => setC("polymer_mgL", v)}
              hint={state.c.upstream?.mode === "clarifier" || state.c.upstream?.mode === "measured_inlet"
                ? "Filter aid only — dosed post-clarifier (not removed). For pre-clarifier coagulant aid, leave this 0 — the model assumes that aid leaves with clarifier sludge."
                : "Filter aid 0.01–0.1 · coag aid 0.05–0.25 · direct 0.2–2.0"} />
            {state.c.upstream?.mode !== "measured_inlet" && (
              <NumField label="Powdered AC" unit="mg/L" step={1} min={0} max={500}
                value={state.c.pac_mgL} onChange={v => setC("pac_mgL", v)} />
            )}
          </div>

          {state.blend.enabled && (
            <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 mt-2 tabular-nums">
              Stream A C_in: {A.total.toFixed(2)} mg/L (before blending)
            </div>
          )}

          {/* Stream B (blend mode only) */}
          {state.blend.enabled && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="text-[11px] font-medium text-blue-800 mb-1.5">
                {state.blend.labelB} ({((1 - fA) * 100).toFixed(0)} %)
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-2">
                <div className="text-[11px] font-medium text-amber-900 mb-1.5">
                  Upstream stage — what reaches the filter
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                  <Select<UpstreamStage>
                    label="Upstream stage"
                    value={state.blend.cB.upstream?.mode ?? "direct"}
                    onChange={v => setCB("upstream", { ...(state.blend.cB.upstream ?? { mode: "direct" }), mode: v })}
                    options={[
                      { value: "direct", label: "Direct / in-line" },
                      { value: "clarifier", label: "Clarifier upstream" },
                      { value: "measured_inlet", label: "Measured inlet turbidity" },
                    ]}
                  />
                  {state.blend.cB.upstream?.mode === "clarifier" && (
                    <NumField label="Clarifier removal" unit="%" step={1} min={0} max={100}
                      value={state.blend.cB.upstream?.removal_pct ?? 92}
                      onChange={v => setCB("upstream", { mode: "clarifier", removal_pct: v })} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <Select<CoagulationRegime>
                  label="Coagulation regime"
                  value={state.blend.cB.regime ?? "sweep"}
                  onChange={v => setCB("regime", v)}
                  options={[
                    { value: "sweep", label: "Sweep flocculation" },
                    { value: "charge_neutralisation", label: "Charge neutralisation" },
                  ]}
                />
                <Select<DoseBasis>
                  label="Coagulant dose basis"
                  value={state.blend.doseBasisB}
                  onChange={v => setBlend("doseBasisB", v)}
                  options={[
                    { value: "product", label: "as product" },
                    { value: "metal",   label: "as metal (Al³⁺ / Fe³⁺)" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumField
                  label={
                    state.blend.cB.upstream?.mode === "measured_inlet"
                      ? "Filter-inlet turbidity (settled)"
                      : state.blend.cB.upstream?.mode === "clarifier"
                        ? "Raw turbidity (pre-clarifier)"
                        : "Filter influent turbidity"
                  }
                  unit="NTU" step={0.1} min={0} max={500}
                  value={state.blend.cB.influent_NTU} onChange={v => setCB("influent_NTU", v)} />
                <NumField label="Turbidity → TSS" unit="mg/L per NTU" step={0.1} min={0.1} max={5}
                  value={state.blend.cB.ntu_to_mgL} onChange={v => setCB("ntu_to_mgL", v)} />
                {state.blend.cB.upstream?.mode !== "measured_inlet" && (<>
                  {state.blend.doseBasisB === "product" ? (
                    <NumField label="Alum (14·H₂O) dose" unit="mg/L product" step={1} min={0} max={500}
                      value={state.blend.cB.alum_mgL} onChange={v => setCB("alum_mgL", v)} />
                  ) : (
                    <NumField label="Alum dose" unit="mg/L as Al" step={0.1} min={0} max={50}
                      value={state.blend.cB.alum_mgL / DOSE_CONV.alum_mgPerMgAl}
                      onChange={v => setCB("alum_mgL", v * DOSE_CONV.alum_mgPerMgAl)}
                      hint={`= ${state.blend.cB.alum_mgL.toFixed(1)} mg/L alum-14`} />
                  )}
                  {state.blend.doseBasisB === "product" ? (
                    <NumField label="PACl dose" unit="mg/L product" step={1} min={0} max={500}
                      value={state.blend.cB.pacl_mgL} onChange={v => setCB("pacl_mgL", v)} />
                  ) : (
                    <NumField label="PACl dose" unit="mg/L as Al" step={0.1} min={0} max={50}
                      value={state.blend.cB.pacl_mgL / DOSE_CONV.pacl_mgPerMgAl}
                      onChange={v => setCB("pacl_mgL", v * DOSE_CONV.pacl_mgPerMgAl)}
                      hint={`= ${state.blend.cB.pacl_mgL.toFixed(1)} mg/L PACl`} />
                  )}
                  {state.blend.doseBasisB === "product" ? (
                    <NumField label="Ferric chloride dose" unit="mg/L product" step={1} min={0} max={500}
                      value={state.blend.cB.ferric_mgL} onChange={v => setCB("ferric_mgL", v)} />
                  ) : (
                    <NumField label="Ferric dose" unit="mg/L as Fe" step={0.1} min={0} max={50}
                      value={state.blend.cB.ferric_mgL / DOSE_CONV.ferric_mgPerMgFe}
                      onChange={v => setCB("ferric_mgL", v * DOSE_CONV.ferric_mgPerMgFe)}
                      hint={`= ${state.blend.cB.ferric_mgL.toFixed(1)} mg/L FeCl₃`} />
                  )}
                </>)}
                {state.blend.cB.upstream?.mode !== "measured_inlet" && (
                  <div className="sm:col-span-2 bg-emerald-50 border border-emerald-200 rounded p-2">
                    <div className="text-[11px] font-medium text-emerald-900 mb-1.5">
                      Lime softening (optional)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      <Select<LimeMode>
                        label="Lime softening mode"
                        value={state.blend.cB.lime_mode ?? "ca_only"}
                        onChange={v => {
                          const next = { ...state.blend.cB, lime_mode: v };
                          if (v === "ca_only") next.lime_mgoh2_mgL = 0;
                          onChange({ ...state, blend: { ...state.blend, cB: next } });
                        }}
                        options={[
                          { value: "ca_only", label: "Ca only (pH ~9.5–10)" },
                          { value: "partial_mg", label: "Partial Mg (pH 10.5–11)" },
                          { value: "excess_mg", label: "Max Mg (pH 11–11.3)" },
                        ]}
                      />
                      <div />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <NumField label="Lime → CaCO₃ path" unit="mg/L lime" step={1} min={0} max={500}
                        value={state.blend.cB.lime_caco3_mgL} onChange={v => setCB("lime_caco3_mgL", v)} />
                      {(state.blend.cB.lime_mode ?? "ca_only") !== "ca_only" && (
                        <NumField label="Lime → Mg(OH)₂ path" unit="mg/L lime" step={1} min={0} max={500}
                          value={state.blend.cB.lime_mgoh2_mgL} onChange={v => setCB("lime_mgoh2_mgL", v)} />
                      )}
                    </div>
                  </div>
                )}
                <NumField
                  label={state.blend.cB.upstream?.mode === "clarifier" || state.blend.cB.upstream?.mode === "measured_inlet"
                    ? "Filter aid (post-clarifier)"
                    : "Polymer / coagulant aid"}
                  unit="mg/L" step={0.05} min={0} max={5}
                  value={state.blend.cB.polymer_mgL} onChange={v => setCB("polymer_mgL", v)} />
                {state.blend.cB.upstream?.mode !== "measured_inlet" && (
                  <NumField label="Powdered AC" unit="mg/L" step={1} min={0} max={500}
                    value={state.blend.cB.pac_mgL} onChange={v => setCB("pac_mgL", v)} />
                )}
              </div>
              {B && (
                <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 mt-2 tabular-nums">
                  Stream B C_in: {B.total.toFixed(2)} mg/L
                  {state.blend.cB.upstream?.mode === "clarifier" &&
                    ` (pre-clarifier ${B.pre_clarifier_total.toFixed(1)} → ${((1 - B.total/Math.max(B.pre_clarifier_total, 1e-9))*100).toFixed(0)}% removed)`}
                  {" "}(before blending)
                </div>
              )}
            </div>
          )}

          <div className="mt-3 text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2">
            <div className="font-medium text-slate-700">
              {state.blend.enabled ? "Blended " : ""}C_in at filter inlet = <span className="tabular-nums">{total.toFixed(2)} mg/L</span>
            </div>
            {!state.blend.enabled && state.c.upstream?.mode === "clarifier" && (
              <div className="text-[11px] text-amber-700 mt-0.5 tabular-nums">
                Pre-clarifier load: {A.pre_clarifier_total.toFixed(1)} mg/L → {((1 - A.total/Math.max(A.pre_clarifier_total, 1e-9))*100).toFixed(0)}% removed by clarifier → {A.total.toFixed(2)} mg/L reaches filter
              </div>
            )}
            {!state.blend.enabled && state.c.upstream?.mode === "measured_inlet" && (
              <div className="text-[11px] text-amber-700 mt-0.5">
                C_in derived from settled-water turbidity {state.c.influent_NTU} NTU; coagulant doses ignored.
              </div>
            )}
            <div className="text-slate-500 mt-1">
              Composition: {fractions.length === 0 ? "—" :
                fractions.map(f => `${(f.fraction * 100).toFixed(0)}% ${SOLIDS[f.solid].label.split(" ")[0]}`).join(" · ")}
            </div>
          </div>
        </div>

        {includeMeasured && (
          <div>
            <SectionTitle>Measured SHC (for flagging)</SectionTitle>
            <NumField label="Measured SHC_a" unit="kg/m²·run" step={0.05}
              value={state.measuredShcA ?? 0}
              onChange={v => set("measuredShcA", v > 0 ? v : undefined)}
              hint="Leave 0 to skip flagging" />
          </div>
        )}

      </CardBody>
    </Card>
  );
}
