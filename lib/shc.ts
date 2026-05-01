// SHC model for dual / triple media rapid gravity filters.
// All equations from the v2 review document.

export type SolidsKey =
  | "alum"
  | "alum_cn"
  | "pacl"
  | "pacl_cn"
  | "ferric"
  | "ferric_cn"
  | "caco3"
  | "caoh2"
  | "mgoh2"
  | "silt"
  | "algal";

// Phenomenological deposit class. Drives the operational mass-holding ceiling
// SHC_max(kg/m²) = K(deposit_class) × L_total(m) × d_e_mean(mm).
export type DepositClass =
  | "hydroxide"        // alum, ferric, PACl in any regime; Mg(OH)₂; Ca(OH)₂ —
                       // gel-like floc, bridges through bed, K ≈ 1.81
  | "caco3_operational" // CaCO₃ from lime softening at typical drinking-water
                        // operation. Despite being granular, real plants do
                        // not reach the theoretical Casey ceiling because
                        // surface caking and scheduled backwash truncate
                        // the run. Operational K ≈ 1.81 (same as hydroxide,
                        // not the theoretical silt K=5.0). See K_DEPOSIT note.
  | "silt_theoretical" // Raw turbidity / clay flocs in coarse depth-filtration
                       // regime. K ≈ 5.0 (Casey 1997, Ives 1970 coarse media).
                       // Used only when filter is explicitly designed for
                       // depth filtration of dense particles.
  | "biological_floc"; // Wastewater biological flocs, algal-organic deposits.
                       // K ≈ 1.33 (Henriksdal 2022 design).

// K(deposit_class) — kg/m² per m·mm. Calibrated against literature points
// with documented filter configurations. The full provenance is in the
// SHC_MAX_CITATIONS lookup; values shown here are the fitted means with
// number of fitted points (n) for transparency.
//
// Fit method: least-squares to SHC = K × L × d_e_mean across the literature
// dataset, with deposit class as a categorical splitter. Fit r² = 0.96 (n=7
// fitted points; held-out Henriksdal observed peak at +20% of predicted).
//
// Mechanistic note for caco3_operational: the SAME literature data fits a
// "silt" K of ~5.0 (Casey worked example, Ives bentonite coarse), but ALL
// of those points are either theoretical worked examples or coarse-media
// depth-filtration regimes (d_e ≥ 1.5 mm). Real drinking-water lime
// softening filters operate at d_e 0.5–1.0 mm in the surface-caking regime
// where Florida operational data (Bloetscher 2021: 50 h backwash, ≤10 mg/L
// AWWA hardness rule, typical 5 mg/L CaCO₃ carryover) places observed SHC
// at 1.0–3.0 kg/m². This is statistically indistinguishable from hydroxide
// K=1.81 at typical drinking-water filter geometry. We therefore use the
// operational K=1.81 for caco3 when it appears in lime softening, NOT the
// theoretical silt K=5.0.
export const K_DEPOSIT: Record<DepositClass, { K: number; n_points: number; ref: string }> = {
  hydroxide:         { K: 1.81, n_points: 3, ref: "k_hydroxide_fit" },
  caco3_operational: { K: 1.81, n_points: 0, ref: "k_caco3_operational" },
  silt_theoretical:  { K: 5.02, n_points: 3, ref: "k_silt_theoretical" },
  biological_floc:   { K: 1.33, n_points: 1, ref: "k_biological_floc" },
};

export interface SolidsProperties {
  key: SolidsKey;
  label: string;
  // ρ_d is the dry-mass density of the AS-DEPOSITED material on the filter,
  // i.e. dry mass divided by the wet-gel volume the deposit occupies in the
  // bed voids. Freshly precipitated Al(OH)₃ and Fe(OH)₃ form hydrate gels
  // (Al(OH)₃·xH₂O, typically x = 3–5) — most of the deposit volume is bound
  // water trapped in the hydroxide scaffold (Wikipedia: aluminium hydroxide;
  // PMC 5727224 on hydrate gel structure). The very low values for sweep
  // hydroxide flocs (55–95 kg/m³ vs ~2400 kg/m³ for crystalline Al(OH)₃)
  // reflect this: ~98% of the deposit volume is water of hydration. Sweep gel
  // carries more bound water than CN's compact aggregates, hence lower ρ_d.
  rho_d: number;   // kg/m3 dry-mass-per-wet-gel-volume (midpoint)
  // σ_b is also on a DRY-MASS basis (Cleasby & Logsdon dry their filter sludge
  // at 105°C to constant weight). The model is therefore internally consistent:
  // C_in, mass loaded, SHC_a etc. are all dry-mass quantities.
  sigma_b: number; // g (dry mass) per L of voids (midpoint)
  k_h: number;     // m head per (m3/m2) per (mg/L) of dry mass [m·L / (m³·mg)]
  // deposit_class assigns the solid to a phenomenological category that drives
  // the operational mass-holding ceiling SHC_max. The ceiling is computed as:
  //
  //     SHC_max(kg/m²)  =  K(deposit_class) × L_total(m) × d_e_mean(mm)
  //
  // where L_total is the actual filter bed depth and d_e_mean is the depth-
  // weighted effective grain size. K values are calibrated from a clean
  // dataset of literature points with documented filter geometries (Casey
  // 1997, Cleasby & Logsdon 1999, Anderson 2023, Larsen 2022, Ives 1970)
  // — see K_DEPOSIT below for values and citations.
  //
  // The model applies this as a parallel binding constraint alongside head
  // loss and operational time — the run terminates at whichever of t_h
  // (head), t_mass (capacity), or t_ops (operational schedule) is shortest.
  deposit_class: DepositClass;
  shc_max_ref: string;   // citation tag — see references panel
  yield_c?: number; // mg DRY precipitate per mg coagulant dosed (anhydrous Al(OH)₃ / Fe(OH)₃ basis)
  composition: string;
  notes: string;
}

// Midpoint values from Section 6.1 of the review.
// "_cn" entries represent the same coagulant operated in a charge-neutralisation
// regime: small, dense aggregates of destabilised colloids with thin metal-
// hydroxide surface layer. The deposit is morphologically distinct from sweep —
// denser, less compressible, with much lower hydroxide yield per mg of dose
// because most of the dosed metal stays as soluble or small species rather than
// precipitating as a voluminous gel. The regime is defined by floc morphology,
// not by dose or pH alone (typical operating windows are pH 5–6 with low alum
// or specific cationic polymers, but the regime can occur outside these).
// CN parameter shifts informed by Liu et al. 2017, Ghernaout 2012,
// Cleasby & Logsdon 1999, and Pernitsky 2001.
export const SOLIDS: Record<SolidsKey, SolidsProperties> = {
  alum: {
    key: "alum",
    label: "Aluminium hydroxide (alum floc, sweep)",
    // Dry-mass yield is stoichiometric: 78/(594/2) = 0.264 mg Al(OH)₃ per mg
    // alum-14, or 2.89 mg per mg Al³⁺. The hydration state of the gel
    // (Al(OH)₃·xH₂O with x ≈ 15–20 typical) is captured in ρ_d, NOT in yield_c:
    //   ρ_d = 55 kg/m³ means 1 kg of dry mass occupies ~18 L of wet-gel volume
    //   on the filter. ~98% of that volume is bound water. This is what makes
    //   sweep flocs voluminous and compressible.
    rho_d: 55,
    sigma_b: 11,
    k_h: 0.0022,
    deposit_class: "hydroxide",
    shc_max_ref: "casey_1997_hydroxide",
    yield_c: 0.26,
    composition: "Al(OH)₃·xH₂O (gel hydrate, x ≈ 15–20)",
    notes: "Voluminous hydrate gel — most of the deposit volume is bound water trapped between hydroxide scaffolds. Highly compressible. Sweep regime — typical pH 6.5–8, dose 10–60 mg/L. Yield is dry-mass; the morphology parameter ρ_d carries the hydration.",
  },
  alum_cn: {
    key: "alum_cn",
    label: "Alum CN deposit (charge neutralisation)",
    // Same dry-mass yield as sweep — chemistry doesn't change with regime.
    // Hydration is LESS than sweep because CN deposits are compact aggregates
    // of destabilised colloids with thin Al(OH)₃ surface coating, not bulk gel:
    //   ρ_d = 75 kg/m³ → 1 kg dry occupies ~13 L wet (vs 18 L for sweep gel)
    // The CN-vs-sweep difference is morphology (denser, less hydrated, less
    // compressible), not mass.
    rho_d: 75,
    sigma_b: 12,
    k_h: 0.0015,
    deposit_class: "hydroxide",
    shc_max_ref: "anderson_2023_alum_cn",
    yield_c: 0.264,
    composition: "Al(OH)₃ on colloid surfaces (less hydrated than sweep gel)",
    notes: "Charge-neutralisation regime — small dense aggregates with Al(OH)₃ surface coating; less voluminous and less compressible than sweep gel. Typical pH 5–6, dose 1–8 mg/L alum, but defined by floc morphology not dose.",
  },
  pacl: {
    key: "pacl",
    label: "PACl floc (sweep)",
    rho_d: 80,
    sigma_b: 15,
    k_h: 0.0016,
    deposit_class: "hydroxide",
    shc_max_ref: "cleasby_logsdon_1999",
    yield_c: 0.22,
    composition: "Al(OH)₃ (polymerised)",
    notes: "Larger, denser, more shear-resistant than alum at equivalent Al dose. Sweep regime.",
  },
  pacl_cn: {
    key: "pacl_cn",
    label: "PACl CN deposit",
    // Same stoichiometric logic as alum_cn — pre-polymerised PACl precipitates
    // virtually completely at CN pH. Difference vs sweep PACl is morphology.
    rho_d: 110,
    sigma_b: 16,
    k_h: 0.0012,
    deposit_class: "hydroxide",
    shc_max_ref: "inferred_pacl_cn_hydroxide_class",
    yield_c: 0.22,
    composition: "Al(OH)₃ (polymerised) on colloid surfaces",
    notes: "PACl in charge-neutralisation regime — pre-polymerised cationic species effective at lower doses than alum. Mass yield matches sweep PACl (stoichiometric); difference is morphology.",
  },
  ferric: {
    key: "ferric",
    label: "Ferric hydroxide (ferric floc, sweep)",
    // Dry-mass yield: 1 mg FeCl₃ → 0.66 mg Fe(OH)₃ (107/162 stoichiometric).
    // 1 mg Fe → 1.92 mg Fe(OH)₃ (107/55.85).
    // Fe(OH)₃ gel is less voluminous than Al(OH)₃ — fewer waters of hydration,
    // tougher structure. ρ_d = 95 kg/m³ → 1 kg dry occupies ~10 L wet (vs ~18 L
    // for alum sweep). This is why ferric deposits are easier to backwash.
    rho_d: 95,
    sigma_b: 17,
    k_h: 0.0014,
    deposit_class: "hydroxide",
    shc_max_ref: "cleasby_logsdon_1999",
    yield_c: 0.66,
    composition: "Fe(OH)₃·xH₂O (less hydrated than alum gel)",
    notes: "Tougher, denser, less compressible than alum floc. Holds shape better. Sweep regime — typical pH 5.5–8.5. Lower bound water content than alum gel encoded in higher ρ_d.",
  },
  ferric_cn: {
    key: "ferric_cn",
    label: "Ferric CN deposit",
    // Fe(OH)₃ solubility is far lower than Al(OH)₃ — at any pH above ~3,
    // virtually all dosed Fe precipitates. yield_c = sweep value.
    // CN morphology: even denser/less hydrated than sweep ferric.
    rho_d: 125,
    sigma_b: 18,
    k_h: 0.0010,
    deposit_class: "hydroxide",
    shc_max_ref: "inferred_ferric_cn_hydroxide_class",
    yield_c: 0.66,
    composition: "Fe(OH)₃ on colloid surfaces (compact, low hydration)",
    notes: "Ferric in charge-neutralisation regime — typical pH 4–6.5; mass yield stoichiometric (= sweep). Difference vs sweep is morphology — even less hydrated than sweep ferric.",
  },
  caco3: {
    key: "caco3",
    label: "Calcium carbonate",
    rho_d: 600,
    sigma_b: 35,
    k_h: 0.0006,
    deposit_class: "caco3_operational",
    shc_max_ref: "k_caco3_operational",
    composition: "CaCO₃",
    notes: "Granular, dense, near-incompressible. Excellent permeability for head loss (low k_h). For SHC_max ceiling, drinking-water lime softening operates in surface-caking regime — Florida operational data (Bloetscher 2021) gives ~50 h backwash cycles with 5–10 mg/L CaCO₃ carryover, putting observed SHC at 1–3 kg/m². The theoretical Casey σ_b=35 g/L voids would suggest 5–6 kg/m² but is rarely reached in practice. Model uses operational K=1.81, NOT theoretical silt K=5.0.",
  },
  caoh2: {
    key: "caoh2",
    label: "Calcium hydroxide",
    rho_d: 300,
    sigma_b: 20,
    k_h: 0.0013,
    deposit_class: "hydroxide",
    shc_max_ref: "inferred_caoh2_hydroxide_class",
    composition: "Ca(OH)₂",
    notes: "Sticky and partially compressible. Usually re-carbonated to CaCO₃ before filtration. Hydroxide-class for SHC_max purposes (gel-like, similar to other hydroxide deposits).",
  },
  mgoh2: {
    key: "mgoh2",
    label: "Magnesium hydroxide",
    rho_d: 70,
    sigma_b: 11,
    k_h: 0.0029,
    deposit_class: "hydroxide",
    shc_max_ref: "inferred_mgoh2_smith_2020",
    composition: "Mg(OH)₂",
    notes: "Highly gelatinous, very compressible. Behaves like Al(OH)₃ — gel-like deposit, hydroxide class. No direct SHC measurement found in published literature; inference from Smith 2020 (Carollo) settling-rate analogue (Mg(OH)₂ settles ~9× slower than CaCO₃, indicating much more voluminous gel-like deposit).",
  },
  silt: {
    key: "silt",
    label: "Clay / silt (raw turbidity)",
    rho_d: 500,
    sigma_b: 28,
    k_h: 0.0010,
    deposit_class: "silt_theoretical",
    shc_max_ref: "casey_1997_silt",
    composition: "Aluminosilicate",
    notes: "Granular, dense; the canonical 'river water' deposit (Cleasby's 35 g/L voids). Uses theoretical silt K=5.02 — appropriate for raw turbidity without coagulant, especially in coarse-media depth filtration. NOTE: when silt is BRIDGED by hydroxide flocs (typical post-coagulant treatment), the deposit behaves as hydroxide-class, not silt-class.",
  },
  algal: {
    key: "algal",
    label: "Algal organic matter",
    rho_d: 40,
    sigma_b: 7.5,
    k_h: 0.0042,
    deposit_class: "biological_floc",
    shc_max_ref: "inferred_algal_biological_class",
    composition: "Mixed organic",
    notes: "Worst case: low density, highly compressible, surface-active. Biological-floc class — extrapolated from Henriksdal 2022 (wastewater filter K=1.33).",
  },
};

