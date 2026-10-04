import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SecurityLogsViewProps {
  onBackToDashboard?: () => void;
}

export interface SecurityLogEntry {
  id: string;
  timestamp: string;
  level: 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO';
  service: string;
  message: string;
  sourceIp: string;
  destination: string;
  action: 'BLOCKED' | 'FLAGGED' | 'ALLOWED' | 'ALERTED' | 'QUARANTINED';
  traceId: string;
  details?: Record<string, any>;
}

export interface LogMetrics {
  totalIngested: number;
  criticalCount: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  blockedRate: number;
}

type Level = SecurityLogEntry['level'];
type ToastType = 'success' | 'info' | 'error';

const EMPTY_METRICS: LogMetrics = {
  totalIngested: 0,
  criticalCount: 0,
  errorCount: 0,
  warnCount: 0,
  infoCount: 0,
  blockedRate: 0,
};

const LEVEL_TEXT_CLASS: Record<Level, string> = {
  CRITICAL: 'text-red-400',
  ERROR: 'text-rose-400',
  WARN: 'text-amber-400',
  INFO: 'text-blue-400',
};

// Escape a CSV cell and neutralise spreadsheet formula injection
const csvCell = (value: unknown): string => {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const downloadBlob = (content: string, mime: string, filename: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const formatTime = (ts: string): string => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toLocaleTimeString();
};

export const SecurityLogsView: React.FC<SecurityLogsViewProps> = ({ onBackToDashboard }) => {
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
  const [metrics, setMetrics] = useState<LogMetrics>(EMPTY_METRICS);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  // Selected Log for Inspector Modal
  const [activeInspectLog, setActiveInspectLog] = useState<SecurityLogEntry | null>(null);

  // Ingest Threat Event Modal
  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [ingestLevel, setIngestLevel] = useState<Level>('CRITICAL');
  const [ingestService, setIngestService] = useState<string>('WAF Guard');
  const [ingestMessage, setIngestMessage] = useState<string>('');
  const [ingestSourceIp, setIngestSourceIp] = useState<string>('');
  const [ingestAction, setIngestAction] = useState<'BLOCKED' | 'FLAGGED' | 'ALLOWED' | 'QUARANTINED'>('BLOCKED');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Debounce search so we don't hit the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Guards against out-of-order responses overwriting newer data
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchLogs = useCallback(
    async (silent = false) => {
      const requestId = ++requestIdRef.current;
      if (!silent) setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedLevel !== 'ALL') params.append('level', selectedLevel);
        if (selectedService !== 'ALL') params.append('service', selectedService);
        if (debouncedSearch) params.append('search', debouncedSearch);

        const res = await fetch(`/api/security-logs?${params.toString()}`);
        if (!isMountedRef.current || requestId !== requestIdRef.current) return;

        if (res.ok) {
          const data = await res.json();
          if (!isMountedRef.current || requestId !== requestIdRef.current) return;
          setLogs(Array.isArray(data.logs) ? data.logs : []);
          if (data.metrics) setMetrics({ ...EMPTY_METRICS, ...data.metrics });
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (err) {
        console.error('Failed to fetch security logs:', err);
        if (isMountedRef.current && requestId === requestIdRef.current) setIsConnected(false);
      } finally {
        if (!silent && isMountedRef.current && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [selectedLevel, selectedService, debouncedSearch]
  );

  // Initial fetch + refetch on filter change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Live polling
  useEffect(() => {
    if (!isLiveStreaming) return;
    const interval = setInterval(() => {
      fetchLogs(true);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLiveStreaming, fetchLogs]);

  // Close modals with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveInspectLog(null);
        setIsIngestModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Inject custom security threat event
  const handleIngestEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = ingestMessage.trim();
    const service = ingestService.trim();
    const sourceIp = ingestSourceIp.trim();
    if (!message || !service || !sourceIp || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/security-logs/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: ingestLevel,
          service,
          message,
          sourceIp,
          destination: 'ingress-gateway',
          action: ingestAction,
          details: {
            environment: 'production',
            manualIngest: true,
            ingestedAt: new Date().toISOString(),
          },
        }),
      });

      if (res.ok) {
        showToast('Security event successfully ingested into SIEM engine!', 'success');
        setIsIngestModalOpen(false);
        setIngestMessage('');
        setIngestSourceIp('');
        fetchLogs(true);
      } else {
        showToast('Failed to ingest security event', 'error');
      }
    } catch (err) {
      showToast('Error sending security event to server', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear logs buffer (only wipes the UI after the server confirms)
  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all SIEM telemetry logs buffer?')) return;

    try {
      const res = await fetch('/api/security-logs/clear', { method: 'POST' });
      if (res.ok) {
        requestIdRef.current++; // discard any in-flight fetch that could repopulate the table
        setLogs([]);
        setMetrics(EMPTY_METRICS);
        showToast('SIEM Security Logs Buffer cleared successfully! (0 events remaining)', 'info');
      } else {
        showToast('Server failed to clear the logs buffer', 'error');
        fetchLogs(true);
      }
    } catch (err) {
      showToast('Could not reach server to clear the logs buffer', 'error');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (logs.length === 0) {
      showToast('No logs available to export', 'error');
      return;
    }
    const headers = ['Timestamp', 'Log ID', 'Level', 'Service', 'Source IP', 'Destination', 'Action', 'Message', 'Trace ID'];
    const rows = logs.map((l) =>
      [l.timestamp, l.id, l.level, l.service, l.sourceIp, l.destination, l.action, l.message, l.traceId]
        .map(csvCell)
        .join(',')
    );
    const csv = [headers.map(csvCell).join(','), ...rows].join('\n');
    downloadBlob(csv, 'text/csv;charset=utf-8', `SIEM_Security_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Exported SIEM logs as CSV', 'success');
  };

  // Export JSON
  const handleExportJSON = () => {
    if (logs.length === 0) {
      showToast('No logs available to export', 'error');
      return;
    }
    downloadBlob(
      JSON.stringify(logs, null, 2),
      'application/json;charset=utf-8',
      `SIEM_Security_Logs_${new Date().toISOString().slice(0, 10)}.json`
    );
    showToast('Exported SIEM logs as JSON', 'success');
  };

  const handleCopyPayload = async () => {
    if (!activeInspectLog) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(activeInspectLog, null, 2));
      showToast('Copied raw JSON to clipboard', 'success');
    } catch {
      showToast('Clipboard access denied', 'error');
    }
  };

  const levelCount = (lvl: string): number => {
    switch (lvl) {
      case 'ALL':
        return metrics.totalIngested;
      case 'CRITICAL':
        return metrics.criticalCount;
      case 'ERROR':
        return metrics.errorCount;
      case 'WARN':
        return metrics.warnCount;
      case 'INFO':
        return metrics.infoCount;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[60] px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 text-white border ${
              toast.type === 'success'
                ? 'bg-emerald-950 border-emerald-500/40'
                : toast.type === 'error'
                ? 'bg-red-950 border-red-500/40'
                : 'bg-blue-950 border-blue-500/40'
            }`}
          >
            <i
              className={`fa-solid ${
                toast.type === 'success'
                  ? 'fa-circle-check text-emerald-400'
                  : toast.type === 'error'
                  ? 'fa-triangle-exclamation text-red-400'
                  : 'fa-circle-info text-blue-400'
              }`}
            />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER & STREAM CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0a0803]/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-2.5 py-1 bg-[#141008] hover:bg-[#20180a] text-amber-300 border border-amber-500/30 rounded text-xs transition cursor-pointer flex items-center gap-1"
            >
              <i className="fa-solid fa-arrow-left text-[10px]" /> Back
            </button>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-amber-400" /> securewatch SIEM Security Telemetry Logs
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              Real Backend Telemetry
            </span>
          </div>
          <p className="text-xs text-amber-200/70 mt-1">
            Real-time audit trails, WAF mitigation logs, authentication telemetry, and threat telemetry events.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsLiveStreaming((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
              isLiveStreaming
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            {isLiveStreaming ? 'Live Stream Active' : 'Stream Paused'}
          </button>

          <button
            type="button"
            onClick={() => fetchLogs()}
            className="px-3 py-1.5 bg-[#15192b] hover:bg-[#1f243d] border border-[#1f2335] text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <i className={`fa-solid fa-rotate-right ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsIngestModalOpen(true)}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer flex items-center gap-1.5"
          >
            <i className="fa-solid fa-plus-circle" /> Inject Security Event
          </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4">
          <span className="text-xs text-gray-400 block font-medium">Total Ingested Events</span>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{metrics.totalIngested}</div>
          <span className="text-[11px] text-emerald-400 mt-1 inline-flex items-center gap-1">
            <i className="fa-solid fa-bolt text-[10px]" /> Real-time active pipeline
          </span>
        </div>

        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4">
          <span className="text-xs text-gray-400 block font-medium">Critical Alerts</span>
          <div className="text-2xl font-bold text-red-400 mt-1 font-mono">{metrics.criticalCount}</div>
          <span className="text-[11px] text-gray-400 mt-1 block">Immediate SOC action required</span>
        </div>

        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4">
          <span className="text-xs text-gray-400 block font-medium">Blocked Attack Rate</span>
          <div className="text-2xl font-bold text-purple-400 mt-1 font-mono">{metrics.blockedRate}%</div>
          <span className="text-[11px] text-purple-300 mt-1 block">WAF & Gateway containment</span>
        </div>

        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4">
          <span className="text-xs text-gray-400 block font-medium">Stream Ingestion Health</span>
          <div
            className={`text-2xl font-bold mt-1 font-mono ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {isConnected ? 'ONLINE' : 'OFFLINE'}
          </div>
          <span className={`text-[11px] mt-1 block ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {isConnected ? 'Backend API reachable' : 'Cannot reach backend API'}
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-500 text-xs" />
            <input
              type="text"
              placeholder="Search logs by IP, message, service, ID, or trace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none focus:border-purple-500 transition font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Service Dropdown Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Service:</span>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-3 py-1.5 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none focus:border-purple-500 font-mono cursor-pointer"
            >
              <option value="ALL">All Services</option>
              <option value="WAF Guard">WAF Guard</option>
              <option value="Auth Gateway">Auth Gateway</option>
              <option value="API Gateway">API Gateway</option>
              <option value="TLS Manager">TLS Manager</option>
              <option value="SIEM Collector">SIEM Collector</option>
              <option value="RBAC Controller">RBAC Controller</option>
            </select>
          </div>

          {/* Export & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-[#15192b] hover:bg-[#1f243d] border border-[#1f2335] text-gray-300 hover:text-white text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5"
              title="Export CSV"
            >
              <i className="fa-solid fa-file-csv text-emerald-400" /> Export CSV
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="px-2.5 py-1.5 bg-[#15192b] hover:bg-[#1f243d] border border-[#1f2335] text-gray-300 hover:text-white text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5"
              title="Export JSON"
            >
              <i className="fa-solid fa-file-code text-blue-400" /> Export JSON
            </button>

            <button
              type="button"
              onClick={handleClearLogs}
              className="px-3 py-1.5 bg-red-950/40 hover:bg-red-800/60 border border-red-500/50 text-red-200 hover:text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Clear Logs Buffer"
            >
              <i className="fa-solid fa-trash-can text-red-400" />
              <span>Clear Logs Buffer</span>
            </button>
          </div>
        </div>

        {/* Level Badges Selector */}
        <div className="flex items-center gap-2 border-t border-[#1f2335] pt-3 overflow-x-auto">
          <span className="text-xs text-gray-400 font-medium mr-1">Severity:</span>
          {['ALL', 'CRITICAL', 'ERROR', 'WARN', 'INFO'].map((lvl) => (
            <button
              type="button"
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedLevel === lvl
                  ? lvl === 'CRITICAL'
                    ? 'bg-red-600 text-white'
                    : lvl === 'ERROR'
                    ? 'bg-rose-600 text-white'
                    : lvl === 'WARN'
                    ? 'bg-amber-600 text-white'
                    : lvl === 'INFO'
                    ? 'bg-blue-600 text-white'
                    : 'bg-purple-600 text-white'
                  : 'bg-[#15192b] text-gray-400 hover:text-white border border-[#1f2335]'
              }`}
            >
              {lvl}
              <span className="px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-mono">{levelCount(lvl)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* LOGS TABLE */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#1f2335] flex justify-between items-center">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <i className="fa-solid fa-list text-purple-400" /> Log Stream Feed ({logs.length} events)
          </h3>
          <span className="text-xs text-gray-400 font-mono">Showing latest real-time records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-[#080a10] border-b border-[#1f2335] text-gray-400 font-semibold uppercase text-[11px]">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Log ID</th>
                <th className="p-3">Level</th>
                <th className="p-3">Service</th>
                <th className="p-3">Source IP</th>
                <th className="p-3">Action</th>
                <th className="p-3">Message</th>
                <th className="p-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2335]/60 text-gray-300">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    <i className="fa-solid fa-spinner animate-spin text-xl text-purple-400 block mb-2" />
                    Fetching live SIEM security logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    <i className="fa-solid fa-shield-cat text-2xl text-gray-600 block mb-2" />
                    No security logs in buffer or matching current filter.
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false}>
                  {logs.map((log) => {
                    const levelBadgeClass =
                      log.level === 'CRITICAL'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : log.level === 'ERROR'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        : log.level === 'WARN'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-400 border-blue-500/40';

                    const actionBadgeClass =
                      log.action === 'BLOCKED'
                        ? 'bg-red-950 text-red-400 border-red-800/50'
                        : log.action === 'QUARANTINED'
                        ? 'bg-purple-950 text-purple-400 border-purple-800/50'
                        : log.action === 'FLAGGED' || log.action === 'ALERTED'
                        ? 'bg-amber-950 text-amber-400 border-amber-800/50'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800/50';

                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={() => setActiveInspectLog(log)}
                        className="hover:bg-[#15192b]/70 cursor-pointer transition"
                      >
                        <td className="p-3 text-gray-400 whitespace-nowrap">{formatTime(log.timestamp)}</td>
                        <td className="p-3 text-purple-300 font-bold whitespace-nowrap">{log.id}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${levelBadgeClass}`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="p-3 text-gray-300 font-semibold whitespace-nowrap">{log.service}</td>
                        <td className="p-3 text-emerald-400 whitespace-nowrap">{log.sourceIp}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${actionBadgeClass}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-white max-w-md truncate font-sans text-xs" title={log.message}>
                          {log.message}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveInspectLog(log);
                            }}
                            className="px-2.5 py-1 bg-[#1a1e30] hover:bg-purple-600 text-gray-300 hover:text-white rounded text-[11px] font-bold transition cursor-pointer"
                          >
                            <i className="fa-solid fa-code" /> Details
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECT LOG MODAL */}
      <AnimatePresence>
        {activeInspectLog && (
          <motion.div
            key="inspect-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setActiveInspectLog(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0d111c] border border-[#1f2335] w-full max-w-2xl rounded-xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-[#1f2335] pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-mono font-bold">
                    {activeInspectLog.id}
                  </span>
                  <h3 className="font-bold text-sm text-white">Security Event Raw Telemetry Payload</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInspectLog(null)}
                  className="text-gray-400 hover:text-white cursor-pointer text-sm"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#080a10] p-3 rounded-lg border border-[#1f2335]">
                <div>
                  <span className="text-gray-500 block">Severity Level</span>
                  <strong className={LEVEL_TEXT_CLASS[activeInspectLog.level] || 'text-white'}>
                    {activeInspectLog.level}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Service Engine</span>
                  <strong className="text-white">{activeInspectLog.service}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Source IP Address</span>
                  <strong className="text-emerald-400 font-mono">{activeInspectLog.sourceIp}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Mitigation Action</span>
                  <strong className="text-purple-400">{activeInspectLog.action}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-medium block">Raw JSON Data Structure</span>
                <pre className="bg-[#05070d] border border-[#1f2335] p-4 rounded-lg text-xs font-mono text-emerald-400 overflow-auto max-h-64">
                  {JSON.stringify(activeInspectLog, null, 2)}
                </pre>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-[#1f2335]">
                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="px-3 py-1.5 bg-[#15192b] hover:bg-[#1f243d] text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-copy" /> Copy Payload JSON
                </button>

                <button
                  type="button"
                  onClick={() => setActiveInspectLog(null)}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INJECT CUSTOM SECURITY EVENT MODAL */}
      <AnimatePresence>
        {isIngestModalOpen && (
          <motion.div
            key="ingest-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsIngestModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0d111c] border border-[#1f2335] w-full max-w-lg rounded-xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-[#1f2335] pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <i className="fa-solid fa-bug text-purple-400" /> Inject Custom Security Threat Event
                </h3>
                <button
                  type="button"
                  onClick={() => setIsIngestModalOpen(false)}
                  className="text-gray-400 hover:text-white cursor-pointer text-sm"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <form onSubmit={handleIngestEvent} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-semibold block">Severity Level</label>
                    <select
                      value={ingestLevel}
                      onChange={(e) => setIngestLevel(e.target.value as Level)}
                      className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="ERROR">ERROR</option>
                      <option value="WARN">WARN</option>
                      <option value="INFO">INFO</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 font-semibold block">Target Service</label>
                    <input
                      type="text"
                      required
                      value={ingestService}
                      onChange={(e) => setIngestService(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-semibold block">Source IP</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 203.0.113.42"
                      value={ingestSourceIp}
                      onChange={(e) => setIngestSourceIp(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg font-mono outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 font-semibold block">Action Taken</label>
                    <select
                      value={ingestAction}
                      onChange={(e) =>
                        setIngestAction(e.target.value as 'BLOCKED' | 'FLAGGED' | 'ALLOWED' | 'QUARANTINED')
                      }
                      className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500"
                    >
                      <option value="BLOCKED">BLOCKED</option>
                      <option value="FLAGGED">FLAGGED</option>
                      <option value="QUARANTINED">QUARANTINED</option>
                      <option value="ALLOWED">ALLOWED</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold block">Log Message Description</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. CSRF token validation failure detected on payment checkout endpoint"
                    value={ingestMessage}
                    onChange={(e) => setIngestMessage(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsIngestModalOpen(false)}
                    className="px-4 py-2 bg-[#111524] hover:bg-[#1a1e30] text-gray-300 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-lg cursor-pointer shadow-lg flex items-center gap-1.5"
                  >
                    <i className={`fa-solid ${isSubmitting ? 'fa-spinner animate-spin' : 'fa-paper-plane'}`} />{' '}
                    {isSubmitting ? 'Ingesting...' : 'Ingest Event Live'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};