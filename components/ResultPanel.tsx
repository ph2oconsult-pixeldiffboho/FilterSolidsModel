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
  return b === "head_loss" ? "Head loss" : b === "breakthrough" ? "Breakthrough" : "Time (t_max)";
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
        <span className="text-xs px-2 py-0.5 rounded-full bg-brand text-white">
          Binding: {bindingLabel(result.binding)}
        </span>
      </CardHeader>
      <CardBody className="space-y-4">

        <div className="grid grid-cols-2 gap-3">
          <Stat label="SHC areal (per m² filter)" value={fmt(result.SHC_a, 2)} unit="kg/m²·run"
            sub={`Ceiling ≈ ${fmt(result.SHC_a_ceiling, 1)} kg/m²`} />
          <Stat label="SHC volumetric (per m³ bed)" value={fmt(result.SHC_v, 2)} unit="kg/m³·run"
            sub={`Ceiling ≈ ${fmt(result.SHC_v_ceiling, 1)} kg/m³`} />
          <Stat label="Run length t_run" value={fmt(result.t_run, 1)} unit="h" />
          <Stat label="UFRV (per m² filter)" value={fmt(result.UFRV, 0)} unit="m³/m²" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-50 rounded border border-slate-200 px-2 py-1.5">
            <div className="text-slate-500">t_h (head loss)</div>
            <div className="font-semibold tabular-nums">{fmt(result.t_h, 1)} h</div>
          </div>
          <div className="bg-slate-50 rounded border border-slate-200 px-2 py-1.5">
            <div className="text-slate-500">t_b (breakthrough)</div>
            <div className="font-semibold tabular-nums">{fmt(result.t_b, 1)} h</div>
          </div>
          <div className="bg-slate-50 rounded border border-slate-200 px-2 py-1.5">
            <div className="text-slate-500">t_max</div>
            <div className="font-semibold tabular-nums">{fmt(result.t_max, 0)} h</div>
          </div>
        </div>

        {result.SHC_a > 0.01 && (
          <div className="bg-cyan-50 border border-cyan-200 rounded px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <span className="text-[11px] uppercase tracking-wide text-cyan-700 font-medium">Wet-gel deposit</span>
                <span className="ml-2 text-sm font-semibold tabular-nums text-cyan-900">
                  {fmt(result.wetDepositVolume_Lm2, 1)} L/m²
                </span>
              </div>
              <span className="text-[11px] text-cyan-700 tabular-nums">
                {(result.wetDepositVolume_pctVoids * 100).toFixed(1)}% of bed voids
              </span>
            </div>
            <div className="text-[11px] text-cyan-800 mt-1">
              SHC_a is dry-mass; the deposit on the filter is hydrated gel ({fmt(result.wetDepositVolume_Lm2 / Math.max(result.SHC_a, 1e-6), 1)}× the dry volume). Sweep flocs carry more bound water than CN deposits.
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