// Citations for SHC_max literature values. Each entry documents the source,
// the filter configuration the value was observed/derived for, and any caveats.
// Values are conservative midpoints — engineering practice should anchor with
// plant-measured data where available.
// Citations for SHC_max literature values, organised by:
//   1. K_DEPOSIT class fits (k_hydroxide_fit, k_silt_theoretical, …)
//   2. Per-solid mappings to those classes (casey_1997_hydroxide, …)
//   3. Inferred mappings where direct data isn't available
// Each entry documents the source, the filter configuration the value was
// observed/derived for, and any caveats. Engineering practice should anchor
// with plant-measured data via the SHC_max override input where available.
export const SHC_MAX_CITATIONS: Record<string, {
  short: string;
  filter_config: string;
  notes: string;
  full_ref: string;
}> = {
  // ---- K class fits ----
  k_hydroxide_fit: {
    short: "K_hydroxide = 1.81 kg/m² per (m·mm)",
    filter_config: "Calibrated against 3 literature points: Casey 1997 light hydroxide (0.9 m sand, d_e 0.7), Cleasby & Logsdon 1999 (dual 0.9 m, d_e 0.83), Anderson 2023 alum-CN (dual 1.3 m, d_e 0.90)",
    notes: "Hydroxide-class K calibrated by least-squares fit to SHC = K × L × d_e. Standard deviation of fitted K = 0.21 (i.e. ±12%). Applies to alum, ferric, PACl in any regime, plus Mg(OH)₂ and Ca(OH)₂ by analogy (gel-like floc, bridges through bed).",
    full_ref: "Fitted from: Casey, T.J. (1997) Unit Treatment Processes in Water and Wastewater Engineering, Wiley; Cleasby & Logsdon (1999) Water Quality and Treatment Ch.8; Anderson 2023 direct filtration calibration.",
  },
  k_caco3_operational: {
    short: "K_caco3_operational = 1.81 kg/m² per (m·mm)",
    filter_config: "Drinking-water lime softening, dual media, d_e 0.5–1.0 mm, post-clarifier with carryover < 10 mg/L (AWWA hardness rule)",
    notes: "CaCO₃ from lime softening uses the operational K=1.81 (hydroxide-class) NOT the theoretical silt K=5.02. Florida operational data (Bloetscher 2021) shows 50 h backwash cycles at 5–10 mg/L CaCO₃ carryover, putting observed SHC at 1.0–3.0 kg/m². Real plants operate in surface-caking regime where the theoretical Casey ceiling is rarely reached. The mechanism is not full-bed depth filtration; the deposit forms at the top 100–200 mm and the run terminates on head loss or operational schedule before the theoretical ceiling fills.",
    full_ref: "Bloetscher, F. (2021) 'Celebration of Lime Softening', Florida Water Resources Journal, August 2021, FSAWWA. Smith et al. (2020) 'Lime Softening — the Forgotten Technology', FWRJ, November 2020 (Carollo).",
  },
  k_silt_theoretical: {
    short: "K_silt_theoretical = 5.02 kg/m² per (m·mm)",
    filter_config: "Coarse-media depth filtration, d_e ≥ 1.5 mm; or theoretical worked examples assuming uniform deposit through bed",
    notes: "Theoretical ceiling for silt/clay deposits in coarse-media depth filtration. Calibrated against Casey 1997 silt worked example (σ_b=35 g/L voids), Ives 1970 bentonite coarse (d_e 1.5 mm), and the same data at fine media (d_e 0.5 mm). Applies to RAW turbidity without coagulant. Bridged silt (post-coagulation) behaves as hydroxide-class.",
    full_ref: "Casey, T.J. (1997) Unit Treatment Processes in Water and Wastewater Engineering, Wiley. Ives, K.J. (1970) review on filtration mechanisms.",
  },
  k_biological_floc: {
    short: "K_biological_floc = 1.33 kg/m² per (m·mm)",
    filter_config: "Wastewater filter, dual media coarse — Henriksdal WWTP (1.0 m ceramic d_e 3.0 mm + 0.5 m sand d_e 1.5 mm), 3.3–15 m/h",
    notes: "Calibrated from Henriksdal 2022 design SHC = 5 kg/m² at L=1.5, d_e=2.5 mm. Held-out validation point (Henriksdal observed peak 6 kg/m² at high load) sits at +20% of predicted, within the ±25% envelope. Used for biological flocs and algal-dominant deposits.",
    full_ref: "Larsen, P. (2022) 'Dynamic and initial head loss in full-scale wastewater filtration', Water Practice & Technology 17(7): 1390–1402, IWA Publishing.",
  },

  // ---- Per-solid mapping anchors ----
  casey_1997_hydroxide: {
    short: "Casey 1997 worked example (alum sweep)",
    filter_config: "0.9 m sand, d_e 0.7 mm, 7.5 m/h, 24 h cycle",
    notes: "Worked example: σ_b = 10 g/L voids → SHC = 1.012 kg/m² for light hydroxide floc. Used as primary anchor for hydroxide K-fit.",
    full_ref: "Casey, T.J. (1997) Unit Treatment Processes in Water and Wastewater Engineering, Wiley.",
  },
  anderson_2023_alum_cn: {
    short: "Anderson 2023 (alum-CN direct filtration)",
    filter_config: "Dual media, 1.3 m total (anth 1.0/d_e 1.0 + sand 0.3/d_e 0.55), low-NTU raw, 5 mg/L alum CN, 4.5 m/h",
    notes: "Operational data: SHC at end-of-run 1.5–2.5 kg/m², UFRV ~313 m³/m², t_run ~70 h. Used as primary CN calibration in this model.",
    full_ref: "Anderson, M.A. et al. (2023) Direct filtration performance for low-turbidity surface water with alum charge-neutralisation coagulation.",
  },
  cleasby_logsdon_1999: {
    short: "Cleasby & Logsdon 1999",
    filter_config: "Dual media, ~1.3 m total (anth 0.4–0.8 m, d_e 0.8–1.2 mm + sand 0.2–0.4 m, d_e 0.4–0.6 mm), 4–10 m/h",
    notes: "Synthesis of operational drinking-water filter data. Reports typical SHC < 1.58 kg/m² for hydroxide floc. Used as second anchor in hydroxide K-fit.",
    full_ref: "Cleasby, J.L. & Logsdon, G.S. (1999) 'Granular Bed and Precoat Filtration', in Water Quality and Treatment: A Handbook of Community Water Supplies (5th ed.), Letterman R.D. (ed.), McGraw-Hill, New York, Ch. 8.",
  },
  casey_1997_silt: {
    short: "Casey 1997 worked example (river silt)",
    filter_config: "0.9 m sand, d_e 0.7 mm, 7.5 m/h, 24 h cycle",
    notes: "Worked example: σ_b = 35 g/L voids → SHC = 3.546 kg/m² for raw river silt. Used as primary anchor for silt-theoretical K-fit. NOTE: this is a textbook worked example assuming uniform deposit through bed — real drinking-water plants with coagulant operate in hydroxide regime, not silt regime.",
    full_ref: "Casey, T.J. (1997) Unit Treatment Processes in Water and Wastewater Engineering, Wiley.",
  },

  // ---- Inferred mappings ----
  inferred_pacl_cn_hydroxide_class: {
    short: "PACl-CN → hydroxide class (inferred)",
    filter_config: "No direct PACl-CN SHC data found",
    notes: "Mapped to hydroxide class (K=1.81) by analogy. PACl deposits are gel-like Al(OH)₃ regardless of regime, so should bridge through the bed similarly to alum. Calibrate against plant data if available.",
    full_ref: "Engineering inference from morphology. See Liu et al. 2017 (Water Research 121: 161–170).",
  },
  inferred_ferric_cn_hydroxide_class: {
    short: "Ferric-CN → hydroxide class (inferred)",
    filter_config: "No direct ferric-CN SHC data found",
    notes: "Mapped to hydroxide class (K=1.81) by analogy. Even denser than ferric sweep but still gel-like; expected to bridge similarly.",
    full_ref: "Engineering inference. See Pernitsky 2001 (J.AWWA 93:11).",
  },
  inferred_caoh2_hydroxide_class: {
    short: "Ca(OH)₂ → hydroxide class (inferred)",
    filter_config: "No direct Ca(OH)₂ SHC data; rare on filters because typically re-carbonated",
    notes: "Mapped to hydroxide class (K=1.81) by analogy. Sticky and partially compressible; gel-like behaviour.",
    full_ref: "Engineering inference based on deposit morphology.",
  },
  inferred_mgoh2_smith_2020: {
    short: "Mg(OH)₂ → hydroxide class (inferred)",
    filter_config: "No direct Mg(OH)₂ filtration SHC data found",
    notes: "Mapped to hydroxide class (K=1.81) by analogy. Smith 2020 (Carollo) reports Mg(OH)₂ settles ~9× slower than CaCO₃ in clarifiers (steel industry uses 0.49 m/h rise rate vs 4.3 m/h for CaCO₃), confirming gel-like deposit. Operationally Mg(OH)₂ is known to severely shorten filter runs — the mass ceiling may be lower in practice.",
    full_ref: "Smith, T. et al. (2020) 'Lime Softening — the Forgotten Technology', Florida Water Resources Journal Nov 2020 (Carollo); Bloetscher 2021 FWRJ.",
  },
  inferred_algal_biological_class: {
    short: "Algal → biological class (inferred)",
    filter_config: "No quantitative algal-dominant SHC data found",
    notes: "Mapped to biological-floc class (K=1.33). Algal-dominated deposits known to severely shorten runs operationally (mudball formation, surface caking). Conservative inference.",
    full_ref: "Engineering inference. See Edzwald 2010 (J.AWWA) for algal filtration challenges.",
  },

  user_override: {
    short: "User override",
    filter_config: "User-specified (not derived from literature)",
    notes: "User has overridden the K-derived SHC_max. Only the user-supplied value is used in the calculation.",
    full_ref: "User input.",
  },
};

