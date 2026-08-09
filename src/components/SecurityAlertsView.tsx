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

const INITIAL_ALERTS: SecurityAlert[] = [
  {
    id: 'ALT-9801',
    title: 'SQL Injection Attack via Order Search Endpoint',
    severity: 'Critical',
    srcIp: '185.220.101.5',
    country: 'Netherlands',
    countryCode: 'NL',
    targetEndpoint: '/api/v1/orders/search?q=1\' OR \'1\'=\'1',
    timestamp: new Date(Date.now() - 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'Active',
    attackVector: 'SQLi (Blind Time-Based Injection)',
    owaspCategory: 'OWASP A03:2021 Injection',
    requestsPerSec: 420,
    protocol: 'HTTPS / TLS 1.3',
    riskScore: 98,
  },
  {
    id: 'ALT-9798',
    title: 'Credential Stuffing Botnet Attempt',
    severity: 'Critical',
    srcIp: '45.154.255.82',
    country: 'Russia',
    countryCode: 'RU',
    targetEndpoint: '/api/v1/auth/login',
    timestamp: new Date(Date.now() - 180000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'Active',
    attackVector: 'Automated Account Takeover (ATO)',
    owaspCategory: 'OWASP A07:2021 Identification & Auth Failures',
    requestsPerSec: 1250,
    protocol: 'HTTP/2',
    riskScore: 92,
  },
  {
    id: 'ALT-9792',
    title: 'Unauthorized Admin Endpoint Probe',
    severity: 'High',
    srcIp: '103.251.170.4',
    country: 'China',
    countryCode: 'CN',
    targetEndpoint: '/admin/env.php',
    timestamp: new Date(Date.now() - 450000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'Investigating',
    attackVector: 'Reconnaissance / Sensitive File Disclosure',
    owaspCategory: 'OWASP A01:2021 Broken Access Control',
    requestsPerSec: 45,
    protocol: 'HTTPS',
    riskScore: 78,
  },
  {
    id: 'ALT-9784',
    title: 'API Rate Limit Exceeded (DDoS Spike)',
    severity: 'Medium',
    srcIp: '198.51.100.44',
    country: 'United States',
    countryCode: 'US',
    targetEndpoint: '/api/v2/products/list',
    timestamp: new Date(Date.now() - 900000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'Blocked',
    attackVector: 'HTTP Flood DDoS',
    owaspCategory: 'OWASP A04:2021 Insecure Design',
    requestsPerSec: 3400,
    protocol: 'HTTP/2',
    riskScore: 55,
  },
  {
    id: 'ALT-9770',
    title: 'Cross-Site Scripting (XSS) Payload in Comment Field',
    severity: 'Low',
    srcIp: '82.165.19.120',
    country: 'Germany',
    countryCode: 'DE',
    targetEndpoint: '/api/comments/submit',
    timestamp: new Date(Date.now() - 1400000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    status: 'Resolved',
    attackVector: 'Stored XSS (<script>alert(1)</script>)',
    owaspCategory: 'OWASP A03:2021 Injection',
    requestsPerSec: 1,
    protocol: 'HTTPS',
    riskScore: 32,
  },
];

const SIMULATION_ATTACKS = [
  {
    title: 'JWT Secret Key Forgery Attempt',
    severity: 'Critical' as const,
    attackVector: 'Broken Token Validation (None Alg)',
    owaspCategory: 'OWASP A02:2021 Cryptographic Failures',
    targetEndpoint: '/api/v1/user/profile',
    protocol: 'HTTPS / TLS 1.3',
    riskScore: 96,
  },
  {
    title: 'Distributed Slowloris Denial of Service',
    severity: 'High' as const,
    attackVector: 'Resource Exhaustion (Unclosed HTTP Headers)',
    owaspCategory: 'OWASP A05:2021 Security Misconfiguration',
    targetEndpoint: '/api/v1/stream',
    protocol: 'HTTP/1.1',
    riskScore: 84,
  },
  {
    title: 'Remote Code Execution (RCE) via Log4j Payload',
    severity: 'Critical' as const,
    attackVector: 'JNDI LDAP Injection (${jndi:ldap://...})',
    owaspCategory: 'OWASP A06:2021 Vulnerable Components',
    targetEndpoint: '/api/v1/search',
    protocol: 'HTTPS',
    riskScore: 99,
  },
  {
    title: 'SSRF Attack Targeting Internal Cloud Metadata (169.254.169.254)',
    severity: 'High' as const,
    attackVector: 'Server-Side Request Forgery',
    owaspCategory: 'OWASP A10:2021 Server-Side Request Forgery',
    targetEndpoint: '/api/v1/fetch-url?url=http://169.254.169.254/latest/meta-data/',
    protocol: 'HTTPS',
    riskScore: 88,
  },
];

const RANDOM_IPS = [
  { ip: '185.220.101.7', country: 'Netherlands', code: 'NL' },
  { ip: '91.240.118.172', country: 'Ukraine', code: 'UA' },
  { ip: '194.26.29.112', country: 'Russia', code: 'RU' },
  { ip: '113.108.192.12', country: 'China', code: 'CN' },
  { ip: '185.191.171.1', country: 'Iran', code: 'IR' },
  { ip: '198.143.158.20', country: 'United States', code: 'US' },
  { ip: '51.15.22.190', country: 'France', code: 'FR' },
];

export const SecurityAlertsView: React.FC<SecurityAlertsViewProps> = ({
  onBackToDashboard,
  onAlertCountChange,
}) => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>(() => {
    const saved = localStorage.getItem('custom_security_alerts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Error reading saved security alerts:', e);
      }
    }
    return INITIAL_ALERTS;
  });

  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Custom Alert Creation Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSeverity, setNewSeverity] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');
  const [newSrcIp, setNewSrcIp] = useState<string>('185.220.101.99');
  const [newCountry, setNewCountry] = useState<string>('Germany');
  const [newEndpoint, setNewEndpoint] = useState<string>('/api/v1/user/payments');
  const [newVector, setNewVector] = useState<string>('BOLA / Broken Object Level Auth');
  const [newOwasp, setNewOwasp] = useState<string>('OWASP A01:2021 Broken Access Control');

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

  // Sync alerts with localStorage
  useEffect(() => {
    localStorage.setItem('custom_security_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Sync active count with parent
  useEffect(() => {
    const activeCount = alerts.filter((a) => a.status === 'Active' || a.status === 'Investigating').length;
    if (onAlertCountChange) onAlertCountChange(activeCount);
  }, [alerts, onAlertCountChange]);

  // Live Stream Attack Generator
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      const template = SIMULATION_ATTACKS[Math.floor(Math.random() * SIMULATION_ATTACKS.length)];
      const location = RANDOM_IPS[Math.floor(Math.random() * RANDOM_IPS.length)];
      const newAlertId = `ALT-${Math.floor(Math.random() * 9000 + 1000)}`;

      const newAlert: SecurityAlert = {
        id: newAlertId,
        title: template.title,
        severity: template.severity,
        srcIp: `${location.ip}`,
        country: location.country,
        countryCode: location.code,
        targetEndpoint: template.targetEndpoint,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 'Active',
        attackVector: template.attackVector,
        owaspCategory: template.owaspCategory,
        requestsPerSec: Math.floor(Math.random() * 800 + 50),
        protocol: template.protocol,
        riskScore: template.riskScore,
      };

      setAlerts((prev) => [newAlert, ...prev.slice(0, 25)]); // keep max 25 items
    }, 6000);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Manual Trigger Alert
  const handleSimulateCustomAlert = (attackType?: string) => {
    const template = SIMULATION_ATTACKS[Math.floor(Math.random() * SIMULATION_ATTACKS.length)];
    const location = RANDOM_IPS[Math.floor(Math.random() * RANDOM_IPS.length)];
    const newAlertId = `ALT-${Math.floor(Math.random() * 9000 + 1000)}`;

    const newAlert: SecurityAlert = {
      id: newAlertId,
      title: attackType || template.title,
      severity: 'Critical',
      srcIp: location.ip,
      country: location.country,
      countryCode: location.code,
      targetEndpoint: template.targetEndpoint,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'Active',
      attackVector: template.attackVector,
      owaspCategory: template.owaspCategory,
      requestsPerSec: Math.floor(Math.random() * 1500 + 200),
      protocol: 'HTTPS / TLS 1.3',
      riskScore: 97,
    };

    setAlerts((prev) => [newAlert, ...prev]);
    showToast(`New Incident Alert Triggered: ${newAlert.id} from ${newAlert.srcIp}`, 'danger');
  };

  // Create Custom Security Alert Handler
  const handleCreateCustomAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const customAlert: SecurityAlert = {
      id: `ALT-${Math.floor(Math.random() * 9000 + 1000)}`,
      title: newTitle.trim(),
      severity: newSeverity,
      srcIp: newSrcIp.trim() || '127.0.0.1',
      country: newCountry.trim() || 'Unknown',
      countryCode: 'XX',
      targetEndpoint: newEndpoint.trim() || '/api/v1/auth',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'Active',
      attackVector: newVector.trim() || 'Custom Security Vector',
      owaspCategory: newOwasp.trim() || 'OWASP Custom',
      requestsPerSec: Math.floor(Math.random() * 500 + 100),
      protocol: 'HTTPS / TLS 1.3',
      riskScore: newSeverity === 'Critical' ? 95 : newSeverity === 'High' ? 82 : newSeverity === 'Medium' ? 58 : 35,
    };

    setAlerts((prev) => [customAlert, ...prev]);
    setIsAddModalOpen(false);
    setNewTitle('');
    showToast(`Custom Security Alert "${customAlert.id}" logged successfully!`, 'success');
  };

  // Actions
  const handleBlockIp = (id: string, srcIp: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'Blocked' } : a))
    );
    showToast(`Firewall Rule Applied: IP ${srcIp} permanently blocked on Edge WAF`, 'success');
  };

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'Investigating' } : a))
    );
    showToast(`Alert ${id} assigned to SOC Incident Response team`, 'info');
  };

  const handleResolve = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'Resolved' } : a))
    );
    showToast(`Alert ${id} marked as resolved and mitigated`, 'success');
  };

  const handleEmergencyLockdown = () => {
    setAlerts((prev) =>
      prev.map((a) => (a.severity === 'Critical' || a.severity === 'High' ? { ...a, status: 'Blocked' } : a))
    );
    showToast('Emergency WAF Lockdown Initiated: All Critical & High risk IPs blocked!', 'danger');
  };

  const handleResetFeed = () => {
    setAlerts(INITIAL_ALERTS);
    localStorage.removeItem('custom_security_alerts');
    showToast('Security Alert Feed restored to baseline!', 'info');
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
      console.warn('AI Investigation Fallback:', e);
      // Fallback
      setAiReport({
        rootCause: `Attacker originating from IP ${alert.srcIp} (${alert.country}) executed high-frequency ${alert.attackVector} targeting ${alert.targetEndpoint}.`,
        mitreTechnique: 'T1110.001 (Password Guessing) / T1190 (Exploit Public-Facing App)',
        recommendedFirewallRule: `iptables -A INPUT -s ${alert.srcIp} -p tcp --dport 443 -j DROP`,
        recommendedPlaybookStep: '1. Revoke active JWT session tokens. 2. Enforce MFA re-authentication. 3. Block IP address across Edge Cloudflare WAF.',
      });
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
              title="Reset alerts to baseline"
            >
              <i className="fa-solid fa-rotate-left" /> Reset
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

        {/* Action Controls & Simulation Toolbar */}
        <div className="pt-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-semibold">Simulate Attack Vector:</span>
            <button
              onClick={() => handleSimulateCustomAlert('SQLi Attack Vector')}
              className="px-2.5 py-1 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 text-[11px] rounded transition cursor-pointer"
            >
              + SQL Injection
            </button>
            <button
              onClick={() => handleSimulateCustomAlert('Credential Stuffing ATO')}
              className="px-2.5 py-1 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 text-[11px] rounded transition cursor-pointer"
            >
              + ATO Botnet
            </button>
            <button
              onClick={() => handleSimulateCustomAlert('DDoS HTTP Flood')}
              className="px-2.5 py-1 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 text-[11px] rounded transition cursor-pointer"
            >
              + DDoS Burst
            </button>
          </div>

          <span className="text-[11px] font-mono text-gray-400">
            SIEM Log Feed: <span className="text-emerald-400 font-bold">ACTIVE (100% Operational)</span>
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
          {filteredAlerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-[#0d111c] border border-[#1f2335] rounded-xl space-y-2"
            >
              <i className="fa-solid fa-shield-halved text-emerald-400 text-3xl block" />
              <h4 className="text-sm font-bold text-white">No Threat Alerts Match Filter Criteria</h4>
              <p className="text-xs text-gray-400">All enterprise security perimeters operating cleanly.</p>
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
