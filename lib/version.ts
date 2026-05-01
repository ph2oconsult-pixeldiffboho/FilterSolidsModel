// Single source of truth for the app version. Update both the version
// string and the changelog entry when shipping. Display surfaces:
//   - app header subtitle (small badge next to title)
//   - footer (full version + date)
//   - References panel changelog tab/section

export const APP_VERSION = "v29";
export const APP_VERSION_DATE = "2026-05-01";

// Short tagline shown alongside version. Keep < 60 chars.
export const APP_VERSION_TAGLINE = "K(deposit)×L×d_e mass cap + operational t_ops binding";

// Changelog entries — newest first. Used by ReferencesPanel.
// Keep entries terse: each line should be readable at a glance.
export interface ChangelogEntry {
  version: string;
  date: string;       // ISO 8601 yyyy-mm-dd
  summary: string;    // one-line headline
  changes: string[];  // bullet items
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v29",
    date: "2026-05-01",
    summary: "K(deposit) × L × d_e mass cap + operational time binding constraint",
    changes: [
      "SHC_max now derived from filter geometry: SHC_max = K(deposit_class) × L × d_e_mean. K values fitted from 8 literature anchors (Casey, Cleasby, Anderson, Ives, Henriksdal); fit r²=0.96.",
      "K_caco3 set to operational hydroxide-class K=1.81 (NOT theoretical silt K=5.02). Florida operational data (Bloetscher 2021) confirms drinking-water lime softening operates well below the Casey theoretical ceiling.",
      "Three-constraint binding: t_run = min(t_h, t_mass, t_ops). New t_ops input (default 72 h) reflects scheduled-backwash reality for low-load filters.",
      "Result panel shows all three horizons side by side with the binding one highlighted.",
      "Removed AWWA-rule misderivations from SHC anchor dataset (10 mg/L is a chemistry-failure diagnostic, not an SHC capacity).",
      "Mg(OH)₂ now mapped to hydroxide class via Smith 2020 (Carollo) settling-rate analogue.",
      "DeltaPanel: t_mass, t_ops, K_eff, SHC_max_eff rows added.",
      "SensitivityPanel: t_ops sweep variable (24–168 h).",
    ],
  },
  {
    version: "v28",
    date: "2026-04-30",
    summary: "Static SHC_max parallel binding constraint with citations",
    changes: [
      "Per-solid shc_max field added with literature-anchored values (1.0–4.0 kg/m²).",
      "Mass-binding constraint added alongside head-loss: t_run = min(t_h, t_mass).",
      "SHC_max_override input lets operators anchor against plant-measured data.",
      "Citations dictionary tracks each value's source filter configuration.",
    ],
  },
  {
    version: "v27",
    date: "2026-04-29",
    summary: "Operational vs head-loss-horizon framing",
    changes: [
      "Headline run length now displays operational run (capped at min(t_h, t_max, 96h)) rather than the head-loss horizon.",
      "Filter-oversized callout when t_run >> t_max.",
    ],
  },
  {
    version: "v26",
    date: "2026-04-28",
    summary: "Auto-compute clean-bed h₀ from layer geometry",
    changes: [
      "Input changed from \"head budget for floc (h_T − h₀)\" to \"terminal head loss limit (h_T)\".",
      "Model auto-subtracts Carman-Kozeny clean-bed h₀ from h_T to get the floc-accumulation budget.",
      "Cold water double-effect now correctly captured: higher μ → higher h₀ AND higher k_h.",
    ],
  },
];