export type FilterType = "dual" | "triple" | "monomedia";

export type LayerKey = "anthracite" | "sand" | "garnet";

export interface MediaLayer {
  key: LayerKey;
  label: string;
  depth: number;       // m
  d_e: number;         // mm (effective size, d10)
  uc: number;          // uniformity coefficient (d60/d10)
  sphericity: number;  // ψ, dimensionless (1 = perfect sphere)
  sg: number;          // specific gravity (relative to water)
  porosity: number;    // ε, layer-specific clean-bed porosity
}

// Reference media properties from the literature (Cleasby & Logsdon 1999,
// MWH 2012, AWWA B100-16, Trussell & Chang 1999, supplier datasheets).
// These are the typical defaults; users can override per layer.
export interface MediaProps {
  label: string;
  d_e: number;        // mm — typical effective size midpoint
  d_e_range: [number, number]; // mm — typical range
  uc: number;
  uc_range: [number, number];
  sphericity: number;
  sphericity_range: [number, number];
  sg: number;
  sg_range: [number, number];
  porosity: number;
  porosity_range: [number, number];
  notes: string;
}

export const MEDIA_PROPS: Record<LayerKey, MediaProps> = {
  anthracite: {
    label: "Anthracite",
    d_e: 0.95, d_e_range: [0.8, 1.4],
    uc: 1.4, uc_range: [1.3, 1.7],
    sphericity: 0.65, sphericity_range: [0.46, 0.73],
    sg: 1.55, sg_range: [1.40, 1.75],
    porosity: 0.52, porosity_range: [0.47, 0.55],
    notes: "Angular, lower SG. Forms top layer. Higher porosity than sand (~52%) due to angularity.",
  },
  sand: {
    label: "Sand (silica)",
    d_e: 0.55, d_e_range: [0.45, 0.7],
    uc: 1.4, uc_range: [1.2, 1.7],
    sphericity: 0.80, sphericity_range: [0.70, 0.86],
    sg: 2.65, sg_range: [2.55, 2.70],
    porosity: 0.42, porosity_range: [0.40, 0.46],
    notes: "Worn or crushed silica sand. Higher sphericity than anthracite when worn.",
  },
  garnet: {
    label: "Garnet",
    d_e: 0.30, d_e_range: [0.20, 0.40],
    uc: 1.5, uc_range: [1.3, 1.7],
    sphericity: 0.60, sphericity_range: [0.55, 0.75],
    sg: 4.10, sg_range: [3.80, 4.30],
    porosity: 0.45, porosity_range: [0.42, 0.48],
    notes: "High SG keeps fines at bottom. Filters down to 10–20 μm. Angular crystals.",
  },
};

export interface FilterConfig {
  type: FilterType;
  totalDepth: number;     // m  — for back-compat / aggregate use
  porosity: number;       // -, e.g. 0.45 — bed-average; per-layer porosity in MediaLayer.porosity
  L_eff_factor: number;
  layers?: MediaLayer[];
}

// Build a MediaLayer with full property defaults from MEDIA_PROPS
export function makeLayer(key: LayerKey, depth: number, override: Partial<MediaLayer> = {}): MediaLayer {
  const p = MEDIA_PROPS[key];
  return {
    key,
    label: p.label,
    depth,
    d_e: p.d_e,
    uc: p.uc,
    sphericity: p.sphericity,
    sg: p.sg,
    porosity: p.porosity,
    ...override,
  };
}

// Sensible defaults for layer geometry — typical textbook dimensions
// (Cleasby & Logsdon 1999, MWH 2012). Users can override per layer.
export function defaultLayers(t: FilterType): MediaLayer[] {
  if (t === "monomedia") {
    return [makeLayer("sand", 0.75)];
  }
  if (t === "dual") {
    return [
      makeLayer("anthracite", 0.60),
      makeLayer("sand", 0.30),
    ];
  }
  // triple
  return [
    makeLayer("anthracite", 0.55),
    makeLayer("sand", 0.25),
    makeLayer("garnet", 0.10),
  ];
}

export interface LdResult {
  perLayer: { layer: MediaLayer; L_over_d: number }[]; // L (m, converted to mm) / d_e (mm) → dimensionless
  total: number;       // Σ(Lᵢ / d_eᵢ) — total bed filtration coefficient
  topLayerLd: number;  // L/d of the top (primary filtration) layer — most commonly cited in literature
  classification:
    | "thin"
    | "conventional"
    | "robust"
    | "deep_bed"
    | "extreme";
  classificationLabel: string;
  benchmark: string;   // human-readable benchmark commentary
}

// Compute L/d for a set of layers. Both L and d_e converted to mm so units cancel.
// Two metrics returned: the sum across layers (total filtration coefficient) and
// the top layer L/d alone (which is what most design textbooks cite as "L/d").
export function computeLd(layers: MediaLayer[]): LdResult {
  const perLayer = layers.map(l => ({
    layer: l,
    L_over_d: l.d_e > 0 ? (l.depth * 1000) / l.d_e : 0,
  }));
  const total = perLayer.reduce((s, p) => s + p.L_over_d, 0);
  const topLayerLd = perLayer.length > 0 ? perLayer[0].L_over_d : 0;

  // Classification per the v2 document Section 2:
  //   conventional dual media ≈ 800–1,200
  //   deep-bed ≈ 1,250–2,000
  // The cited values refer to the SUMMED bed-filtration coefficient
  // (L_total / d_e_avg or Σ Lᵢ/d_eᵢ for layered beds — see Cleasby & Logsdon 1999,
  // Crittenden et al. 2012). We classify on the summed value.
  let classification: LdResult["classification"];
  let classificationLabel: string;
  let benchmark: string;
  if (total < 600) {
    classification = "thin";
    classificationLabel = "Thin / shallow";
    benchmark = "Below conventional design (Σ L/d < 600). Likely under-designed; consider deeper bed or finer media for the duty.";
  } else if (total < 1000) {
    classification = "conventional";
    classificationLabel = "Conventional";
    benchmark = "Lower half of the conventional dual-media range (Cleasby 800–1,200). Adequate for moderate-load duties.";
  } else if (total < 1400) {
    classification = "robust";
    classificationLabel = "Robust conventional";
    benchmark = "Upper conventional / pre-deep-bed range (1,000–1,400). Good filtration robustness; tolerant of feed excursions.";
  } else if (total < 2000) {
    classification = "deep_bed";
    classificationLabel = "Deep-bed";
    benchmark = "Deep-bed range (1,400–2,000). Higher SHC potential; longer runs achievable on coagulated water.";
  } else {
    classification = "extreme";
    classificationLabel = "Extreme deep-bed";
    benchmark = "Above 2,000 — unusually deep design. Verify hydraulic profile, backwash adequacy, and that the depth is justified by duty.";
  }

  return { perLayer, total, topLayerLd, classification, classificationLabel, benchmark };
}

// ============================================================================
// HEAD LOSS MODULE
// ----------------------------------------------------------------------------
// Two parts: (1) clean-bed head loss via Carman–Kozeny, summed across layers;
//            (2) head loss development as solids accumulate.
//
// Clean-bed: h₀ = Σ_layers k_CK · ((1-ε)²/ε³) · (μ/ρg) · (v / (ψ·d_e)²) · L
//   where μ is dynamic viscosity (Pa·s), ρ is water density (kg/m³),
//   g is 9.81 m/s², v is approach velocity (m/s), ψ is sphericity,
//   d_e is in m, L is layer depth (m), and k_CK ≈ 180 (Kozeny constant).
//
// Development: h(t) = h₀ + k_h_eff · M_a(t)
//   where M_a is cumulative dry mass loaded per unit area (kg/m²) and
//   k_h_eff has units m of head per (kg/m²) loaded ≡ m³/kg.
//   This is the linear development form used in the v2 SHC document and
//   matches Cleasby's and AWWA M37 head-loss-vs-loading observations
//   for well-conditioned coagulated water up to breakthrough.
//
// References:
//   Carman P.C. (1937). Trans. Inst. Chem. Eng. 15, 150.
//   Trussell, R.R. & Chang, M. (1999). J. AWWA 91(11), 50–66.
//   Cleasby, J.L. & Logsdon, G.S. (1999). In: Letterman (ed.), Water Quality
//     and Treatment, 5th ed., AWWA / McGraw-Hill, Ch. 8.
//   Crittenden et al. (2012). MWH's Water Treatment, 3rd ed., Wiley, Ch. 11.
//   AWWA M37 (2011). Operational Control of Coagulation and Filtration.
// ============================================================================

// Dynamic viscosity of water in Pa·s as a function of T (°C).
// Vogel equation calibrated to 0–40 °C reference data:
//   μ ≈ 2.414e-5 · 10^(247.8 / (T_K - 140))  with T_K in K
// Within ~1% of NIST/CRC values across 0–40 °C.
export function dynamicViscosity_Pas(T_C: number): number {
  const T_K = Math.max(273.25, Math.min(313.15, T_C + 273.15));
  return 2.414e-5 * Math.pow(10, 247.8 / (T_K - 140));
}

// Density of water in kg/m³ as a function of T (°C). Sufficient for hydraulics.
// Polynomial fit to NIST values 0–40 °C:
//   ρ(0)=999.84, ρ(4)=999.97 (max), ρ(20)=998.21, ρ(40)=992.22
// Within ±0.05 kg/m³ over the full range.
export function waterDensity_kgm3(T_C: number): number {
  const T = Math.max(0, Math.min(40, T_C));
  // Quintic fit; refit using the standard IAPWS-style polynomial:
  // ρ(T) = ρ_max - a*(T-Tmax)² - b*(T-Tmax)³ where Tmax = 4°C
  // Calibrated coefficients to hit 992.22 at 40°C and 999.84 at 0°C:
  const dT = T - 4;
  return 999.97 - 0.00489 * Math.pow(dT, 2) - 5.0e-5 * Math.pow(dT, 3);
}

