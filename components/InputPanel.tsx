"use client";
import React from "react";
import { Card, CardBody, CardHeader, NumField, Select, SectionTitle } from "./ui";
import { CinComponents, FilterType, ShcInputs, SolidsKey, SolidsFraction, SOLIDS,
  defaultLeffFactor, computeCin, MediaLayer, defaultLayers, MEDIA_PROPS,
  CoagulationRegime } from "@/lib/shc";

export interface PanelState {
  // filter
  filterType: FilterType;
  porosity: number;
  L_eff_factor: number;
  layers: MediaLayer[]; // per-layer breakdown drives totalDepth and L/d

  // operation
  velocity: number;
  C_eff: number;
  h_T_minus_h0: number;
  t_max: number;
  eta: number;
  temperature: number;

  // C_in components
  c: CinComponents;

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
  };

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
    h_T_minus_h0: 1.6,
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
    },
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
      },
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
      h_T_minus_h0: s.h_T_minus_h0,
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
}: {
  state: PanelState;
  onChange: (s: PanelState) => void;
  includeMeasured?: boolean;
  title?: string;
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

        <div>
          <SectionTitle>Filter configuration</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select<FilterType>
              label="Filter type"
              value={state.filterType}
              onChange={onFilterTypeChange}
              options={[
                { value: "dual", label: "Dual media (anthracite/sand)" },
                { value: "triple", label: "Triple media (anthracite/sand/garnet)" },
                { value: "monomedia", label: "Monomedia sand" },
              ]}
            />
            <NumField label="L_eff factor" step={0.05} min={0.4} max={1.0}
              value={state.L_eff_factor} onChange={v => set("L_eff_factor", v)}
              hint="Depth utilisation · 0.6 mono / 0.8 dual / 0.85 triple" />
          </div>

          <div className="mt-3">
            <div className="text-xs font-medium text-slate-600 mb-1.5">
              Media layers (top → bottom)
            </div>
            <div className="space-y-2">
              {state.layers.map((layer, i) => (
                <div key={i} className="border border-slate-200 rounded p-2 bg-slate-50/30">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-3">
                      <span className="block text-[11px] font-medium text-slate-700">{layer.label}</span>
                      <span className="block text-[10px] text-slate-400">layer {i + 1}</span>
                    </div>
                    <div className="col-span-6 sm:col-span-4">
                      <NumField label="Depth" unit="m" step={0.05} min={0.05} max={3}
                        value={layer.depth} onChange={v => setLayer(i, { depth: v })} />
                    </div>
                    <div className="col-span-6 sm:col-span-5">
                      <NumField label="d_e" unit="mm" step={0.05} min={0.1} max={3}
                        value={layer.d_e} onChange={v => setLayer(i, { d_e: v })} />
                    </div>
                  </div>
                  <details className="mt-2">
                    <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-brand select-none">
                      Advanced properties (UC, ψ, SG, ε)
                    </summary>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pl-2 border-l-2 border-slate-200">
                      {(() => {
                        const ref = MEDIA_PROPS[layer.key];
                        const refLabel = ref.label.split(" ")[0].toLowerCase();
                        return <>
                          <NumField label="UC" step={0.05} min={1.0} max={2.5}
                            value={layer.uc} onChange={v => setLayer(i, { uc: v })}
                            hint={`d60/d10 · ${refLabel} ${ref.uc_range[0].toFixed(1)}–${ref.uc_range[1].toFixed(1)}`} />
                          <NumField label="Sphericity ψ" step={0.01} min={0.3} max={1.0}
                            value={layer.sphericity} onChange={v => setLayer(i, { sphericity: v })}
                            hint={`${refLabel} ≈ ${ref.sphericity.toFixed(2)}`} />
                          <NumField label="SG" step={0.05} min={1.0} max={5.0}
                            value={layer.sg} onChange={v => setLayer(i, { sg: v })}
                            hint={`${refLabel} ≈ ${ref.sg.toFixed(2)}`} />
                          <NumField label="Porosity ε" step={0.01} min={0.3} max={0.6}
                            value={layer.porosity} onChange={v => setLayer(i, { porosity: v })}
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
              value={state.velocity} onChange={v => set("velocity", v)} />
            <NumField label="Head budget for floc (h_T − h₀)" unit="m" step={0.1} min={0.1} max={5}
              value={state.h_T_minus_h0} onChange={v => set("h_T_minus_h0", v)}
              hint="Available head for solids accumulation, beyond clean bed" />
            <NumField label="Filtrate target C_eff" unit="mg/L" step={0.05} min={0} max={5}
              value={state.C_eff} onChange={v => set("C_eff", v)}
              hint="0.10 NTU ≈ 0.15 mg/L" />
            <NumField label="Max run time t_max" unit="h" step={1} min={1} max={168}
              value={state.t_max} onChange={v => set("t_max", v)} />
            <NumField label="Removal efficiency η" step={0.01} min={0.5} max={1.0}
              value={state.eta} onChange={v => set("eta", v)}
              hint="0.95–0.995 typical" />
            <NumField label="Water temperature" unit="°C" step={1} min={0} max={40}
              value={state.temperature} onChange={v => set("temperature", v)}
              hint="Cold water → higher k_h" />
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
          <div className="mb-2">
            <Select<CoagulationRegime>
              label="Coagulation regime"
              value={state.c.regime ?? "sweep"}
              onChange={v => setC("regime", v)}
              options={[
                { value: "sweep", label: "Sweep flocculation (large gel-like flocs, full hydroxide yield)" },
                { value: "charge_neutralisation", label: "Charge neutralisation (small dense flocs, low yield)" },
              ]}
              hint="Defines floc morphology — typical sweep at pH 6.5–8 / dose >10 mg/L; CN at pH 5–6 / lower dose, but regime is the diagnostic, not the operating window."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NumField label="Filter influent turbidity" unit="NTU" step={0.1} min={0} max={500}
              value={state.c.influent_NTU} onChange={v => setC("influent_NTU", v)} />
            <NumField label="Turbidity → TSS" unit="mg/L per NTU" step={0.1} min={0.1} max={5}
              value={state.c.ntu_to_mgL} onChange={v => setC("ntu_to_mgL", v)}
              hint="1.0–2.5 typical" />
            <NumField label="Alum (14·H₂O) dose" unit="mg/L" step={1} min={0} max={500}
              value={state.c.alum_mgL} onChange={v => setC("alum_mgL", v)} />
            <NumField label="PACl dose" unit="mg/L" step={1} min={0} max={500}
              value={state.c.pacl_mgL} onChange={v => setC("pacl_mgL", v)} />
            <NumField label="Ferric chloride dose" unit="mg/L" step={1} min={0} max={500}
              value={state.c.ferric_mgL} onChange={v => setC("ferric_mgL", v)} />
            <NumField label="Lime → CaCO₃ path" unit="mg/L lime" step={1} min={0} max={500}
              value={state.c.lime_caco3_mgL} onChange={v => setC("lime_caco3_mgL", v)}
              hint="Ca-hardness fraction" />
            <NumField label="Lime → Mg(OH)₂ path" unit="mg/L lime" step={1} min={0} max={500}
              value={state.c.lime_mgoh2_mgL} onChange={v => setC("lime_mgoh2_mgL", v)}
              hint="Mg path also yields CaCO₃" />
            <NumField label="Polymer / coagulant aid" unit="mg/L" step={0.05} min={0} max={5}
              value={state.c.polymer_mgL} onChange={v => setC("polymer_mgL", v)}
              hint="Filter aid 0.01–0.1 · coag aid 0.05–0.25 · direct 0.2–2.0" />
            <NumField label="Powdered AC" unit="mg/L" step={1} min={0} max={500}
              value={state.c.pac_mgL} onChange={v => setC("pac_mgL", v)} />
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
              <div className="mb-2">
                <Select<CoagulationRegime>
                  label="Coagulation regime"
                  value={state.blend.cB.regime ?? "sweep"}
                  onChange={v => setCB("regime", v)}
                  options={[
                    { value: "sweep", label: "Sweep flocculation" },
                    { value: "charge_neutralisation", label: "Charge neutralisation" },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumField label="Filter influent turbidity" unit="NTU" step={0.1} min={0} max={500}
                  value={state.blend.cB.influent_NTU} onChange={v => setCB("influent_NTU", v)} />
                <NumField label="Turbidity → TSS" unit="mg/L per NTU" step={0.1} min={0.1} max={5}
                  value={state.blend.cB.ntu_to_mgL} onChange={v => setCB("ntu_to_mgL", v)} />
                <NumField label="Alum (14·H₂O) dose" unit="mg/L" step={1} min={0} max={500}
                  value={state.blend.cB.alum_mgL} onChange={v => setCB("alum_mgL", v)} />
                <NumField label="PACl dose" unit="mg/L" step={1} min={0} max={500}
                  value={state.blend.cB.pacl_mgL} onChange={v => setCB("pacl_mgL", v)} />
                <NumField label="Ferric chloride dose" unit="mg/L" step={1} min={0} max={500}
                  value={state.blend.cB.ferric_mgL} onChange={v => setCB("ferric_mgL", v)} />
                <NumField label="Lime → CaCO₃ path" unit="mg/L lime" step={1} min={0} max={500}
                  value={state.blend.cB.lime_caco3_mgL} onChange={v => setCB("lime_caco3_mgL", v)} />
                <NumField label="Lime → Mg(OH)₂ path" unit="mg/L lime" step={1} min={0} max={500}
                  value={state.blend.cB.lime_mgoh2_mgL} onChange={v => setCB("lime_mgoh2_mgL", v)} />
                <NumField label="Polymer / coagulant aid" unit="mg/L" step={0.05} min={0} max={5}
                  value={state.blend.cB.polymer_mgL} onChange={v => setCB("polymer_mgL", v)} />
                <NumField label="Powdered AC" unit="mg/L" step={1} min={0} max={500}
                  value={state.blend.cB.pac_mgL} onChange={v => setCB("pac_mgL", v)} />
              </div>
              {B && (
                <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 mt-2 tabular-nums">
                  Stream B C_in: {B.total.toFixed(2)} mg/L (before blending)
                </div>
              )}
            </div>
          )}

          <div className="mt-3 text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2">
            <div className="font-medium text-slate-700">
              {state.blend.enabled ? "Blended " : ""}C_in at filter inlet = <span className="tabular-nums">{total.toFixed(2)} mg/L</span>
            </div>
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
