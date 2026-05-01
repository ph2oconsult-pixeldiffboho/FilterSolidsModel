"use client";
import React from "react";
import { Card, CardBody, CardHeader, Stat } from "./ui";
import { ShcResult, FLAG_LABELS } from "@/lib/shc";
import { AlertCircle, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

function fmt(n: number, dp = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function bindingLabel(b: ShcResult["binding"]) {
  return b === "head_loss" ? "Head loss"
       : b === "mass" ? "Mass capacity (SHC_max)"
       : b === "operational" ? "Operational time (t_ops)"
       : "Breakthrough";
}

export function ResultPanel({ result, title = "Model output", filterArea_m2, velocity_mh }: {
  result: ShcResult;
  title?: string;
  filterArea_m2?: number;
  velocity_mh?: number;
}) {
  const flagInfo = result.flag ? FLAG_LABELS[result.flag] : null;

  const flagIcon = result.flag?.startsWith("alarm") ? <ShieldAlert className="w-4 h-4" />
    : result.flag?.startsWith("flag") ? <AlertTriangle className="w-4 h-4" />
    : result.flag?.startsWith("watch") ? <AlertCircle className="w-4 h-4" />
    : <CheckCircle2 className="w-4 h-4" />;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {result.breakthrough_before_terminal ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white font-medium">
            ⚠ Breakthrough before h_T
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand text-white">
            Terminates at h_T
          </span>
        )}
      </CardHeader>
      <CardBody className="space-y-4">

        <div className="grid grid-cols-2 gap-3">
          {result.operational_caps_horizon ? (
            <div className="bg-slate-50 rounded border border-slate-200 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                Operational run length
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">
                {fmt(result.t_run_operational, 1)}
                <span className="text-sm text-slate-500 font-normal ml-1">h</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Head-loss horizon: {fmt(result.t_run, 0)} h (uncapped)
              </div>
            </div>
          ) : (
            <Stat label="Run length t_run" value={fmt(result.t_run, 1)} unit="h" />
          )}
          {result.operational_caps_horizon ? (
            <div className="bg-slate-50 rounded border border-slate-200 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                UFRV (operational)
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">
                {fmt(result.UFRV_operational, 0)}
                <span className="text-sm text-slate-500 font-normal ml-1">m³/m²</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Horizon UFRV: {fmt(result.UFRV, 0)} m³/m²
              </div>
            </div>
          ) : (
            <Stat label="UFRV (per m² filter)" value={fmt(result.UFRV, 0)} unit="m³/m²" />
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
          <div className="text-[11px] uppercase tracking-wide text-slate-600 font-medium mb-1.5">
            Solids holding capacity per run
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">
                {result.operational_caps_horizon ? "SHC areal (operational)" : "SHC areal (per m² filter)"}
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">
                {fmt(result.operational_caps_horizon ? result.SHC_a_operational : result.SHC_a, 2)} <span className="text-xs font-normal text-slate-500">kg/m²·run</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {result.operational_caps_horizon
                  ? `Horizon SHC: ${fmt(result.SHC_a, 2)} kg/m²`
                  : `Ceiling ≈ ${fmt(result.SHC_a_ceiling, 1)} kg/m²`}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">
                {result.operational_caps_horizon ? "SHC volumetric (operational)" : "SHC volumetric (per m³ bed)"}
              </div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">
                {(() => {
                  if (!result.operational_caps_horizon) return fmt(result.SHC_v, 2);
                  // SHC_v_op = SHC_a_op / totalDepth = SHC_a_op × (SHC_v / SHC_a)
                  const ratio = result.SHC_a > 0 ? result.SHC_v / result.SHC_a : 0;
                  return fmt(result.SHC_a_operational * ratio, 2);
                })()} <span className="text-xs font-normal text-slate-500">kg/m³·run</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Ceiling ≈ {fmt(result.SHC_v_ceiling, 1)} kg/m³
              </div>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-200">
            {result.operational_caps_horizon
              ? "Operational values reflect the actual run length the operator experiences (capped by setpoint or 96 h schedule limit). Head-loss horizon shows the mathematical maximum; rarely reached in practice for low-load filters."
              : "SHC_v = SHC_a / total bed depth. The two values look similar at ~1 m bed depth but diverge for shallow or deep beds — for a 1.3 m bed, SHC_v is ~23% lower than SHC_a; for a 0.5 m bed, ~2× higher."}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className={`rounded border px-2 py-1.5 ${result.binding === "head_loss" ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}>
            <div className="text-slate-500">t_h (head loss)</div>
            <div className="font-semibold tabular-nums">
              {fmt(result.t_h, 1)} h{result.binding === "head_loss" ? " ←" : ""}
            </div>
          </div>
          <div className={`rounded border px-2 py-1.5 ${result.binding === "mass" ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}>
            <div className="text-slate-500">t_mass (SHC_max)</div>
            <div className="font-semibold tabular-nums">
              {Number.isFinite(result.t_mass) ? `${fmt(result.t_mass, 1)} h` : "∞"}{result.binding === "mass" ? " ←" : ""}
            </div>
          </div>
          <div className={`rounded border px-2 py-1.5 ${result.binding === "operational" ? "bg-amber-50 border-amber-300" : "bg-slate-50 border-slate-200"}`}>
            <div className="text-slate-500">t_ops (schedule)</div>
            <div className="font-semibold tabular-nums">
              {fmt(result.t_ops, 0)} h{result.binding === "operational" ? " ←" : ""}
            </div>
          </div>
          <div className={`rounded border px-2 py-1.5 ${result.breakthrough_before_terminal ? "bg-red-50 border-red-400" : "bg-slate-50 border-slate-200"}`}>
            <div className={result.breakthrough_before_terminal ? "text-red-700" : "text-slate-500"}>
              t_b (breakthrough)
            </div>
            <div className={`font-semibold tabular-nums ${result.breakthrough_before_terminal ? "text-red-900" : ""}`}>
              {fmt(result.t_b, 1)} h{result.breakthrough_before_terminal ? " ⚠" : ""}
            </div>
          </div>
        </div>
        <div className="text-[10px] text-slate-500 -mt-2">
          Run terminates at the smallest of t_h, t_mass, t_ops. Binding constraint highlighted (←). Breakthrough fires only as a quality-failure flag.
        </div>

        {result.breakthrough_before_terminal && result.SHC_a > 0.01 && (
          <div className="bg-red-50 border border-red-300 rounded px-3 py-2 text-[11px]">
            <div className="font-semibold text-red-900 mb-0.5">
              ⚠ Quality failure: breakthrough before terminal head loss
            </div>
            <div className="text-red-800 leading-tight">
              Filter quality breaks down at t_b = <span className="font-semibold tabular-nums">{fmt(result.t_b, 1)} h</span> —
              before terminal head loss is reached at t_h = {fmt(result.t_h, 1)} h.
              Operator must backwash at breakthrough, so achievable capacity is
              SHC_a = <span className="font-semibold tabular-nums">{fmt(result.SHC_a_at_breakthrough, 2)} kg/m²</span>
              {" "}rather than the {fmt(result.SHC_a, 2)} kg/m² the head budget would allow.
              {" "}Possible mitigations: deeper bed, finer media, lower velocity, change coagulant or regime to improve floc capture.
            </div>
          </div>
        )}

        {result.setpoint_truncates_run && result.SHC_a > 0.01 && !result.breakthrough_before_terminal && (
          <div className={`${result.filter_oversized ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"} border rounded px-3 py-2 text-[11px]`}>
            <div className={`font-semibold mb-0.5 ${result.filter_oversized ? "text-blue-900" : "text-orange-900"}`}>
              {result.filter_oversized
                ? "Filter is hydraulically oversized for this load"
                : "Operator setpoint truncates the run"}
            </div>
            <div className={`leading-tight ${result.filter_oversized ? "text-blue-800" : "text-orange-800"}`}>
              {result.filter_oversized ? (
                <>
                  Predicted natural run is {fmt(result.t_run, 0)} h ({(result.t_run / Math.max(result.t_max, 1)).toFixed(0)}× the operator setpoint
                  of {fmt(result.t_max, 0)} h). The filter has substantial spare head budget — backwashing at t_max would be
                  driven by routine maintenance, not head loss. At {fmt(result.t_max, 0)} h, only{" "}
                  <span className="font-semibold tabular-nums">{fmt(result.SHC_a_at_setpoint, 2)} kg/m²</span>{" "}
                  ({((result.t_max / Math.max(result.t_run, 1e-9)) * 100).toFixed(0)}% of natural capacity) has accumulated.
                  Note that filters are usually backwashed within 1–4 days regardless of head loss for biological/operational reasons —
                  this calculation is the head-loss horizon, not a recommended run time.
                </>
              ) : (
                <>
                  Filter run terminates at t_h = {fmt(result.t_run, 1)} h capturing {fmt(result.SHC_a, 2)} kg/m².
                  At t_max = {fmt(result.t_max, 0)} h, the operator would see only
                  SHC_a = <span className="font-semibold tabular-nums">{fmt(result.SHC_a_at_setpoint, 2)} kg/m²</span>
                  {" "}(UFRV {fmt(result.UFRV_at_setpoint, 0)} m³/m²).
                </>
              )}
            </div>
          </div>
        )}

        {result.SHC_a > 0.01 && (
          <div className="bg-cyan-50 border border-cyan-200 rounded px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <span className="text-[11px] uppercase tracking-wide text-cyan-700 font-medium">Wet-floc deposit on filter</span>
                <span className="ml-2 text-sm font-semibold tabular-nums text-cyan-900">
                  {fmt(result.wetDepositVolume_Lm2, 1)} L/m²
                </span>
              </div>
              <span className="text-[11px] text-cyan-700 tabular-nums">
                {(result.wetDepositVolume_pctVoids * 100).toFixed(1)}% of bed voids
              </span>
            </div>
            <div className="text-[11px] text-cyan-800 mt-1 leading-tight">
              {fmt(result.SHC_a, 2)} kg/m² of dry hydroxide expands to {fmt(result.wetDepositVolume_Lm2, 1)} L/m² on the filter
              — a hydration ratio of {fmt(result.wetDepositVolume_Lm2 / Math.max(result.SHC_a, 1e-6), 1)}× the dry volume.
              Bound water in the floc gel is captured in ρ_d_eff = {fmt(result.rho_d_eff, 0)} kg/m³,
              not in the dry-mass yield. The terminal wet-floc volume is roughly regime-independent
              (head loss is what fills the bed); CN deposits pack more dry mass into the same wet volume
              than sweep gel, which is why CN gives higher dry-mass SHC at equivalent dose.
            </div>
          </div>
        )}

        {filterArea_m2 && filterArea_m2 > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-amber-800 font-medium mb-1.5">
              Plant totals at {fmt(filterArea_m2, 0)} m² filter area
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div className="flex justify-between border-b border-amber-100 py-0.5">
                <span className="text-amber-800">Flow rate</span>
                <span className="font-semibold tabular-nums text-amber-900">
                  {fmt((velocity_mh ?? 0) * filterArea_m2, 0)} m³/h
                </span>
              </div>
              <div className="flex justify-between border-b border-amber-100 py-0.5">
                <span className="text-amber-800">Flow rate</span>
                <span className="font-semibold tabular-nums text-amber-900">
                  {fmt(((velocity_mh ?? 0) * filterArea_m2 * 24) / 1000, 2)} ML/d
                </span>
              </div>
              <div className="flex justify-between border-b border-amber-100 py-0.5">
                <span className="text-amber-800">Volume per run</span>
                <span className="font-semibold tabular-nums text-amber-900">
                  {fmt(result.UFRV * filterArea_m2, 0)} m³
                </span>
              </div>
              <div className="flex justify-between border-b border-amber-100 py-0.5">
                <span className="text-amber-800">Mass captured per run</span>
                <span className="font-semibold tabular-nums text-amber-900">
                  {fmt(result.SHC_a * filterArea_m2, 1)} kg
                </span>
              </div>
              <div className="flex justify-between border-b border-amber-100 py-0.5">
                <span className="text-amber-800">Wet-gel per run</span>
                <span className="font-semibold tabular-nums text-amber-900">
                  {fmt((result.wetDepositVolume_Lm2 * filterArea_m2) / 1000, 2)} m³
                </span>
              </div>
              <div className="flex justify-between border-b border-amber-100 py-0.5">
                <span className="text-amber-800">Backwash water (≈6% UFRV·a)</span>
                <span className="font-semibold tabular-nums text-amber-900">
                  {fmt(0.06 * result.UFRV * filterArea_m2, 0)} m³
                </span>
              </div>
            </div>
            <div className="text-[10px] text-amber-700 mt-1.5 leading-tight">
              Display-only conversion from per-m² model results. Backwash estimate at ~6% of UFRV is a screening figure; actual depends on cycle design.
            </div>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold uppercase text-slate-600 tracking-wide mb-1.5">
            Composition-weighted parameters
          </h4>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-50 rounded border border-slate-200 px-2 py-1.5">
              <div className="text-slate-500">ρ_d,eff</div>
              <div className="font-semibold tabular-nums">{fmt(result.rho_d_eff, 0)} kg/m³</div>
            </div>
            <div className="bg-slate-50 rounded border border-slate-200 px-2 py-1.5">
              <div className="text-slate-500">σ_b,eff</div>
              <div className="font-semibold tabular-nums">{fmt(result.sigma_b_eff, 1)} g/L</div>
            </div>
            <div className="bg-slate-50 rounded border border-slate-200 px-2 py-1.5">
              <div className="text-slate-500">k_h,eff</div>
              <div className="font-semibold tabular-nums">{fmt(result.k_h_eff, 4)}</div>
            </div>
          </div>
        </div>

        {result.ld && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-slate-600 tracking-wide mb-1.5">
              Bed depth-to-grain ratio (L/d)
            </h4>
            <div className="bg-slate-50 rounded border border-slate-200 px-3 py-2">
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <div>
                  <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Σ L/d</span>
                  <span className="ml-2 text-base font-semibold tabular-nums">
                    {result.ld.total.toFixed(0)}
                  </span>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  result.ld.classification === "thin" ? "bg-amber-100 text-amber-800" :
                  result.ld.classification === "conventional" ? "bg-blue-100 text-blue-800" :
                  result.ld.classification === "robust" ? "bg-emerald-100 text-emerald-800" :
                  result.ld.classification === "deep_bed" ? "bg-violet-100 text-violet-800" :
                  "bg-rose-100 text-rose-800"
                }`}>
                  {result.ld.classificationLabel}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mb-2">{result.ld.benchmark}</div>
              <div className="space-y-0.5">
                {result.ld.perLayer.map((p, i) => (
                  <div key={i} className="flex justify-between text-[11px] tabular-nums">
                    <span className="text-slate-500">
                      {p.layer.label} ({p.layer.depth.toFixed(2)} m / {p.layer.d_e.toFixed(2)} mm)
                    </span>
                    <span className="font-medium text-slate-700">
                      L/d = {p.L_over_d.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {result.warnings && result.warnings.length > 0 && (
          <div className="border border-amber-300 bg-amber-50 rounded p-3 text-amber-900">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertCircle className="w-4 h-4" />
              Input warnings
            </div>
            <ul className="text-xs mt-1.5 space-y-0.5 list-disc pl-5">
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {flagInfo && (
          <div className={`border rounded p-3 ${flagInfo.tone}`}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              {flagIcon}
              {flagInfo.label}
              {result.ratio !== undefined && (
                <span className="font-normal opacity-75">
                  · ratio {fmt(result.ratio, 2)}× expected
                </span>
              )}
            </div>
            <div className="text-xs mt-1 opacity-90">{flagInfo.description}</div>
          </div>
        )}

      </CardBody>
    </Card>
  );
}
