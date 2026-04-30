"use client";
import React from "react";
import { Card, CardBody, CardHeader } from "./ui";
import { ShcResult } from "@/lib/shc";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

function fmt(n: number, dp = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(dp);
}

function safe(n: number) { return Number.isFinite(n) ? n : 0; }

function bindLabel(b: ShcResult["binding"]) {
  return b === "head_loss" ? "Head loss" : b === "breakthrough" ? "Breakthrough" : "Time (t_max)";
}

interface Row {
  metric: string;
  unit: string;
  a: number;
  b: number;
  goodDirection?: "up" | "down" | "neutral"; // for colouring the delta
  dp?: number;
}

function DeltaCell({ a, b, goodDirection = "up", dp = 2 }: { a: number; b: number; goodDirection?: Row["goodDirection"]; dp?: number }) {
  const delta = b - a;
  const pct = a !== 0 ? (delta / Math.abs(a)) * 100 : 0;
  const isUp = delta > 0.0001;
  const isDown = delta < -0.0001;
  const flat = !isUp && !isDown;

  const isGood =
    goodDirection === "neutral" ? false :
    goodDirection === "up" ? isUp :
    isDown;

  const colour =
    flat ? "text-slate-400" :
    isGood ? "text-emerald-700" : "text-rose-700";

  const Icon = flat ? Minus : isUp ? ArrowUp : ArrowDown;

  return (
    <span className={`inline-flex items-center gap-1 font-medium tabular-nums ${colour}`}>
      <Icon className="w-3.5 h-3.5" />
      {delta >= 0 ? "+" : ""}{fmt(delta, dp)}
      <span className="text-[11px] opacity-75">
        ({delta >= 0 ? "+" : ""}{fmt(pct, 0)}%)
      </span>
    </span>
  );
}

export function DeltaPanel({ A, B, labelA = "A", labelB = "B" }: {
  A: ShcResult; B: ShcResult; labelA?: string; labelB?: string;
}) {
  const rows: Row[] = [
    { metric: "SHC (areal)", unit: "kg/m²·run", a: safe(A.SHC_a), b: safe(B.SHC_a), goodDirection: "up", dp: 2 },
    { metric: "SHC (volumetric)", unit: "kg/m³·run", a: safe(A.SHC_v), b: safe(B.SHC_v), goodDirection: "up", dp: 2 },
    { metric: "Run length", unit: "h", a: safe(A.t_run), b: safe(B.t_run), goodDirection: "up", dp: 1 },
    { metric: "UFRV", unit: "m³/m²", a: safe(A.UFRV), b: safe(B.UFRV), goodDirection: "up", dp: 0 },
    { metric: "t_h (head loss)", unit: "h", a: safe(A.t_h), b: safe(B.t_h), goodDirection: "up", dp: 1 },
    { metric: "t_b (breakthrough)", unit: "h", a: safe(A.t_b), b: safe(B.t_b), goodDirection: "up", dp: 1 },
    { metric: "Σ L/d", unit: "—", a: safe(A.ld?.total ?? 0), b: safe(B.ld?.total ?? 0), goodDirection: "up", dp: 0 },
    { metric: "ρ_d,eff", unit: "kg/m³", a: safe(A.rho_d_eff), b: safe(B.rho_d_eff), goodDirection: "neutral", dp: 0 },
    { metric: "σ_b,eff", unit: "g/L voids", a: safe(A.sigma_b_eff), b: safe(B.sigma_b_eff), goodDirection: "up", dp: 1 },
    { metric: "k_h,eff", unit: "m·L/(m³·mg)", a: safe(A.k_h_eff), b: safe(B.k_h_eff), goodDirection: "down", dp: 4 },
    { metric: "SHC_a ceiling", unit: "kg/m²", a: safe(A.SHC_a_ceiling), b: safe(B.SHC_a_ceiling), goodDirection: "neutral", dp: 1 },
  ];

  const bindingChanged = A.binding !== B.binding;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-800">Side-by-side delta</h2>
      </CardHeader>
      <CardBody className="space-y-3">
        {bindingChanged && (
          <div className="bg-amber-50 border border-amber-300 rounded px-3 py-2 text-xs text-amber-900">
            <strong>Binding constraint changed:</strong> {bindLabel(A.binding)} (A) → {bindLabel(B.binding)} (B).
            This usually indicates a meaningful shift in design regime — the new configuration is being
            limited by a different physical mechanism. Worth understanding why before committing to the change.
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="text-left px-2 py-1.5 border border-slate-200">Metric</th>
                <th className="text-right px-2 py-1.5 border border-slate-200">{labelA}</th>
                <th className="text-right px-2 py-1.5 border border-slate-200">{labelB}</th>
                <th className="text-right px-2 py-1.5 border border-slate-200">B − A</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-2 py-1.5 border border-slate-200">
                    <span className="font-medium text-slate-800">{r.metric}</span>
                    <span className="text-slate-400 ml-1">({r.unit})</span>
                  </td>
                  <td className="text-right px-2 py-1.5 border border-slate-200">{fmt(r.a, r.dp)}</td>
                  <td className="text-right px-2 py-1.5 border border-slate-200">{fmt(r.b, r.dp)}</td>
                  <td className="text-right px-2 py-1.5 border border-slate-200">
                    <DeltaCell a={r.a} b={r.b} goodDirection={r.goodDirection} dp={r.dp} />
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100">
                <td className="px-2 py-1.5 border border-slate-200 font-medium text-slate-800">
                  Binding constraint
                </td>
                <td className="text-right px-2 py-1.5 border border-slate-200">{bindLabel(A.binding)}</td>
                <td className="text-right px-2 py-1.5 border border-slate-200">{bindLabel(B.binding)}</td>
                <td className="text-right px-2 py-1.5 border border-slate-200">
                  {bindingChanged
                    ? <span className="text-amber-700 font-medium">changed</span>
                    : <span className="text-slate-400">same</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">
          Green = direction favourable to filter performance · Red = unfavourable · Grey = neutral metric.
          k_h is "good when down" because lower head-loss build-up means longer runs.
        </p>
      </CardBody>
    </Card>
  );
}
