"use client";
import React, { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Select } from "./ui";
import { PanelState, panelToInputs } from "./InputPanel";
import { computeShc } from "@/lib/shc";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from "recharts";

type SweepVar =
  | "velocity" | "alum" | "ferric" | "polymer"
  | "temperature" | "C_eff" | "h_budget"
  | "anth_depth" | "anth_de" | "anth_psi" | "anth_porosity"
  | "blend_ratio";

const SWEEPS: Record<SweepVar, {
  label: string;
  unit: string;
  getValue: (s: PanelState) => number;
  setValue: (s: PanelState, v: number) => PanelState;
  range: (centre: number) => number[];
}> = {
  velocity: {
    label: "Filtration velocity", unit: "m/h",
    getValue: s => s.velocity,
    setValue: (s, v) => ({ ...s, velocity: v }),
    range: c => sweepRange(Math.max(c, 1), 0.4, 1.8, 9, 1),
  },
  alum: {
    label: "Alum dose", unit: "mg/L",
    getValue: s => s.c.alum_mgL,
    setValue: (s, v) => ({ ...s, c: { ...s.c, alum_mgL: v } }),
    range: c => sweepRange(Math.max(c, 5), 0.2, 2.5, 9, 5),
  },
  ferric: {
    label: "Ferric dose", unit: "mg/L",
    getValue: s => s.c.ferric_mgL,
    setValue: (s, v) => ({ ...s, c: { ...s.c, ferric_mgL: v } }),
    range: c => sweepRange(Math.max(c, 4), 0.2, 2.5, 9, 1),
  },
  polymer: {
    label: "Polymer dose", unit: "mg/L",
    getValue: s => s.c.polymer_mgL,
    setValue: (s, v) => ({ ...s, c: { ...s.c, polymer_mgL: v } }),
    range: c => sweepRange(Math.max(c, 0.1), 0, 3, 9, 0.05),
  },
  temperature: {
    label: "Water temperature", unit: "°C",
    getValue: s => s.temperature,
    setValue: (s, v) => ({ ...s, temperature: v }),
    range: c => [2, 5, 8, 12, 15, 20, 25, 30],
  },
  C_eff: {
    label: "Filtrate target C_eff", unit: "mg/L",
    getValue: s => s.C_eff,
    setValue: (s, v) => ({ ...s, C_eff: v }),
    range: c => sweepRange(c, 0.1, 5, 9, 0.05),
  },
  h_budget: {
    label: "Head budget (h_T − h₀)", unit: "m",
    getValue: s => s.h_T_minus_h0,
    setValue: (s, v) => ({ ...s, h_T_minus_h0: v }),
    range: c => sweepRange(c, 0.4, 2, 9, 0.1),
  },
  anth_depth: {
    label: "Top layer depth", unit: "m",
    getValue: s => s.layers[0]?.depth ?? 0,
    setValue: (s, v) => ({ ...s, layers: s.layers.map((l, i) => i === 0 ? { ...l, depth: v } : l) }),
    range: c => sweepRange(c, 0.4, 2, 9, 0.05),
  },
  anth_de: {
    label: "Top layer d_e", unit: "mm",
    getValue: s => s.layers[0]?.d_e ?? 0,
    setValue: (s, v) => ({ ...s, layers: s.layers.map((l, i) => i === 0 ? { ...l, d_e: v } : l) }),
    range: c => sweepRange(c, 0.5, 1.7, 9, 0.05),
  },
  anth_psi: {
    label: "Top layer sphericity ψ", unit: "—",
    getValue: s => s.layers[0]?.sphericity ?? 0,
    setValue: (s, v) => ({ ...s, layers: s.layers.map((l, i) => i === 0 ? { ...l, sphericity: v } : l) }),
    range: c => [0.45, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90],
  },
  anth_porosity: {
    label: "Top layer porosity ε", unit: "—",
    getValue: s => s.layers[0]?.porosity ?? 0,
    setValue: (s, v) => ({ ...s, layers: s.layers.map((l, i) => i === 0 ? { ...l, porosity: v } : l) }),
    range: c => [0.38, 0.42, 0.46, 0.50, 0.52, 0.54, 0.56, 0.60],
  },
  blend_ratio: {
    label: "Blend: Stream A flow share", unit: "—",
    getValue: s => s.blend.fractionA,
    setValue: (s, v) => ({ ...s, blend: { ...s.blend, enabled: true, fractionA: Math.max(0, Math.min(1, v)) } }),
    range: c => [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  },
};

// Generate a sweep range around centre value: [centre*minMult ... centre*maxMult]
function sweepRange(centre: number, minMult: number, maxMult: number, n: number, snap: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const f = minMult + ((maxMult - minMult) * i) / (n - 1);
    const v = centre * f;
    out.push(snap > 0 ? Math.round(v / snap) * snap : v);
  }
  return Array.from(new Set(out.filter(v => v >= 0))).sort((a, b) => a - b);
}

