"use client";
import React from "react";
import { Card, CardBody, CardHeader } from "./ui";
import { ShcResult } from "@/lib/shc";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Area, ComposedChart,
} from "recharts";

function fmt(n: number, dp = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

export function HeadLossPanel({ result, title = "Head loss" }: { result: ShcResult; title?: string }) {
  if (!result.headLoss && !result.development) return null;

  const hl = result.headLoss;
  const dev = result.development;

  const curveData = dev?.curve.map(p => ({
    t: parseFloat(p.t_h.toFixed(2)),
    total: parseFloat(p.total_h.toFixed(3)),
    clean: parseFloat((dev.h0).toFixed(3)),
    target: parseFloat(dev.h_T_target.toFixed(3)),
    mass: parseFloat(p.mass_loaded.toFixed(3)),
  })) ?? [];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </CardHeader>
      <CardBody className="space-y-4">

        {hl && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-slate-600 tracking-wide mb-1.5">
              Clean-bed head loss (Carman–Kozeny)
            </h4>
            <div className="bg-slate-50 rounded border border-slate-200 px-3 py-2 mb-2">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Total h₀</span>
                  <span className="ml-2 text-base font-semibold tabular-nums">{fmt(hl.total_h0, 3)} m</span>
                  <span className="ml-1 text-xs text-slate-500">water column</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  T = {fmt(hl.temperature_C, 0)} °C · μ = {(hl.viscosity_Pas * 1000).toFixed(3)} mPa·s
                </div>
              </div>
            </div>
            <div className="space-y-1">
              {hl.perLayer.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 text-[11px] tabular-nums items-center
                                        bg-white rounded border border-slate-200 px-2 py-1">
                  <div className="col-span-3 font-medium text-slate-700">
                    {p.layer.label}
                  </div>
                  <div className="col-span-3 text-slate-500">
                    {p.layer.depth.toFixed(2)} m / d_e {p.layer.d_e.toFixed(2)} mm
                  </div>
                  <div className="col-span-3 text-slate-500">
                    ψ {p.layer.sphericity.toFixed(2)} · ε {p.layer.porosity.toFixed(2)}
                  </div>
                  <div className="col-span-2 text-right font-medium text-slate-800">
                    {fmt(p.h0_layer, 3)} m
                  </div>
                  <div className={`col-span-1 text-right text-[10px] ${p.reynolds > 10 ? "text-amber-700 font-medium" : "text-slate-400"}`}>
                    Re {fmt(p.reynolds, 1)}
                  </div>
                </div>
              ))}
            </div>
            {hl.ergun_warning && (
              <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Re &gt; 10 in at least one layer — Carman–Kozeny is being extrapolated.
                Consider Ergun for high-velocity / coarse-media designs.
              </div>
            )}
          </div>
        )}

        {dev && curveData.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase text-slate-600 tracking-wide mb-1.5">
              Head loss development through the run
            </h4>
            <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
              <div className="bg-slate-50 rounded border border-slate-200 px-2 py-1.5">
                <div className="text-slate-500">dh/d(UFRV)</div>
                <div className="font-semibold tabular-nums">{fmt(dev.development_rate_m_per_m3m2, 4)} m/(m³/m²)</div>
              </div>
              <div className="bg-slate-50 rounded border border-slate-200 px-2 py-1.5">
                <div className="text-slate-500">dh/dM (per kg/m² loaded)</div>
                <div className="font-semibold tabular-nums">{fmt(dev.development_rate_m_per_kgm2, 2)} m/(kg/m²)</div>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curveData} margin={{ top: 8, right: 12, bottom: 22, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="t" tick={{ fontSize: 11 }}
                         label={{ value: "Time (h)", position: "insideBottom", offset: -8, style: { fontSize: 11 } }} />
                  <YAxis tick={{ fontSize: 11 }}
                         label={{ value: "Head loss (m)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                  <Tooltip
                    formatter={(v: number, name: string) => [v.toFixed(3) + " m", name]}
                    labelFormatter={(t) => `t = ${t} h`} />
                  <ReferenceLine y={dev.h_T_target} stroke="#dc2626" strokeDasharray="4 4"
                                 label={{ value: `Terminal h_T = ${dev.h_T_target.toFixed(2)} m`, fontSize: 10, fill: "#dc2626", position: "insideTopLeft" }} />
                  <ReferenceLine y={dev.h0} stroke="#94a3b8" strokeDasharray="3 3"
                                 label={{ value: `h₀ = ${dev.h0.toFixed(2)} m`, fontSize: 10, fill: "#64748b", position: "insideBottomLeft" }} />
                  <Line type="monotone" dataKey="total" name="Total head loss"
                        stroke="#1f4e79" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {dev.time_to_terminal_h !== null && (
              <div className="text-[11px] text-slate-500 mt-1">
                Time to terminal head loss: <span className="tabular-nums font-medium text-slate-700">{fmt(dev.time_to_terminal_h, 1)} h</span>
                {result.binding === "head_loss" ? " (binding constraint)" : ""}
              </div>
            )}
          </div>
        )}

      </CardBody>
    </Card>
  );
}
