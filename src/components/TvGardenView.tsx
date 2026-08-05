import React, { useState } from 'react';
import {
  Tv,
  RefreshCw,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const TvGardenView: React.FC = () => {
  const [iframeKey, setIframeKey] = useState<number>(0);

  const TV_GARDEN_URL = 'https://tvgarden.world/tv';

  const reloadIframe = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0b0f1f] border border-[#1d2342] rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Tv className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
                  World TV Garden
                  <span className="text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Broadcast
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Explore thousands of live world television broadcasts, news networks, and international TV feeds across the globe.
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={reloadIframe}
              className="px-4 py-2.5 bg-[#12182e] hover:bg-[#1a2242] text-gray-300 hover:text-white border border-[#232c4d] rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" /> Reload TV Feed
            </button>
          </div>
        </div>
      </div>

      {/* Main World TV Garden Frame */}
      <div className="bg-[#0b0f1f] border border-[#1d2342] rounded-2xl p-4 space-y-3 shadow-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-[#1d2342]">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Tv className="w-4 h-4 text-indigo-400" />
            World TV Garden Live Feed
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> Embed Active
            </span>
          </div>
        </div>

        {/* World TV Garden Main Frame */}
        <div className="relative h-[700px] w-full rounded-xl overflow-hidden border border-[#1d2342] bg-black shadow-inner">
          <iframe
            key={iframeKey}
            src={TV_GARDEN_URL}
            title="World TV Garden Live"
            className="w-full h-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>

        <div className="p-3 bg-[#10162e] border border-[#1f284a] rounded-xl flex items-center gap-2 text-xs font-mono text-gray-300">
          <Info className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Tip: World TV Garden lets you spin the 3D globe and tune into live regional broadcasts in real-time.
          </span>
        </div>
      </div>
    </div>
  );
};
