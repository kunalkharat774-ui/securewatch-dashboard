import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface SecurityAlert {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  srcIp: string;
  country: string;
  countryCode: string;
  targetEndpoint: string;
  timestamp: string;
  status: 'Active' | 'Investigating' | 'Blocked' | 'Resolved';
  attackVector: string;
  owaspCategory: string;
  requestsPerSec: number;
  protocol: string;
  riskScore: number; // 0-100
}

interface SecurityAlertsViewProps {
  onBackToDashboard?: () => void;
  onAlertCountChange?: (count: number) => void;
}

interface SecurityLogRecord {
  id: string;
  timestamp: string;
  level: 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO';
  service: string;
  message: string;
  sourceIp: string;
  destination: string;
  action: string;
  traceId: string;
  details?: Record<string, unknown>;
}

interface ThreatIndicator {
  id: string;
  pulseName: string;
  indicator: string;
  indicatorType: string;
  created: string;
  tags: string[];
  sourceCountry?: { name: string; code: string; lat: number; lng: number };
  targetCountry?: { name: string; code: string; lat: number; lng: number };
  targetIp?: string;
}

interface ThreatFeed {
  source: string;
  fetchedAt: string;
  threats: ThreatIndicator[];
}

const mapLogToAlert = (log: SecurityLogRecord): SecurityAlert => {
  const severity = log.level === 'CRITICAL' ? 'Critical' : log.level === 'ERROR' ? 'High' : log.level === 'WARN' ? 'Medium' : 'Low';
  const status = typeof log.details?.alertStatus === 'string' ? log.details.alertStatus as SecurityAlert['status'] : log.action === 'BLOCKED' ? 'Blocked' : 'Active';
  const numericDetails = log.details || {};
  const requestsPerSec = typeof numericDetails.requestsPerSec === 'number' ? numericDetails.requestsPerSec : 0;
  return {
    id: log.id,
    title: log.message,
    severity,
    srcIp: log.sourceIp,
    country: typeof numericDetails.country === 'string' ? numericDetails.country : 'Unknown',
    countryCode: typeof numericDetails.countryCode === 'string' ? numericDetails.countryCode : 'XX',
    targetEndpoint: log.destination,
    timestamp: log.timestamp,
    status,
    attackVector: log.service,
    owaspCategory: typeof numericDetails.owaspCategory === 'string' ? numericDetails.owaspCategory : 'Not classified',
    requestsPerSec,
    protocol: 'Not reported',
    riskScore: severity === 'Critical' ? 90 : severity === 'High' ? 70 : severity === 'Medium' ? 40 : 15,
  };
};

const mapThreatToAlert = (threat: ThreatIndicator, index: number): SecurityAlert => {
  const hasHighRiskTag = threat.tags?.some((tag) => /exploit|malware|ransomware|ddos|botnet|c2|credential|phish/i.test(tag));
  const severity: 'Critical' | 'High' | 'Medium' | 'Low' = hasHighRiskTag ? 'Critical' : 'High';
  return {
    id: threat.id || `threat-${index}`,
    title: threat.pulseName || `ThreatCloud Attack Event #${index + 1}`,
    severity,
    srcIp: threat.sourceCountry?.code || threat.indicator?.split(' -> ')[0] || 'N/A',
    country: threat.sourceCountry?.name || 'Unknown',
    countryCode: threat.sourceCountry?.code || 'XX',
    targetEndpoint: threat.targetCountry?.name || threat.indicator?.split(' -> ')[1] || 'Protected Network',
    timestamp: threat.created || new Date().toISOString(),
    status: 'Active',
    attackVector: threat.indicatorType || 'LIVE ATTACK',
    owaspCategory: threat.tags?.join(', ') || 'Cross-site threat',
    requestsPerSec: 0,
    protocol: 'Multi-protocol',
    riskScore: hasHighRiskTag ? 95 : 75,
  };
};