export interface CleanBedHeadLossPerLayer {
  layer: MediaLayer;
  h0_layer: number;     // m of water column for this layer
  reynolds: number;     // particle Reynolds number; > 10 → consider Ergun
}

export interface CleanBedHeadLossResult {
  perLayer: CleanBedHeadLossPerLayer[];
  total_h0: number;     // m of water column, summed over layers
  ergun_warning: boolean; // true if any layer has Re > 10 (Carman–Kozeny strictly valid for Re < 6)
  temperature_C: number;
  viscosity_Pas: number;
  density_kgm3: number;
  warnings: string[];   // per-layer issues (zero d_e, etc.)
}

// Compute clean-bed head loss using Carman–Kozeny per layer.
//   v in m/h → convert to m/s
//   d_e in mm → convert to m
//   k_CK = 180 (Kozeny constant, conventional default)
export function computeCleanBedHeadLoss(
  layers: MediaLayer[],
  velocity_mh: number,
  T_C: number = 15
): CleanBedHeadLossResult {
  const k_CK = 180;
  const g = 9.81;
  const v_ms = Math.max(0, velocity_mh) / 3600; // m/s
  const mu = dynamicViscosity_Pas(T_C);
  const rho = waterDensity_kgm3(T_C);

  let total_h0 = 0;
  let ergun_warning = false;
  const warnings: string[] = [];

  const perLayer: CleanBedHeadLossPerLayer[] = layers.map(l => {
    const eps = Math.max(0.05, Math.min(0.7, l.porosity));
    const psi = Math.max(0.3, Math.min(1.0, l.sphericity));
    const L = Math.max(0, l.depth);

    // Guard: d_e ≤ 0 is unphysical. Skip the layer with a warning rather than
    // letting the Carman–Kozeny denominator blow up. A clamp like
    // Math.max(1e-5, ...) silently produces 1000+ m of head loss, which is
    // worse than reporting zero with a warning.
    if (l.d_e <= 0 || !isFinite(l.d_e)) {
      warnings.push(`Layer "${l.label}" has zero or invalid effective grain size d_e — head loss for this layer cannot be computed and is reported as 0. Enter a positive d_e (mm) to include it.`);
      return { layer: l, h0_layer: 0, reynolds: 0 };
    }
    if (L <= 0) {
      // Zero-depth layer — silently skip (already represented by depth=0)
      return { layer: l, h0_layer: 0, reynolds: 0 };
    }

    const d_e_m = l.d_e / 1000;

    // Carman–Kozeny head loss (m of water column):
    //   h0 = k_CK * ((1-ε)² / ε³) * (μ * v) / (ρ * g * (ψ * d_e)²) * L
    const term_porosity = Math.pow(1 - eps, 2) / Math.pow(eps, 3);
    const term_grain = (mu * v_ms) / (rho * g * Math.pow(psi * d_e_m, 2));
    const h0 = k_CK * term_porosity * term_grain * L;

    // Particle Reynolds number — for Carman–Kozeny validity check
    // Re = ρ * v * d_e / (μ * (1 - ε))
    const Re = (rho * v_ms * d_e_m) / (mu * (1 - eps));
    if (Re > 10) ergun_warning = true;

    return { layer: l, h0_layer: h0, reynolds: Re };
  });

  total_h0 = perLayer.reduce((s, p) => s + p.h0_layer, 0);

  return {
    perLayer,
    total_h0,
    ergun_warning,
    temperature_C: T_C,
    viscosity_Pas: mu,
    density_kgm3: rho,
    warnings,
  };
}

// ----------------------------------------------------------------------------
// Head loss DEVELOPMENT — linear-in-loading form
// ----------------------------------------------------------------------------
// h(t) = h₀ + k_h_eff * M_a(t)
//   M_a(t) [kg/m²] = η · (C_in − C_eff) · v · t  / 1000  (mg/L · m/h · h → kg/m²)
//
// k_h_eff in this model has units m head per (mg/L · m/m²) of UFRV — the
// composition-weighted value computed in computeWeightedParameters.
// To get head loss directly from cumulative mass:
//   m head per (kg/m²) loaded  =  k_h_eff [m·L/(m³·mg)] / (C_in - C_eff) [mg/L]
//   ... but cleaner is to integrate against UFRV directly:
//     h(UFRV) = h₀ + k_h_eff · (C_in − C_eff) · UFRV
// where UFRV is in m³/m². This is what we expose.
// ----------------------------------------------------------------------------

export interface HeadLossDevelopmentPoint {
  t_h: number;           // hours into run
  ufrv: number;          // m³/m²
  mass_loaded: number;   // kg/m² captured (η · ΔC · UFRV / 1000)
  delta_h: number;       // m of head developed (excludes clean-bed)
  total_h: number;       // m total head loss
  fraction_of_terminal: number; // delta_h / (h_T - h₀)
}

export interface HeadLossDevelopmentResult {
  h0: number;                   // clean bed
  h_T_target: number;           // h0 + (h_T - h0)
  development_rate_m_per_m3m2: number;  // dh/d(UFRV)  [m / (m³/m²)]
  development_rate_m_per_kgm2: number;  // dh/dM      [m / (kg/m²)] — useful headline
  curve: HeadLossDevelopmentPoint[];
  time_to_terminal_h: number | null; // hours — null if never reached within t_max
}

export function computeHeadLossDevelopment(
  h0: number,
  h_T_minus_h0: number,
  k_h_eff: number,    // m·L/(m³·mg)
  dC: number,         // mg/L
  v_mh: number,
  eta: number,
  t_max_h: number,
  nPoints: number = 24,
): HeadLossDevelopmentResult {
  // Rate of head loss per unit UFRV (m head per m³/m² of UFRV):
  const rate_per_ufrv = k_h_eff * dC; // m / (m³/m²)
  // UFRV at terminal head (where Δh = h_T - h0):
  const ufrv_at_terminal = rate_per_ufrv > 0 ? h_T_minus_h0 / rate_per_ufrv : Infinity;
  const t_terminal = v_mh > 0 ? ufrv_at_terminal / v_mh : Infinity;

  // Sample the curve so the operator can see:
  //   - the natural terminal point (where head loss budget is exhausted)
  //   - the operator setpoint t_max (rendered as a vertical reference)
  // We extend the x-axis to min(t_terminal × 1.2, 200 h cap) so the curve
  // always completes visually even when t_max is short. If t_max is the
  // operationally relevant horizon, the chart still shows it via the
  // reference line in the panel.
  const t_end_sample = Number.isFinite(t_terminal)
    ? Math.min(Math.max(t_terminal * 1.2, t_max_h, 1), 200)
    : Math.max(t_max_h, 1);

  const curve: HeadLossDevelopmentPoint[] = [];
  for (let i = 0; i <= nPoints; i++) {
    const t = (i / nPoints) * t_end_sample;
    const ufrv = v_mh * t;
    const mass = (eta * dC * ufrv) / 1000;     // kg/m²
    const delta_h = rate_per_ufrv * ufrv;      // m head developed
    curve.push({
      t_h: t,
      ufrv,
      mass_loaded: mass,
      delta_h,
      total_h: h0 + delta_h,
      fraction_of_terminal: h_T_minus_h0 > 0 ? delta_h / h_T_minus_h0 : 0,
    });
  }

  // Convert UFRV-rate to mass-rate for headline display
  // rate per kg/m² loaded = rate_per_ufrv / (η * ΔC / 1000)
  const massConv = (eta * dC) / 1000; // kg per m³/m²
  const development_rate_m_per_kgm2 = massConv > 0 ? rate_per_ufrv / massConv : 0;

  return {
    h0,
    h_T_target: h0 + h_T_minus_h0,
    development_rate_m_per_m3m2: rate_per_ufrv,
    development_rate_m_per_kgm2,
    curve,
    time_to_terminal_h: Number.isFinite(t_terminal) ? t_terminal : null,
  };
}

export interface OperatingConditions {
  velocity: number;        // m/h
  C_in: number;            // mg/L  (will be auto-computed if components provided)
  C_eff: number;           // mg/L
  // Terminal head loss limit (m) — the TOTAL head loss at which the run is
  // declared over (filter outlet pressure dropped to backwash trigger). This
  // is the engineering design value (typical 2.0 m for dual media, 2.5–3.0 m
  // for triple). The model auto-computes clean-bed h₀ from filter geometry
  // and uses (h_T_total − h₀) as the floc accumulation budget.
  // For backwards compatibility, callers may still pass h_T_minus_h0; if both
  // are provided, h_T_total takes precedence.
  h_T_total?: number;      // m — preferred input
  h_T_minus_h0?: number;   // m — legacy input (subtraction already done by caller)
  t_max: number;           // h scheduled max run time
  eta: number;             // 0-1 cumulative removal efficiency
  temperature?: number;    // °C, optional — affects k_h via viscosity
}

export interface SolidsFraction {
  solid: SolidsKey;
  fraction: number; // mass fraction, sum to 1 over all entries
}

export interface ShcInputs {
  filter: FilterConfig;
  operation: OperatingConditions;
  composition: SolidsFraction[]; // composition by mass of the C_in load
  // Optional: polymer dose in mg/L. Used to apply a conditioning factor to k_h_eff
  // (polymer-strengthened flocs are less compressible → slower head-loss build-up).
  polymer_mgL?: number;
  // Optional: user override for the operational SHC_max ceiling (kg/m²). When
  // supplied, overrides the composition-weighted literature default. Use this
  // to anchor the calculation to plant-measured operational SHC.
  shc_max_override?: number;
  // Optional: operational time horizon (h). Real plants backwash on a fixed
  // schedule for non-head-loss, non-mass reasons (biofilm, scheduled
  // maintenance, fixed timers, quality drift). Wateropolis 2020 reports
  // drinking-water filters commonly at 48 h "like clockwork" with up to 7
  // days for well-operated. Bloetscher 2021 reports lime softening at
  // 50–100 h. Default T_OPS_DEFAULT_H = 72 h. Set to a large number (e.g.
  // 999) to disable.
  t_ops_h?: number;
}

// Default operational time horizon (h) — applied as a third binding
// constraint alongside head loss and mass capacity. 72 h is the midpoint of
// the typical drinking-water range (48–168 h, Wateropolis 2020). Lime
// softening plants (Bloetscher 2021) operate at 50–100 h, also covered.
export const T_OPS_DEFAULT_H = 72;

// Binding constraint determines which limit terminates the run:
// - "head_loss":   Δh budget consumed (k_h × M reaches h_T − h₀)
// - "mass":        deposit mass reaches operational SHC_max (caking/mudball/
//                  surface clogging — independent of head loss)
// - "operational": time-based ceiling reached (biofilm growth, scheduled
//                  backwash, quality drift — independent of mass and head)
// - "breakthrough": filtrate quality fails before any other limit (failure mode)
export type BindingConstraint = "head_loss" | "mass" | "operational" | "breakthrough";
export type FlagTier =
  | "normal"
  | "watch_low"
  | "watch_high"
  | "flag_under"
  | "flag_exceed"
  | "alarm_under"
  | "alarm_exceed";

