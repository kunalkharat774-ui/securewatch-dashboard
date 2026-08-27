import React from 'react';
import { Smartphone, ArrowLeft, ShieldCheck } from 'lucide-react';

interface MobileTrackerViewProps {
  onBackToDashboard: () => void;
}

export const MobileTrackerView: React.FC<MobileTrackerViewProps> = ({ onBackToDashboard }) => {
  return (
    <section className="glass-panel rounded-xl p-6 md:p-8 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3 text-cyan-300">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">SecureWatch Tool</p>
            <h2 className="mt-1 text-xl font-bold text-white">Mobile Security Tracker</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Mobile tracking telemetry is ready for an authorized device integration.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1.5 text-xs text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Protected
        </span>
      </div>
      <button
        type="button"
        onClick={onBackToDashboard}
        className="mt-8 inline-flex items-center gap-2 rounded-md border border-slate-600/70 bg-slate-900/70 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/50 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </button>
    </section>
  );
};
