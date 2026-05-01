import { CompareTab } from "@/components/CompareTab";
import { GitCompare } from "lucide-react";
import { APP_VERSION, APP_VERSION_DATE, APP_VERSION_TAGLINE } from "@/lib/version";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-brand flex items-center justify-center text-white">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  SHC Comparison Tool
                </h1>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Solids holding capacity · dual & triple media RGFs · scenario A vs B
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-xs text-slate-400">
            For process engineers · all calculations local in your browser
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-5">
        <CompareTab />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 text-xs text-slate-500 flex flex-wrap justify-between gap-2">
          <div>
            Model based on Iwasaki (1937), Cleasby & Logsdon (1999), MWH Water Treatment (2012),
            and the consolidated literature on coagulant and softening floc properties.
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono">{APP_VERSION}</span>
            <span className="text-slate-400">·</span>
            <span>{APP_VERSION_DATE}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600">{APP_VERSION_TAGLINE}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