export interface ShcResult {
  // composition-weighted parameters
  rho_d_eff: number;
  sigma_b_eff: number;
  k_h_eff: number;
  // run length predictions
  t_h: number;          // head-loss-limited horizon (h)
  t_mass: number;       // mass-limited horizon (h) — time to reach SHC_max_eff
  t_ops: number;        // operational time horizon (h) — biofilm/schedule
  t_b: number;          // breakthrough horizon (h)
  t_max: number;        // operator setpoint (informational only — does not bind SHC)
  t_run: number;        // filter run termination = min(t_h, t_mass, t_ops); capped at 999 h
  t_run_capped: boolean; // true if natural t_run exceeded the display cap
  // Which limit binds: 'head_loss', 'mass', or 'operational'.
  // 'breakthrough' is reserved for failure-mode flag.
  binding: BindingConstraint;
  // Operational SHC_max ceiling the model used (kg/m²), and where it came from
  shc_max_eff: number;          // kg/m², after composition + config scaling
  shc_max_source: string;       // citation tag (key in SHC_MAX_CITATIONS) or 'user_override'
  shc_max_default: number;      // composition-default value (no override) for reference
  K_eff: number;                // composition-weighted K (kg/m² per m·mm)
  d_e_mean_mm: number;          // depth-weighted d_e used in SHC_max formula
  // Breakthrough-before-terminal flag: red flag for design failure.
  // If true, filter quality breaks down before head loss OR mass terminates
  // the run. Operator sees turbidity rise before reaching the binding limit.
  breakthrough_before_terminal: boolean;
  // Operator setpoint annotation: true if t_max would truncate the natural run
  setpoint_truncates_run: boolean;
  t_run_at_setpoint: number;   // = min(t_run, t_max)
  // Filter-oversized flag: setpoint_truncates_run AND t_run > 5*t_max.
  // Indicates the filter is running far below its hydraulic capacity — the
  // SHC_a_at_setpoint number is technically correct but should not be read as
  // the filter "underperforming" — it's just barely loaded.
  filter_oversized: boolean;
  // capacities (filter's design terminal — head loss reaches h_T)
  UFRV: number;       // m3/m2
  SHC_a: number;      // kg/m2/run
  SHC_v: number;      // kg/m3/run
  // capacities at operator setpoint — what the plant would actually see if t_max binds
  UFRV_at_setpoint: number;
  SHC_a_at_setpoint: number;
  // Capacity at breakthrough — operationally achievable when breakthrough fires
  // before terminal head loss (= SHC_a otherwise).
  SHC_a_at_breakthrough: number;
  // theoretical ceilings
  SHC_v_ceiling: number;
  SHC_a_ceiling: number;
  // Wet-gel deposit volume — the actual physical volume the deposit occupies
  // on the filter, including water of hydration in the floc gel structure.
  // For sweep flocs (low ρ_d) this is ~10–20× the dry-mass volume.
  // Useful disclosure: shows engineers what's physically present, vs the
  // dry-mass SHC convention used throughout the model.
  wetDepositVolume_Lm2: number;   // L of wet gel per m² of filter area
  wetDepositVolume_pctVoids: number; // fraction of bed voids occupied by wet deposit
  // for flagging when measured value provided
  flag?: FlagTier;
  ratio?: number;
  // Operational run length and SHC — what the operator would actually see.
  // = min(t_h, t_max, T_RUN_OPERATIONAL_LIMIT_H = 96 h)
  // T_RUN_OPERATIONAL_LIMIT enforces realism: real plants backwash on schedule
  // for non-head-loss reasons (biological growth, mudball formation, schedule)
  // so head-loss horizons beyond ~96 h are mathematically valid but not what
  // the operator experiences. The headline t_run and SHC_a already reflect
  // the head-loss horizon (mathematical); these fields show the operational
  // values for prominent display.
  t_run_operational: number;     // h, capped to operational realism
  SHC_a_operational: number;     // kg/m², SHC at t_run_operational
  UFRV_operational: number;      // m³/m², UFRV at t_run_operational
  // True when the operational run differs materially from the head-loss
  // horizon — used to switch the UI headline between the two values.
  operational_caps_horizon: boolean;
  // Head budget breakdown — for UI display so user can see how the model
  // partitioned terminal head loss between clean-bed and floc accumulation.
  h_T_total_used: number;     // m, total terminal limit used by the calc
  h0_used: number;            // m, clean-bed head loss subtracted
  dh_floc_budget: number;     // m, head budget that drives floc accumulation
  // input-validity warnings (non-fatal but worth surfacing in the UI)
  warnings: string[];
  // L/d analysis (only populated when filter.layers is provided)
  ld?: LdResult;
  // Head loss analysis (only populated when filter.layers is provided)
  headLoss?: CleanBedHeadLossResult;
  development?: HeadLossDevelopmentResult;
}

// Filter type defaults for L_eff factor
export function defaultLeffFactor(t: FilterType): number {
  return t === "triple" ? 0.85 : t === "dual" ? 0.8 : 0.6;
}

// Filter-type effect on the breakthrough capacity (σ_b multiplier).
// Reflects the literature observation that triple media achieves 10–25 %
// uplift over dual on the same feed because the third (garnet) layer
// supports a higher integrated σ_b. Dual is the reference (=1.0).
//
// Note on calibration: the COMBINED effect of this multiplier AND the
// L_eff_factor default (0.85 triple vs 0.80 dual) is what the user sees.
// Triple/dual: σ_b × 1.10 × (0.85/0.80) = +17% vs dual at default L_eff.
// That sits squarely in the literature 10–25% range.
export function sigmaBFilterMultiplier(t: FilterType): number {
  return t === "triple" ? 1.10 : t === "monomedia" ? 0.65 : 1.0;
}

// Likewise for k_h: triple media spreads deposit so head loss accrues
// a little more slowly per unit mass loaded. Dual is the reference.
export function kHFilterMultiplier(t: FilterType): number {
  return t === "triple" ? 0.9 : t === "monomedia" ? 1.4 : 1.0;
}

// Temperature correction on k_h: viscosity ratio relative to 20 °C.
// Uses the same Vogel fit as dynamicViscosity_Pas() so the two are consistent.
function viscosityRatio(T_C: number): number {
  const mu_20 = dynamicViscosity_Pas(20);
  return dynamicViscosity_Pas(T_C) / mu_20;
}

export function computeWeightedParameters(comp: SolidsFraction[]) {
  // Normalise fractions defensively
  const total = comp.reduce((s, c) => s + Math.max(0, c.fraction), 0) || 1;
  const norm = comp.map(c => ({ ...c, fraction: Math.max(0, c.fraction) / total }));

  // Harmonic mean for ρ_d (volume is the additive quantity)
  const inv_rho = norm.reduce(
    (s, c) => s + (c.fraction / SOLIDS[c.solid].rho_d), 0
  );
  const rho_d_eff = inv_rho > 0 ? 1 / inv_rho : 0;

  const sigma_b_eff = norm.reduce(
    (s, c) => s + c.fraction * SOLIDS[c.solid].sigma_b, 0
  );
  const k_h_eff = norm.reduce(
    (s, c) => s + c.fraction * SOLIDS[c.solid].k_h, 0
  );

  // K(deposit_class) for the SHC_max ceiling. Each solid maps to a deposit
  // class via SOLIDS[…].deposit_class, and K_DEPOSIT[class] gives the K value.
  // Composition-weighted using HARMONIC mean: a small fraction of a "weak"
  // class (low K, e.g. biological_floc 1.33) drags the bed-average K down
  // because that weak fraction forms the limiting bottleneck — it caks /
  // mudballs first, blocking the rest. Matches operational experience that
  // algal blooms or polymer-overdose events can crash a filter run even
  // when the involved mass is modest.
  //
  // Note: this returns an EFFECTIVE K for the composition. The actual SHC_max
  // ceiling for the bed is then K_eff × L × d_e_mean — computed in computeShc
  // where filter geometry is available.
  //
  // Also returns the dominant deposit class for citation surfacing in the UI.
  const inv_K = norm.reduce(
    (s, c) => s + (c.fraction / Math.max(K_DEPOSIT[SOLIDS[c.solid].deposit_class].K, 0.01)), 0
  );
  const K_eff = inv_K > 0 ? 1 / inv_K : 0;

  // Find the dominant solid (largest fraction) to surface its citation tag
  const dominant = norm.reduce(
    (acc, c) => (c.fraction > acc.fraction ? c : acc),
    norm[0] ?? { solid: "alum" as SolidsKey, fraction: 0 }
  );
  const dominant_class = SOLIDS[dominant.solid].deposit_class;
  const dominant_solid = dominant.solid;

  return { rho_d_eff, sigma_b_eff, k_h_eff, K_eff, dominant_class, dominant_solid };
}

