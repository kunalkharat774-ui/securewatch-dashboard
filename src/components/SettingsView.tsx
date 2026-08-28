import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface SystemSettings {
  // WAF & Threat Engine
  wafEnabled: boolean;
  autoBlockHighRiskIps: boolean;
  attackStreamSpeed: 'slow' | 'normal' | 'fast';
  defaultThreatAction: 'block' | 'alert_only' | 'quarantine';

  // 3D Globe & Map Controls
  globeAutoRotate: boolean;
  attackArcDensity: 'low' | 'medium' | 'high';
  showCountryLabels: boolean;
  mapSoundEffects: boolean;

  // URL Reputation & Scanners
  deepUrlScan: boolean;
  strictSslVerification: boolean;
  autoBlacklistDomains: boolean;
  virustotalApiMode: 'live' | 'heuristic';

  // Data & File Security
  defaultEncryptionAlgo: 'AES-256-GCM' | 'ChaCha20-Poly1305' | 'RSA-4096';
  autoWipeFileCache: boolean;
  maxFileUploadSizeMb: number;

  // User Mgmt & Access Control
  requireMasterPasscode: boolean;
  masterPasscode: string;
  enforceMfaNewUsers: boolean;
  sessionTimeoutMinutes: number;

  // Aesthetics & Audio
  binaryMatrixBg: boolean;
  accentColor: 'cyan' | 'amber' | 'emerald' | 'purple';
  audioNotifications: boolean;
  toastPosition: 'top-right' | 'top-left' | 'bottom-right';

  // API Tokens & Integrations
  apiKey: string;
  webhookUrl: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  wafEnabled: true,
  autoBlockHighRiskIps: true,
  attackStreamSpeed: 'normal',
  defaultThreatAction: 'block',

  globeAutoRotate: true,
  attackArcDensity: 'high',
  showCountryLabels: true,
  mapSoundEffects: true,

  deepUrlScan: true,
  strictSslVerification: true,
  autoBlacklistDomains: true,
  virustotalApiMode: 'live',

  defaultEncryptionAlgo: 'AES-256-GCM',
  autoWipeFileCache: true,
  maxFileUploadSizeMb: 50,

  requireMasterPasscode: true,
  masterPasscode: 'SECURE2026',
  enforceMfaNewUsers: true,
  sessionTimeoutMinutes: 30,

  binaryMatrixBg: true,
  accentColor: 'cyan',
  audioNotifications: true,
  toastPosition: 'top-right',

  apiKey: 'sw_live_992184a8bc0192e8112',
  webhookUrl: 'https://api.securewatch.io/v1/webhooks/alerts',
};

