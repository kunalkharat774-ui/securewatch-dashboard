import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { GlobeMap } from './components/GlobeMap';
import { UrlChecker } from './components/UrlChecker';
import { FileSecurity } from './components/FileSecurity';
import { RecentTables } from './components/RecentTables';
import { ExtraViews } from './components/ExtraViews';
import { BinaryBackground } from './components/BinaryBackground';
import { SecurityTerminal } from './components/SecurityTerminal';
import { NavView, UrlScanResult, FileActivity } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');

  // URL Scans performed by the user
  const [urlScans, setUrlScans] = useState<UrlScanResult[]>([]);

  // File Activities performed by the user
  const [fileActivities, setFileActivities] = useState<FileActivity[]>([]);

  useEffect(() => {
    const loadPersistedActivity = async () => {
      try {
        const [urlResponse, fileResponse] = await Promise.all([
          fetch('/api/url-scans', { cache: 'no-store' }),
          fetch('/api/file-activities', { cache: 'no-store' }),
        ]);
        if (urlResponse.ok) setUrlScans(await urlResponse.json());
        if (fileResponse.ok) setFileActivities(await fileResponse.json());
      } catch {
        // Local state remains available when persistence is temporarily unavailable.
      }
    };
    void loadPersistedActivity();
  }, []);

  const handleScanComplete = (newResult: UrlScanResult) => {
    setUrlScans((prev) => [newResult, ...prev]);
    void fetch('/api/url-scans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scan: newResult }),
    });
  };

  const handleFileActivity = (newActivity: FileActivity) => {
    setFileActivities((prev) => [newActivity, ...prev]);
    void fetch('/api/file-activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity: newActivity }),
    });
  };

  return (
    <SecurityTerminal>
      <div className="flex h-screen bg-[#0b1727] text-[#f9fbfd] font-sans overflow-hidden select-none relative falcon-dark-grid">
        {/* Live Falcon Dark Animated Telemetry & Matrix Canvas */}
        <BinaryBackground />

      {/* Falcon Dark Enterprise Radial Ambient Glows */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-[#2c7be5]/15 blur-[160px] rounded-full animate-ocean-pulse" />
        <div className="absolute top-1/4 right-10 w-[550px] h-[550px] bg-[#27bcfd]/12 blur-[180px] rounded-full animate-bioluminescence" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-[#3950ff]/10 blur-[170px] rounded-full" />
      </div>

      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        alertCount={12}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 bg-transparent z-10 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex-1 flex flex-col"
          >
            {/* VIEW: FULL-SCREEN LIVE ATTACK MAP */}
            {currentView === 'live-map' ? (
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-[#1f2335] pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">Live 3D Cyber Attack Globe</h2>
                    <p className="text-xs text-gray-400">Real-time global threat vectors & attack stream analytics</p>
                  </div>
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="px-3.5 py-1.5 bg-[#1a1e30] hover:bg-[#252b42] text-gray-200 text-xs rounded border border-[#1f2335] transition flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-gauge-high text-xs" /> Back to Dashboard
                  </button>
                </div>
                <div className="flex-1 relative rounded-xl overflow-hidden border border-[#1f2335] min-h-[550px]">
                  <GlobeMap isFullScreen={true} />
                </div>
              </div>
            ) : currentView === 'url-reputation' ? (
              /* VIEW 1: DEDICATED URL REPUTATION CHECKER */
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-[#1f2335] pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">URL Reputation Checker</h2>
                    <p className="text-xs text-gray-400">Scan domains and URLs for phishing, malware, and blacklist status</p>
                  </div>
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="px-3.5 py-1.5 bg-[#1a1e30] hover:bg-[#252b42] text-gray-200 text-xs rounded border border-[#1f2335] transition flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-gauge-high text-xs" /> Back to Dashboard
                  </button>
                </div>
                <div className="max-w-4xl">
                  <UrlChecker onScanComplete={handleScanComplete} recentScans={urlScans} />
                </div>
              </div>
            ) : currentView === 'file-security' ? (
              /* VIEW 2: DEDICATED FILE SECURITY ENCRYPTION */
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-[#1f2335] pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">File Security - Encrypt & Decrypt</h2>
                    <p className="text-xs text-gray-400">Secure client-side AES-GCM file encryption and decryption</p>
                  </div>
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className="px-3.5 py-1.5 bg-[#1a1e30] hover:bg-[#252b42] text-gray-200 text-xs rounded border border-[#1f2335] transition flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-gauge-high text-xs" /> Back to Dashboard
                  </button>
                </div>
                <FileSecurity onFileActivity={handleFileActivity} />
                <RecentTables urlScans={urlScans} fileActivities={fileActivities} />
              </div>
            ) : currentView !== 'dashboard' ? (
              /* OTHER SIDEBAR MODULE VIEWS */
              <ExtraViews view={currentView} onBackToDashboard={() => setCurrentView('dashboard')} />
            ) : (
              /* MAIN SECUREWATCH DASHBOARD VIEW */
              <>
                {/* Header */}
                <Header />

                {/* Top KPI Metrics */}
                <KpiCards onSelectView={setCurrentView} />

                {/* Middle Row: CyberBriefing IOC Map + URL Reputation Checker */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* 3D IOC Map Card */}
                  <div className="bg-[#030e1e]/50 backdrop-blur-md border border-cyan-500/20 hover:border-cyan-400/40 transition rounded-xl p-5 shadow-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 font-bold text-sm text-white">
                        <span>Live 3D Threat Intelligence Map</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          LIVE
                        </span>
                      </div>
                    </div>

                    {/* Embedded CyberBriefing IOC globe */}
                    <div className="mb-4 rounded-lg overflow-hidden border border-[#1a2035]">
                      <GlobeMap />
                    </div>
                  </div>

                  {/* URL Reputation Checker */}
                  <UrlChecker onScanComplete={handleScanComplete} recentScans={urlScans} />
                </div>

                {/* File Security Row */}
                <FileSecurity onFileActivity={handleFileActivity} />

                {/* Tables Row */}
                <RecentTables urlScans={urlScans} fileActivities={fileActivities} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  </SecurityTerminal>
  );
}