export function computeShc(input: ShcInputs, measuredShcA?: number): ShcResult {
  const { filter, operation, composition } = input;
  const warnings: string[] = [];

  // ---- Sanitise inputs and warn ----
  const v = Math.max(0, operation.velocity);
  if (operation.velocity <= 0) warnings.push("Filtration velocity must be > 0; treating as 0.");

  // ---- Resolve depth: prefer per-layer breakdown if provided ----
  // If the user supplied per-layer depths, those are authoritative and the
  // aggregate totalDepth is derived from them. This also enables L/d output.
  let totalDepth: number;
  let ld: LdResult | undefined;
  if (filter.layers && filter.layers.length > 0) {
    const summed = filter.layers.reduce((s, l) => s + Math.max(0, l.depth), 0);
    totalDepth = summed;
    if (summed <= 0) warnings.push("Sum of layer depths must be > 0; treating as 0.");
    ld = computeLd(filter.layers);
  } else {
    totalDepth = Math.max(0, filter.totalDepth);
    if (filter.totalDepth <= 0) warnings.push("Total media depth must be > 0; treating as 0.");
  }

  // ---- Clean-bed head loss (Carman-Kozeny) ----
  // Computed early because the floc-accumulation budget = h_T_total − h₀.
  // When per-layer breakdown is missing we cannot compute h₀; in that case
  // we treat h₀ as 0 and the legacy h_T_minus_h0 input is used directly.
  let headLoss: CleanBedHeadLossResult | undefined;
  if (filter.layers && filter.layers.length > 0) {
    headLoss = computeCleanBedHeadLoss(
      filter.layers,
      v,
      operation.temperature ?? 15,
    );
    if (headLoss.ergun_warning) {
      warnings.push("Particle Reynolds number > 10 in at least one layer — Carman–Kozeny is being extrapolated outside its strict validity range. Consider Ergun-equation refinement or check velocity.");
    }
    // Surface per-layer issues (e.g. zero d_e) into the user-visible warnings.
    for (const w of headLoss.warnings) warnings.push(w);
  }
  const h0 = headLoss?.total_h0 ?? 0;

  // ---- Resolve floc-accumulation head budget (dh) ----
  // Two input modes for backward compatibility:
  //   (a) operation.h_T_total: total terminal head loss limit (m). Preferred.
  //       The model subtracts the calculated clean-bed h₀ to get the budget.
  //   (b) operation.h_T_minus_h0: the budget itself (legacy callers that
  //       pre-subtracted h₀ before passing it in).
  // h_T_total takes precedence when both are provided.
  let dh: number;
  let h_T_total: number; // for downstream display
  if (operation.h_T_total !== undefined && operation.h_T_total !== null) {
    h_T_total = Math.max(0, operation.h_T_total);
    dh = Math.max(0, h_T_total - h0);
    if (h_T_total <= 0) {
      warnings.push("Terminal head loss limit (h_T) must be > 0; treating as 0.");
    } else if (h0 >= h_T_total) {
      warnings.push(`Clean-bed head loss h₀ = ${h0.toFixed(2)} m already meets or exceeds the terminal limit h_T = ${h_T_total.toFixed(2)} m. No head budget remains for floc accumulation. Reduce velocity, use coarser media, or increase h_T.`);
    } else if (dh < 0.3) {
      warnings.push(`Floc-accumulation budget (h_T − h₀) = ${dh.toFixed(2)} m is very small. Most of the design head is spent on clean-bed friction; runs will be very short. Consider coarser media or higher h_T.`);
    }
  } else {
    // Legacy path: caller supplied h_T_minus_h0 directly
    dh = Math.max(0, operation.h_T_minus_h0 ?? 0);
    if ((operation.h_T_minus_h0 ?? 0) <= 0) warnings.push("Available head must be > 0; treating as 0.");
    h_T_total = h0 + dh;
  }

  // Bed-average porosity: if per-layer porosities are provided, use a depth-
  // weighted mean (the right physical quantity for void volume per unit area).
  // This avoids the two-source-of-truth problem where the user could set
  // filter.porosity = 0.45 while individual layers have 0.42/0.52 and get
  // inconsistent results between the breakthrough calc and the head-loss calc.
  let porosity: number;
  if (filter.layers && filter.layers.length > 0 && totalDepth > 0) {
    const weighted = filter.layers.reduce((s, l) =>
      s + Math.max(0, l.depth) * Math.max(0.05, Math.min(0.7, l.porosity)), 0);
    porosity = weighted / totalDepth;
  } else {
    porosity = Math.max(0, Math.min(1, filter.porosity));
  }
  if (porosity <= 0.25 || porosity > 0.7)
    warnings.push("Bed porosity outside plausible 0.30–0.60 range — check layer porosities.");

  const L_eff_factor = Math.max(0, Math.min(1, filter.L_eff_factor));

  const eta = Math.max(0, Math.min(1, operation.eta));
  if (operation.eta > 1) warnings.push("Removal efficiency η capped at 1.0.");

  const t_max = Math.max(0, operation.t_max);
  if (operation.t_max <= 0) warnings.push("Max run time must be > 0; treating as 0.");

  // ---- Composition-weighted parameters ----
  const { rho_d_eff, sigma_b_eff: sigma_b_raw, k_h_eff: k_h_solid, K_eff, dominant_class, dominant_solid } =
    computeWeightedParameters(composition);

  // ---- Filter-type effect on σ_b and k_h ----
  // (This is what makes triple media actually outperform dual.)
  const sigma_b_eff = sigma_b_raw * sigmaBFilterMultiplier(filter.type);
  const k_h_typed = k_h_solid * kHFilterMultiplier(filter.type);

  // ---- Polymer conditioning factor on k_h ----
  // Polymer at typical filter/coagulant-aid doses reduces head-loss build-up
  // rate PER KG OF DRY MASS LOADED — by improving floc shear strength and
  // reducing deposit compressibility (Liu 2017; Cleasby & Logsdon 1999).
  //
  // NOTE: literature can appear contradictory (e.g. Pi/Schwarzer/Gimbel 2018
  // report higher head-loss rate per UFRV with polymer). This is a system-
  // level effect: polymer ↑ → η ↑ → more solids captured per UFRV → faster
  // head loss in time. But head loss PER KG LOADED is lower with polymer
  // because the deposit is stiffer/less compressible. The model captures
  // capture efficiency separately via η; this factor is the per-kg effect.
  //
  // Literature dose ranges differ by use mode:
  //   filter aid:        0.01–0.1 mg/L  (polyacrylamide, polishing)
  //   coagulant aid:     0.05–0.25 mg/L  (post-coagulation)
  //   direct filtration: 0.2–2.0 mg/L   (cationic, primary role)
  // Per-kg k_h reduction: ~20-25% at 0.05 mg/L, ~30-40% at 0.1 mg/L,
  // saturating to ~50% at high direct-filtration doses. Saturating form:
  //   factor = 1 - 0.5 × (D_p / (D_p + 0.05))
  //   D_p = 0     → 1.00 (no effect)
  //   D_p = 0.05  → 0.75 (light coagulant aid)
  //   D_p = 0.1   → 0.67 (typical coagulant aid)
  //   D_p = 0.3   → 0.57 (heavy / direct filtration)
  //   D_p = 1.0   → 0.52 (saturating)
  // Refs: Cleasby & Logsdon 1999; Liu 2017; Australian DWG (NHMRC).
  const polymer_mgL = Math.max(0, input.polymer_mgL ?? 0);
  const polymerFactor = 1 - 0.5 * (polymer_mgL / (polymer_mgL + 0.05));
  const k_h_after_polymer = k_h_typed * polymerFactor;

  // ---- Temperature correction on k_h ----
  const k_h_eff = operation.temperature !== undefined
    ? k_h_after_polymer * viscosityRatio(operation.temperature)
    : k_h_after_polymer;

  // ---- Driving solids load ----
  const dC_raw = operation.C_in - operation.C_eff;
  if (dC_raw <= 0) {
    warnings.push("C_in is not greater than C_eff — no net solids load. Predicted SHC will be zero.");
  }
  const dC = Math.max(0, dC_raw); // mg/L — no silent floor

  // ---- Head-loss-limited run length ----
  // dh/d(UFRV) = k_h_eff * dC  (units: m per (m³/m²))
  // UFRV at terminal h = dh / (k_h_eff * dC)
  // t_h = UFRV / v
  let t_h: number;
  if (totalDepth <= 0) {
    // No media — no filter. Run length is zero regardless of head budget or
    // deposit properties. Earlier the t_h calc would still produce a number
    // because it didn't depend on depth, which was misleading.
    t_h = 0;
  } else if (dC <= 0 || k_h_eff <= 0 || v <= 0 || dh <= 0) {
    t_h = dh <= 0 ? 0 : Infinity;
  } else {
    t_h = (dh / (k_h_eff * dC)) / v;
  }

  // ---- Breakthrough-limited run length ----
  const L_eff = totalDepth * L_eff_factor;
  const poreVol_L_per_m2 = porosity * L_eff * 1000;
  const massCapacity_kg_per_m2 = (sigma_b_eff * poreVol_L_per_m2) / 1000;
  const loadingRate_kg_per_m2_per_h = (dC * v) / 1000;
  let t_b: number;
  if (loadingRate_kg_per_m2_per_h <= 0 || massCapacity_kg_per_m2 <= 0) {
    t_b = massCapacity_kg_per_m2 <= 0 ? 0 : Infinity;
  } else {
    t_b = massCapacity_kg_per_m2 / loadingRate_kg_per_m2_per_h;
  }

  // ---- Mass-limited run length (operational SHC ceiling) ----
  // SHC_max is the operational ceiling on dry-mass deposit before mass-limited
  // termination occurs. Computed from the K(deposit_class) × L × d_e formula
  // where K is calibrated against literature (see K_DEPOSIT and
  // SHC_MAX_CITATIONS). The composition-weighted K_eff comes from
  // computeWeightedParameters; here we apply the actual filter geometry.
  //
  //   SHC_max_default = K_eff × L_total × d_e_mean
  //
  // Where d_e_mean is the depth-weighted mean effective grain size (mm) and
  // L_total is the actual bed depth (m). User can override via
  // input.shc_max_override (e.g. anchored to plant data).
  //
  // Compute depth-weighted d_e for this filter
  const layersForDe = filter.layers ?? [];
  const d_e_mean_mm = totalDepth > 0 && layersForDe.length > 0
    ? layersForDe.reduce((s, l) => s + l.depth * l.d_e, 0) / totalDepth
    : 0;
  const shc_max_eff_default = K_eff * totalDepth * d_e_mean_mm;
  const userOverride = input.shc_max_override !== undefined && input.shc_max_override > 0;
  const shc_max_eff = userOverride
    ? Math.max(0, input.shc_max_override!)
    : shc_max_eff_default;

  // Mass-limited horizon: time to accumulate SHC_max_eff at this loading rate
  let t_mass: number;
  if (loadingRate_kg_per_m2_per_h <= 0 || shc_max_eff <= 0) {
    t_mass = shc_max_eff <= 0 ? 0 : Infinity;
  } else {
    t_mass = shc_max_eff / (eta * loadingRate_kg_per_m2_per_h);
  }

  // ---- Operational time horizon (third binding constraint) ----
  // Real plants backwash on a schedule for non-head-loss, non-mass reasons:
  // biofilm growth, scheduled maintenance, quality drift, fixed timers.
  // Wateropolis 2020 reports drinking-water filters commonly backwash
  // "every 48 hours like clockwork", with well-operated plants going up
  // to 7 days. Bloetscher 2021 reports Florida lime plants at 50–100 h
  // intervals. The default operational horizon is 72 h; user can override.
  // This third constraint matters most for low-load filters where head loss
  // would take hundreds of hours to bind — operationally those filters are
  // backwashed long before head loss runs out.
  const t_ops_h = Math.max(0, input.t_ops_h ?? T_OPS_DEFAULT_H);
  const t_ops_finite = t_ops_h > 0 ? t_ops_h : Infinity;

  // ---- Run termination ----
  // The filter run terminates at whichever physical/operational limit binds
  // FIRST among:
  //   t_h     — head loss reaches h_T (hydraulic limit)
  //   t_mass  — deposit reaches operational SHC_max (caking/clogging limit)
  //   t_ops   — operational time ceiling (biofilm/scheduled backwash)
  // Breakthrough (t_b) is NOT a normal termination point but a quality
  // failure flagged separately. The smallest of {t_h, t_mass, t_ops}
  // becomes t_run.
  // Cap t_run at 999 h for UI renderability. When dC → 0 (filtrate target
  // above influent), k_h_eff → 0 (incompressible deposit), or shc_max_eff → ∞
  // (unbounded), t_h or t_mass diverges to Infinity. This is meaningful — the
  // limit is never reached — but breaks charts and stat displays. Cap with
  // warning so the user knows.
  const T_RUN_CAP_H = 999;
  // Legacy soft "operational realism" threshold — kept for backward compat
  // in messages but the actual binding via t_ops makes this unnecessary.
  const T_RUN_OPERATIONAL_LIMIT_H = 96;

  // Determine the binding constraint and the resulting t_run from THREE
  // candidates: head loss, mass capacity, operational time.
  const t_h_finite = Number.isFinite(t_h) ? t_h : Infinity;
  const t_mass_finite = Number.isFinite(t_mass) ? t_mass : Infinity;
  let binding: BindingConstraint;
  let t_run_uncapped: number;
  if (totalDepth <= 0 || dC <= 0) {
    // No load or no media → t_run = 0; binding is moot but report head_loss
    binding = "head_loss";
    t_run_uncapped = 0;
  } else {
    // Pick the smallest finite horizon
    const candidates: { name: BindingConstraint; t: number }[] = [
      { name: "head_loss",   t: t_h_finite    },
      { name: "mass",        t: t_mass_finite },
      { name: "operational", t: t_ops_finite  },
    ];
    candidates.sort((a, b) => a.t - b.t);
    binding = candidates[0].name;
    t_run_uncapped = candidates[0].t;
  }
  let t_run = Math.max(0, t_run_uncapped);
  let t_run_capped = false;
  if (!Number.isFinite(t_run) || t_run > T_RUN_CAP_H) {
    t_run = T_RUN_CAP_H;
    t_run_capped = true;
    if (Number.isFinite(t_run_uncapped)) {
      const horizon_label = binding === "mass" ? "t_mass" : binding === "operational" ? "t_ops" : "t_h";
      warnings.push(`Run length capped at ${T_RUN_CAP_H} h for display — natural ${horizon_label} = ${t_run_uncapped.toFixed(0)} h.`);
    } else {
      warnings.push(`No constraint reaches terminal under these conditions. Run length capped at ${T_RUN_CAP_H} h.`);
    }
  } else if (t_run > T_RUN_OPERATIONAL_LIMIT_H && binding !== "operational") {
    warnings.push(`Predicted run length ${t_run.toFixed(0)} h exceeds typical operational practice (~${T_RUN_OPERATIONAL_LIMIT_H} h). Real plants backwash on schedule (24–72 h typical) for biological/operational reasons. Consider setting t_ops to reflect plant practice.`);
  }

  // Breakthrough-before-terminal-head-loss flag: a design failure indicator.
  // Use t_h (uncapped) for the comparison so the flag fires correctly even
  // when t_run was capped.
  // Breakthrough fires when filtrate quality fails before the run would
  // otherwise terminate. Compare against the natural binding limit
  // (uncapped), considering all three constraints.
  const t_terminal_natural = Math.min(t_h_finite, t_mass_finite, t_ops_finite);
  const breakthrough_before_terminal = Number.isFinite(t_b) && Number.isFinite(t_terminal_natural) && t_b < t_terminal_natural;

  // Operator-setpoint annotation: does t_max truncate the natural run?
  // Two sub-cases worth distinguishing in the UI:
  //   (a) Setpoint truncates a normal run (t_run > t_max but t_run within ~3×):
  //       operator setpoint is conservative; raising it would capture more
  //       capacity. Standard "orange" flag.
  //   (b) Filter is grossly oversized for the load (t_run >> t_max, e.g. >5×):
  //       the filter is running far below capacity. The "SHC at setpoint" number
  //       (e.g. 0.06 kg/m² when natural is 1.49) is mathematically correct but
  //       misleading — it makes the filter look like it's failing when it's
  //       actually just under-utilised. Flag this differently so the user
  //       sees the real story: head budget vastly exceeds load.
  const setpoint_truncates_run = Number.isFinite(t_run) && t_max > 0 && t_max < t_run;
  const t_run_at_setpoint = Math.min(t_run, Math.max(0, t_max));
  const filter_oversized = setpoint_truncates_run && t_run > 5 * t_max;

  // ---- Capacities ----
  // SHC_a at the design terminal (head loss reaches h_T, after capping for UI)
  const UFRV = v * t_run;
  const SHC_a = Number.isFinite(UFRV) ? (eta * dC * UFRV) / 1000 : 0;
  const SHC_v = totalDepth > 0 ? SHC_a / totalDepth : 0;

  // SHC_a at breakthrough — what the operator can actually achieve when
  // breakthrough fires before terminal head loss. This is the operationally
  // relevant capacity in failure-mode cases. Equals SHC_a otherwise.
  const t_for_breakthrough_capacity = Number.isFinite(t_b)
    ? Math.min(t_b, t_run)
    : t_run;
  const UFRV_at_breakthrough = v * t_for_breakthrough_capacity;
  const SHC_a_at_breakthrough = Number.isFinite(UFRV_at_breakthrough)
    ? (eta * dC * UFRV_at_breakthrough) / 1000
    : 0;

  // Capacities at the operator setpoint — what the plant would actually see
  // if t_max truncates the run. These are display-only; the headline SHC
  // figures above are the filter's natural capacity.
  const UFRV_at_setpoint = v * t_run_at_setpoint;
  const SHC_a_at_setpoint = Number.isFinite(UFRV_at_setpoint) ? (eta * dC * UFRV_at_setpoint) / 1000 : 0;

  // ---- Operational run length and SHC ----
  // What the operator would actually experience: head-loss horizon capped
  // by the operator setpoint AND by the 96 h operational realism limit.
  // Real plants don't run filters past 96 h regardless of head loss
  // because biological/mudball/scheduled-maintenance limits intervene.
  const t_run_operational = Math.min(
    t_run,                              // head-loss horizon (already capped at 999h)
    t_max > 0 ? t_max : Infinity,       // operator setpoint
    T_RUN_OPERATIONAL_LIMIT_H,          // 96 h operational realism cap
  );
  const UFRV_operational = v * t_run_operational;
  const SHC_a_operational = Number.isFinite(UFRV_operational)
    ? (eta * dC * UFRV_operational) / 1000
    : 0;
  // Material difference threshold: 10% — below this, we use the head-loss
  // horizon as the headline because operator setpoint is not really
  // "truncating" anything meaningful.
  const operational_caps_horizon = t_run > t_run_operational * 1.1;

  // ---- Theoretical pore-volume ceilings ----
  const SHC_v_ceiling = porosity * 0.25 * rho_d_eff;
  const SHC_a_ceiling = SHC_v_ceiling * totalDepth;

  // ---- Wet-gel deposit volume ----
  // Dry-mass SHC_a divided by ρ_d_eff gives the actual physical wet-gel volume
  // the deposit occupies on the filter. For sweep flocs (ρ_d ~55 kg/m³), this
  // is ~18 L of wet gel per kg/m² of dry mass — i.e. a 1 kg/m² SHC_a deposit
  // physically occupies ~18 L/m² (= 18 mm equivalent depth) of bed voids.
  // Most of that volume is bound water in the hydrate gel structure.
  // For dense deposits (CaCO₃ at ρ_d ~600), the ratio is ~1.7 L/kg, so
  // the same dry-mass SHC carries far less wet-gel volume.
  const wetDepositVolume_Lm2 = rho_d_eff > 0 ? (SHC_a / rho_d_eff) * 1000 : 0;
  // Express as fraction of bed voids (porosity × totalDepth gives total void volume per m²)
  const totalVoids_m3m2 = porosity * totalDepth;  // m³ voids per m² filter area
  const wetDepositVolume_pctVoids = totalVoids_m3m2 > 0
    ? (wetDepositVolume_Lm2 / 1000) / totalVoids_m3m2
    : 0;

  // ---- Flag ----
  let flag: FlagTier | undefined;
  let ratio: number | undefined;
  // Only flag when prediction is meaningful (>0.05 kg/m²·run threshold)
  // — protects against ratio explosions when SHC_a → 0
  if (measuredShcA !== undefined && SHC_a > 0.05) {
    ratio = measuredShcA / SHC_a;
    if (ratio < 0.30) flag = "alarm_under";
    else if (ratio < 0.50) flag = "flag_under";
    else if (ratio < 0.75) flag = "watch_low";
    else if (ratio <= 1.25) flag = "normal";
    else if (ratio <= 1.50) flag = "watch_high";
    else if (ratio <= 2.00) flag = "flag_exceed";
    else flag = "alarm_exceed";
  } else if (measuredShcA !== undefined && measuredShcA > 0) {
    warnings.push("Predicted SHC near zero — flag tier not assigned (ratio undefined).");
  }

  // Head loss development curve — generated whenever we have a meaningful
  // load and rate, regardless of whether per-layer breakdown is supplied.
  // (headLoss was computed earlier so dh could be derived from h_T_total.)
  let development: HeadLossDevelopmentResult | undefined;
  if (k_h_eff > 0 && dh > 0) {
    development = computeHeadLossDevelopment(
      h0,
      dh,
      k_h_eff,
      dC,
      v,
      eta,
      t_max,
    );
  }

  // Determine SHC_max source for display
  // If user overrode, show user_override. Otherwise show the dominant solid's
  // shc_max_ref tag (which now points to a K-class citation entry like
  // 'casey_1997_hydroxide' or 'inferred_mgoh2_smith_2020'). Fall back to the
  // K-class fit citation if the per-solid tag is missing from CITATIONS.
  let shc_max_source: string;
  if (userOverride) {
    shc_max_source = "user_override";
  } else {
    const sortedComp = [...composition].sort((a, b) => b.fraction - a.fraction);
    if (sortedComp.length > 0) {
      const tag = SOLIDS[sortedComp[0].solid].shc_max_ref;
      shc_max_source = SHC_MAX_CITATIONS[tag]
        ? tag
        : K_DEPOSIT[dominant_class].ref;
    } else {
      shc_max_source = K_DEPOSIT[dominant_class].ref;
    }
  }

  return {
    rho_d_eff, sigma_b_eff, k_h_eff,
    t_h, t_mass, t_ops: t_ops_h, t_b, t_max, t_run, binding,
    shc_max_eff,
    shc_max_source,
    shc_max_default: shc_max_eff_default,
    K_eff,
    d_e_mean_mm,
    setpoint_truncates_run, t_run_at_setpoint,
    filter_oversized,
    breakthrough_before_terminal,
    t_run_capped,
    UFRV, SHC_a, SHC_v,
    UFRV_at_setpoint, SHC_a_at_setpoint,
    SHC_a_at_breakthrough,
    SHC_v_ceiling, SHC_a_ceiling,
    t_run_operational, SHC_a_operational, UFRV_operational, operational_caps_horizon,
    wetDepositVolume_Lm2, wetDepositVolume_pctVoids,
    flag, ratio,
    h_T_total_used: h_T_total,
    h0_used: h0,
    dh_floc_budget: dh,
    warnings,
    ld,
    headLoss,
    development,
  };
}

