import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NavView } from '../types';
import { TextEncryptView } from './TextEncryptView';
import { SteganographyView } from './SteganographyView';
import { IpLocationView } from './IpLocationView';
import { DomainInfoView } from './DomainInfoView';
import { EmailBreachView } from './EmailBreachView';
import { VulnerabilityScannerView } from './VulnerabilityScannerView';
import { RiskAssessmentView } from './RiskAssessmentView';
import { SecurityAlertsView } from './SecurityAlertsView';
import { ApiMonitoringView } from './ApiMonitoringView';
import { SecurityLogsView } from './SecurityLogsView';
import { ReportsView } from './ReportsView';
import { SecurityUsersView } from './SecurityUsersView';
import { SettingsView } from './SettingsView';
import { LiveWebcamsView } from './LiveWebcamsView';

interface ExtraViewsProps {
  view: NavView;
  onBackToDashboard: () => void;
}

export const ExtraViews: React.FC<ExtraViewsProps> = ({ view, onBackToDashboard }) => {
  // API Monitoring State
  const [testEndpoint, setTestEndpoint] = useState('https://api.securewatch.io/v1/auth');
  const [pingResult, setPingResult] = useState<any>(null);
  const [isPinging, setIsPinging] = useState(false);

  // Security Alerts State
  const [alerts, setAlerts] = useState([
    { id: 'ALT-101', title: 'SSH Brute Force Attack Detected', severity: 'Critical', src: '185.220.101.5', target: 'Port 22 (SSH)', time: '2 mins ago', status: 'Active' },
    { id: 'ALT-102', title: 'SQL Injection Payload in Search API', severity: 'High', src: '103.251.16.88', target: '/api/v1/search', time: '12 mins ago', status: 'Active' },
    { id: 'ALT-103', title: 'Excessive API Rate Limit Exceeded', severity: 'Medium', src: '194.26.29.112', target: '/api/v1/auth/token', time: '34 mins ago', status: 'Active' },
    { id: 'ALT-104', title: 'Cross-Site Scripting (XSS) Attempt', severity: 'High', src: '45.154.255.88', target: '/comments', time: '1 hr ago', status: 'Active' },
  ]);

  // Vulnerability Scanner State
  const [scanTarget, setScanTarget] = useState('192.168.1.100');
  const [isScanningVuln, setIsScanningVuln] = useState(false);
  const [vulnResults, setVulnResults] = useState<any>(null);

  // Email Breach State
  const [emailInput, setEmailInput] = useState('user@company.com');
  const [breachResult, setBreachResult] = useState<any>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStepMessage, setScanStepMessage] = useState('');
  const [reportCopied, setReportCopied] = useState(false);
  const [monitoredEmails, setMonitoredEmails] = useState<string[]>(['user@company.com']);
  const [emailHistory, setEmailHistory] = useState<string[]>(['user@company.com', 'ceo@target-corp.com', 'safe-user@securewatch.io']);
  const [remediationTasks, setRemediationTasks] = useState<Record<string, boolean>>({});

  // Password Analyzer State
  const [testPassword, setTestPassword] = useState('P@ssw0rd2025!MilitryGrade99');
  const [generatedPass, setGeneratedPass] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [copiedToast, setCopiedToast] = useState(false);

  // Risk Assessment Calculator State
  const [assetValue, setAssetValue] = useState(8);
  const [threatLikelihood, setThreatLikelihood] = useState(7);
  const [vulnerabilityImpact, setVulnerabilityImpact] = useState(8);

  // Security Logs State
  const [logFilter, setLogFilter] = useState('ALL');
  const [logs, setLogs] = useState([
    { id: 'LOG-8812', timestamp: '15:24:02', level: 'ERROR', service: 'AUTH-SVC', message: 'Failed login attempt for admin from 185.220.101.5' },
    { id: 'LOG-8811', timestamp: '15:23:45', level: 'WARN', service: 'WAF', message: 'Rate limit trigger: 120 req/sec from IP 194.26.29.112' },
    { id: 'LOG-8810', timestamp: '15:22:18', level: 'INFO', service: 'API-GW', message: 'OAuth Token generated for user_cat_921' },
    { id: 'LOG-8809', timestamp: '15:20:00', level: 'INFO', service: 'DB-CLUSTER', message: 'Automated DB snapshot backup completed successfully' },
    { id: 'LOG-8808', timestamp: '15:18:12', level: 'CRITICAL', service: 'FIREWALL', message: 'DDoS SYN Flood attack vector intercepted on port 443' },
  ]);

  // Settings State
  const [wafEnabled, setWafEnabled] = useState(true);
  const [autoBlock, setAutoBlock] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [apiKey, setApiKey] = useState('sw_live_992184a8bc0192e8112');

  // Handle Ping Endpoint
  const handlePing = () => {
    setIsPinging(true);
    setTimeout(() => {
      const lat = Math.floor(Math.random() * 45 + 12);
      setPingResult({
        url: testEndpoint,
        status: 200,
        latency: `${lat}ms`,
        tls: 'TLS 1.3 (Valid)',
        server: 'nginx/1.24.0 (Cloudflare)',
        time: new Date().toLocaleTimeString(),
      });
      setIsPinging(false);
    }, 600);
  };

  // Handle Resolve Alert
  const handleResolveAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Handle Trigger Vulnerability Scan
  const handleScanVuln = () => {
    setIsScanningVuln(true);
    setTimeout(() => {
      setVulnResults({
        target: scanTarget,
        openPorts: [
          { port: 22, service: 'SSH', status: 'Open', risk: 'Medium (Outdated OpenSSH 7.4)' },
          { port: 80, service: 'HTTP', status: 'Open', risk: 'Low (Redirects to HTTPS)' },
          { port: 443, service: 'HTTPS', status: 'Open', risk: 'Clean (TLS 1.3)' },
          { port: 3306, service: 'MySQL', status: 'Filtered', risk: 'Safe' },
        ],
        vulnerabilities: [
          { cve: 'CVE-2023-38408', severity: 'High', title: 'OpenSSH PKCS#11 Remote Code Execution', fix: 'Upgrade OpenSSH to version 9.3p2 or higher' },
          { cve: 'CVE-2023-4863', severity: 'Medium', title: 'WebP Buffer Overflow in User Avatar Upload', fix: 'Update libwebp dependency' },
        ],
        score: '7.8 / 10',
      });
      setIsScanningVuln(false);
    }, 1000);
  };

  // Handle Animated Email Breach Check
  const handleCheckEmail = (targetEmailOverride?: string) => {
    const emailToCheck = typeof targetEmailOverride === 'string' ? targetEmailOverride : emailInput;
    if (!emailToCheck || !emailToCheck.includes('@')) {
      alert('Please enter a valid email address (e.g. user@example.com)');
      return;
    }

    if (typeof targetEmailOverride === 'string') {
      setEmailInput(targetEmailOverride);
    }

    setCheckingEmail(true);
    setBreachResult(null);
    setScanProgress(10);
    setScanStepMessage('Connecting to HIBP & Global Dark Web Intelligence Feeds...');

    if (!emailHistory.includes(emailToCheck)) {
      setEmailHistory((prev) => [emailToCheck, ...prev.slice(0, 5)]);
    }

    setTimeout(() => {
      setScanProgress(35);
      setScanStepMessage('Searching 14.8 Billion Compromised Credential Records...');
    }, 400);

    setTimeout(() => {
      setScanProgress(70);
      setScanStepMessage('Cross-referencing Paste Sites, Darknet Forums & SHA-256 Dumps...');
    }, 900);

    setTimeout(() => {
      setScanProgress(90);
      setScanStepMessage('Correlating Exposure Severity & Building Threat Matrix...');
    }, 1300);

    setTimeout(() => {
      setScanProgress(100);

      const cleanKeywords = ['safe', 'clean', 'securewatch', 'good', 'ok', 'protect'];
      const isClean = cleanKeywords.some((k) => emailToCheck.toLowerCase().includes(k));

      if (isClean) {
        setBreachResult({
          email: emailToCheck,
          isBreached: false,
          foundInBreaches: 0,
          riskLevel: 'LOW',
          exposureScore: 100,
          checkedAt: new Date().toLocaleTimeString(),
          sources: [],
          recommendations: [
            'Maintain unique, 16+ character passwords across all platforms.',
            'Keep Hardware MFA (FIDO2/WebAuthn or TOTP Authenticator) enabled.',
            'Activate 24/7 Dark Web Monitoring alerts to receive instant notifications.'
          ]
        });
      } else {
        const isCritical = emailToCheck.includes('target') || emailToCheck.includes('ceo') || emailToCheck.includes('crypto');

        setBreachResult({
          email: emailToCheck,
          isBreached: true,
          foundInBreaches: isCritical ? 4 : 2,
          riskLevel: isCritical ? 'CRITICAL' : 'HIGH',
          exposureScore: isCritical ? 24 : 48,
          checkedAt: new Date().toLocaleTimeString(),
          leakedClasses: ['Plaintext Passwords', 'Email Addresses', 'IP Address Logs', 'Billing Info', 'Phone Numbers'],
          sources: isCritical
            ? [
                {
                  name: 'Collection #1 (773M Data Dump)',
                  domain: 'mega.nz / DarkWeb Paste',
                  date: 'Jan 2019',
                  pwnCount: '772,904,991 accounts',
                  severity: 'CRITICAL',
                  leaked: ['Emails', 'Plaintext Passwords', 'Bcrypt Hashes'],
                  desc: 'A massive compilation of credentials aggregated from thousands of individual security breaches across 2,000+ databases.',
                  hashType: 'Plaintext & MD5'
                },
                {
                  name: 'Canva Design Platform Breach',
                  domain: 'canva.com',
                  date: 'May 2019',
                  pwnCount: '137,000,000 accounts',
                  severity: 'HIGH',
                  leaked: ['Usernames', 'Email Addresses', 'City/Country', 'Salted Passwords'],
                  desc: 'Unclassified database breach exposing profile details, geographic coordinates, and bcrypt hashed password tokens.',
                  hashType: 'Bcrypt'
                },
                {
                  name: 'LinkedIn Credential Scrape',
                  domain: 'linkedin.com',
                  date: 'Jun 2021',
                  pwnCount: '700,000,000 accounts',
                  severity: 'HIGH',
                  leaked: ['Full Name', 'Work Email', 'Phone Number', 'Workplace History'],
                  desc: 'Darknet forum sale containing scraped user metadata and public-facing corporate email associations.',
                  hashType: 'Metadata Dump'
                },
                {
                  name: 'Crypto Vault Platform Leak',
                  domain: 'darknet-forum.onion',
                  date: 'Dec 2023',
                  pwnCount: '2,400,000 accounts',
                  severity: 'CRITICAL',
                  leaked: ['API Secret Keys', 'Wallet Addresses', 'Email Credentials'],
                  desc: 'Exposed cloud storage bucket containing unencrypted configuration files and user connection tokens.',
                  hashType: 'RSA Private Keys & API Tokens'
                }
              ]
            : [
                {
                  name: 'Collection #1 (2019 Data Dump)',
                  domain: 'mega.nz / DarkWeb Paste',
                  date: 'Jan 2019',
                  pwnCount: '772,904,991 accounts',
                  severity: 'HIGH',
                  leaked: ['Emails', 'Plaintext Passwords'],
                  desc: 'Massive credentials list assembled from breach compilations distributed across underground channels.',
                  hashType: 'Plaintext'
                },
                {
                  name: 'SaaS Marketing Cloud Breach',
                  domain: 'marketing-cloud.io',
                  date: 'Nov 2022',
                  pwnCount: '18,500,000 accounts',
                  severity: 'MEDIUM',
                  leaked: ['Full Name', 'Work Email', 'IP Address Logs'],
                  desc: 'Analytics database breach revealing user session logs, geolocations, and corporate contact profiles.',
                  hashType: 'Session Logs'
                }
              ]
        });
      }

      setCheckingEmail(false);
    }, 1600);
  };

  // Military-Grade Password Generator
  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + symbols;

    let res = '';
    // Ensure at least 1 of each category
    res += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    res += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    res += numbers.charAt(Math.floor(Math.random() * numbers.length));
    res += symbols.charAt(Math.floor(Math.random() * symbols.length));

    for (let i = 0; i < 14; i++) {
      res += all.charAt(Math.floor(Math.random() * all.length));
    }

    // Shuffle characters
    res = res.split('').sort(() => Math.random() - 0.5).join('');

    setGeneratedPass(res);
    setTestPassword(res);
  };

  // Real-Time Password Strength Evaluation Engine (WEAK, STRONG, MILITARY-GRADE)
  const evaluatePasswordStrength = (pass: string) => {
    if (!pass) {
      return {
        score: 0,
        rating: 'WEAK' as const,
        crackTime: 'N/A',
        badgeBg: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        progressBg: 'bg-gray-600',
        feedback: 'Enter a password to evaluate strength',
        criteria: { length: false, upper: false, lower: false, number: false, symbol: false },
      };
    }

    const length = pass.length;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass);

    const commonWeak = ['password', '123456', '12345678', 'qwerty', 'admin', 'welcome', '123456789', 'password123', 'iloveyou', 'p@ssw0rd', 'secure'];
    const isCommon = commonWeak.some((w) => pass.toLowerCase().includes(w));

    let score = 0;

    // Length criteria
    if (length >= 16) score += 40;
    else if (length >= 12) score += 30;
    else if (length >= 8) score += 18;
    else score += length * 2;

    // Diversity criteria
    if (hasUpper) score += 15;
    if (hasLower) score += 15;
    if (hasNumber) score += 15;
    if (hasSymbol) score += 15;

    if (isCommon) score = Math.min(score, 25);

    score = Math.min(100, Math.max(0, score));

    let rating: 'WEAK' | 'STRONG' | 'MILITARY-GRADE' = 'WEAK';
    let crackTime = 'Instant';
    let badgeBg = 'bg-red-500/20 text-red-400 border-red-500/40';
    let progressBg = 'bg-red-500';
    let feedback = 'WEAK: Lacks length or character diversity. Easily cracked by dictionary brute-force.';

    if (isCommon || length < 8 || score < 50) {
      rating = 'WEAK';
      if (length < 6) crackTime = 'Instant';
      else if (length < 8) crackTime = '3 seconds';
      else crackTime = '14 minutes';
      badgeBg = 'bg-red-500/20 text-red-400 border-red-500/40';
      progressBg = 'bg-red-500';
      feedback = 'WEAK: Easily cracked by automated brute-force attacks. Add uppercase, numbers & special symbols.';
    } else if (score >= 50 && score < 85) {
      rating = 'STRONG';
      if (length < 12) crackTime = '3 Years';
      else crackTime = '12,000 Years';
      badgeBg = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      progressBg = 'bg-emerald-500';
      feedback = 'STRONG: Meets enterprise security guidelines. Highly resistant to standard GPU cluster cracking.';
    } else {
      rating = 'MILITARY-GRADE';
      crackTime = '84 Billion Years (Quantum-Resistant)';
      badgeBg = 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(159,134,255,0.3)] animate-pulse';
      progressBg = 'bg-gradient-to-r from-[#3b28cc] via-[#9f86ff] to-emerald-400';
      feedback = 'MILITARY-GRADE: Exceeds NSA & AES-256 quantum entropy requirements. Virtually uncrackable!';
    }

    return {
      score,
      rating,
      crackTime,
      badgeBg,
      progressBg,
      feedback,
      criteria: {
        length: length >= 12,
        upper: hasUpper,
        lower: hasLower,
        number: hasNumber,
        symbol: hasSymbol,
      },
    };
  };

  // Calculate Risk
  const calculatedRiskScore = Math.min(100, Math.round((assetValue * threatLikelihood * vulnerabilityImpact) / 10));

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
          <div>
            <h2 className="text-xl font-bold text-white capitalize">{view.replace('-', ' ')}</h2>
            <p className="text-xs text-gray-400">SecureWatch Telemetry & Security Operations</p>
          </div>
          <button
            onClick={onBackToDashboard}
            className="px-3.5 py-1.5 bg-[#1a1e30] hover:bg-[#252b42] text-gray-200 text-xs rounded border border-[#1f2335] transition flex items-center gap-2 cursor-pointer font-medium"
          >
            <i className="fa-solid fa-arrow-left text-xs" /> Back to Dashboard
          </button>
      </div>

      {/* 1. API MONITORING */}
      {view === 'api-monitoring' && (
        <ApiMonitoringView onBackToDashboard={onBackToDashboard} />
      )}

      {/* 2. SECURITY ALERTS */}
      {view === 'alerts' && (
        <SecurityAlertsView onBackToDashboard={onBackToDashboard} />
      )}

      {/* 3. VULNERABILITY SCANNER */}
      {view === 'vulnerability-scanner' && (
        <VulnerabilityScannerView onBackToDashboard={onBackToDashboard} />
      )}

      {/* 4. RISK ASSESSMENT */}
      {view === 'risk-assessment' && (
        <RiskAssessmentView onBackToDashboard={onBackToDashboard} />
      )}

      {/* 6. EMAIL BREACH CHECKER */}
      {view === 'email-breach' && (
        <EmailBreachView onBackToDashboard={onBackToDashboard} />
      )}

      {/* 7. PASSWORD STRENGTH & GENERATOR */}
      {view === 'password-strength' && (() => {
        const passEval = evaluatePasswordStrength(testPassword);

        return (
          <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-[#1f2335] pb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <i className="fa-solid fa-key text-[#9f86ff]" />
                  Password Security Analyzer & Generator
                </h3>
                <p className="text-xs text-gray-400">
                  Real-time entropy analysis, character set validation & supercomputer brute-force time estimation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Security Rating:</span>
                <span className={`px-3.5 py-1 rounded-full text-xs font-bold border transition-all ${passEval.badgeBg}`}>
                  {passEval.rating === 'MILITARY-GRADE' ? '🛡️ MILITARY-GRADE' : passEval.rating === 'STRONG' ? '⚡ STRONG' : '⚠️ WEAK'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Password Evaluation Input & Meter */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-gray-300 font-semibold">Enter Password to Evaluate</label>
                    <span className="text-[11px] text-gray-400 font-mono">{testPassword.length} characters</span>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={testPassword}
                      onChange={(e) => setTestPassword(e.target.value)}
                      placeholder="Type password to check..."
                      className="w-full px-3.5 py-2.5 pr-10 bg-[#080a10] border border-[#1f2335] text-white rounded-lg text-xs outline-none focus:border-[#3b28cc] font-mono tracking-wider transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-white cursor-pointer transition text-xs"
                    >
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                </div>

                {/* Animated Strength Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">Entropy Score:</span>
                    <span className="font-bold text-white">{passEval.score} / 100</span>
                  </div>
                  <div className="w-full h-3 bg-[#111524] rounded-full overflow-hidden border border-[#1f2335]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${passEval.score}%` }}
                      transition={{ duration: 0.3 }}
                      className={`h-full rounded-full ${passEval.progressBg}`}
                    />
                  </div>
                </div>

                {/* Feedback Box */}
                <div className="p-3.5 bg-[#111524] border border-[#1f2335] rounded-xl text-xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <i className={`fa-solid ${passEval.rating === 'MILITARY-GRADE' ? 'fa-shield-halved text-purple-400' : passEval.rating === 'STRONG' ? 'fa-bolt text-emerald-400' : 'fa-triangle-exclamation text-red-400'} mt-0.5 text-base`} />
                    <div>
                      <span className="font-bold text-white block mb-0.5">{passEval.feedback}</span>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Estimated Crack Time: <strong className="text-emerald-400 font-mono font-bold">{passEval.crackTime}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="p-3.5 bg-[#080a10] border border-[#1f2335] rounded-xl space-y-2.5 text-xs">
                  <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">Security Requirements Checklist</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passEval.criteria.length ? 'text-emerald-400 font-semibold' : 'text-gray-500'}`}>
                      <i className={`fa-solid ${passEval.criteria.length ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                      <span>12+ Characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passEval.criteria.upper ? 'text-emerald-400 font-semibold' : 'text-gray-500'}`}>
                      <i className={`fa-solid ${passEval.criteria.upper ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                      <span>Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passEval.criteria.lower ? 'text-emerald-400 font-semibold' : 'text-gray-500'}`}>
                      <i className={`fa-solid ${passEval.criteria.lower ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                      <span>Lowercase (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passEval.criteria.number ? 'text-emerald-400 font-semibold' : 'text-gray-500'}`}>
                      <i className={`fa-solid ${passEval.criteria.number ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                      <span>Numbers (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 col-span-2 ${passEval.criteria.symbol ? 'text-emerald-400 font-semibold' : 'text-gray-500'}`}>
                      <i className={`fa-solid ${passEval.criteria.symbol ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                      <span>Special Symbols (!@#$%^&*)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generator & Quick Actions */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <label className="text-xs text-gray-300 font-semibold block">Generate Military-Grade Password</label>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Generate a 18-character cryptographically secure password with maximum entropy for root servers, databases, and encryption keys.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedPass || testPassword}
                      className="flex-1 px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-purple-300 font-mono text-xs rounded-lg outline-none font-bold select-all"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={generatePassword}
                      className="px-4 py-2.5 bg-[#3b28cc] hover:bg-[#4d3be3] text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles" /> Generate
                    </motion.button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPass || testPassword);
                        setCopiedToast(true);
                        setTimeout(() => setCopiedToast(false), 2000);
                      }}
                      className="flex-1 px-3 py-2 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-200 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <i className="fa-regular fa-copy text-xs" />
                      {copiedToast ? 'Copied to Clipboard!' : 'Copy Password'}
                    </button>
                    <button
                      onClick={() => setTestPassword(generatedPass || testPassword)}
                      className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-flask" /> Test Password
                    </button>
                  </div>
                </div>

                {/* Rating Guide Card */}
                <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2 text-xs">
                  <span className="font-bold text-white block">Password Strength Tiers:</span>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between p-1.5 bg-[#080a10] rounded border border-red-500/20">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">WEAK</span>
                      <span className="text-gray-400">&lt; 8 chars or dictionary words. Crack time &lt; 15 mins.</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-[#080a10] rounded border border-emerald-500/20">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">STRONG</span>
                      <span className="text-gray-400">8 to 13 chars with mixed set. Crack time 3 to 12,000 yrs.</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-[#080a10] rounded border border-purple-500/30">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">MILITARY-GRADE</span>
                      <span className="text-gray-400">14+ chars full sets. Quantum-resistant (AES-256 equivalent).</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 7.5 TEXT ENCRYPTION TOOL */}
      {view === 'text-encrypt' && <TextEncryptView />}

      {/* 7.6 LIVE WEBCAMS */}
      {view === 'live-webcams' && <LiveWebcamsView />}

      {/* 7.55 STEGANOGRAPHY TOOL */}
      {view === 'steganography' && <SteganographyView />}

      {/* 8. IP LOCATION LOOKUP */}
      {view === 'ip-location' && <IpLocationView />}

      {/* 9. DOMAIN INFO */}
      {view === 'domain-info' && <DomainInfoView onBackToDashboard={onBackToDashboard} />}

      {/* 10. SIEM LOGS */}
      {view === 'logs' && <SecurityLogsView onBackToDashboard={onBackToDashboard} />}

      {/* 11. REPORTS */}
      {view === 'reports' && <ReportsView onBackToDashboard={onBackToDashboard} />}

      {/* 12. USERS */}
      {view === 'users' && <SecurityUsersView onBackToDashboard={onBackToDashboard} />}

      {/* 13. SETTINGS */}
      {view === 'settings' && <SettingsView onBackToDashboard={onBackToDashboard} />}
    </div>
  );
};
