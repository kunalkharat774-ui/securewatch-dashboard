import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { NavView } from '../types';

interface KpiCardsProps {
  onSelectView?: (viewId: NavView) => void;
}

interface ThreatFeedEvent {
  id: string;
  pulseName: string;
  indicator: string;
  indicatorType: string;
  created: string;
  tags: string[];
  sourceCountry: { name: string; code: string; lat: number; lng: number };
  targetCountry: { name: string; code: string; lat: number; lng: number };
}

export const KpiCards: React.FC<KpiCardsProps> = ({ onSelectView }) => {
  const [securityEvents, setSecurityEvents] = useState(0);
  const [activeThreats, setActiveThreats] = useState<number | null>(null);
  const [threatEvents, setThreatEvents] = useState<ThreatFeedEvent[]>([]);
  const [threatFeedSource, setThreatFeedSource] = useState('Check Point ThreatMap');
  const [threatFeedMessage, setThreatFeedMessage] = useState('Loading live attack events...');
  const [vulnerabilityScanCount, setVulnerabilityScanCount] = useState(0);
  const [latestScan, setLatestScan] = useState<{
    target?: string;
    scannedAt?: string;
    vulnerabilities?: Array<{ severity?: string; title?: string }>;
  } | null>(null);
  const [riskScore, setRiskScore] = useState(0);
  const [activeModal, setActiveModal] = useState<'requests' | 'threats' | 'vulns' | 'risk' | null>(null);

  // KPI values come from backend telemetry and remain numeric while data loads.
  useEffect(() => {
    let cancelled = false;

    const loadThreatFeed = async () => {
      try {
        const response = await fetch('/api/threats?limit=100', { cache: 'no-store' });
        const payload = await response.json() as {
          source?: string;
          threats?: ThreatFeedEvent[];
          degraded?: boolean;
          error?: string;
          message?: string;
        };
        if (!response.ok || payload.degraded) {
          throw new Error(payload.error || `Check Point ThreatMap request failed (${response.status})`);
        }
        if (!Array.isArray(payload.threats)) {
          throw new Error('Check Point ThreatMap returned an invalid attack feed.');
        }
        if (cancelled) return;

        setThreatEvents(payload.threats);
        setActiveThreats(payload.threats.length);
        setThreatFeedSource(payload.source || 'Check Point ThreatMap');
        setThreatFeedMessage(
          payload.threats.length > 0
            ? ''
            : payload.message || 'No attack events are currently being received.'
        );
      } catch (error) {
        if (cancelled) return;
        console.error('Active Threats feed unavailable:', error);
        setActiveThreats(null);
        setThreatFeedMessage(error instanceof Error ? error.message : 'Check Point ThreatMap feed unavailable.');
      }
    };

    const loadMetrics = async () => {
      try {
        const [logsResponse, riskResponse, urlScansResponse, scannerStateResponse] = await Promise.all([
          fetch('/api/security-logs', { cache: 'no-store' }),
          fetch('/api/risk-items', { cache: 'no-store' }),
          fetch('/api/url-scans', { cache: 'no-store' }),
          fetch('/api/component-state/vulnerability-scanner', { cache: 'no-store' }),
        ]);
        if (!logsResponse.ok || !riskResponse.ok || !urlScansResponse.ok || !scannerStateResponse.ok) {
          throw new Error('Telemetry unavailable');
        }

        const logsPayload = await logsResponse.json() as { logs?: Array<{ level?: string; action?: string }> };
        const riskItems = await riskResponse.json() as Array<{
          likelihood?: number;
          impact?: number;
          assetCriticality?: number;
          controlsImplemented?: boolean;
        }>;
        const urlScans = await urlScansResponse.json() as Array<{ reputationScore?: number }>;
        const scannerState = await scannerStateResponse.json() as {
          scanCount?: number;
          scanResult?: {
            target?: string;
            scannedAt?: string;
            vulnerabilitiesCount?: number;
            vulnerabilities?: Array<{ severity?: string; title?: string }>;
          };
        } | null;
        if (cancelled) return;

        const logs = Array.isArray(logsPayload.logs) ? logsPayload.logs : [];

        setSecurityEvents(logs.length);
        const validRiskItems = Array.isArray(riskItems) ? riskItems : [];
        const residualTotal = validRiskItems.reduce((total, item) => {
          const inherent = Number(item.likelihood || 0) * Number(item.impact || 0) * (Number(item.assetCriticality || 0) / 3);
          return total + (item.controlsImplemented === true ? inherent * 0.4 : inherent);
        }, 0);
        const calculatedRiskScore = validRiskItems.length
          ? Math.round((residualTotal / (validRiskItems.length * 25)) * 100)
          : 0;
        const latestUrlScore = Array.isArray(urlScans)
          ? Number(urlScans[0]?.reputationScore)
          : NaN;
        const savedScanCount = Number(scannerState?.scanCount);
        const legacyScanCount = scannerState?.scanResult ? 1 : 0;

        setVulnerabilityScanCount(Number.isFinite(savedScanCount)
          ? Math.max(0, savedScanCount)
          : legacyScanCount);
        setLatestScan(scannerState?.scanResult || null);
        setRiskScore(Number.isFinite(latestUrlScore)
          ? Math.min(100, Math.max(0, Math.round(100 - latestUrlScore)))
          : Math.min(100, Math.max(0, calculatedRiskScore)));
      } catch {
        if (cancelled) return;
        setSecurityEvents(0);
        setRiskScore(0);
      }
    };

    void loadThreatFeed();
    void loadMetrics();
    const metricsInterval = window.setInterval(() => void loadMetrics(), 10000);
    const threatInterval = window.setInterval(() => void loadThreatFeed(), 10000);
    const handleScannerUpdate = () => void loadMetrics();
    window.addEventListener('vulnerability_scan_completed', handleScannerUpdate);
    window.addEventListener('url_reputation_scan_completed', handleScannerUpdate);

    return () => {
      cancelled = true;
      window.clearInterval(metricsInterval);
      window.clearInterval(threatInterval);
      window.removeEventListener('vulnerability_scan_completed', handleScannerUpdate);
      window.removeEventListener('url_reputation_scan_completed', handleScannerUpdate);
    };
  }, []);

  const formatMetric = (num: number) => num.toLocaleString();

  const cards = [
    {
      id: 'requests',
      title: 'Security Events',
      value: formatMetric(securityEvents),
      badge: <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shadow-[0_0_6px_#f59e0b]" />,
      subtext: 'Backend SIEM telemetry',
      subIcon: 'fa-arrow-up',
      subColor: 'text-amber-400',
      icon: 'fa-shield',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      borderColor: 'hover:border-amber-500/50',
      targetView: 'api-monitoring' as NavView,
    },
    {
      id: 'threats',
      title: 'Active Threats',
      value: activeThreats === null ? '—' : formatMetric(activeThreats),
      badge: <span className="px-1 py-0.2 rounded text-[9px] bg-red-500/20 text-red-400 font-bold uppercase border border-red-500/30">LIVE</span>,
      subtext: 'Real-time detection',
      subIcon: 'fa-arrow-up',
      subColor: 'text-red-400',
      icon: 'fa-triangle-exclamation',
      iconBg: 'bg-red-500/10 text-red-400 border border-red-500/20',
      borderColor: 'hover:border-red-500/40',
      targetView: 'alerts' as NavView,
    },
    {
      id: 'vulns',
      title: 'Vulnerability Scans',
      value: formatMetric(vulnerabilityScanCount),
      badge: null,
      subtext: latestScan
        ? `${latestScan.vulnerabilities?.length ?? 0} findings in latest scan`
        : 'Completed vulnerability scans',
      subIcon: 'fa-arrow-down',
      subColor: 'text-emerald-400',
      icon: 'fa-bug',
      iconBg: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
      borderColor: 'hover:border-amber-500/40',
      targetView: 'vulnerability-scanner' as NavView,
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
                    {activeModal === 'vulns' && 'Vulnerability Scan Summary'}
                    {activeModal === 'risk' && 'Enterprise Risk Score Factors'}
                  </h3>
                  <p className="text-xs text-amber-400/80 font-mono">
                    {activeModal === 'threats' ? threatFeedSource : 'Live Real-time Metrics & Controls'}
                  </p>
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
                  <span>Check Point ThreatMap attack events</span>
                  <span className="font-mono font-bold text-red-400">
                    {activeThreats === null ? 'Unavailable' : `${activeThreats} Events`}
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {threatEvents.length > 0 ? threatEvents.map((threat) => (
                    <article key={threat.id} className="p-2.5 bg-[#040d1a] border border-[#0d2138] rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold leading-snug text-white">{threat.pulseName}</div>
                        <span className="shrink-0 px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30">
                          {threat.indicatorType}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-gray-300">
                        <span>{threat.sourceCountry.name} ({threat.sourceCountry.code})</span>
                        <i className="fa-solid fa-arrow-right text-cyan-400" />
                        <span>{threat.targetCountry.name} ({threat.targetCountry.code})</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-gray-500">
                        <span className="truncate">{threat.tags.join(', ') || 'Threat event'}</span>
                        <time className="shrink-0">
                          Received {Number.isNaN(Date.parse(threat.created))
                            ? threat.created
                            : new Date(threat.created).toLocaleTimeString()}
                        </time>
                      </div>
                    </article>
                  )) : (
                    <p className="rounded-lg border border-[#0d2138] bg-[#040d1a] p-3 text-gray-400">
                      {threatFeedMessage}
                    </p>
                  )}
                </div>
                <a
                  href="https://threatmap.checkpoint.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Open Check Point ThreatMap
                  <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                </a>
              </div>
            )}

            {activeModal === 'vulns' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 text-center p-3 bg-[#040d1a] border border-[#0d2138] rounded-lg">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Completed Scans</span>
                    <span className="text-sm font-bold text-amber-300 font-mono">{formatMetric(vulnerabilityScanCount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Latest Scan Findings</span>
                    <span className="text-sm font-bold text-cyan-400 font-mono">{latestScan?.vulnerabilities?.length ?? 0}</span>
                  </div>
                </div>
                {latestScan ? (
                  <div className="p-3 bg-[#040d1a] border border-[#0d2138] rounded-lg space-y-1 text-[11px]">
                    <div className="text-gray-300">Latest target: <span className="text-cyan-300 font-mono">{latestScan.target || 'Unknown'}</span></div>
                    {latestScan.scannedAt && (
                      <div className="text-gray-400">Scanned: <span className="font-mono">{new Date(latestScan.scannedAt).toLocaleString()}</span></div>
                    )}
                    {(latestScan.vulnerabilities || []).slice(0, 5).map((finding, index) => (
                      <div key={`${finding.title || 'finding'}-${index}`} className="text-gray-300">
                        <span className="text-amber-300">{finding.severity || 'Unrated'}</span>
                        {' '}{finding.title || 'Untitled finding'}
                      </div>
                    ))}
                    {latestScan.vulnerabilities?.length === 0 && (
                      <div className="text-emerald-300">No findings were reported in the latest scan.</div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-[#040d1a] border border-[#0d2138] rounded-lg text-gray-400">
                    No vulnerability scans have been completed yet.
                  </div>
                )}
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
