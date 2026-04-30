"use client";
import React, { useMemo, useState } from "react";
import { InputPanel, defaultPanelState, panelToInputs, PanelState } from "./InputPanel";
import { ResultPanel } from "./ResultPanel";
import { DeltaPanel } from "./DeltaPanel";
import { HeadLossPanel } from "./HeadLossPanel";
import { SensitivityPanel } from "./SensitivityPanel";
import { ReferencesPanel } from "./ReferencesPanel";
import { computeShc } from "@/lib/shc";
import { Card, CardBody, CardHeader, Select } from "./ui";
import { PRESET_PAIRS, applyPresetPair } from "./presets";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { RefreshCw, ArrowLeftRight } from "lucide-react";

const LABEL_A_DEFAULT = "Scenario A";
const LABEL_B_DEFAULT = "Scenario B";

export function CompareTab() {
  const [labelA, setLabelA] = useState(LABEL_A_DEFAULT);
  const [labelB, setLabelB] = useState(LABEL_B_DEFAULT);
  const [scenarioA, setA] = useState<PanelState>(defaultPanelState());
  const [scenarioB, setB] = useState<PanelState>(() => {
    const s = defaultPanelState();
    s.c.alum_mgL = 0;
    s.c.ferric_mgL = 12;
    return s;
  });
  const [presetId, setPresetId] = useState<string>("");

  const resA = useMemo(() => {
    const p = panelToInputs(scenarioA);
    const r = computeShc(p.inputs);
    return { ...r, warnings: [...p.cinWarnings, ...r.warnings] };
  }, [scenarioA]);
  const resB = useMemo(() => {
    const p = panelToInputs(scenarioB);
    const r = computeShc(p.inputs);
    return { ...r, warnings: [...p.cinWarnings, ...r.warnings] };
  }, [scenarioB]);

  const applyPreset = (id: string) => {
    setPresetId(id);
    if (!id) return;
    const pair = applyPresetPair(id, defaultPanelState());
    if (pair) {
      setA(pair.A);
      setB(pair.B);
      const cfg = PRESET_PAIRS.find(p => p.id === id);
      if (cfg) {
        setLabelA(cfg.A.label);
        setLabelB(cfg.B.label);
      }
    }
  };

  const swap = () => {
    setA(scenarioB);
    setB(scenarioA);
    const tmp = labelA;
    setLabelA(labelB);
    setLabelB(tmp);
  };

  const reset = () => {
    setA(defaultPanelState());
    setB((() => {
      const s = defaultPanelState();
      s.c.alum_mgL = 0;
      s.c.ferric_mgL = 12;
      return s;
    })());
    setLabelA(LABEL_A_DEFAULT);
    setLabelB(LABEL_B_DEFAULT);
    setPresetId("");
  };

  // Sanitise: replace non-finite values with 0 so Recharts doesn't choke
  const safe = (n: number) => Number.isFinite(n) ? n : 0;

  // Two charts: capacity (kg/m² and kg/m³) on the left, time-based (hours and m³/m²) on the right
  const capacityData = [
    { metric: "SHC_a (kg/m²)", A: safe(resA.SHC_a), B: safe(resB.SHC_a) },
    { metric: "SHC_v (kg/m³)", A: safe(resA.SHC_v), B: safe(resB.SHC_v) },
  ];
  // Run length and UFRV are very different in magnitude (hours vs m³/m²) so
  // we plot them as one comparison row with a secondary y-axis instead of
  // forcing them onto a shared axis where run length would visually vanish.
  const runData = [
    { scenario: labelA, t_run: safe(resA.t_run), UFRV: safe(resA.UFRV) },
    { scenario: labelB, t_run: safe(resB.t_run), UFRV: safe(resB.UFRV) },
  ];

  const presetCfg = presetId ? PRESET_PAIRS.find(p => p.id === presetId) : null;

  return (
    <div className="space-y-4">

      <Card>
        <CardBody className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 min-w-0">
            <Select<string>
              label="Quick preset comparison"
              value={presetId}
              onChange={applyPreset}
              options={[
                { value: "", label: "— Custom (no preset) —" },
                ...PRESET_PAIRS.map(p => ({ value: p.id, label: p.label })),
              ]}
            />
            {presetCfg && (
              <div className="text-[11px] text-slate-500 mt-1.5">
                <span className="font-medium text-slate-700">A:</span> {presetCfg.A.description}
                <span className="mx-2 text-slate-300">·</span>
                <span className="font-medium text-slate-700">B:</span> {presetCfg.B.description}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={swap}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm
                         bg-white border border-slate-300 rounded text-slate-700
                         hover:bg-slate-50"
              title="Swap A and B"
            >
              <ArrowLeftRight className="w-4 h-4" /> Swap
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm
                         bg-white border border-slate-300 rounded text-slate-700
                         hover:bg-slate-50"
              title="Reset to defaults"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Comparison</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-brand inline-block" />
              {labelA}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-brand-light inline-block" />
              {labelB}
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Capacity</div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={capacityData} margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="metric" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => v.toFixed(2)} />
                    <Bar dataKey="A" name={labelA} fill="#1f4e79" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="B" name={labelB} fill="#2e74b5" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Run length and throughput</div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={runData} margin={{ top: 10, right: 50, bottom: 30, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="scenario" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis yAxisId="L" tick={{ fontSize: 11 }}
                           label={{ value: "Run length (h)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 10, fill: "#1f4e79" } }} />
                    <YAxis yAxisId="R" orientation="right" tick={{ fontSize: 11 }}
                           label={{ value: "UFRV (m³/m²)", angle: 90, position: "insideRight", offset: 10, style: { fontSize: 10, fill: "#0e7c66" } }} />
                    <Tooltip formatter={(v: number, name: string) =>
                      name === "UFRV" ? [v.toFixed(0) + " m³/m²", name] : [v.toFixed(1) + " h", "Run length"]} />
                    <Bar yAxisId="L" dataKey="t_run" name="Run length" fill="#1f4e79" radius={[3, 3, 0, 0]} />
                    <Bar yAxisId="R" dataKey="UFRV"  name="UFRV"       fill="#0e7c66" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <DeltaPanel A={resA} B={resB} labelA={labelA} labelB={labelB} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <ScenarioLabel value={labelA} onChange={setLabelA} colour="bg-brand" />
          <ResultPanel result={resA} title={`${labelA} — output`}
            filterArea_m2={scenarioA.filterArea_m2} velocity_mh={scenarioA.velocity} />
          <HeadLossPanel result={resA} title={`${labelA} — head loss`} />
          <InputPanel state={scenarioA} onChange={setA} title={`${labelA} — inputs`} />
          <SensitivityPanel state={scenarioA} label={labelA} />
        </div>
        <div className="space-y-4">
          <ScenarioLabel value={labelB} onChange={setLabelB} colour="bg-brand-light" />
          <ResultPanel result={resB} title={`${labelB} — output`}
            filterArea_m2={scenarioB.filterArea_m2} velocity_mh={scenarioB.velocity} />
          <HeadLossPanel result={resB} title={`${labelB} — head loss`} />
          <InputPanel state={scenarioB} onChange={setB} title={`${labelB} — inputs`} />
          <SensitivityPanel state={scenarioB} label={labelB} />
        </div>
      </div>

      <ReferencesPanel />

    </div>
  );
}

function ScenarioLabel({ value, onChange, colour }: { value: string; onChange: (v: string) => void; colour: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-sm ${colour}`} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 text-sm font-semibold text-slate-800 bg-transparent
                   border-b border-transparent hover:border-slate-300 focus:border-brand
                   focus:outline-none px-1 py-0.5"
      />
    </div>
  );
}
