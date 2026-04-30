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
    rho_d: 55,
    sigma_b: 11,
    k_h: 0.0022,
    yield_c: 0.26, // alum 14·H2O, full stoichiometric
    composition: "Al(OH)₃·xH₂O",
    notes: "Gelatinous, highly compressible. Worst-case for filter run length per unit mass. Sweep regime — typical pH 6.5–8, dose 10–60 mg/L.",
  },
  alum_cn: {
    key: "alum_cn",
    label: "Alum CN deposit (charge neutralisation)",
    // Parameter calibration (red-team v8): values softened from initial estimates
    // to match literature midpoints rather than upper bounds.
    //   ρ_d: +35% vs sweep (Bache & Gregory; fractal-dimension studies show
    //        CN flocs are 20–50% denser; midpoint ≈ +35%)
    //   σ_b: +9% vs sweep (denser deposits hold marginally more per unit voids
    //        but smaller voids overall; net effect modest)
    //   k_h: -32% vs sweep (Liu 2017; cake resistance studies show CN/sweep
    //        ratios in 0.5–0.8× range; midpoint ≈ 0.68×)
    //   yield_c: 0.05 (Pernitsky 2001 — at low CN-favouring doses, much of
    //        the dosed Al stays soluble; overstated at higher doses)
    rho_d: 75,
    sigma_b: 12,
    k_h: 0.0015,
    yield_c: 0.05,
    composition: "Destabilised colloid + thin Al(OH)₃ surface layer",
    notes: "Charge-neutralisation regime — typical pH 5–6, dose 1–8 mg/L alum. Defined by floc morphology (small dense aggregates), not dose alone. At high dose (>15 mg/L) regime tips to sweep regardless of pH due to solubility.",
  },
  pacl: {
    key: "pacl",
    label: "PACl floc (sweep)",
    rho_d: 80,
    sigma_b: 15,
    k_h: 0.0016,
    yield_c: 0.22,
    composition: "Al(OH)₃ (polymerised)",
    notes: "Larger, denser, more shear-resistant than alum at equivalent Al dose. Sweep regime.",
  },
  pacl_cn: {
    key: "pacl_cn",
    label: "PACl CN deposit",
    // PACl pre-polymerised species are effective in CN at lower doses than
    // alum; deposit is denser than alum-CN. Limited direct literature data —
    // softened estimate, treat with caution.
    rho_d: 110,
    sigma_b: 16,
    k_h: 0.0012,
    yield_c: 0.06,
    composition: "Destabilised colloid + PACl surface coating",
    notes: "PACl in charge-neutralisation regime — pre-polymerised cationic species effective at lower doses than alum. Limited published parameter data; values are estimates.",
  },
  ferric: {
    key: "ferric",
    label: "Ferric hydroxide (ferric floc, sweep)",
    rho_d: 95,
    sigma_b: 17,
    k_h: 0.0014,
    yield_c: 0.66, // FeCl3 anhydrous, full stoichiometric
    composition: "Fe(OH)₃·xH₂O",
    notes: "Tougher, denser, less compressible than Al floc. Holds shape better. Sweep regime — typical pH 5.5–8.5.",
  },
  ferric_cn: {
    key: "ferric_cn",
    label: "Ferric CN deposit",
    // Fe(OH)3 solubility is far lower than Al(OH)3 — at any pH above ~3, most
    // dosed Fe precipitates. CN for ferric means low-dose with charge-driven
    // mechanism, but yield is HIGHER than for alum-CN because precipitation
    // happens regardless. Properties shift less dramatically.
    rho_d: 125,
    sigma_b: 18,
    k_h: 0.0010,
    yield_c: 0.30,
    composition: "Destabilised colloid + Fe(OH)₃ (mostly precipitated)",
    notes: "Ferric in charge-neutralisation regime — typical pH 4–6.5; less common than sweep. Higher yield than Al-CN because Fe(OH)₃ precipitates at most pH values.",
  },
  caco3: {
    key: "caco3",
    label: "Calcium carbonate",
    rho_d: 600,
    sigma_b: 35,
    k_h: 0.0006,
    composition: "CaCO₃",
    notes: "Granular, dense, near-incompressible. Excellent permeability.",
  },
  caoh2: {
    key: "caoh2",
    label: "Calcium hydroxide",
    rho_d: 300,
    sigma_b: 20,
    k_h: 0.0013,
    composition: "Ca(OH)₂",
    notes: "Sticky and partially compressible. Usually re-carbonated to CaCO₃ before filtration.",
  },
  mgoh2: {
    key: "mgoh2",
    label: "Magnesium hydroxide",
    rho_d: 70,
    sigma_b: 11,
    k_h: 0.0029,
    composition: "Mg(OH)₂",
    notes: "Highly gelatinous, very compressible. Behaves like Al(OH)₃; severely shortens runs.",
  },
  silt: {
    key: "silt",
    label: "Clay / silt (raw turbidity)",
    rho_d: 500,
    sigma_b: 28,
    k_h: 0.0010,
    composition: "Aluminosilicate",
    notes: "Granular, dense; the canonical 'river water' deposit (Cleasby's 35 g/L voids).",
  },
  algal: {
    key: "algal",
    label: "Algal organic matter",
    rho_d: 40,
    sigma_b: 7.5,
    k_h: 0.0042,
    composition: "Mixed organic",
    notes: "Worst case: low density, highly compressible, surface-active.",
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

  // Sample the curve from t = 0 to t = min(t_max, t_terminal * 1.2) so the
  // user can see the curve a bit past the terminal point if it falls before t_max
  const t_end_sample = Math.min(
    Math.max(t_max_h, 1),
    Number.isFinite(t_terminal) ? t_terminal * 1.2 : t_max_h
  );

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
  h_T_minus_h0: number;    // m available head loss
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
}

