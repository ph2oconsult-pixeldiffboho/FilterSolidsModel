"use client";
import React from "react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-3 border-b border-slate-200 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function NumField({
  label, value, onChange, unit, step = 0.01, min, max, hint, id, disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
  id?: string;
  disabled?: boolean;
}) {
  const inputId = id || label.replace(/\s+/g, "-").toLowerCase();
  return (
    <label htmlFor={inputId} className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">
        {label}
        {unit ? <span className="text-slate-400 font-normal"> ({unit})</span> : null}
      </span>
      <input
        id={inputId}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`w-full px-3 py-1.5 text-sm border rounded tabular-nums
                   focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
                   ${disabled
                     ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                     : "bg-white border-slate-300"}`}
      />
      {hint ? <span className="block text-[11px] text-slate-400 mt-0.5">{hint}</span> : null}
    </label>
  );
}

export function Select<T extends string>({
  label, value, onChange, options, hint, id, disabled = false,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
  id?: string;
  disabled?: boolean;
}) {
  const inputId = id || label.replace(/\s+/g, "-").toLowerCase();
  return (
    <label htmlFor={inputId} className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <select
        id={inputId}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={`w-full px-3 py-1.5 text-sm border rounded
                   focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
                   ${disabled
                     ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                     : "bg-white border-slate-300"}`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint ? <span className="block text-[11px] text-slate-400 mt-0.5">{hint}</span> : null}
    </label>
  );
}

export function Stat({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="bg-slate-50 rounded border border-slate-200 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-slate-900">
        {value}
        {unit ? <span className="text-sm text-slate-500 font-normal ml-1">{unit}</span> : null}
      </div>
      {sub ? <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-slate-700 mb-2 mt-1 uppercase tracking-wide">
      {children}
    </h3>
  );
}
