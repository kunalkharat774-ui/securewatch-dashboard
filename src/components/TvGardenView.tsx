import React, { useState } from 'react';
import {
  Camera,
  Tv,
  RefreshCw,
  CheckCircle2,
  Info,
  Video,
  Eye,
  ShieldCheck
} from 'lucide-react';

export const TvGardenView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'webcams' | 'tv-garden'>('webcams');
  const [iframeKey, setIframeKey] = useState<number>(0);

  const LIVE_WEBCAMS_URL = 'https://liveworldwebcams.com/';
  const TV_GARDEN_URL = 'https://tvgarden.world/tv';

  const currentUrl = activeTab === 'webcams' ? LIVE_WEBCAMS_URL : TV_GARDEN_URL;

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
              <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                {activeTab === 'webcams' ? (
                  <Camera className="w-6 h-6 animate-pulse text-cyan-400" />
                ) : (
                  <Tv className="w-6 h-6 animate-pulse text-indigo-400" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
                  {activeTab === 'webcams' ? 'Live World Webcams Hub' : 'World TV Garden'}
                  <span className="text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Feed Active
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {activeTab === 'webcams'
                    ? 'Explore real-time streaming webcams, city skylines, traffic cameras, and global landmark streams.'
                    : 'Explore thousands of live world television broadcasts, news networks, and international TV feeds across the globe.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={reloadIframe}
              className="px-4 py-2.5 bg-[#12182e] hover:bg-[#1a2242] text-gray-300 hover:text-white border border-[#232c4d] rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" /> Reload Stream
            </button>
          </div>
        </div>

        {/* Source Mode Switcher */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#1d2342]/80 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('webcams');
              setIframeKey((prev) => prev + 1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'webcams'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/50'
                : 'bg-[#12182e] text-gray-400 hover:text-white border border-[#232c4d] hover:bg-[#1a2242]'
            }`}
          >
            <Camera className="w-4 h-4" /> Live World Webcams
          </button>

          <button
            onClick={() => {
              setActiveTab('tv-garden');
              setIframeKey((prev) => prev + 1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tv-garden'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/50'
                : 'bg-[#12182e] text-gray-400 hover:text-white border border-[#232c4d] hover:bg-[#1a2242]'
            }`}
          >
            <Tv className="w-4 h-4" /> World TV Garden
          </button>
        </div>
      </div>

      {/* Main Stream Frame Container */}
      <div className="bg-[#0b0f1f] border border-[#1d2342] rounded-2xl p-4 space-y-3 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between pb-2 border-b border-[#1d2342] gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            {activeTab === 'webcams' ? (
              <Video className="w-4 h-4 text-cyan-400" />
            ) : (
              <Tv className="w-4 h-4 text-indigo-400" />
            )}
            {activeTab === 'webcams' ? 'Live World Webcams Feed' : 'World TV Garden Broadcast Feed'}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> SSL Stream Active
            </span>
          </div>
        </div>

        {/* Embedded Portal Frame */}
        <div className="relative h-[720px] w-full rounded-xl overflow-hidden border border-[#1d2342] bg-black shadow-inner group">
          <iframe
            key={`${activeTab}-${iframeKey}`}
            src={currentUrl}
            title={activeTab === 'webcams' ? 'Live World Webcams Portal' : 'World TV Garden Live'}
            className="w-full h-full border-0"
            allow="autoplay; camera; microphone; encrypted-media; picture-in-picture; fullscreen; geolocation"
            allowFullScreen
          />
        </div>

        {/* Informational Footer Bar */}
        <div className="p-3 bg-[#10162e] border border-[#1f284a] rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs font-mono text-gray-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {activeTab === 'webcams'
                ? 'Tip: Explore real-time public webcams, landmark surveillance streams, and city weather cams worldwide.'
                : 'Tip: World TV Garden lets you spin the 3D interactive globe to discover live regional television networks.'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-400 text-[11px]">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-blue-400" /> Visual Telemetry
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> OSINT Monitoring
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