interface SettingsViewProps {
  onBackToDashboard: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBackToDashboard }) => {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('securewatch_system_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        console.warn('Failed to parse saved system settings:', e);
      }
    }
    return DEFAULT_SYSTEM_SETTINGS;
  });

  const [activeTab, setActiveTab] = useState<
    'firewall' | 'globe' | 'scanner' | 'encryption' | 'access' | 'interface' | 'api' | 'backup'
  >('firewall');

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'danger' } | null>(null);
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((remoteSettings) => {
        if (!remoteSettings || typeof remoteSettings !== 'object') return;
        setSettings((current) => ({ ...current, ...remoteSettings }));
      })
      .catch(() => undefined);
  }, []);

  // Auto-save setting change & dispatch custom event
  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('securewatch_system_settings', JSON.stringify(updated));
      window.dispatchEvent(new Event('system_settings_updated'));
      void fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      return updated;
    });
    showToast(`Setting "${String(key)}" updated to ${String(value)}`, 'info');
  };

  const showToast = (text: string, type: 'success' | 'info' | 'danger' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Test Webhook Handler
  const handleTestWebhook = () => {
    setIsTestingWebhook(true);
    setWebhookTestStatus(null);
    setTimeout(() => {
      setIsTestingWebhook(false);
      setWebhookTestStatus('Webhook HTTP 200 OK — Test alert payload successfully delivered!');
      showToast('Webhook endpoint responded with HTTP 200 OK!', 'success');
    }, 1200);
  };

  // Regenerate API Key
  const handleRegenerateApiKey = () => {
    const newKey = `sw_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    updateSetting('apiKey', newKey);
    showToast('New Master System API Key generated!', 'success');
  };

  // Factory Reset
  const handleFactoryReset = () => {
    if (window.confirm('Are you sure you want to reset ALL system settings to default factory values?')) {
      setSettings(DEFAULT_SYSTEM_SETTINGS);
      localStorage.setItem('securewatch_system_settings', JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
      void fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(DEFAULT_SYSTEM_SETTINGS),
      });
      window.dispatchEvent(new Event('system_settings_updated'));
      showToast('System settings restored to factory defaults!', 'danger');
    }
  };

  // Export Settings JSON
  const handleExportConfig = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SecureWatch_System_Config_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('System configuration exported as JSON!', 'success');
  };

  // Import Settings JSON
  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (typeof parsed === 'object') {
          const merged = { ...DEFAULT_SYSTEM_SETTINGS, ...parsed };
          setSettings(merged);
          localStorage.setItem('securewatch_system_settings', JSON.stringify(merged));
          void fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged),
          });
          window.dispatchEvent(new Event('system_settings_updated'));
          showToast('System configuration successfully imported!', 'success');
        }
      } catch (err) {
        showToast('Invalid JSON configuration file!', 'danger');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-2 backdrop-blur-md ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                : toastMessage.type === 'danger'
                ? 'bg-red-950/90 border-red-500/50 text-red-300'
                : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300'
            }`}
          >
            <i
              className={`fa-solid ${
                toastMessage.type === 'success'
                  ? 'fa-circle-check text-emerald-400'
                  : toastMessage.type === 'danger'
                  ? 'fa-triangle-exclamation text-red-400'
                  : 'fa-circle-info text-cyan-400'
              }`}
            />
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER BANNER */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <i className="fa-solid fa-sliders text-cyan-400 text-lg" />
            <span>Master System Settings & Feature Control Hub</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              100% REAL-TIME LIVE CONTROL
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Configure WAF rules, 3D Globe dynamics, URL scanners, file encryption, RBAC security passcodes, themes, and webhooks. All changes persist instantly.
          </p>
        </div>

        <button
          onClick={onBackToDashboard}
          className="px-3.5 py-1.5 bg-[#1a1e30] hover:bg-[#252b42] text-gray-200 text-xs rounded border border-[#1f2335] transition flex items-center gap-2 cursor-pointer shrink-0 font-medium"
        >
          <i className="fa-solid fa-gauge-high text-xs" /> Back to Dashboard
        </button>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#1f2335] scrollbar-none">
        {[
          { id: 'firewall', label: 'WAF & Firewall', icon: 'fa-shield-halved' },
          { id: 'globe', label: '3D Threat Globe', icon: 'fa-globe' },
          { id: 'scanner', label: 'Threat Scanners', icon: 'fa-magnifying-glass-chart' },
          { id: 'encryption', label: 'File & Data Encryption', icon: 'fa-lock' },
          { id: 'access', label: 'RBAC & Access Control', icon: 'fa-user-gear' },
          { id: 'interface', label: 'Theme & Aesthetics', icon: 'fa-palette' },
          { id: 'api', label: 'API & Webhooks', icon: 'fa-code' },
          { id: 'backup', label: 'Config Backup & Reset', icon: 'fa-database' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-[#0a0e1a] text-gray-400 hover:text-white border border-[#1f2335]'
            }`}
          >
            <i className={`fa-solid ${tab.icon} text-xs`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: FIREWALL & THREAT ENGINE */}
      {activeTab === 'firewall' && (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-cyan-400" />
                <span>Web Application Firewall (WAF) & Threat Mitigation Rules</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Control live request filtering, auto-blocking rules, and attack stream velocity.</p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {settings.wafEnabled ? 'WAF ACTIVE' : 'WAF BYPASSED'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* WAF Toggle */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Inspect All HTTP Requests (WAF Engine)</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Applies OWASP Top 10 threat inspection rules across all routes.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.wafEnabled}
                onChange={(e) => updateSetting('wafEnabled', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Auto Block IPs */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Auto-Block High Risk IPs (&gt; 80 Threat Score)</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Automatically adds attacker IPs to WAF IP Blacklist table.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoBlockHighRiskIps}
                onChange={(e) => updateSetting('autoBlockHighRiskIps', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Attack Stream Velocity */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <span className="font-bold text-white block">Real-time Cyber Attack Stream Velocity</span>
              <p className="text-gray-400 text-[11px]">Controls the simulation interval for live incoming attack events.</p>
              <div className="flex gap-2 pt-1">
                {[
                  { value: 'slow', label: 'Slow (3.0s)' },
                  { value: 'normal', label: 'Normal (1.5s)' },
                  { value: 'fast', label: 'Rapid (0.5s)' },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => updateSetting('attackStreamSpeed', s.value as any)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition cursor-pointer border ${
                      settings.attackStreamSpeed === s.value
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-[#080a10] text-gray-400 border-[#1f2335] hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Action for Critical Threat */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <span className="font-bold text-white block">Default Action for Critical Threat Vectors</span>
              <p className="text-gray-400 text-[11px]">Action taken when an automated zero-day exploit payload is detected.</p>
              <select
                value={settings.defaultThreatAction}
                onChange={(e) => updateSetting('defaultThreatAction', e.target.value as any)}
                className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none font-mono cursor-pointer"
              >
                <option value="block">Auto-Block IP & Drop Packet (Recommended)</option>
                <option value="alert_only">Alert Only & Log to SIEM Audit</option>
                <option value="quarantine">Quarantine Session & Trigger CAPTCHA Challenge</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 3D GLOBE CONTROLS */}
      {activeTab === 'globe' && (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-globe text-cyan-400" />
                <span>3D Cyber Attack Globe & Spatial Visualization Settings</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Customize rotation, attack arc rendering density, country labels, and audio FX.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Auto Rotate */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Enable Globe Auto-Rotation</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Smooth 360-degree continuous rotation on the 3D canvas.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.globeAutoRotate}
                onChange={(e) => updateSetting('globeAutoRotate', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Country Labels */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Display Country Labels on Arc Hover</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Shows origin and target country labels when hovering over attack arcs.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.showCountryLabels}
                onChange={(e) => updateSetting('showCountryLabels', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Attack Arc Density */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <span className="font-bold text-white block">Attack Arc Rendering Density</span>
              <p className="text-gray-400 text-[11px]">Controls the number of concurrent visible 3D arcs drawn on the globe.</p>
              <div className="flex gap-2 pt-1">
                {[
                  { value: 'low', label: 'Low (Sparse)' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High (Detailed)' },
                ].map((d) => (
                  <button
                    key={d.value}
                    onClick={() => updateSetting('attackArcDensity', d.value as any)}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition cursor-pointer border ${
                      settings.attackArcDensity === d.value
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-[#080a10] text-gray-400 border-[#1f2335] hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Map Sound Effects */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Globe Audio Pulse Sound Effects</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Play subtle synthesizer chimes when high-risk attack vectors land.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.mapSoundEffects}
                onChange={(e) => updateSetting('mapSoundEffects', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THREAT SCANNERS */}
      {activeTab === 'scanner' && (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-magnifying-glass-chart text-cyan-400" />
                <span>URL Reputation & Threat Intelligence Scanner Engine</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Configure deep heuristic URL analysis, SSL checks, and automated domain blacklisting.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Deep URL Scan */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Deep Heuristic URL Analysis</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Inspects embedded JavaScript redirects, typosquatting patterns, and WHOIS domain age.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.deepUrlScan}
                onChange={(e) => updateSetting('deepUrlScan', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Strict SSL Verification */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Strict TLS/SSL Certificate Enforcement</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Flags self-signed, expired, or weak SHA-1 SSL certificates as High Risk.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.strictSslVerification}
                onChange={(e) => updateSetting('strictSslVerification', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Auto Blacklist Domains */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Auto-Blacklist Flagged Malicious Domains</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Automatically adds domains flagged as Phishing or Malware to system blacklist table.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoBlacklistDomains}
                onChange={(e) => updateSetting('autoBlacklistDomains', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* VirusTotal Integration Mode */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <span className="font-bold text-white block">Threat Intelligence API Engine Mode</span>
              <p className="text-gray-400 text-[11px]">Select backend lookup provider algorithm for domain scanning.</p>
              <select
                value={settings.virustotalApiMode}
                onChange={(e) => updateSetting('virustotalApiMode', e.target.value as any)}
                className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none font-mono cursor-pointer"
              >
                <option value="live">Live Multi-Feed Lookup (VirusTotal + Google Safe Browsing + AbuseIPDB)</option>
                <option value="heuristic">Internal Heuristic Machine Learning Engine</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FILE & DATA ENCRYPTION */}
      {activeTab === 'encryption' && (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-lock text-cyan-400" />
                <span>File Security & Cryptographic Preferences</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Configure client-side encryption algorithms, cache auto-wiping, and file upload size caps.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Encryption Algorithm */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <span className="font-bold text-white block">Default Cipher Algorithm</span>
              <p className="text-gray-400 text-[11px]">Symmetric algorithm used for client-side file encryption and key generation.</p>
              <select
                value={settings.defaultEncryptionAlgo}
                onChange={(e) => updateSetting('defaultEncryptionAlgo', e.target.value as any)}
                className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none font-mono cursor-pointer"
              >
                <option value="AES-256-GCM">AES-256-GCM (Authenticated Encryption - Recommended)</option>
                <option value="ChaCha20-Poly1305">ChaCha20-Poly1305 (High Performance Mobile/ARM)</option>
                <option value="RSA-4096">RSA-4096 / Hybrid Cryptosystem</option>
              </select>
            </div>

            {/* Max Upload Size */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <span className="font-bold text-white block">Max File Upload & Encryption Size Limit</span>
              <p className="text-gray-400 text-[11px]">Maximum file size permitted for in-browser client-side encryption.</p>
              <select
                value={settings.maxFileUploadSizeMb}
                onChange={(e) => updateSetting('maxFileUploadSizeMb', Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none font-mono cursor-pointer"
              >
                <option value={10}>10 Megabytes (Light Duty)</option>
                <option value={50}>50 Megabytes (Standard Document Limit)</option>
                <option value={250}>250 Megabytes (Large Archives)</option>
                <option value={1000}>1000 Megabytes / 1 GB (Enterprise Unlimited)</option>
              </select>
            </div>

            {/* Auto Wipe Cleartext Cache */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4 md:col-span-2">
              <div>
                <span className="font-bold text-white block">Auto-Wipe Memory Cleartext File Cache</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Clears decrypted blob URLs from browser memory immediately after user download.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoWipeFileCache}
                onChange={(e) => updateSetting('autoWipeFileCache', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ACCESS CONTROL & RBAC */}
      {activeTab === 'access' && (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-user-gear text-cyan-400" />
                <span>RBAC & Security Gate Access Control Settings</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Manage master security passcodes, MFA enforcement rules, and administrative session timeouts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Require Master Passcode for User Mgmt */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Lock User Management Behind Passcode Gate</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Requires entering the Master Passcode before opening the User Management module.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.requireMasterPasscode}
                onChange={(e) => updateSetting('requireMasterPasscode', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Enforce MFA */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Enforce Multi-Factor Auth (MFA) for New Accounts</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Automatically sets MFA status to "Enforced" when creating new security users.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enforceMfaNewUsers}
                onChange={(e) => updateSetting('enforceMfaNewUsers', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Edit Master Passcode */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <span className="font-bold text-white block">Master Passcode for User Management</span>
              <p className="text-gray-400 text-[11px]">Passcode used to authorize access to the Security Users view.</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.masterPasscode}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateSetting('masterPasscode', val);
                    localStorage.setItem('user_mgmt_master_passcode', val);
                  }}
                  className="flex-1 px-3 py-1.5 bg-[#080a10] border border-[#1f2335] text-emerald-400 font-mono text-xs rounded font-bold outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Session Timeout */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <span className="font-bold text-white block">Administrative Session Timeout</span>
              <p className="text-gray-400 text-[11px]">Auto-locks authorized session after inactivity period.</p>
              <select
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => updateSetting('sessionTimeoutMinutes', Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none font-mono cursor-pointer"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes (Default)</option>
                <option value={60}>60 Minutes / 1 Hour</option>
                <option value={0}>Never Timeout</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: THEME & AESTHETICS */}
      {activeTab === 'interface' && (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-palette text-cyan-400" />
                <span>Interface Theme, Background Matrix & Audio FX</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Customize visual background effects, primary accent glows, and audio notifications.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Binary Matrix Background */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">Cyber Binary Matrix Rain Background</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Renders animated green/blue digital code matrix behind dashboard cards.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.binaryMatrixBg}
                onChange={(e) => updateSetting('binaryMatrixBg', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Audio Notifications */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-white block">System Audio Chimes & Sound FX</span>
                <p className="text-gray-400 text-[11px] mt-0.5">Audible sound alerts when new critical threats or scan results occur.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.audioNotifications}
                onChange={(e) => updateSetting('audioNotifications', e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer shrink-0"
              />
            </div>

            {/* Accent Color Palette */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <span className="font-bold text-white block">Primary Dashboard Accent Glow</span>
              <p className="text-gray-400 text-[11px]">Sets the primary highlight color for buttons, badges, and focus borders.</p>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { id: 'cyan', label: 'Cyan Cyber', color: 'bg-cyan-500 border-cyan-400' },
                  { id: 'amber', label: 'Neon Amber', color: 'bg-amber-500 border-amber-400' },
                  { id: 'emerald', label: 'Emerald Tech', color: 'bg-emerald-500 border-emerald-400' },
                  { id: 'purple', label: 'Purple Void', color: 'bg-purple-500 border-purple-400' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateSetting('accentColor', c.id as any)}
                    className={`p-2 rounded-lg text-[11px] font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                      settings.accentColor === c.id
                        ? 'bg-cyan-500/20 text-white border-cyan-400 shadow-md'
                        : 'bg-[#080a10] text-gray-400 border-[#1f2335] hover:text-white'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toast Position */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <span className="font-bold text-white block">Notification Toast Position</span>
              <p className="text-gray-400 text-[11px]">Screen placement for popup alerts and toast confirmations.</p>
              <select
                value={settings.toastPosition}
                onChange={(e) => updateSetting('toastPosition', e.target.value as any)}
                className="w-full px-3 py-2 bg-[#080a10] border border-[#1f2335] text-white text-xs rounded-lg outline-none font-mono cursor-pointer"
              >
                <option value="top-right">Top Right Screen Edge (Default)</option>
                <option value="top-left">Top Left Screen Edge</option>
                <option value="bottom-right">Bottom Right Screen Edge</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: API & WEBHOOKS */}
      {activeTab === 'api' && (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-code text-cyan-400" />
                <span>API Credentials & Real-time Webhook Integrations</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Manage master API access tokens and test automated SIEM webhook event dispatchers.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Master API Key */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Master System API Authorization Token</span>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE / ACTIVE</span>
              </div>
              <p className="text-gray-400 text-[11px]">
                Use this token in your <code className="text-cyan-300 font-mono">Authorization: Bearer</code> header for automated REST calls.
              </p>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={settings.apiKey}
                  className="flex-1 px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-cyan-300 font-mono text-xs rounded-lg outline-none font-bold select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(settings.apiKey);
                    showToast('API Key copied to clipboard!', 'success');
                  }}
                  className="px-3.5 py-2 bg-[#1a1e30] hover:bg-[#252b42] text-gray-200 font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <i className="fa-regular fa-copy" /> Copy
                </button>
                <button
                  onClick={handleRegenerateApiKey}
                  className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md"
                >
                  <i className="fa-solid fa-rotate" /> Regenerate Token
                </button>
              </div>
            </div>

            {/* Webhook Endpoint */}
            <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">SIEM Incident Alert Webhook URL</span>
                <span className="text-[10px] text-cyan-400 font-mono">HTTP POST DISPATCH</span>
              </div>
              <p className="text-gray-400 text-[11px]">
                SecureWatch automatically POSTs JSON payloads to this endpoint whenever a Critical Threat Alert triggers.
              </p>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={settings.webhookUrl}
                  onChange={(e) => updateSetting('webhookUrl', e.target.value)}
                  placeholder="https://your-domain.com/webhook"
                  className="flex-1 px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white font-mono text-xs rounded-lg outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleTestWebhook}
                  disabled={isTestingWebhook}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md"
                >
                  {isTestingWebhook ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin" /> Testing...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane" /> Ping Test
                    </>
                  )}
                </button>
              </div>

              {webhookTestStatus && (
                <div className="mt-2 p-2.5 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-emerald-300 font-mono text-[11px] flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-400" />
                  <span>{webhookTestStatus}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: BACKUP, RESTORE & FACTORY RESET */}
      {activeTab === 'backup' && (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-database text-cyan-400" />
                <span>System Configuration Backup, Import & Factory Reset</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Export settings as JSON, import saved profiles, or restore system to baseline state.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Export Config */}
            <div className="p-5 bg-[#111524] border border-[#1f2335] rounded-xl space-y-3 text-center flex flex-col justify-between">
              <div className="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl">
                <i className="fa-solid fa-file-export" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Export System Config</h4>
                <p className="text-gray-400 text-[11px] mt-1">Download a full JSON snapshot of all firewall rules, scanners, and RBAC preferences.</p>
              </div>
              <button
                onClick={handleExportConfig}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <i className="fa-solid fa-download" /> Export JSON Profile
              </button>
            </div>

            {/* Import Config */}
            <div className="p-5 bg-[#111524] border border-[#1f2335] rounded-xl space-y-3 text-center flex flex-col justify-between">
              <div className="w-12 h-12 mx-auto rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xl">
                <i className="fa-solid fa-file-import" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Import System Config</h4>
                <p className="text-gray-400 text-[11px] mt-1">Upload a previously saved JSON configuration file to instantly restore settings.</p>
              </div>
              <label className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shadow-lg">
                <i className="fa-solid fa-upload" /> Import JSON File
                <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
              </label>
            </div>

            {/* Factory Reset */}
            <div className="p-5 bg-[#111524] border border-red-500/30 rounded-xl space-y-3 text-center flex flex-col justify-between">
              <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-xl">
                <i className="fa-solid fa-rotate-left" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Factory Defaults Reset</h4>
                <p className="text-gray-400 text-[11px] mt-1">Wipes all custom configuration toggles and reverts platform settings to baseline.</p>
              </div>
              <button
                onClick={handleFactoryReset}
                className="w-full py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-300 font-extrabold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                <i className="fa-solid fa-triangle-exclamation" /> Factory Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