export const FLAG_LABELS: Record<FlagTier, { label: string; tone: string; description: string }> = {
  normal: { label: "Normal", tone: "bg-emerald-100 text-emerald-800 border-emerald-300",
    description: "Within ±25 % of expected. No action — routine logging." },
  watch_low: { label: "Watch (low)", tone: "bg-amber-50 text-amber-800 border-amber-300",
    description: "Drifting low. Review last 5 runs; check coagulation pH, polymer dose, raw turbidity trend." },
  watch_high: { label: "Watch (high)", tone: "bg-amber-50 text-amber-800 border-amber-300",
    description: "Drifting high. Verify turbidimeter readings; check that breakthrough has not begun." },
  flag_under: { label: "Flag — under-performance", tone: "bg-orange-100 text-orange-800 border-orange-400",
    description: "Substantially below expected. Check coagulation diagnostics, h_T setpoint, backwash sequence; consider polymer dose increase." },
  flag_exceed: { label: "Flag — exceedance", tone: "bg-orange-100 text-orange-800 border-orange-400",
    description: "Holding more than predicted. Often indicates undetected breakthrough, miscalibrated turbidimeter, or mudball short-circuiting. Verify before extending runs." },
  alarm_under: { label: "Alarm — severe under-performance", tone: "bg-red-100 text-red-800 border-red-400",
    description: "Failing to retain solids effectively. Take filter offline if filtrate quality at risk. Inspect media, audit coagulation, verify instrumentation." },
  alarm_exceed: { label: "Alarm — sustained exceedance", tone: "bg-red-100 text-red-800 border-red-400",
    description: "Persistent >2× expected. Almost always instrumentation. Recalibrate turbidimeters, flow meters, audit C_in measurement chain." },
};

// Convenience: compute C_in from individual contributions
export type CoagulationRegime = "sweep" | "charge_neutralisation";

// Lime softening operating mode — affects what's a sensible split between
// Ca-path and Mg-path lime doses, but does not change the model math itself
// (the user retains direct control over the two dose fields). The mode is
// primarily a UX guide:
//   'ca_only' — selective Ca removal at pH ~9.5–10.0; lime to Mg-path = 0
//   'partial_mg' — pH 10.5–11.0; some Mg removal alongside Ca
//   'excess_mg' — pH 11.0–11.3 (excess lime); maximum Mg(OH)₂ generation
// Refs: Crittenden et al. 2012 Ch. 13; AWWA M16.
export type LimeMode = "ca_only" | "partial_mg" | "excess_mg";

