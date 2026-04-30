// Preset design scenarios for quick comparisons.
// Each preset is a partial PanelState — only the fields that differ from baseline.

import { PanelState, defaultPanelState } from "./InputPanel";
import { defaultLayers, makeLayer } from "@/lib/shc";

export interface Preset {
  label: string;
  description: string;
  apply: (base: PanelState) => PanelState;
}

const ferric = (s: PanelState): PanelState => ({
  ...s,
  c: { ...s.c, alum_mgL: 0, pacl_mgL: 0, ferric_mgL: 12, polymer_mgL: 0.1 },
});

const alum = (s: PanelState): PanelState => ({
  ...s,
  c: { ...s.c, alum_mgL: 35, pacl_mgL: 0, ferric_mgL: 0, polymer_mgL: 0.1 },
});

const pacl = (s: PanelState): PanelState => ({
  ...s,
  c: { ...s.c, alum_mgL: 0, pacl_mgL: 30, ferric_mgL: 0, polymer_mgL: 0.1 },
});

export const PRESET_PAIRS: { id: string; label: string; A: Preset; B: Preset }[] = [
  {
    id: "alum-vs-ferric",
    label: "Alum vs ferric",
    A: { label: "Alum (conventional)", description: "Surface water, alum 35 mg/L + polymer 0.1 mg/L",
         apply: alum },
    B: { label: "Ferric (conventional)", description: "Same water, FeCl3 12 mg/L + polymer 0.1 mg/L",
         apply: ferric },
  },
  {
    id: "alum-vs-pacl",
    label: "Alum vs PACl",
    A: { label: "Alum 35 mg/L", description: "Conventional alum dose",
         apply: alum },
    B: { label: "PACl 30 mg/L", description: "Polymerised aluminium — less compressible floc",
         apply: pacl },
  },
  {
    id: "conventional-vs-direct",
    label: "Conventional vs direct filtration",
    A: { label: "Conventional (clarified feed)", description: "2 NTU influent, 35 mg/L alum",
         apply: (s) => ({ ...s, c: { ...alum(s).c, influent_NTU: 2 } }) },
    B: { label: "Direct filtration", description: "Higher influent turbidity (8 NTU) reaches the filter",
         apply: (s) => ({ ...s, c: { ...alum(s).c, influent_NTU: 8 } }) },
  },
  {
    id: "dual-vs-triple",
    label: "Dual vs triple media",
    A: { label: "Dual media", description: "1.0 m anthracite + 0.3 m sand, L_eff 0.80",
         apply: (s) => ({ ...alum(s), filterType: "dual", layers: defaultLayers("dual"), L_eff_factor: 0.80 }) },
    B: { label: "Triple media", description: "1.0 m anthracite + 0.3 m sand + 0.1 m garnet, L_eff 0.85",
         apply: (s) => ({ ...alum(s), filterType: "triple", layers: defaultLayers("triple"), L_eff_factor: 0.85 }) },
  },
  {
    id: "shallow-vs-deep-bed",
    label: "Conventional vs deep-bed (L/d)",
    A: { label: "Conventional dual (L/d ≈ 1,150)",
         description: "1.0 m anthracite + 0.3 m sand, standard ES",
         apply: (s) => ({ ...alum(s), filterType: "dual", layers: defaultLayers("dual"), L_eff_factor: 0.80 }) },
    B: { label: "Deep-bed monomedia (L/d ≈ 1,800)",
         description: "1.8 m of coarse sand (ES 1.0 mm) — European deep-bed style",
         apply: (s) => ({ ...alum(s), filterType: "monomedia",
                          layers: [makeLayer("sand", 1.8, { d_e: 1.0 })],
                          L_eff_factor: 0.80 }) },
  },
  {
    id: "summer-vs-winter",
    label: "Summer vs winter (same plant)",
    A: { label: "Summer (20 °C, algal load)",
         description: "Warmer water, higher organic carry-over",
         apply: (s) => ({ ...alum(s), temperature: 20, c: { ...alum(s).c, influent_NTU: 3 } }) },
    B: { label: "Winter (4 °C, clean water)",
         description: "Cold water raises k_h via viscosity",
         apply: (s) => ({ ...alum(s), temperature: 4, c: { ...alum(s).c, influent_NTU: 1.5 } }) },
  },
  {
    id: "softening-vs-coag",
    label: "Lime softening vs coagulation",
    A: { label: "Coagulation (alum)", description: "35 mg/L alum, low Cin",
         apply: alum },
    B: { label: "Lime softening (Ca + Mg)",
         description: "60 mg/L lime → CaCO₃ + 40 mg/L → Mg(OH)₂; high Cin, dense deposit",
         apply: (s) => ({ ...s, c: { ...s.c, alum_mgL: 0, ferric_mgL: 0, polymer_mgL: 0,
                          lime_caco3_mgL: 60, lime_mgoh2_mgL: 40, influent_NTU: 1 } }) },
  },
  {
    id: "blend-50-50",
    label: "50/50 blend: clarifier + softener",
    A: { label: "All clarifier (alum-only)",
         description: "100% alum-coagulated surface water",
         apply: (s) => ({ ...alum(s), blend: { ...s.blend, enabled: false } }) },
    B: { label: "50/50 blend",
         description: "50% alum-clarified surface water + 50% lime-softened well water",
         apply: (s) => ({
           ...alum(s),
           blend: {
             enabled: true,
             fractionA: 0.5,
             labelA: "Clarifier (alum)",
             labelB: "Softener (Ca + Mg)",
             cB: {
               influent_NTU: 0.5, ntu_to_mgL: 1.5,
               alum_mgL: 0, pacl_mgL: 0, ferric_mgL: 0,
               lime_caco3_mgL: 60, lime_mgoh2_mgL: 40,
               polymer_mgL: 0, pac_mgL: 0,
             },
           },
         }) },
  },
  {
    id: "blend-ratios",
    label: "Blend ratio: 70/30 vs 30/70",
    A: { label: "70 % clarifier / 30 % softener",
         description: "Clarifier-dominant blend",
         apply: (s) => ({
           ...alum(s),
           blend: {
             enabled: true, fractionA: 0.7,
             labelA: "Clarifier (alum)", labelB: "Softener (Ca + Mg)",
             cB: { influent_NTU: 0.5, ntu_to_mgL: 1.5,
                   alum_mgL: 0, pacl_mgL: 0, ferric_mgL: 0,
                   lime_caco3_mgL: 60, lime_mgoh2_mgL: 40,
                   polymer_mgL: 0, pac_mgL: 0 },
           },
         }) },
    B: { label: "30 % clarifier / 70 % softener",
         description: "Softener-dominant blend",
         apply: (s) => ({
           ...alum(s),
           blend: {
             enabled: true, fractionA: 0.3,
             labelA: "Clarifier (alum)", labelB: "Softener (Ca + Mg)",
             cB: { influent_NTU: 0.5, ntu_to_mgL: 1.5,
                   alum_mgL: 0, pacl_mgL: 0, ferric_mgL: 0,
                   lime_caco3_mgL: 60, lime_mgoh2_mgL: 40,
                   polymer_mgL: 0, pac_mgL: 0 },
           },
         }) },
  },
  {
    id: "velocity-low-vs-high",
    label: "Low vs high filtration rate",
    A: { label: "5 m/h (conservative)", description: "Lower flux → longer runs",
         apply: (s) => ({ ...alum(s), velocity: 5 }) },
    B: { label: "10 m/h (high-rate)", description: "Higher flux → shorter runs",
         apply: (s) => ({ ...alum(s), velocity: 10 }) },
  },
  {
    id: "polymer-on-off",
    label: "With vs without polymer aid",
    A: { label: "Alum + 0.1 mg/L polymer", description: "Polymer-conditioned floc (typical coagulant aid)",
         apply: alum },
    B: { label: "Alum, no polymer", description: "Same alum dose, polymer off",
         apply: (s) => ({ ...alum(s), c: { ...alum(s).c, polymer_mgL: 0 } }) },
  },
  {
    id: "sweep-vs-cn",
    label: "Sweep vs charge neutralisation",
    A: { label: "Sweep regime (20 mg/L alum, pH ~7)",
         description: "Conventional sweep flocculation — voluminous gel-like flocs (calibrated to AWWA design 200–250 m³/m²)",
         apply: (s) => ({ ...s, c: { ...s.c, influent_NTU: 2, alum_mgL: 20, pacl_mgL: 0, ferric_mgL: 0,
           lime_caco3_mgL: 0, lime_mgoh2_mgL: 0, polymer_mgL: 0.1, regime: "sweep" }, velocity: 8, t_max: 36 }) },
    B: { label: "CN regime (5 mg/L alum, pH ~5.5)",
         description: "Direct filtration — small dense flocs (calibrated to Anderson 2023, UFRV ~313 m³/m²)",
         apply: (s) => ({ ...s, c: { ...s.c, influent_NTU: 0.5, alum_mgL: 5, pacl_mgL: 0, ferric_mgL: 0,
           lime_caco3_mgL: 0, lime_mgoh2_mgL: 0, polymer_mgL: 0.05, regime: "charge_neutralisation" }, velocity: 4.5, t_max: 80 }) },
  },
];

export function applyPresetPair(id: string, base: PanelState): { A: PanelState; B: PanelState } | null {
  const p = PRESET_PAIRS.find(p => p.id === id);
  if (!p) return null;
  return { A: p.A.apply(base), B: p.B.apply(base) };
}