export const SecurityAlertsView: React.FC<SecurityAlertsViewProps> = ({
  onBackToDashboard,
  onAlertCountChange,
}) => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState<boolean>(true);

  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Custom Alert Creation Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSeverity, setNewSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newSrcIp, setNewSrcIp] = useState<string>('');
  const [newCountry, setNewCountry] = useState<string>('');
  const [newEndpoint, setNewEndpoint] = useState<string>('');
  const [newVector, setNewVector] = useState<string>('');
  const [newOwasp, setNewOwasp] = useState<string>('');

  // AI Investigation State
  const [selectedAlertForAi, setSelectedAlertForAi] = useState<SecurityAlert | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<{
    rootCause: string;
    mitreTechnique: string;
    recommendedFirewallRule: string;
    recommendedPlaybookStep: string;
  } | null>(null);

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'danger' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadLiveAlerts = async () => {
    try {
      const allAlerts: SecurityAlert[] = [];
      
      // Fetch real threat data from Check Point ThreatCloud
      try {
        const threatResponse = await fetch('/api/threats?limit=20', { cache: 'no-store' });
        if (threatResponse.ok) {
          const threatPayload = await threatResponse.json() as ThreatFeed;
          const realThreats = (threatPayload.threats || []).map(mapThreatToAlert);
          allAlerts.push(...realThreats);
          if (realThreats.length > 0) {
            showToast(`Live Threat Feed: ${realThreats.length} real-time attacks detected from Check Point ThreatCloud`, 'info');
          }
        }
      } catch (threatError) {
        console.warn('Threat feed unavailable, falling back to SIEM logs:', threatError);
      }
      
      // Fetch SIEM security logs as backup
      try {
        const siemResponse = await fetch('/api/security-logs', { cache: 'no-store' });
        if (siemResponse.ok) {
          const siemPayload = await siemResponse.json() as { logs?: SecurityLogRecord[] };
          const siemAlerts = (siemPayload.logs || [])
            .filter((log) => log.level !== 'INFO' || log.action !== 'ALLOWED')
            .map(mapLogToAlert);
          allAlerts.push(...siemAlerts);
        }
      } catch (siemError) {
        console.warn('SIEM logs unavailable:', siemError);
      }
      
      // Remove duplicates and set alerts
      const uniqueAlerts = allAlerts.filter((alert, index, arr) =>
        arr.findIndex((a) => a.srcIp === alert.srcIp && a.country === alert.country && a.targetEndpoint === alert.targetEndpoint) === index
      );
      
      if (uniqueAlerts.length === 0) {
        showToast('No active security alerts at this moment', 'info');
      }
      
      setAlerts(uniqueAlerts);
    } catch (error) {
      showToast(`Alert feed unavailable: ${error instanceof Error ? error.message : 'request failed'}`, 'danger');
      setAlerts([]);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  useEffect(() => {
    loadLiveAlerts();
    if (!isLiveStreaming) return;
    const interval = setInterval(loadLiveAlerts, 5000);
    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Sync active count with parent
  useEffect(() => {
    const activeCount = alerts.filter((a) => a.status === 'Active' || a.status === 'Investigating').length;
    if (onAlertCountChange) onAlertCountChange(activeCount);
  }, [alerts, onAlertCountChange]);


  // Create Custom Security Alert Handler
  const handleCreateCustomAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const response = await fetch('/api/security-logs/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: newSeverity === 'Critical' ? 'CRITICAL' : newSeverity === 'High' ? 'ERROR' : newSeverity === 'Medium' ? 'WARN' : 'INFO',
          service: newVector.trim() || 'Manual Security Alert',
          message: newTitle.trim(),
          sourceIp: newSrcIp.trim() || 'unknown',
          destination: newEndpoint.trim() || 'unknown',
          action: 'FLAGGED',
          details: { country: newCountry.trim() || 'Unknown', owaspCategory: newOwasp.trim() || 'Not classified' },
        }),
      });
      if (!response.ok) throw new Error(`SIEM rejected event with HTTP ${response.status}`);
      setIsAddModalOpen(false);
      setNewTitle('');
      await loadLiveAlerts();
      showToast('Security event ingested into the live SIEM feed.', 'success');
    } catch (error) {
      showToast(`Security event was not saved: ${error instanceof Error ? error.message : 'request failed'}`, 'danger');
    }
  };

  // Actions
  const updateAlertStatus = async (id: string, status: 'Investigating' | 'Blocked' | 'Resolved') => {
    const response = await fetch(`/api/security-alerts/${encodeURIComponent(id)}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `HTTP ${response.status}`);
    setAlerts((prev) => prev.map((alert) => alert.id === id ? { ...alert, status } : alert));
  };

  const handleBlockIp = async (id: string, srcIp: string) => {
    try { await updateAlertStatus(id, 'Blocked'); showToast(`Alert ${id} recorded as blocked for ${srcIp}.`, 'success'); }
    catch (error) { showToast(`Block action unavailable: ${error instanceof Error ? error.message : 'request failed'}`, 'danger'); }
  };

  const handleAcknowledge = async (id: string) => {
    try { await updateAlertStatus(id, 'Investigating'); showToast(`Alert ${id} status saved as investigating.`, 'info'); }
    catch (error) { showToast(`Status update unavailable: ${error instanceof Error ? error.message : 'request failed'}`, 'danger'); }
  };

  const handleResolve = async (id: string) => {
    try { await updateAlertStatus(id, 'Resolved'); showToast(`Alert ${id} resolution saved.`, 'success'); }
    catch (error) { showToast(`Resolution unavailable: ${error instanceof Error ? error.message : 'request failed'}`, 'danger'); }
  };

  const handleEmergencyLockdown = async () => {
    const highRiskAlerts = alerts.filter((alert) => alert.severity === 'Critical' || alert.severity === 'High');
    const results = await Promise.allSettled(highRiskAlerts.map((alert) => updateAlertStatus(alert.id, 'Blocked')));
    const saved = results.filter((result) => result.status === 'fulfilled').length;
    showToast(`${saved}/${highRiskAlerts.length} alert status changes were saved.`, saved === highRiskAlerts.length ? 'success' : 'danger');
  };

  const handleResetFeed = () => {
    loadLiveAlerts();
    showToast('Live SIEM feed refreshed.', 'info');
  };

  // Export CSV Report
  const handleExportCsv = () => {
    const headers = ['ID', 'Title', 'Severity', 'Source_IP', 'Country', 'Target_Endpoint', 'Timestamp', 'Status', 'Risk_Score'];
    const rows = alerts.map((a) => [
      a.id,
      `"${a.title.replace(/"/g, '""')}"`,
      a.severity,
      a.srcIp,
      a.country,
      `"${a.targetEndpoint.replace(/"/g, '""')}"`,
      a.timestamp,
      a.status,
      a.riskScore,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Security_Threat_Alerts_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Threat Alerts CSV Audit Report downloaded!', 'success');
  };

  // AI Investigation Call
  const handleAnalyzeWithAi = async (alert: SecurityAlert) => {
    setSelectedAlertForAi(alert);
    setIsAnalyzingAi(true);
    setAiReport(null);

    try {
      const res = await fetch('/api/analyze-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiReport(data);
      } else {
        throw new Error('API request failed');
      }
    } catch (e) {
      setAiReport(null);
      showToast(`AI investigation unavailable: ${e instanceof Error ? e.message : 'request failed'}`, 'danger');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // Filtered List
  const filteredAlerts = alerts.filter((a) => {
    const matchesSeverity = severityFilter === 'All' || a.severity === severityFilter;
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchesQuery =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.srcIp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.targetEndpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSeverity && matchesStatus && matchesQuery;
  });

  // KPI Metrics
  const activeCount = alerts.filter((a) => a.status === 'Active').length;
  const criticalCount = alerts.filter((a) => a.severity === 'Critical' && a.status !== 'Resolved').length;
  const blockedCount = alerts.filter((a) => a.status === 'Blocked').length;
  const investigatingCount = alerts.filter((a) => a.status === 'Investigating').length;

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-xs font-semibold backdrop-blur-md ${
              toastMessage.type === 'danger'
                ? 'bg-red-950/90 text-red-200 border-red-500/50'
                : toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
                : 'bg-purple-950/90 text-purple-200 border-purple-500/50'
            }`}
          >
            <i
              className={`fa-solid ${
                toastMessage.type === 'danger'
                  ? 'fa-triangle-exclamation text-red-400'
                  : toastMessage.type === 'success'
                  ? 'fa-circle-check text-emerald-400'
                  : 'fa-bell text-purple-400'
              }`}
            />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-[#0a0803]/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-amber-500/20 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-bell text-amber-400" /> Security Threat Alerts & SIEM Incident Monitor
              </h2>
            </div>
            <p className="text-xs text-amber-200/70 mt-1">
              Real-time anomaly detection, automated WAF response, and AI incident threat analysis.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Live Ticker Toggle */}
            <button
              onClick={() => setIsLiveStreaming(!isLiveStreaming)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                isLiveStreaming
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'bg-[#141008] text-gray-400 border-amber-500/30'
              }`}
            >
              <i className={`fa-solid ${isLiveStreaming ? 'fa-signal-stream animate-pulse' : 'fa-pause'}`} />
              {isLiveStreaming ? 'LIVE STREAM: ON' : 'STREAM: PAUSED'}
            </button>

            {/* Custom Alert Modal Trigger */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-lg transition shadow-lg cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-plus-circle" /> Log Threat Alert
            </button>

            {/* Export CSV Report */}
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 bg-[#141008] hover:bg-[#20180a] border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-file-csv text-amber-400" /> Export CSV
            </button>

            {/* Reset Feed */}
            <button
              onClick={handleResetFeed}
              className="px-3.5 py-1.5 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-400 hover:text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
              title="Refresh live SIEM alerts"
            >
              <i className="fa-solid fa-rotate" /> Refresh
            </button>

            {/* Emergency Lockdown */}
            <button
              onClick={handleEmergencyLockdown}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition shadow-lg cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-shield-halved" /> Emergency WAF Block
            </button>

            {/* Back Button */}
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="px-3.5 py-1.5 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 hover:text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
              >
                <i className="fa-solid fa-arrow-left" /> Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Live SIEM Feed Status */}
        <div className="pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <span className="text-[11px] font-mono text-gray-400">
            SIEM Log Feed: <span className="text-emerald-400 font-bold">LIVE BACKEND TELEMETRY</span>
          </span>
        </div>
      </div>

      {/* Aggregate Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">Active Threat Alerts</span>
            <div className="text-2xl font-bold font-mono text-red-400 mt-0.5">{activeCount}</div>
            <span className="text-[11px] text-gray-400 mt-1 block font-mono">Requires Immediate Triage</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
        </div>

        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">Critical Severity Threats</span>
            <div className="text-2xl font-bold font-mono text-orange-400 mt-0.5">{criticalCount}</div>
            <span className="text-[11px] text-gray-400 mt-1 block font-mono">High Explosive Risk Vector</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <i className="fa-solid fa-fire" />
          </div>
        </div>

        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">Under SOC Investigation</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-0.5">{investigatingCount}</div>
            <span className="text-[11px] text-gray-400 mt-1 block font-mono">Analyst Assigned</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <i className="fa-solid fa-user-shield" />
          </div>
        </div>

        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">Blocked Threat IPs</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{blockedCount}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block font-mono">Active WAF Drop Rules</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <i className="fa-solid fa-shield-halved" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search IP, Endpoint, Title, Country..."
            className="w-full pl-9 pr-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none font-mono focus:border-[#3b28cc]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-1 bg-[#080a10] p-1 border border-[#1f2335] rounded-lg">
            <span className="text-[11px] text-gray-400 px-2 font-semibold">Severity:</span>
            {['All', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-[#3b28cc] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-[#080a10] p-1 border border-[#1f2335] rounded-lg">
            <span className="text-[11px] text-gray-400 px-2 font-semibold">Status:</span>
            {['All', 'Active', 'Investigating', 'Blocked', 'Resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#3b28cc] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI INVESTIGATION MODAL / EXPANDED SECTION */}
      <AnimatePresence>
        {selectedAlertForAi && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="p-5 bg-[#0d111c] border border-purple-500/50 rounded-xl space-y-4 shadow-[0_0_25px_rgba(159,134,255,0.15)]"
          >
            <div className="flex justify-between items-center border-b border-[#1f2335] pb-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-brain text-purple-400 text-base" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    AI Threat Analysis & Incident Investigation ({selectedAlertForAi.id})
                  </h3>
                  <span className="text-[11px] font-mono text-purple-300">
                    Source: {selectedAlertForAi.srcIp} ({selectedAlertForAi.country}) | Target: {selectedAlertForAi.targetEndpoint}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedAlertForAi(null)}
                className="text-gray-400 hover:text-white text-xs font-mono bg-[#111524] px-2.5 py-1 rounded border border-[#1f2335] cursor-pointer"
              >
                Close Investigation
              </button>
            </div>

            {isAnalyzingAi ? (
              <div className="py-8 text-center space-y-2">
                <i className="fa-solid fa-spinner animate-spin text-purple-400 text-2xl" />
                <p className="text-xs text-gray-300 font-mono">Generating AI Threat Intelligence Root Cause Analysis...</p>
              </div>
            ) : aiReport ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-[#111524] border border-[#1f2335] rounded-lg space-y-2">
                  <span className="font-bold text-purple-300 block">Root Cause & Attack Signature:</span>
                  <p className="text-gray-300 leading-relaxed font-sans">{aiReport.rootCause}</p>
                  <div className="pt-2 border-t border-[#1f2335] flex justify-between items-center text-[11px] font-mono">
                    <span className="text-gray-400">MITRE ATT&CK Mapping:</span>
                    <strong className="text-red-400">{aiReport.mitreTechnique}</strong>
                  </div>
                </div>

                <div className="p-3.5 bg-[#111524] border border-[#1f2335] rounded-lg space-y-2">
                  <span className="font-bold text-emerald-400 block">Recommended WAF/Firewall Mitigation Rule:</span>
                  <pre className="p-2.5 bg-[#080a10] border border-[#1f2335] rounded text-[11px] text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">
                    {aiReport.recommendedFirewallRule}
                  </pre>
                  <span className="font-bold text-amber-400 block pt-1">SOC Playbook Action:</span>
                  <p className="text-gray-300 text-[11px] font-mono">{aiReport.recommendedPlaybookStep}</p>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ALERT LIST CARDS WITH MOTION ANIMATIONS */}
      <div className="space-y-3">
        <AnimatePresence>
          {isLoadingAlerts ? (
            <div className="text-center py-12 bg-[#0d111c] border border-[#1f2335] rounded-xl space-y-2">
              <i className="fa-solid fa-spinner animate-spin text-amber-400 text-2xl" />
              <h4 className="text-sm font-bold text-white">Loading Live SIEM Alerts</h4>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-[#0d111c] border border-[#1f2335] rounded-xl space-y-2"
            >
              <i className="fa-solid fa-shield-halved text-emerald-400 text-3xl block" />
              <h4 className="text-sm font-bold text-white">No Live Security Alerts</h4>
              <p className="text-xs text-gray-400">No matching events are currently present in the backend SIEM buffer.</p>
            </motion.div>
          ) : (
            filteredAlerts.map((alert) => {
              const isCritical = alert.severity === 'Critical';
              const isHigh = alert.severity === 'High';
              const isBlocked = alert.status === 'Blocked';
              const isInvestigating = alert.status === 'Investigating';

              let sevBadgeClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
              if (isCritical) sevBadgeClass = 'bg-red-500/20 text-red-400 border-red-500/40';
              else if (isHigh) sevBadgeClass = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
              else if (alert.severity === 'Medium') sevBadgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';

              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, y: -15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className={`p-4 bg-[#0d111c] border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition hover:border-[#3b28cc]/50 ${
                    isCritical && alert.status === 'Active'
                      ? 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                      : isBlocked
                      ? 'border-emerald-500/30 opacity-75'
                      : 'border-[#1f2335]'
                  }`}
                >
                  {/* Left Info Column */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <div
                      className={`w-3.5 h-3.5 rounded-full mt-1 shrink-0 ${
                        alert.status === 'Active' && isCritical
                          ? 'bg-red-500 animate-ping'
                          : alert.status === 'Active'
                          ? 'bg-amber-500'
                          : alert.status === 'Blocked'
                          ? 'bg-emerald-500'
                          : 'bg-purple-500'
                      }`}
                    />

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-gray-400 font-bold">{alert.id}</span>
                        <h4 className="font-bold text-xs text-white">{alert.title}</h4>

                        {/* Severity Badge */}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sevBadgeClass}`}>
                          {alert.severity}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            alert.status === 'Active'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : alert.status === 'Investigating'
                              ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                              : alert.status === 'Blocked'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}
                        >
                          {alert.status}
                        </span>
                      </div>

                      {/* Technical Line */}
                      <div className="text-[11px] text-gray-400 font-mono flex items-center gap-3 flex-wrap">
                        <span>
                          IP: <strong className="text-gray-200">{alert.srcIp}</strong> ({alert.country})
                        </span>
                        <span>•</span>
                        <span>
                          Target: <strong className="text-purple-300">{alert.targetEndpoint}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Vector: <strong className="text-amber-300">{alert.attackVector}</strong>
                        </span>
                        <span>•</span>
                        <span className="text-gray-500">{alert.timestamp}</span>
                      </div>

                      <div className="text-[10px] text-gray-500 font-mono">
                        {alert.owaspCategory} | Rate: {alert.requestsPerSec} req/sec | Protocol: {alert.protocol} | Risk Index: {alert.riskScore}/100
                      </div>
                    </div>
                  </div>

                  {/* Right Action Column */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {/* AI Investigate */}
                    <button
                      onClick={() => handleAnalyzeWithAi(alert)}
                      className="px-3 py-1.5 bg-[#111524] hover:bg-[#1a1e30] border border-purple-500/30 text-purple-300 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-brain text-[11px]" /> AI Investigate
                    </button>

                    {/* Block IP */}
                    {alert.status !== 'Blocked' && (
                      <button
                        onClick={() => handleBlockIp(alert.id, alert.srcIp)}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-ban" /> Block IP
                      </button>
                    )}

                    {/* Acknowledge */}
                    {alert.status === 'Active' && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="px-2.5 py-1.5 bg-[#111524] hover:bg-[#1a1e30] text-gray-300 border border-[#1f2335] text-xs font-semibold rounded-lg transition cursor-pointer"
                        title="Assign to SOC Analyst"
                      >
                        <i className="fa-solid fa-user-check" />
                      </button>
                    )}

                    {/* Resolve */}
                    {alert.status !== 'Resolved' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="px-2.5 py-1.5 bg-[#111524] hover:bg-[#1a1e30] text-emerald-400 border border-[#1f2335] text-xs font-semibold rounded-lg transition cursor-pointer"
                        title="Mark as Resolved"
                      >
                        <i className="fa-solid fa-check" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* MODAL: LOG CUSTOM THREAT ALERT */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0d111c] border border-purple-500/30 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-[#1f2335] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-sm">
                    <i className="fa-solid fa-triangle-exclamation" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Log Custom Threat Alert</h3>
                    <p className="text-[11px] text-gray-400">Manual SIEM incident registration</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-400 hover:text-white text-sm cursor-pointer"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomAlert} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Alert Title / Anomaly Description *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Unauthorized API Access from Anomaly IP"
                    required
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Severity Level</label>
                    <select
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Attacker Source IP</label>
                    <input
                      type="text"
                      value={newSrcIp}
                      onChange={(e) => setNewSrcIp(e.target.value)}
                      placeholder="e.g. 185.220.101.99"
                      className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none font-mono focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Country</label>
                    <input
                      type="text"
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      placeholder="e.g., Germany"
                      className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Target Endpoint</label>
                    <input
                      type="text"
                      value={newEndpoint}
                      onChange={(e) => setNewEndpoint(e.target.value)}
                      placeholder="e.g., /api/v1/auth/login"
                      className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none font-mono focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Attack Vector / Pattern</label>
                  <input
                    type="text"
                    value={newVector}
                    onChange={(e) => setNewVector(e.target.value)}
                    placeholder="e.g., JWT Algorithm Confusion Attack"
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">OWASP Category</label>
                  <input
                    type="text"
                    value={newOwasp}
                    onChange={(e) => setNewOwasp(e.target.value)}
                    placeholder="e.g., OWASP A01:2021 Broken Access Control"
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-[#1f2335]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2.5 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                  >
                    <i className="fa-solid fa-plus-circle" /> Log Incident
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
