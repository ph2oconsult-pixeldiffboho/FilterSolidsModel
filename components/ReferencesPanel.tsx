"use client";
import React from "react";
import { Card, CardBody, CardHeader } from "./ui";
import { BookOpen } from "lucide-react";

interface Ref {
  cite: string;
  used_for: string;
}

const REFS: { group: string; items: Ref[] }[] = [
  {
    group: "Filtration theory and modelling",
    items: [
      { cite: "Iwasaki, T. (1937). Some notes on sand filtration. Journal AWWA 29(10), 1591–1602.",
        used_for: "Coupled equations for deep-bed filtration (∂C/∂z = -λC; ∂σ/∂t = λvC); foundation of the run-length model." },
      { cite: "Carman, P.C. (1937). Fluid flow through a granular bed. Trans. Inst. Chem. Eng. 15, 150–166.",
        used_for: "Carman–Kozeny clean-bed head loss equation used in computeCleanBedHeadLoss()." },
      { cite: "Yao, K.M., Habibian, M.T. & O'Melia, C.R. (1971). Water and wastewater filtration: concepts and applications. Environ. Sci. Technol. 5(11), 1105–1112.",
        used_for: "Single-collector efficiency framework underpinning σ_b interpretation." },
      { cite: "O'Melia, C.R. & Ali, W. (1978). The role of retained particles in deep bed filtration. Prog. Water Technol. 10, 167–182.",
        used_for: "Multistage deposition kinetics — informs the ripening/breakthrough behaviour of σ_b." },
      { cite: "Trussell, R.R. & Chang, M. (1999). Review of flow through porous media as applied to head loss in water filters. J. AWWA 91(11), 50–66.",
        used_for: "Authoritative parameter set for κ_V and κ_I in head-loss equations; sphericity treatment for filter media." },
      { cite: "Tien, C. & Ramarao, B.V. (2007). Granular Filtration of Aerosols and Hydrosols, 2nd ed., Elsevier.",
        used_for: "Comprehensive treatment of deep-bed filtration; reference for filter coefficient λ behaviour with σ." },
      { cite: "Ives, K.J. (1985). Deep bed filters. In Solid–Liquid Separation, ed. L. Svarovsky, Butterworths.",
        used_for: "Practical filter run-length and head-loss correlations." },
    ],
  },
  {
    group: "Design and engineering practice",
    items: [
      { cite: "Cleasby, J.L. & Logsdon, G.S. (1999). Granular bed and precoat filtration. In Letterman, R.D. (ed.), Water Quality and Treatment, 5th ed., AWWA / McGraw-Hill, Ch. 8.",
        used_for: "SHC ranges, σ_b values (10–35 g/L voids), L/d benchmark ranges (800–2,000), backwashing fluidisation." },
      { cite: "Crittenden, J.C., Trussell, R.R., Hand, D.W., Howe, K.J. & Tchobanoglous, G. (2012). MWH's Water Treatment: Principles and Design, 3rd ed., Wiley, Chapter 11.",
        used_for: "Filter media properties (Table 11-3), shape factors, design rate ranges, dual/triple media configurations." },
      { cite: "AWWA (2022). Operational Control of Coagulation and Filtration Processes, 4th ed., Manual M37, American Water Works Association.",
        used_for: "Operating-side guidance on head-loss build-up and UFRV; flag-tier rationale." },
      { cite: "AWWA B100-16 (2016). Standard for Granular Filter Material.",
        used_for: "Specification ranges for effective size, uniformity coefficient, and acceptable suppliers' product properties." },
      { cite: "Twort, A.C., Ratnayaka, D.D. & Brandt, M.J. (2017). Twort's Water Supply, 7th ed., Butterworth-Heinemann, Chapter 8.",
        used_for: "Practical UK/European filtration design; deep-bed monomedia configurations." },
      { cite: "Voutchkov, N. (2017). Pretreatment for Reverse Osmosis Desalination, Elsevier.",
        used_for: "Dual-media SHC for SWRO pretreatment; gravity vs pressure media filter ranges." },
      { cite: "Hazen and Sawyer / AWWA Opflow (2023). Filter Optimization Guidance — UFRV and ripening management.",
        used_for: "UFRV interpretation; modern filter optimisation practice." },
    ],
  },
  {
    group: "Coagulation, softening, floc properties",
    items: [
      { cite: "AWWA & ASCE (1998). Water Treatment Plant Design, 3rd ed., McGraw-Hill.",
        used_for: "Coagulant stoichiometry; Al(OH)₃ and Fe(OH)₃ yields per mg of dosed product." },
      { cite: "EPA (Ireland). (2002). Water Treatment Manuals: Coagulation, Flocculation & Clarification.",
        used_for: "Coagulation reaction stoichiometry and floc formation mechanisms." },
      { cite: "Davis, M.L. (2010). Water and Wastewater Engineering, McGraw-Hill, Chapters on softening.",
        used_for: "Lime-soda softening reactions; CaCO₃ and Mg(OH)₂ stoichiometry; sludge characterisation." },
      { cite: "Veolia Water Handbook (online). Precipitation softening; Chemical conditioning.",
        used_for: "Cold lime softening reactions; CaCO₃/Mg(OH)₂ split in excess-lime mode." },
      { cite: "Mintz, D.M. (1966). Modern theory of filtration. Special Subject No. 10, IWSA.",
        used_for: "Linear head-loss-vs-deposit relation underpinning the development model." },
      { cite: "Studies on alum-floc compressibility and specific cake resistance (e.g. dewatering of alumino-humic sludges, IWA Publishing).",
        used_for: "k_h ranges for Al(OH)₃ vs Fe(OH)₃ vs Mg(OH)₂ — gelatinous-floc compressibility." },
      { cite: "Liu, Z., Wei, H., Li, A. & Yang, H. (2017). Influence of coagulation mechanisms and floc formation on filterability. J. Env. Sci. 56, 18–25.",
        used_for: "Distinct floc properties and filterability for charge-neutralisation vs sweep flocculation regimes (alum_cn vs alum tables)." },
      { cite: "Anderson, L. et al. (2023). Adapting direct filtration to increasing source water dissolved organic carbon. AWWA Water Science 5(5), e1352.",
        used_for: "Calibration target for CN regime / direct filtration: pilot-scale UFRV 313 m³/m² (median), filter run time 70 h (median), terminal head loss 1.98 m for adapted GAC/Ant/Sand filter. Model agrees to within ±15% on UFRV and run length at low alum dose (5 mg/L, 0.5 NTU feed)." },
      { cite: "Israeli National Water Carrier Central Filtration Plant (Adin et al., 2012). High-rate direct filtration plant performance. JAWWA 104(8).",
        used_for: "Field reference for direct filtration in CN regime: 20 m/h through 2 m anthracite achieving <0.2 NTU." },
      { cite: "Ghernaout, D. & Ghernaout, B. (2012). Sweep flocculation as a second form of charge neutralisation — a review. Desalination & Water Treatment 44(1–3), 15–28.",
        used_for: "Mechanism review distinguishing sweep flocculation from charge neutralisation; floc morphology differences." },
      { cite: "Pernitsky, D.J. (2001). Coagulation 101 / Tech Transfer Conference, AWWA Research Foundation.",
        used_for: "Practical operating windows for sweep vs CN; pH and dose ranges as advisory." },
      { cite: "Crittenden et al. (2012), MWH's Water Treatment, Ch. 9 (Coagulation).",
        used_for: "Coagulant species speciation; soluble vs precipitate fractions at different pH and dose." },
      { cite: "Cohen, Y. et al. (2017). High flux water purification using aluminium hydroxide hydrate gels. Sci. Rep. 7, PMC 5727224.",
        used_for: "Hydrate-gel structure of freshly precipitated Al(OH)₃; bound water trapped between hydroxide scaffolds explains the very low ρ_d (~55 kg/m³) of sweep flocs." },
      { cite: "Wikipedia: Aluminium hydroxide (Al(OH)₃) — entry on freshly precipitated gel formation, gibbsite/bayerite hydrate forms.",
        used_for: "Al(OH)₃·xH₂O formula with x ≈ 3–5; rationale for hydration-based interpretation of ρ_d in the model." },
    ],
  },
  {
    group: "Media properties",
    items: [
      { cite: "Cleasby, J.L. & Fan, K.S. (1981). Predicting fluidization and expansion of filter media. J. Env. Eng. Div. ASCE 107(EE3), 455–471.",
        used_for: "Sphericity values for sand, anthracite, garnet, ilmenite (Table from this paper widely cited)." },
      { cite: "Soyer, E. & Akgiray, Ö. (2009). A new simple equation for the prediction of filter expansion during backwashing. J. Wat. Sup. Res. & Tech. AQUA 58(5), 336–345.",
        used_for: "Sphericity measurement and ranges for filter media." },
      { cite: "Northern Filter Media; CEI Filtration; Starke Filter Media — supplier datasheets (2023–2026).",
        used_for: "Modern UC and ES product ranges; commercial reality of media specifications." },
      { cite: "Akkoyunlu, A. (2003). Expansion of granular filters during backwashing. Env. Eng. & Pol. Manag. — sphericity calibration.",
        used_for: "Cross-check on sphericity values for crushed silica sand and angular anthracite." },
    ],
  },
  {
    group: "Solids-type properties (composition-weighted parameters)",
    items: [
      { cite: "Knocke, W.R., Hamon, J.R. & Dulin, B.E. (1987). Effects of coagulation on sludge thickening and dewatering. J. AWWA 79(6), 89–98.",
        used_for: "Floc density and cake compressibility for Al(OH)₃ and Fe(OH)₃ sludges." },
      { cite: "Bache, D.H. & Gregory, R. (2007). Flocs in Water Treatment, IWA Publishing.",
        used_for: "Floc density (ρ_d), strength, and structure for hydroxide and mixed precipitates." },
      { cite: "Parsons, S.A. & Daniels, S.J. (1999). The use of recovered coagulants in wastewater treatment. Env. Tech. 20(9), 979–986.",
        used_for: "Density and filterability of Al/Fe hydroxide deposits." },
    ],
  },
];

export function ReferencesPanel() {
  return (
    <Card>
      <CardHeader>
        <details>
          <summary className="cursor-pointer flex items-center gap-2 text-base font-semibold text-slate-800 select-none">
            <BookOpen className="w-4 h-4" />
            References and source material
            <span className="text-xs text-slate-400 font-normal ml-auto">(click to expand)</span>
          </summary>
          <div className="mt-3 space-y-4">
            {REFS.map((g, i) => (
              <div key={i}>
                <h3 className="text-sm font-semibold text-slate-700 mb-1.5">{g.group}</h3>
                <ul className="space-y-1.5">
                  {g.items.map((r, j) => (
                    <li key={j} className="text-xs text-slate-700">
                      <div>{r.cite}</div>
                      <div className="text-[11px] text-slate-500 italic mt-0.5">→ {r.used_for}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-[11px] text-slate-500 italic pt-2 border-t border-slate-200">
              Note: where multiple sources support the same parameter range, the cited values are
              consolidated midpoints. Site-specific calibration against pilot or full-scale data
              is recommended before using model outputs for design commitments.
            </p>
          </div>
        </details>
      </CardHeader>
    </Card>
  );
}
