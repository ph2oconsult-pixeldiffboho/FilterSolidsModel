"use client";
import React from "react";
import { Card, CardBody, CardHeader, NumField, Select, SectionTitle } from "./ui";
import { CinComponents, FilterType, ShcInputs, SolidsKey, SolidsFraction, SOLIDS,
  defaultLeffFactor, computeCin, MediaLayer, defaultLayers, MEDIA_PROPS } from "@/lib/shc";

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
    },
    measuredShcA: undefined,
  };
}

export function panelToInputs(s: PanelState): { inputs: ShcInputs; cinTotal: number } {
  const { total, fractions } = computeCin(s.c);
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
    polymer_mgL: s.c.polymer_mgL, // pass polymer through for k_h conditioning
  };
  return { inputs, cinTotal: total };
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

  const totalDepth = state.layers.reduce((a, l) => a + Math.max(0, l.depth), 0);

  const { total, fractions } = computeCin(state.c);

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
          <SectionTitle>Influent solids C_in build-up</SectionTitle>
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
              hint="Mg-hardness fraction" />
            <NumField label="Polymer / coagulant aid" unit="mg/L" step={0.05} min={0} max={5}
              value={state.c.polymer_mgL} onChange={v => setC("polymer_mgL", v)}
              hint="Filter aid 0.01–0.1 · coag aid 0.05–0.25 · direct 0.2–2.0" />
            <NumField label="Powdered AC" unit="mg/L" step={1} min={0} max={500}
              value={state.c.pac_mgL} onChange={v => setC("pac_mgL", v)} />
          </div>

          <div className="mt-3 text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2">
            <div className="font-medium text-slate-700">
              Computed C_in = <span className="tabular-nums">{total.toFixed(2)} mg/L</span>
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