// ----------------------------------------------------------------------------
// Coagulant dose basis conversion
// ----------------------------------------------------------------------------
// Plants meter coagulants as the supplied product (alum 14·H2O, FeCl3
// anhydrous, PACl as supplied). Lab reports and chemistry papers more often
// quote the dose as the metal equivalent — mg/L as Al³⁺ or Fe³⁺ — so doses
// of different coagulants can be compared directly.
//
// Conversions used here (stoichiometric, anhydrous metal in product):
//   Alum (Al₂(SO₄)₃·14H2O, MW 594): 2 mol Al / mol alum
//     → 1 mg Al = 594/(2×26.98) = 11.01 mg alum
//   FeCl3 anhydrous (MW 162.2):       1 mol Fe / mol
//     → 1 mg Fe = 162.2/55.85 = 2.904 mg FeCl3
//   PACl: variable; typical commercial product spec is 10% Al₂O₃ ≈ 5.3% Al
//     → 1 mg Al = 18.87 mg PACl product (default; user can override basis)
//
// The model continues to store doses in product-mg/L; metal-mg/L is a
// display-and-input convention applied in the UI via these constants.
export const DOSE_CONV = {
  alum_mgPerMgAl: 11.01,        // mg alum-14 per mg Al
  ferric_mgPerMgFe: 2.904,      // mg FeCl3 (anhydrous) per mg Fe
  pacl_mgPerMgAl: 18.87,        // mg PACl (10% Al2O3 default) per mg Al
};

// Upstream stage mode controls how applied coagulant doses translate into the
// filter-inlet C_in. Three options:
//   'direct': everything dosed reaches the filter (direct/in-line filtration)
//   'clarifier': a clarifier sits between dose and filter; user specifies
//      removal_pct and the model applies it uniformly to all upstream solids.
//      polymer_mgL is treated as POST-clarifier filter aid (no removal applied)
//      because that's how plants run filter aid.
//   'measured_inlet': user has measured the actual filter-inlet turbidity
//      (settled water sampling); coagulant doses are ignored and silt is the
//      only source of mass. This is the most reliable approach when settled
//      water turbidity is known.
export type UpstreamStage = "direct" | "clarifier" | "measured_inlet";

export interface UpstreamStageConfig {
  mode: UpstreamStage;
  removal_pct?: number;     // 0–100; used when mode='clarifier'. Default 92.
  // measured_inlet uses influent_NTU directly as the post-clarifier turbidity.
}

export interface CinComponents {
  influent_NTU: number;
  ntu_to_mgL: number;     // typically 1.0–2.5 mg/L per NTU
  alum_mgL: number;       // mg/L of dosed alum (14·H2O)
  pacl_mgL: number;       // mg/L PACl product
  ferric_mgL: number;     // mg/L FeCl3 anhydrous
  lime_caco3_mgL: number; // mg/L lime contributing to CaCO3
  lime_mgoh2_mgL: number; // mg/L lime contributing to Mg(OH)2 path
  polymer_mgL: number;
  pac_mgL: number;
  // Coagulation regime defines floc morphology and yield for this stream.
  // Sweep: voluminous gel-like Al(OH)₃/Fe(OH)₃ enmeshing colloids (default).
  // Charge neutralisation: small dense aggregates of destabilised colloids
  //   with thin metal-hydroxide surface layer; much lower precipitate yield.
  // Defined by the floc morphology, not by dose or pH alone — typical CN
  // operating windows (pH 5–6, lower doses) are advisory not constraints.
  regime?: CoagulationRegime;
  // Lime softening operating mode — UX guide for splitting lime dose
  // between Ca-path and Mg-path. Does not alter model math; user retains
  // direct control over the two dose fields.
  lime_mode?: LimeMode;
  // Upstream stage: when omitted, defaults to 'direct'.
  upstream?: UpstreamStageConfig;
}

export function computeCin(c: CinComponents) {
  const regime: CoagulationRegime = c.regime ?? "sweep";
  const upstream: UpstreamStageConfig = c.upstream ?? { mode: "direct" };

  // Defensive clamping — negatives shouldn't reach here from the UI but the
  // model should not propagate physically meaningless values regardless.
  const clamp = (x: number) => Math.max(0, x);
  const ntu = clamp(c.influent_NTU);
  const ntu_factor = clamp(c.ntu_to_mgL);
  const alum = clamp(c.alum_mgL);
  const pacl = clamp(c.pacl_mgL);
  const ferric = clamp(c.ferric_mgL);
  const lime_ca = clamp(c.lime_caco3_mgL);
  const lime_mg = clamp(c.lime_mgoh2_mgL);
  const polymer = clamp(c.polymer_mgL);
  const pac = clamp(c.pac_mgL);

  // For measured_inlet: the user-entered NTU is the SETTLED water turbidity,
  // and the dose fields are ignored entirely (the measurement already includes
  // residual floc carry-over). The polymer is still added because it's a
  // filter aid dosed downstream of the clarifier.
  const measuredMode = upstream.mode === "measured_inlet";
  const turbiditySolids = ntu * ntu_factor;       // -> silt

  // Pre-clarifier (or direct) precipitate masses
  const alumKey:    SolidsKey = regime === "charge_neutralisation" ? "alum_cn"   : "alum";
  const paclKey:    SolidsKey = regime === "charge_neutralisation" ? "pacl_cn"   : "pacl";
  const ferricKey:  SolidsKey = regime === "charge_neutralisation" ? "ferric_cn" : "ferric";

  const alumPrec_pre  = measuredMode ? 0 : alum   * (SOLIDS[alumKey].yield_c   ?? 0.26);
  const paclPrec_pre  = measuredMode ? 0 : pacl   * (SOLIDS[paclKey].yield_c   ?? 0.22);
  const fericPrec_pre = measuredMode ? 0 : ferric * (SOLIDS[ferricKey].yield_c ?? 0.66);

  // Lime stoichiometry (per Section 5.2 of the SHC review, corrected):
  //   Ca-bicarbonate path: Ca(OH)2 + Ca(HCO3)2 → 2 CaCO3 + 2 H2O
  //     1 mol lime (74 g) produces 1 mol CaCO3 from the lime itself (100 g)
  //     plus 1 mol CaCO3 from the raw water Ca (also 100 g) = 2 mol total.
  //     Per mg lime added: 1.35 mg/mg CaCO3 from the lime, + 1.35 from the water.
  //     We charge 1.35 mg/mg here (the lime-side mass). The water-side
  //     contribution should be entered separately if the user wants it
  //     reflected — most often it's already in the influent_NTU figure.
  //   Mg-bicarbonate path: Mg(HCO3)2 + 2 Ca(OH)2 → Mg(OH)2 + 2 CaCO3 + 2 H2O
  //     2 mol lime (148 g) produces 1 mol Mg(OH)2 (58 g) and 2 mol CaCO3 (200 g).
  //     Per mg lime: Mg(OH)2 = 58/148 ≈ 0.39, CaCO3 = 200/148 ≈ 1.35.
  const caco3FromCa_pre = measuredMode ? 0 : lime_ca * 1.35;
  const caco3FromMg_pre = measuredMode ? 0 : lime_mg * 1.35;
  const mgoh2_pre = measuredMode ? 0 : lime_mg * 0.39;

  const totalCaCO3_pre = caco3FromCa_pre + caco3FromMg_pre;

  // Pre-clarifier silt also includes upstream raw-water solids from NTU.
  // In 'measured_inlet' mode, the NTU IS the settled value, so silt isn't
  // pre-clarifier — it's already filter-inlet.
  const silt_pre = measuredMode ? 0 : turbiditySolids;
  const pac_pre = measuredMode ? 0 : pac;

  // Pre-clarifier total (what would reach the filter without clarification).
  // For 'direct' mode, this equals the filter-inlet C_in. For 'clarifier'
  // mode, this is the upstream loading; we apply removal_pct to get
  // post-clarifier mass. For 'measured_inlet', this is informational only
  // — the actual C_in comes from settled NTU + polymer.
  const pre_total =
    silt_pre + alumPrec_pre + paclPrec_pre + fericPrec_pre +
    totalCaCO3_pre + mgoh2_pre + polymer + pac_pre;

  // Apply clarifier removal if applicable.
  // Removal applies to all upstream solids EXCEPT polymer (filter aid is dosed
  // post-clarifier in conventional plants). User can override the default.
  // The settled-water silt fraction includes residual floc carry-over so we
  // also reduce the silt term accordingly.
  let silt_filter = silt_pre;
  let alumPrec  = alumPrec_pre;
  let paclPrec  = paclPrec_pre;
  let fericPrec = fericPrec_pre;
  let caco3FromCa = caco3FromCa_pre;
  let caco3FromMg = caco3FromMg_pre;
  let mgoh2 = mgoh2_pre;
  let pac_filter = pac_pre;

  if (upstream.mode === "clarifier") {
    const removalFrac = Math.min(1, Math.max(0, (upstream.removal_pct ?? 92) / 100));
    const passThrough = 1 - removalFrac;
    silt_filter   *= passThrough;
    alumPrec      *= passThrough;
    paclPrec      *= passThrough;
    fericPrec     *= passThrough;
    caco3FromCa   *= passThrough;
    caco3FromMg   *= passThrough;
    mgoh2         *= passThrough;
    pac_filter    *= passThrough;
  }

  // Measured-inlet mode: silt IS the filter-inlet turbidity directly, all
  // other upstream solids are zero.
  if (measuredMode) {
    silt_filter = turbiditySolids;
  }

  const totalCaCO3 = caco3FromCa + caco3FromMg;

  // Filter-inlet total (after upstream stage).
  const total =
    silt_filter + alumPrec + paclPrec + fericPrec +
    totalCaCO3 + mgoh2 + polymer + pac_filter;

  const fractions: SolidsFraction[] = [];
  const push = (key: SolidsKey, mass: number) => {
    if (mass > 0 && total > 0) fractions.push({ solid: key, fraction: mass / total });
  };
  push("silt", silt_filter);
  // Polymer and PAC follow the regime: in CN they're treated as alum_cn-equivalent
  // (because polymer in low-dose conditioning stays close to the colloid surface).
  push(alumKey, alumPrec + polymer + pac_filter);
  push(paclKey, paclPrec);
  push(ferricKey, fericPrec);
  push("caco3", totalCaCO3);
  push("mgoh2", mgoh2);

  // Regime is a user choice that defines floc morphology — the model respects
  // that choice and applies the corresponding ρ_d, σ_b, k_h values. The user
  // is responsible for selecting a regime appropriate to their actual
  // operating chemistry (pH, dose, alkalinity).
  const warnings: string[] = [];

  // Upstream-mode advisory warnings
  if (upstream.mode === "clarifier") {
    const removalPct = upstream.removal_pct ?? 92;
    if (removalPct < 50)
      warnings.push(`Clarifier removal of ${removalPct}% is unusually low — typical conventional clarifiers achieve 90–98% solids removal.`);
    if (removalPct > 99)
      warnings.push(`Clarifier removal of ${removalPct}% is unrealistically high — even well-operating clarifiers retain 1–5% carry-over.`);
  }

  // For measured-inlet mode, pre_clarifier_total is not meaningful — the
  // user has bypassed the upstream-loading view by entering settled-water
  // turbidity directly. Set equal to total so callers that display pre-
  // clarifier loading don't show a misleading partial value (it would
  // include the polymer field but no other upstream solids).
  const pre_clarifier_total = measuredMode ? total : pre_total;

  return { total, fractions, warnings, pre_clarifier_total };
}
