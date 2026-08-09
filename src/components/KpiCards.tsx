import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface KpiCardsProps {
  onSelectView?: (viewId: string) => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ onSelectView }) => {
  const [totalRequests, setTotalRequests] = useState<number>(24810450);
  const [activeThreats, setActiveThreats] = useState<number>(156);
  const [vulnerabilities, setVulnerabilities] = useState<number>(28);
  const [riskScore, setRiskScore] = useState<number>(72);
  const [activeModal, setActiveModal] = useState<'requests' | 'threats' | 'vulns' | 'risk' | null>(null);

  // Live real-time tick simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalRequests((prev) => prev + Math.floor(Math.random() * 8 + 3));

      if (Math.random() > 0.7) {
        const threatDelta = Math.random() > 0.5 ? 1 : -1;
        setActiveThreats((prev) => Math.max(120, Math.min(220, prev + threatDelta)));
      }

      if (Math.random() > 0.85) {
        const vulnDelta = Math.random() > 0.6 ? -1 : 1;
        setVulnerabilities((prev) => Math.max(10, Math.min(50, prev + vulnDelta)));
      }
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const formatMillions = (num: number) => {
    return (num / 1000000).toFixed(3) + 'M';
  };

  const cards = [
    {
      id: 'requests',
      title: 'Total Requests',
      value: formatMillions(totalRequests),
      badge: <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shadow-[0_0_6px_#f59e0b]" />,
      subtext: '12.5% live request rate',
      subIcon: 'fa-arrow-up',
      subColor: 'text-amber-400',
      icon: 'fa-shield',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      borderColor: 'hover:border-amber-500/50',
      targetView: 'api-monitoring',
    },
    {
      id: 'threats',
      title: 'Active Threats',
      value: activeThreats,
      badge: <span className="px-1 py-0.2 rounded text-[9px] bg-red-500/20 text-red-400 font-bold uppercase border border-red-500/30">LIVE</span>,
      subtext: 'Real-time detection',
      subIcon: 'fa-arrow-up',
      subColor: 'text-red-400',
      icon: 'fa-triangle-exclamation',
      iconBg: 'bg-red-500/10 text-red-400 border border-red-500/20',
      borderColor: 'hover:border-red-500/40',
      targetView: 'alerts',
    },
    {
      id: 'vulns',
      title: 'Vulnerabilities',
      value: vulnerabilities,
      badge: null,
      subtext: '3.7% patched',
      subIcon: 'fa-arrow-down',
      subColor: 'text-emerald-400',
      icon: 'fa-bug',
      iconBg: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
      borderColor: 'hover:border-amber-500/40',
      targetView: 'vulnerabilities',
    },
    {
      id: 'risk',
      title: 'Risk Score',
      value: `${riskScore} /100`,
      badge: null,
      subtext: 'Medium Risk Shield',
      subIcon: 'fa-circle-check',
      subColor: 'text-amber-400',
      icon: 'fa-shield-halved',
      iconBg: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      borderColor: 'hover:border-amber-500/50',
      targetView: 'risk',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            onClick={() => setActiveModal(card.id as any)}
            className={`bg-[#0a0803]/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-4 flex items-center justify-between ${card.borderColor} transition-all shadow-xl hover:bg-[#141008]/85 relative overflow-hidden group cursor-pointer select-none`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg ${card.iconBg} flex items-center justify-center text-xl shrink-0 transition-transform group-hover:scale-110`}>
                <i className={`fa-solid ${card.icon}`} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs text-gray-400 font-medium">{card.title}</h3>
                  {card.badge}
                </div>
                <div className="text-2xl font-bold text-white mt-0.5 font-mono tracking-tight">
                  {card.value}
                </div>
                <div className={`text-[11px] ${card.subColor} flex items-center gap-1 mt-0.5 font-medium`}>
                  <i className={`fa-solid ${card.subIcon} text-[9px]`} /> {card.subtext}
                </div>
              </div>
            </div>
            <div className="text-gray-500 group-hover:text-amber-400 transition text-xs pr-1">
              <i className="fa-solid fa-chevron-right" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Real-time KPI Modal Detail Overlays */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0a0803] border border-amber-500/40 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 relative"
          >
            <div className="flex justify-between items-center border-b border-amber-500/30 pb-3">
              <div className="flex items-center gap-2">
                <i className={`fa-solid ${
                  activeModal === 'requests' ? 'fa-shield text-amber-400' :
                  activeModal === 'threats' ? 'fa-triangle-exclamation text-red-400' :
                  activeModal === 'vulns' ? 'fa-bug text-amber-300' : 'fa-shield-halved text-amber-400'
                } text-lg`} />
                <div>
                  <h3 className="font-bold text-white text-base">
                    {activeModal === 'requests' && 'Live Traffic & Request Telemetry'}
                    {activeModal === 'threats' && 'Active Cyber Threat Stream'}
                    {activeModal === 'vulns' && 'Vulnerability Assessment Audit'}
                    {activeModal === 'risk' && 'Enterprise Risk Score Factors'}
                  </h3>
                  <p className="text-xs text-amber-400/80 font-mono">Live Real-time Metrics & Controls</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-[#141008] hover:bg-[#1f190d] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition border border-amber-500/30"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Content Based on Selected KPI */}
            {activeModal === 'requests' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2 text-center p-3 bg-[#040d1a] border border-[#0d2138] rounded-lg">
                  <div>
                    <span className="text-[10px] text-gray-400 block">HTTP GET Rate</span>
                    <span className="text-sm font-bold text-white font-mono">68.2%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">HTTP POST Rate</span>
                    <span className="text-sm font-bold text-cyan-400 font-mono">27.1%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Options/Put</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">4.7%</span>
                  </div>
                </div>

                <div className="p-3 bg-[#040d1a] border border-[#0d2138] rounded-lg space-y-2 font-mono">
                  <div className="flex justify-between text-gray-300 text-[11px]">
                    <span>Status 200 OK</span>
                    <span className="text-emerald-400 font-bold">24,198,002 (97.5%)</span>
                  </div>
                  <div className="flex justify-between text-gray-300 text-[11px]">
                    <span>Status 403 Forbidden</span>
                    <span className="text-cyan-400 font-bold">512,120 (2.1%)</span>
                  </div>
                  <div className="flex justify-between text-gray-300 text-[11px]">
                    <span>Status 429 Rate Limited</span>
                    <span className="text-red-400 font-bold">100,328 (0.4%)</span>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'threats' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 flex items-center justify-between">
                  <span>Critical High-Frequency Probes Detected</span>
                  <span className="font-mono font-bold text-red-400">{activeThreats} Live Vectors</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <div className="p-2.5 bg-[#040d1a] border border-[#0d2138] rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">SQLi Injection Attack</div>
                      <div className="text-[10px] text-gray-400 font-mono">Target: /api/v1/auth/login</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">Auto Blocked</span>
                  </div>
                  <div className="p-2.5 bg-[#040d1a] border border-[#0d2138] rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">SSH Brute Force Flood</div>
                      <div className="text-[10px] text-gray-400 font-mono">IP: 185.220.101.5</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">Blacklisted</span>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'vulns' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 text-center p-3 bg-[#040d1a] border border-[#0d2138] rounded-lg">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Critical CVEs</span>
                    <span className="text-sm font-bold text-red-400 font-mono">2 Active</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Moderate/Low CVEs</span>
                    <span className="text-sm font-bold text-cyan-400 font-mono">{vulnerabilities - 2} Active</span>
                  </div>
                </div>
                <div className="p-3 bg-[#040d1a] border border-[#0d2138] rounded-lg space-y-1 font-mono text-[11px]">
                  <div className="text-cyan-400 font-bold">CVE-2026-44910: TLS 1.1 Deprecation Notice</div>
                  <p className="text-gray-400 text-[10px]">Upgrade TLS handshake policy on ingress router.</p>
                </div>
              </div>
            )}

            {activeModal === 'risk' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">Security Health Index</div>
                    <div className="text-[10px] text-cyan-300">WAF Rules Active, Headers Enforced</div>
                  </div>
                  <div className="text-2xl font-extrabold text-cyan-400 font-mono">{riskScore}/100</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Content Security Policy (CSP)</span>
                    <span className="text-emerald-400 font-bold">Passed</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>HSTS Strict Transport</span>
                    <span className="text-emerald-400 font-bold">Passed</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Open Ports Scanner</span>
                    <span className="text-cyan-400 font-bold">2 Non-standard Ports</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-between items-center pt-2 border-t border-amber-500/30">
              <button
                onClick={() => {
                  const view = cards.find((c) => c.id === activeModal)?.targetView;
                  setActiveModal(null);
                  if (view && onSelectView) onSelectView(view);
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold rounded-lg cursor-pointer transition text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              >
                <span>Go to Full Module</span>
                <i className="fa-solid fa-arrow-right text-[11px]" />
              </button>

              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-[#141008] hover:bg-[#1f190d] text-gray-200 text-xs font-semibold rounded-lg cursor-pointer transition border border-amber-500/30"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};


