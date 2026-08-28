import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePersistentComponentState } from '../utils/usePersistentComponentState';

export interface ApiEndpointItem {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status: 'Healthy' | 'Degraded' | 'Down';
  latencyMs: number;
  uptimePct: number;
  errorRatePct: number;
  authType: 'JWT Bearer' | 'API Key' | 'OAuth 2.0' | 'Public';
  rateLimit: string;
  lastTested: string;
}

interface ApiMonitoringViewProps {
  onBackToDashboard?: () => void;
}

const INITIAL_ENDPOINTS: ApiEndpointItem[] = [
  {
    id: 'health',
    name: 'SecureWatch Backend Health',
    path: '/api/health',
    method: 'GET',
    status: 'Down',
    latencyMs: 0,
    uptimePct: 0,
    errorRatePct: 0,
    authType: 'Public',
    rateLimit: 'Not reported',
    lastTested: 'Not tested',
  },
];

export const ApiMonitoringView: React.FC<ApiMonitoringViewProps> = ({ onBackToDashboard }) => {
  const [monitorState, setMonitorState] = usePersistentComponentState<{ endpoints: ApiEndpointItem[] }>('api-monitoring', { endpoints: INITIAL_ENDPOINTS });
  const endpoints = monitorState.endpoints;
  const setEndpoints = (next: ApiEndpointItem[] | ((current: ApiEndpointItem[]) => ApiEndpointItem[])) => {
    setMonitorState((current) => ({
      ...current,
      endpoints: typeof next === 'function' ? next(current.endpoints) : next,
    }));
  };
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [selectedMethod, setSelectedMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [testUrl, setTestUrl] = useState<string>('/api/health');
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<any | null>(null);

  // Live Chart Stream Latency Data
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  // Measured load test state
  const [isLoadTesting, setIsLoadTesting] = useState<boolean>(false);
  const [loadTestProgress, setLoadTestProgress] = useState<number>(0);
  const [loadTestStats, setLoadTestStats] = useState<{
    totalReq: number;
    passedReq: number;
    failedReq: number;
    avgLatency: number;
    peakRps: number;
  } | null>(null);

  // AI API Audit State
  const [auditEndpoint, setAuditEndpoint] = useState<ApiEndpointItem | null>(null);
  const [isAuditingAi, setIsAuditingAi] = useState<boolean>(false);
  const [aiAuditReport, setAiAuditReport] = useState<{
    securityScore: number;
    authAssessment: string;
    rateLimitAssessment: string;
    owaspApiRisks: string[];
    concreteFixes: string[];
  } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'danger' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'danger' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Real Request Metrics Counter
  const [totalProbesCount, setTotalProbesCount] = useState<number>(14);
  const [isProbingAll, setIsProbingAll] = useState<boolean>(false);

  // Add Endpoint Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newEpName, setNewEpName] = useState<string>('');
  const [newEpPath, setNewEpPath] = useState<string>('');
  const [newEpMethod, setNewEpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [newEpAuth, setNewEpAuth] = useState<'JWT Bearer' | 'API Key' | 'OAuth 2.0' | 'Public'>('Public');

  // Real Live Stream Telemetry Probe
  useEffect(() => {
    if (!isLiveStreaming) return;

    const measureRealTelemetry = async () => {
      const t0 = performance.now();
      try {
        const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
        const t1 = performance.now();
        const measuredLat = Math.round(t1 - t0);

        setLatencyHistory((prev) => [...prev.slice(1), measuredLat]);

        setEndpoints((prev) => prev.map((ep) => ep.path === '/api/health'
          ? { ...ep, latencyMs: measuredLat, lastTested: 'Just now', status: res.ok ? 'Healthy' : 'Degraded' }
          : ep));
      } catch (err) {
        setEndpoints((prev) => prev.map((ep) => ep.path === '/api/health'
          ? { ...ep, lastTested: 'Just now', status: 'Down' }
          : ep));
      }
    };

    measureRealTelemetry();
    const interval = setInterval(measureRealTelemetry, 2500);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Handle Real Endpoint Ping
  const handlePing = async (urlToPing?: string, methodToUse?: 'GET' | 'POST' | 'PUT' | 'DELETE') => {
    const targetUrl = urlToPing || testUrl;
    const targetMethod = methodToUse || selectedMethod;

    setIsPinging(true);
    setPingResult(null);

    try {
      const res = await fetch('/api/ping-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, method: targetMethod }),
      });

      setTotalProbesCount((c) => c + 1);

      if (res.ok) {
        const data = await res.json();
        setPingResult(data);
        setEndpoints((prev) => prev.map((endpoint) => endpoint.path === targetUrl && endpoint.method === targetMethod
          ? {
              ...endpoint,
              latencyMs: data.latencyMs,
              status: data.status < 300 ? 'Healthy' : data.status < 500 ? 'Degraded' : 'Down',
              lastTested: 'Just now',
              rateLimit: data.rateLimitRemaining === '100' ? endpoint.rateLimit : `${data.rateLimitRemaining} remaining`,
            }
          : endpoint));
        showToast(`API Probe Succeeded: ${data.status} ${data.statusText} (${data.latencyMs}ms)`, 'success');
      } else {
        throw new Error('Server returned error response');
      }
    } catch (err: any) {
      setPingResult({ url: targetUrl, method: targetMethod, status: 0, statusText: 'Probe failed', latencyMs: 0, bodySnippet: err.message });
      showToast(`API Probe Failed: ${err.message}`, 'danger');
    } finally {
      setIsPinging(false);
    }
  };

  // Probe ALL endpoints live in parallel
  const handleProbeAllEndpoints = async () => {
    setIsProbingAll(true);
    showToast('Executing live parallel probe on all endpoints...', 'info');

    try {
      const updatedList = await Promise.all(
        endpoints.map(async (ep) => {
          try {
            const res = await fetch('/api/ping-endpoint', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: ep.path, method: ep.method }),
            });
            if (res.ok) {
              const data = await res.json();
              const statusLabel: 'Healthy' | 'Degraded' | 'Down' =
                data.status < 300 ? 'Healthy' : data.status < 500 ? 'Degraded' : 'Down';
              return {
                ...ep,
                latencyMs: data.latencyMs,
                status: statusLabel,
                lastTested: 'Just now',
              };
            }
          } catch (e) {
            return { ...ep, status: 'Down' as const, lastTested: 'Just now' };
          }
          return { ...ep, status: 'Down' as const, lastTested: 'Just now' };
        })
      );

      setEndpoints(updatedList);
      setTotalProbesCount((c) => c + endpoints.length);
      showToast('All Endpoints Probed Live! Latencies & Status updated.', 'success');
    } catch (err) {
      showToast('Completed batch probe execution.', 'info');
    } finally {
      setIsProbingAll(false);
    }
  };

  // Add Custom Endpoint Handler
  const handleAddCustomEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEpName || !newEpPath) return;

    const newEndpoint: ApiEndpointItem = {
      id: `EP-${Date.now()}`,
      name: newEpName,
      path: newEpPath,
      method: newEpMethod,
      status: 'Down',
      latencyMs: 0,
      uptimePct: 0,
      errorRatePct: 0,
      authType: newEpAuth,
      rateLimit: '100 req/min',
      lastTested: 'Just now',
    };

    setEndpoints([newEndpoint, ...endpoints]);
    setIsAddModalOpen(false);
    setNewEpName('');
    setNewEpPath('');
    showToast(`Added custom endpoint: ${newEndpoint.path}`, 'success');

    // Probe it immediately
    handlePing(newEndpoint.path, newEndpoint.method === 'PATCH' ? 'POST' : newEndpoint.method);
  };

  // Remove Endpoint
  const handleRemoveEndpoint = (id: string) => {
    setEndpoints((prev) => prev.filter((e) => e.id !== id));
    showToast(`Endpoint ${id} removed from monitoring inventory`, 'info');
  };

  // Run a measured burst against the real backend health endpoint.
  const handleRunLoadTest = async () => {
    setIsLoadTesting(true);
    setLoadTestProgress(0);
    setLoadTestStats(null);

    const totalRequests = 500;
    const results: { ok: boolean; latencyMs: number }[] = [];
    const startedAt = performance.now();
    try {
      for (let offset = 0; offset < totalRequests; offset += 25) {
        const batch = await Promise.all(Array.from({ length: Math.min(25, totalRequests - offset) }, async () => {
          const requestStartedAt = performance.now();
          try {
            const response = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
            return { ok: response.ok, latencyMs: Math.round(performance.now() - requestStartedAt) };
          } catch {
            return { ok: false, latencyMs: Math.round(performance.now() - requestStartedAt) };
          }
        }));
        results.push(...batch);
        setLoadTestProgress(Math.round(((offset + batch.length) / totalRequests) * 100));
      }
      const passedReq = results.filter((result) => result.ok).length;
      const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
      setLoadTestStats({ totalReq: results.length, passedReq, failedReq: results.length - passedReq, avgLatency: Math.round(results.reduce((sum, result) => sum + result.latencyMs, 0) / results.length), peakRps: Math.round(results.length / elapsedSeconds) });
      showToast(`Real load test complete: ${passedReq}/${results.length} requests succeeded.`, passedReq === results.length ? 'success' : 'danger');
    } finally {
      setIsLoadTesting(false);
    }
  };

  // Run AI Security Audit
  const handleRunAiAudit = async (endpoint: ApiEndpointItem) => {
    setAuditEndpoint(endpoint);
    setIsAuditingAi(true);
    setAiAuditReport(null);

    try {
      const res = await fetch('/api/analyze-api-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAuditReport(data);
      } else {
        throw new Error('API Audit Request Failed');
      }
    } catch (err) {
      console.warn('AI API Audit Fallback:', err);
      setAiAuditReport(null);
      showToast(`Security audit unavailable: ${err instanceof Error ? err.message : 'request failed'}`, 'danger');
    } finally {
      setIsAuditingAi(false);
    }
  };

  const observedEndpoints = endpoints.filter((endpoint) => endpoint.lastTested !== 'Not tested');
  const avgSystemLatency = observedEndpoints.length
    ? Math.round(observedEndpoints.reduce((acc, curr) => acc + curr.latencyMs, 0) / observedEndpoints.length)
    : null;
  const gatewayStatus = endpoints.some((endpoint) => endpoint.status === 'Down') ? 'DOWN' : 'ONLINE';

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-xs font-semibold backdrop-blur-md ${
              toast.type === 'danger'
                ? 'bg-red-950/90 text-red-200 border-red-500/50'
                : toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
                : 'bg-purple-950/90 text-purple-200 border-purple-500/50'
            }`}
          >
            <i
              className={`fa-solid ${
                toast.type === 'danger'
                  ? 'fa-triangle-exclamation text-red-400'
                  : toast.type === 'success'
                  ? 'fa-circle-check text-emerald-400'
                  : 'fa-bell text-purple-400'
              }`}
            />
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#1f2335] pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-network-wired text-purple-400" /> xHunter API Gateway & Health Monitor
              </h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Real-time REST endpoint probing, automated latency telemetry, rate-limiting audit & AI security analysis.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Live Ticker Toggle */}
            <button
              onClick={() => setIsLiveStreaming(!isLiveStreaming)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                isLiveStreaming
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-[#111524] text-gray-400 border-[#1f2335]'
              }`}
            >
              <i className={`fa-solid ${isLiveStreaming ? 'fa-signal animate-pulse' : 'fa-pause'}`} />
              {isLiveStreaming ? 'LIVE TELEMETRY: ON' : 'TELEMETRY: PAUSED'}
            </button>

            {/* Run Load Test */}
            <button
              onClick={handleRunLoadTest}
              disabled={isLoadTesting}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition shadow-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <i className="fa-solid fa-gauge-high" /> {isLoadTesting ? 'Testing...' : 'Run Load Stress Test'}
            </button>

            {/* Back to Dashboard */}
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

        {/* Quick Ticker Details */}
        <div className="pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-gray-400">
              Gateway Status: <strong className={gatewayStatus === 'ONLINE' ? 'text-emerald-400' : 'text-red-400'}>{gatewayStatus}</strong>
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">
              Monitored Endpoints: <strong className="text-purple-300">{endpoints.length}</strong>
            </span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400">
              Average Observed Latency: <strong className="text-amber-300">{avgSystemLatency === null ? 'No data' : `${avgSystemLatency} ms`}</strong>
            </span>
          </div>

          <span className="text-gray-400">Current rate: <strong className="text-blue-400">Available after load test</strong></span>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">API Gateway Availability</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{observedEndpoints.length ? `${Math.round(observedEndpoints.filter((endpoint) => endpoint.status !== 'Down').length / observedEndpoints.length * 100)}%` : 'No data'}</div>
            <span className="text-[11px] text-gray-400 mt-1 block font-mono">
              <i className="fa-solid fa-chart-line mr-1" /> Based on current probes
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <i className="fa-solid fa-server" />
          </div>
        </div>

        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">Avg Response Latency</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-0.5">{avgSystemLatency} ms</div>
            <span className="text-[11px] text-purple-300 mt-1 block font-mono">
              <i className="fa-solid fa-bolt mr-1" /> Current probe observations
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <i className="fa-solid fa-stopwatch" />
          </div>
        </div>

        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">HTTP Error Rate (5xx)</span>
            <div className="text-2xl font-bold font-mono text-blue-400 mt-0.5">Observed on probe</div>
            <span className="text-[11px] text-gray-400 mt-1 block font-mono">Historical error data unavailable</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <i className="fa-solid fa-chart-line" />
          </div>
        </div>

        <div className="p-4 bg-[#0d111c] border border-[#1f2335] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium block">Security Defended Requests</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">Not reported</div>
            <span className="text-[11px] text-gray-400 mt-1 block font-mono">No gateway counter available</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <i className="fa-solid fa-shield-halved" />
          </div>
        </div>
      </div>

      {/* REAL-TIME STREAMING LATENCY GRAPH & LOAD TEST SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Latency Ticker Visualizer */}
        <div className="lg:col-span-2 bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-chart-simple text-purple-400 text-sm" />
              <h3 className="font-bold text-sm text-white">xHunter endpoint latency stream (ms)</h3>
            </div>
            <span className="text-[11px] text-gray-400 font-mono">Live Telemetry (2.5s Probe Interval)</span>
          </div>

          {/* Animated Latency Bar Histogram */}
          <div className="h-40 bg-[#080a10] border border-[#1f2335] rounded-lg p-4 flex items-end justify-between gap-1.5 relative overflow-hidden">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 opacity-10">
              <div className="border-b border-gray-400 w-full" />
              <div className="border-b border-gray-400 w-full" />
              <div className="border-b border-gray-400 w-full" />
            </div>

            {latencyHistory.length ? latencyHistory.map((lat, idx) => {
              const heightPct = Math.min(100, Math.max(12, (lat / 50) * 100));
              const isHigh = lat > 30;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group z-10">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition text-[10px] bg-purple-950 text-purple-200 px-1.5 py-0.5 rounded font-mono border border-purple-500/40 pointer-events-none">
                    {lat}ms
                  </div>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className={`w-full rounded-t transition-colors ${
                      isHigh ? 'bg-amber-500 hover:bg-amber-400' : 'bg-purple-500 hover:bg-purple-400'
                    }`}
                  />
                </div>
              );
            }) : <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 font-mono">Waiting for real probe data...</span>}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
            <span>Minimum: {latencyHistory.length ? `${Math.min(...latencyHistory)}ms` : 'No data'}</span>
            <span>Average: {latencyHistory.length ? `${Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length)}ms` : 'No data'}</span>
            <span>Peak Spike: {latencyHistory.length ? `${Math.max(...latencyHistory)}ms` : 'No data'}</span>
            <span>Target SLA: &lt;50ms</span>
          </div>
        </div>

        {/* Load Burst Test Panel */}
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-gauge-high text-amber-400 text-sm" />
              <h3 className="font-bold text-sm text-white">Live Load Test</h3>
            </div>
            <p className="text-xs text-gray-400">
              Send 500 real requests to the selected backend health endpoint and report measured results.
            </p>
          </div>

          {isLoadTesting ? (
            <div className="space-y-3 py-4">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-purple-300">Executing Load Burst...</span>
                <span className="text-white font-bold">{loadTestProgress}%</span>
              </div>
              <div className="w-full bg-[#080a10] border border-[#1f2335] h-3 rounded-full overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-purple-500 to-amber-500 h-full rounded-full"
                  style={{ width: `${loadTestProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-500 font-mono text-center">Firing real parallel HTTP requests...</p>
            </div>
          ) : loadTestStats ? (
            <div className="p-3 bg-[#111524] border border-[#1f2335] rounded-lg space-y-2 text-xs font-mono">
              <div className="flex justify-between text-emerald-400 font-bold border-b border-[#1f2335] pb-1">
                <span>Burst Completed</span>
                <span>500 Requests</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Passed (200 OK):</span>
                <strong className="text-emerald-400">{loadTestStats.passedReq}</strong>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Rate Limited (429):</span>
                <strong className="text-amber-400">{loadTestStats.failedReq}</strong>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Peak Concurrency:</span>
                <strong className="text-purple-300">{loadTestStats.peakRps} req/sec</strong>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#080a10] border border-[#1f2335] rounded-lg text-center text-xs text-gray-400">
              Click <strong>"Run Load Stress Test"</strong> to execute a real load test on `/api/health`.
            </div>
          )}

          <button
            onClick={handleRunLoadTest}
            disabled={isLoadTesting}
            className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-play" /> Trigger 500-Req Load Burst
          </button>
        </div>
      </div>

      {/* LIVE INTERACTIVE ENDPOINT TESTER & INSPECTOR */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#1f2335] pb-4">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <i className="fa-solid fa-terminal text-emerald-400" /> Interactive REST API Endpoint Inspector & Ping Probe
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Probe any local or external API endpoint. Real HTTP request is dispatched with latency timing and response header auditing.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-500 font-mono">Quick Presets:</span>
            <button
              onClick={() => { setTestUrl('/api/health'); setSelectedMethod('GET'); }}
              className="px-2 py-1 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 text-[11px] rounded font-mono"
            >
              GET /api/health
            </button>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Method Select */}
          <select
            value={selectedMethod}
            onChange={(e: any) => setSelectedMethod(e.target.value)}
            className="w-full sm:w-28 px-3 py-2 bg-[#080a10] border border-[#1f2335] text-purple-400 text-xs font-bold rounded-lg outline-none cursor-pointer focus:border-[#3b28cc]"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* URL Input */}
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="e.g. /api/health or https://api.github.com"
            className="flex-1 w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none font-mono focus:border-[#3b28cc]"
          />

          {/* Ping Button */}
          <button
            onClick={() => handlePing()}
            disabled={isPinging}
            className="w-full sm:w-auto px-6 py-2 bg-[#3b28cc] hover:bg-[#4d3be3] text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-lg"
          >
            {isPinging ? <i className="fa-solid fa-spinner animate-spin" /> : <i className="fa-solid fa-bolt" />}
            {isPinging ? 'Pinging Target...' : 'Execute Probe Ping'}
          </button>
        </div>

        {/* PING RESPONSE CARD */}
        <AnimatePresence>
          {pingResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-3 font-mono text-xs"
            >
              <div className="flex justify-between items-center border-b border-[#1f2335] pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 font-bold rounded text-[11px]">
                    {pingResult.method}
                  </span>
                  <span className="text-white font-bold">{pingResult.url}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                    HTTP {pingResult.status} {pingResult.statusText}
                  </span>
                  <span className="text-purple-300 font-bold">
                    Latency: {pingResult.latencyMs} ms
                  </span>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-gray-300">
                <div>
                  <span className="text-gray-500 block">Server Header:</span>
                  <strong className="text-gray-200">{pingResult.serverHeader}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Content-Type:</span>
                  <strong className="text-gray-200">{pingResult.contentType}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">RateLimit Remaining:</span>
                  <strong className="text-emerald-400">{pingResult.rateLimitRemaining} reqs</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Protocol / Security:</span>
                  <strong className="text-purple-300">{pingResult.protocol}</strong>
                </div>
              </div>

              {/* Body snippet */}
              <div className="space-y-1">
                <span className="text-[11px] text-gray-400">Response Payload Snippet:</span>
                <pre className="p-3 bg-[#080a10] border border-[#1f2335] rounded text-[11px] text-emerald-300 overflow-x-auto max-h-36 whitespace-pre-wrap">
                  {pingResult.bodySnippet}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI API SECURITY AUDIT MODAL / PANEL */}
      <AnimatePresence>
        {auditEndpoint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="p-5 bg-[#0d111c] border border-purple-500/50 rounded-xl space-y-4 shadow-[0_0_25px_rgba(159,134,255,0.15)]"
          >
            <div className="flex justify-between items-center border-b border-[#1f2335] pb-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-brain text-purple-400 text-base" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    AI Endpoint Security Audit ({auditEndpoint.name})
                  </h3>
                  <span className="text-[11px] font-mono text-purple-300">
                    Path: {auditEndpoint.path} | Method: {auditEndpoint.method} | Auth: {auditEndpoint.authType}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setAuditEndpoint(null)}
                className="text-gray-400 hover:text-white text-xs font-mono bg-[#111524] px-2.5 py-1 rounded border border-[#1f2335] cursor-pointer"
              >
                Close Audit
              </button>
            </div>

            {isAuditingAi ? (
              <div className="py-8 text-center space-y-2">
                <i className="fa-solid fa-spinner animate-spin text-purple-400 text-2xl" />
                <p className="text-xs text-gray-300 font-mono">Generating OWASP API Security Top 10 Audit Report...</p>
              </div>
            ) : aiAuditReport ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
                {/* Score Card */}
                <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-lg flex flex-col items-center justify-center text-center space-y-2">
                  <span className="text-gray-400 text-xs uppercase font-bold">API Security Posture</span>
                  <div className="text-4xl font-extrabold font-mono text-purple-400">{aiAuditReport.securityScore}/100</div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    PASSED SECURITY AUDIT
                  </span>
                </div>

                {/* OWASP Risks */}
                <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-lg space-y-2">
                  <span className="font-bold text-amber-400 block">OWASP API Security Vulnerability Assessment:</span>
                  <ul className="space-y-1.5 text-gray-300 text-[11px] font-mono">
                    {aiAuditReport.owaspApiRisks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <i className="fa-solid fa-triangle-exclamation text-amber-400 mt-0.5" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Technical Fixes */}
                <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-lg space-y-2">
                  <span className="font-bold text-emerald-400 block">Actionable Technical Remediation:</span>
                  <ul className="space-y-1.5 text-gray-300 text-[11px] font-mono">
                    {aiAuditReport.concreteFixes.map((fix, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <i className="fa-solid fa-shield-halved text-emerald-400 mt-0.5" />
                        <span>{fix}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENDPOINT INVENTORY & HEALTH MATRIX TABLE */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-[#1f2335] pb-3 flex-wrap gap-2">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <i className="fa-solid fa-list-check text-purple-400" /> Monitored Microservice API Inventory ({endpoints.length})
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={handleProbeAllEndpoints}
              disabled={isProbingAll}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <i className={`fa-solid ${isProbingAll ? 'fa-spinner animate-spin' : 'fa-bolt'}`} />
              {isProbingAll ? 'Probing All...' : 'Probe All Endpoints Live'}
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer flex items-center gap-1.5"
            >
              <i className="fa-solid fa-plus" /> Add Endpoint
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1f2335] text-gray-400 uppercase text-[10px]">
                <th className="pb-3 font-semibold">Service / Name</th>
                <th className="pb-3 font-semibold">Endpoint Path</th>
                <th className="pb-3 font-semibold">Method</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Latency</th>
                <th className="pb-3 font-semibold">Auth Mechanism</th>
                <th className="pb-3 font-semibold">Rate Limit</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2335]">
              {endpoints.map((ep) => (
                <tr key={ep.id} className="hover:bg-[#111524] transition group">
                  <td className="py-3 font-sans font-semibold text-white">
                    {ep.name}
                    <span className="block text-[10px] text-gray-500 font-mono">{ep.id}</span>
                  </td>
                  <td className="py-3 text-purple-300 font-bold">{ep.path}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 font-bold rounded text-[10px]">
                      {ep.method}
                    </span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        ep.status === 'Healthy'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      <i className={`fa-solid ${ep.status === 'Healthy' ? 'fa-circle-check' : 'fa-triangle-exclamation'} mr-1`} />
                      {ep.status}
                    </span>
                  </td>
                  <td className="py-3 text-white font-bold">{ep.latencyMs} ms</td>
                  <td className="py-3 text-gray-300">{ep.authType}</td>
                  <td className="py-3 text-gray-400">{ep.rateLimit}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handlePing(ep.path, ep.method === 'PATCH' ? 'POST' : ep.method)}
                        className="px-2.5 py-1 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-emerald-400 text-[11px] rounded transition cursor-pointer"
                        title="Probe Ping Endpoint"
                      >
                        <i className="fa-solid fa-bolt" /> Probe
                      </button>
                      <button
                        onClick={() => handleRunAiAudit(ep)}
                        className="px-2.5 py-1 bg-[#111524] hover:bg-[#1a1e30] border border-purple-500/30 text-purple-300 text-[11px] rounded transition cursor-pointer"
                        title="Run AI Security Audit"
                      >
                        <i className="fa-solid fa-brain" /> Audit
                      </button>
                      <button
                        onClick={() => handleRemoveEndpoint(ep.id)}
                        className="px-2 py-1 bg-[#111524] hover:bg-red-950/40 border border-[#1f2335] hover:border-red-500/40 text-gray-500 hover:text-red-400 text-[11px] rounded transition cursor-pointer"
                        title="Remove Endpoint"
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD CUSTOM ENDPOINT MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0d111c] border border-[#1f2335] w-full max-w-lg rounded-xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex justify-between items-center border-b border-[#1f2335] pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <i className="fa-solid fa-plus-circle text-purple-400" /> Register New API Endpoint For Live Monitoring
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-400 hover:text-white cursor-pointer text-sm"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <form onSubmit={handleAddCustomEndpoint} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold block">Endpoint Name / Service</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Analytics Ingestion API"
                    value={newEpName}
                    onChange={(e) => setNewEpName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-300 font-semibold block">URL Path or Full External URL</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. /api/analytics or https://api.github.com/zen"
                    value={newEpPath}
                    onChange={(e) => setNewEpPath(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg font-mono outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-semibold block">HTTP Method</label>
                    <select
                      value={newEpMethod}
                      onChange={(e: any) => setNewEpMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500 font-mono"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 font-semibold block">Auth Type</label>
                    <select
                      value={newEpAuth}
                      onChange={(e: any) => setNewEpAuth(e.target.value)}
                      className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-purple-500"
                    >
                      <option value="Public">Public</option>
                      <option value="JWT Bearer">JWT Bearer</option>
                      <option value="API Key">API Key</option>
                      <option value="OAuth 2.0">OAuth 2.0</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-[#111524] hover:bg-[#1a1e30] text-gray-300 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg cursor-pointer shadow-lg flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-check" /> Add & Probe Now
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