export type BindingConstraint = "head_loss" | "breakthrough" | "time";
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
  t_h: number;
  t_b: number;
  t_max: number;
  t_run: number;
  binding: BindingConstraint;
  // capacities
  UFRV: number;       // m3/m2
  SHC_a: number;      // kg/m2/run
  SHC_v: number;      // kg/m3/run
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

  return { rho_d_eff, sigma_b_eff, k_h_eff };
}

export function computeShc(input: ShcInputs, measuredShcA?: number): ShcResult {
  const { filter, operation, composition } = input;
  const warnings: string[] = [];

  // ---- Sanitise inputs and warn ----
  const v = Math.max(0, operation.velocity);
  if (operation.velocity <= 0) warnings.push("Filtration velocity must be > 0; treating as 0.");

  const dh = Math.max(0, operation.h_T_minus_h0);
  if (operation.h_T_minus_h0 <= 0) warnings.push("Available head must be > 0; treating as 0.");

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
  const { rho_d_eff, sigma_b_eff: sigma_b_raw, k_h_eff: k_h_solid } =
    computeWeightedParameters(composition);

  // ---- Filter-type effect on σ_b and k_h ----
  // (This is what makes triple media actually outperform dual.)
  const sigma_b_eff = sigma_b_raw * sigmaBFilterMultiplier(filter.type);
  const k_h_typed = k_h_solid * kHFilterMultiplier(filter.type);

  // ---- Polymer conditioning factor on k_h ----
  // Polymer at typical filter/coagulant-aid doses reduces head-loss build-up
  // rate by improving floc shear strength and reducing compressibility.
  // Literature dose ranges differ by use mode:
  //   filter aid:        0.01–0.1 mg/L  (polyacrylamide, polishing)
  //   coagulant aid:     0.05–0.25 mg/L  (post-coagulation)
  //   direct filtration: 0.2–2.0 mg/L   (cationic, primary role)
  // Operational effect: ~20-25% k_h reduction at 0.05 mg/L (light dose),
  // ~30-40% at 0.1 mg/L (typical coagulant aid), saturating to ~50% at high
  // direct-filtration doses. Saturating form:
  //   factor = 1 - 0.5 × (D_p / (D_p + 0.05))
  //   D_p = 0     → 1.00 (no effect)
  //   D_p = 0.05  → 0.75 (light coagulant aid)
  //   D_p = 0.1   → 0.67 (typical coagulant aid)
  //   D_p = 0.3   → 0.57 (heavy / direct filtration)
  //   D_p = 1.0   → 0.52 (saturating)
  // Refs: Cleasby & Logsdon 1999; Australian DWG (NHMRC); ScienceDirect.
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

  // ---- Binding ----
  const candidates: { tag: BindingConstraint; t: number }[] = [
    { tag: "head_loss", t: t_h },
    { tag: "breakthrough", t: t_b },
    { tag: "time", t: t_max },
  ];
  candidates.sort((a, b) => a.t - b.t);
  const t_run = Math.max(0, candidates[0].t);
  const binding = candidates[0].tag;

  // ---- Capacities ----
  const UFRV = v * t_run;
  const SHC_a = Number.isFinite(UFRV) ? (eta * dC * UFRV) / 1000 : 0;
  const SHC_v = totalDepth > 0 ? SHC_a / totalDepth : 0;

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

  // ---- Clean-bed head loss (Carman–Kozeny per layer) ----
  // Only computed when per-layer data is provided. h0 is informational here;
  // h_T_minus_h0 (the available head budget for floc) is the binding quantity
  // for SHC calculation, kept as the user input.
  let headLoss: CleanBedHeadLossResult | undefined;
  let development: HeadLossDevelopmentResult | undefined;
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

  // Head loss development curve — generated whenever we have a meaningful
  // load and rate, regardless of whether per-layer breakdown is supplied.
  if (k_h_eff > 0 && dh > 0) {
    development = computeHeadLossDevelopment(
      headLoss?.total_h0 ?? 0,
      dh,
      k_h_eff,
      dC,
      v,
      eta,
      t_max,
    );
  }

  return {
    rho_d_eff, sigma_b_eff, k_h_eff,
    t_h, t_b, t_max, t_run, binding,
    UFRV, SHC_a, SHC_v,
    SHC_v_ceiling, SHC_a_ceiling,
    wetDepositVolume_Lm2, wetDepositVolume_pctVoids,
    flag, ratio,
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
}

export function computeCin(c: CinComponents) {
  const regime: CoagulationRegime = c.regime ?? "sweep";

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

  const turbiditySolids = ntu * ntu_factor;       // -> silt

  // Coagulant yields depend on the regime — in CN, much of the dose stays
  // soluble and only a fraction precipitates as a thin surface layer.
  // The destabilised colloids themselves are already counted via influent_NTU.
  const alumKey:    SolidsKey = regime === "charge_neutralisation" ? "alum_cn"   : "alum";
  const paclKey:    SolidsKey = regime === "charge_neutralisation" ? "pacl_cn"   : "pacl";
  const ferricKey:  SolidsKey = regime === "charge_neutralisation" ? "ferric_cn" : "ferric";

  const alumPrec  = alum   * (SOLIDS[alumKey].yield_c   ?? 0.26);
  const paclPrec  = pacl   * (SOLIDS[paclKey].yield_c   ?? 0.22);
  const fericPrec = ferric * (SOLIDS[ferricKey].yield_c ?? 0.66);

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
  const caco3FromCa = lime_ca * 1.35;
  const caco3FromMg = lime_mg * 1.35;
  const mgoh2 = lime_mg * 0.39;

  const totalCaCO3 = caco3FromCa + caco3FromMg;

  const total =
    turbiditySolids + alumPrec + paclPrec + fericPrec +
    totalCaCO3 + mgoh2 + polymer + pac;

  const fractions: SolidsFraction[] = [];
  const push = (key: SolidsKey, mass: number) => {
    if (mass > 0 && total > 0) fractions.push({ solid: key, fraction: mass / total });
  };
  push("silt", turbiditySolids);
  // Polymer and PAC follow the regime: in CN they're treated as alum_cn-equivalent
  // (because polymer in low-dose conditioning stays close to the colloid surface).
  push(alumKey, alumPrec + polymer + pac);
  push(paclKey, paclPrec);
  push(ferricKey, fericPrec);
  push("caco3", totalCaCO3);
  push("mgoh2", mgoh2);

  // Regime-plausibility warnings.
  // CN regime requires keeping the metal hydroxide soluble — at high doses the
  // solubility limit is exceeded and the system tips into sweep regardless of pH.
  // These thresholds are approximate and intended to flag implausible inputs,
  // not enforce them. (See Pernitsky 2001, Crittenden et al. 2012.)
  const warnings: string[] = [];
  if (regime === "charge_neutralisation") {
    if (alum > 15)
      warnings.push(`Alum ${alum} mg/L with charge-neutralisation regime is implausible — at >15 mg/L the system tips into sweep regardless of pH due to Al(OH)₃ solubility. Reduce dose or set regime to sweep.`);
    if (pacl > 12)
      warnings.push(`PACl ${pacl} mg/L with charge-neutralisation regime is implausible at this dose. Consider sweep regime.`);
    if (ferric > 8)
      warnings.push(`Ferric ${ferric} mg/L with charge-neutralisation regime is implausible — Fe(OH)₃ has very low solubility, so most dosed Fe precipitates regardless of pH.`);
    // Lime softening operates at pH 10–11; CN regime requires pH 5–6.
    // The two cannot coexist physically in one stream.
    if (lime_ca > 0 || lime_mg > 0)
      warnings.push("Lime softening + charge-neutralisation regime in same stream is physically impossible — softening requires pH 10–11 while CN requires pH 5–6. Use blend mode to combine separately-treated streams.");
  }

  return { total, fractions, warnings };
}