export function SensitivityPanel({
  state,
  label = "scenario",
}: {
  state: PanelState;
  label?: string;
}) {
  const [sweep, setSweep] = useState<SweepVar>("velocity");

  const cfg = SWEEPS[sweep];
  const centre = cfg.getValue(state);

  const data = useMemo(() => {
    const values = cfg.range(centre);
    return values.map(v => {
      const ns = cfg.setValue(state, v);
      const r = computeShc(panelToInputs(ns).inputs);
      return {
        x: parseFloat(v.toFixed(3)),
        SHC_a: parseFloat(r.SHC_a.toFixed(3)),
        SHC_v: parseFloat(r.SHC_v.toFixed(3)),
        t_run: parseFloat(r.t_run.toFixed(2)),
        binding: r.binding,
      };
    });
  }, [state, sweep]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">
          Sensitivity check ({label})
        </h3>
        <div className="w-full sm:w-72">
          <Select<SweepVar>
            label="Variable"
            value={sweep}
            onChange={setSweep}
            options={Object.entries(SWEEPS).map(([k, v]) => ({ value: k as SweepVar, label: v.label }))}
          />
        </div>
      </CardHeader>
      <CardBody className="space-y-2">
        <div className="text-[11px] text-slate-500">
          Showing how SHC and run length respond to {cfg.label.toLowerCase()} around the current value
          ({centre.toFixed(2)} {cfg.unit}). Other inputs held constant.
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 50, bottom: 38, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="x" tick={{ fontSize: 11 }}
                     label={{ value: `${cfg.label} (${cfg.unit})`, position: "insideBottom", offset: -22, style: { fontSize: 11 } }} />
              <YAxis yAxisId="L" orientation="left" tick={{ fontSize: 11 }}
                     label={{ value: "SHC (kg/m² or kg/m³)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
              <YAxis yAxisId="R" orientation="right" tick={{ fontSize: 11 }}
                     label={{ value: "Run (h)", angle: 90, position: "insideRight", style: { fontSize: 11 } }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="L" x={parseFloat(centre.toFixed(3))} stroke="#94a3b8" strokeDasharray="3 3" />
              <Line yAxisId="L" type="monotone" dataKey="SHC_a" name="SHC_a (kg/m²)"
                    stroke="#1f4e79" strokeWidth={2} dot />
              <Line yAxisId="L" type="monotone" dataKey="SHC_v" name="SHC_v (kg/m³)"
                    stroke="#2e74b5" strokeWidth={2} dot />
              <Line yAxisId="R" type="monotone" dataKey="t_run" name="Run length (h)"
                    stroke="#0e7c66" strokeWidth={2} dot strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Highlight any binding-constraint switches across the sweep */}
        {(() => {
          const transitions: { from: string; to: string; at: number }[] = [];
          for (let i = 1; i < data.length; i++) {
            if (data[i].binding !== data[i - 1].binding) {
              transitions.push({
                from: data[i - 1].binding,
                to: data[i].binding,
                at: data[i].x,
              });
            }
          }
          if (transitions.length === 0) return null;
          return (
            <div className="bg-amber-50 border border-amber-300 rounded px-2 py-1.5 text-[11px] text-amber-900">
              <span className="font-medium">Binding constraint changes within the sweep:</span>{" "}
              {transitions.map((t, i) =>
                <span key={i} className="ml-1">
                  {t.from} → {t.to} at {t.at} {cfg.unit}
                  {i < transitions.length - 1 ? "," : ""}
                </span>
              )}
            </div>
          );
        })()}
      </CardBody>
    </Card>
  );
}
