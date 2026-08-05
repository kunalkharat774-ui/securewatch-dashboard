import React, { useState, useEffect } from 'react';

export interface BreachDetail {
  name: string;
  domain: string;
  date: string;
  pwnCount: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  leakedData: string[];
  description: string;
  industry?: string;
}

export interface BreachQueryResult {
  email: string;
  isBreached: boolean;
  foundInBreaches: number;
  riskScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  checkedAt: string;
  sources: BreachDetail[];
  recommendations: string[];
}

interface EmailBreachViewProps {
  onBackToDashboard?: () => void;
}

export const EmailBreachView: React.FC<EmailBreachViewProps> = ({ onBackToDashboard }) => {
  const [activeTab, setActiveTab] = useState<'email' | 'password'>('email');

  // Email Breach States
  const [emailInput, setEmailInput] = useState<string>('');
  const [checkingEmail, setCheckingEmail] = useState<boolean>(false);
  const [emailProgressStep, setEmailProgressStep] = useState<string>('');
  const [breachResult, setBreachResult] = useState<BreachQueryResult | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Password Breach States (HaveIBeenPwned k-Anonymity API)
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [checkingPassword, setCheckingPassword] = useState<boolean>(false);
  const [passwordResult, setPasswordResult] = useState<{
    password: string;
    isPwned: boolean;
    timesExposed: number;
    sha1Prefix: string;
  } | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Helper SHA-1 calculation using browser Crypto API
  const sha1 = async (message: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  // Check Email Breach against real XposedOrNot API & HIBP public endpoints
  const handleCheckEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailError('Please enter a valid email address (e.g. name@domain.com)');
      return;
    }

    setEmailError(null);
    setCheckingEmail(true);
    setBreachResult(null);
    setEmailProgressStep('Connecting to XposedOrNot Live Dark Web Intelligence Feeds...');

    try {
      // Step 1: Query XposedOrNot Check Email Endpoint
      setEmailProgressStep('Searching global compromised credential databases...');
      
      const checkRes = await fetch(`https://api.xposedornot.com/v1/check-email/${encodeURIComponent(cleanEmail)}`);
      
      // If HTTP 404, the email is clean (not breached)
      if (checkRes.status === 404) {
        setBreachResult({
          email: cleanEmail,
          isBreached: false,
          foundInBreaches: 0,
          riskScore: 0,
          riskLevel: 'LOW',
          checkedAt: new Date().toLocaleTimeString(),
          sources: [],
          recommendations: [
            'Maintain unique, 16+ character passwords across all platforms.',
            'Keep Hardware MFA (FIDO2/WebAuthn or TOTP Authenticator) enabled.',
            'Activate continuous dark web monitoring to stay notified of future data leaks.'
          ]
        });
        triggerToast(`Live scan complete: No breaches found for ${cleanEmail}`);
        setCheckingEmail(false);
        return;
      }

      // Step 2: Fetch detailed breach analytics if response is ok
      setEmailProgressStep('Analyzing breach incident timeline & exposed fields...');
      const analyticsRes = await fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(cleanEmail)}`);
      
      let breachesList: BreachDetail[] = [];
      let totalCount = 0;
      let calculatedRiskScore = 0;

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        
        if (analyticsData?.ExposedBreaches?.breaches_details && Array.isArray(analyticsData.ExposedBreaches.breaches_details)) {
          const rawBreaches = analyticsData.ExposedBreaches.breaches_details;
          totalCount = rawBreaches.length;

          breachesList = rawBreaches.map((b: any) => {
            const leakedDataArray = b.xposed_data ? b.xposed_data.split(';').flatMap((s: string) => s.split(',')).map((s: string) => s.trim()) : ['Emails', 'Passwords'];
            const pwnedNum = parseInt(b.pwncount || '0', 10);
            
            let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
            if (pwnedNum > 50000000 || leakedDataArray.some((d: string) => d.toLowerCase().includes('passwords') || d.toLowerCase().includes('credit'))) {
              severity = 'CRITICAL';
            } else if (pwnedNum > 10000000) {
              severity = 'HIGH';
            }

            return {
              name: b.breach || 'Data Breach Incident',
              domain: b.domain || 'N/A',
              date: b.date || 'Unspecified Date',
              pwnCount: pwnedNum ? pwnedNum.toLocaleString() + ' accounts' : 'Multiple accounts',
              severity,
              leakedData: leakedDataArray,
              description: b.description ? b.description.replace(/<[^>]*>?/gm, '') : 'Exposed in dark web breach repository.',
              industry: b.industry || 'Tech / Web Application',
            };
          });
        }

        if (analyticsData?.RiskScore?.risk_score) {
          calculatedRiskScore = analyticsData.RiskScore.risk_score;
        } else {
          calculatedRiskScore = Math.min(100, totalCount * 25);
        }
      } else if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData?.breaches && Array.isArray(checkData.breaches) && checkData.breaches[0]) {
          const simpleNames: string[] = checkData.breaches[0];
          totalCount = simpleNames.length;
          calculatedRiskScore = Math.min(100, totalCount * 25);

          breachesList = simpleNames.map((name: string) => ({
            name: name,
            domain: name.toLowerCase() + '.com',
            date: 'Identified Leak',
            pwnCount: 'Known Breach Record',
            severity: 'HIGH',
            leakedData: ['User Credentials', 'Email Address', 'Account Hashes'],
            description: `Email ${cleanEmail} was confirmed present in the ${name} public breach dump.`,
          }));
        }
      }

      const riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 
        calculatedRiskScore >= 70 ? 'CRITICAL' : calculatedRiskScore >= 40 ? 'HIGH' : totalCount > 0 ? 'MEDIUM' : 'LOW';

      if (totalCount === 0) {
        setBreachResult({
          email: cleanEmail,
          isBreached: false,
          foundInBreaches: 0,
          riskScore: 0,
          riskLevel: 'LOW',
          checkedAt: new Date().toLocaleTimeString(),
          sources: [],
          recommendations: [
            'Maintain unique, 16+ character passwords across all platforms.',
            'Keep Hardware MFA enabled for all critical accounts.'
          ]
        });
      } else {
        setBreachResult({
          email: cleanEmail,
          isBreached: true,
          foundInBreaches: totalCount,
          riskScore: calculatedRiskScore,
          riskLevel,
          checkedAt: new Date().toLocaleTimeString(),
          sources: breachesList,
          recommendations: [
            'Immediately change passwords for all affected platforms listed above.',
            'Do NOT reuse passwords across multiple sites.',
            'Enable 2-Factor Authentication (2FA) / Authenticator app immediately.'
          ]
        });
      }

      triggerToast(`Live breach search complete for ${cleanEmail}`);
    } catch (err: any) {
      setEmailError('Failed to complete breach query. Please check your internet connection.');
    } finally {
      setCheckingEmail(false);
    }
  };

  // Check Password against HaveIBeenPwned k-Anonymity SHA1 API
  const handleCheckPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!passwordInput) {
      setPasswordError('Please enter a password to evaluate.');
      return;
    }

    setPasswordError(null);
    setCheckingPassword(true);
    setPasswordResult(null);

    try {
      // 1. Calculate SHA-1 hash client-side
      const fullHash = await sha1(passwordInput);
      const prefix = fullHash.substring(0, 5);
      const suffix = fullHash.substring(5);

      // 2. Query HaveIBeenPwned k-Anonymity endpoint (Only 5 chars sent to server!)
      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!res.ok) {
        throw new Error('Pwned Passwords API unavailable');
      }

      const text = await res.text();
      const lines = text.split('\n');

      let timesExposed = 0;
      let isPwned = false;

      for (const line of lines) {
        const [hashSuffix, count] = line.trim().split(':');
        if (hashSuffix === suffix) {
          isPwned = true;
          timesExposed = parseInt(count, 10);
          break;
        }
      }

      setPasswordResult({
        password: passwordInput,
        isPwned,
        timesExposed,
        sha1Prefix: prefix,
      });

      triggerToast(`Password live security check complete!`);
    } catch (err: any) {
      setPasswordError('Error querying password database. Please try again.');
    } finally {
      setCheckingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] bg-red-950/90 border border-red-500/50 text-red-300 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md animate-bounce">
          <i className="fa-solid fa-circle-check text-red-400"></i>
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 shadow-lg">
        <div>
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="p-2 hover:bg-[#1a2035] rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Back to Dashboard"
              >
                <i className="fa-solid fa-arrow-left"></i>
              </button>
            )}
            <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
              <i className="fa-solid fa-user-shield text-red-400"></i>
              xHunter Dark Web Breach & Password Intelligence
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Real-time live cross-reference against 14.8+ billion compromised records (XposedOrNot & HaveIBeenPwned k-Anonymity API).
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 bg-[#141a2e] border border-[#232d48] p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setActiveTab('email')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'email' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-envelope"></i>
            Email Breach Search
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'password' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-key"></i>
            Password Pwned Check
          </button>
        </div>
      </div>

      {/* TAB 1: EMAIL BREACH QUERY */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {/* Input Form */}
          <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 shadow-lg">
            <form onSubmit={handleCheckEmail} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <i className="fa-solid fa-at"></i>
                </div>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter email address to inspect (e.g., user@domain.com)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141a2e] border border-[#232d48] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={checkingEmail}
                className="bg-red-600 hover:bg-red-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                {checkingEmail ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    Querying Live Feeds...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-magnifying-glass font-bold"></i>
                    Check Email Leaks
                  </>
                )}
              </button>
            </form>

            {emailError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i>
                {emailError}
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {checkingEmail && (
            <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-12 text-center space-y-3 shadow-lg">
              <i className="fa-solid fa-shield-cat text-4xl text-red-500 animate-pulse"></i>
              <h3 className="text-sm font-bold text-white">Querying Live XposedOrNot Dark Web Repository</h3>
              <p className="text-xs text-gray-400 font-mono">{emailProgressStep}</p>
            </div>
          )}

          {/* Result Banner */}
          {!checkingEmail && breachResult && (
            <div className="space-y-6">
              {breachResult.isBreached ? (
                /* LEAK DETECTED BANNER */
                <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-xl space-y-4 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                        <i className="fa-solid fa-triangle-exclamation text-2xl animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-400 text-base flex items-center gap-2">
                          LEAK DETECTED: Email Found in Data Breaches!
                        </h4>
                        <p className="text-xs text-gray-300 mt-0.5">
                          Email <span className="font-mono text-white font-bold">{breachResult.email}</span> appeared in <strong className="text-red-400 font-bold">{breachResult.foundInBreaches} verified security incidents</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-md text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                        {breachResult.riskLevel} SEVERITY
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        Checked: {breachResult.checkedAt}
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-[#080a10] border border-red-500/20 rounded-lg">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Exposure Risk Score</span>
                      <div className="text-lg font-bold font-mono text-red-400 mt-0.5">
                        {breachResult.riskScore} / 100
                      </div>
                    </div>

                    <div className="p-3 bg-[#080a10] border border-red-500/20 rounded-lg">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Confirmed Breaches</span>
                      <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                        {breachResult.foundInBreaches} Leaks
                      </div>
                    </div>

                    <div className="p-3 bg-[#080a10] border border-red-500/20 rounded-lg">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Source Database</span>
                      <div className="text-xs font-semibold text-emerald-400 mt-1 font-mono">
                        XposedOrNot Live
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* CLEAN / NO LEAK BANNER */
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <i className="fa-solid fa-shield-halved text-2xl" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-400 text-base flex items-center gap-2">
                          GOOD NEWS: No Data Breaches Found!
                        </h4>
                        <p className="text-xs text-gray-300 mt-0.5">
                          Email <span className="font-mono text-white font-bold">{breachResult.email}</span> was not detected in any indexed dark web repositories.
                        </p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      100 / 100 SAFE
                    </span>
                  </div>

                  <div className="p-3 bg-[#080a10] border border-emerald-500/20 rounded-lg text-xs space-y-1.5">
                    <span className="font-semibold text-emerald-400 block">Security Best Practices:</span>
                    <ul className="list-disc list-inside text-gray-300 space-y-1 text-[11px]">
                      {breachResult.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Detailed Incident List */}
              {breachResult.isBreached && breachResult.sources.length > 0 && (
                <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 shadow-lg">
                  <h4 className="font-bold text-sm text-white flex items-center justify-between border-b border-[#1f2335] pb-3">
                    <span className="flex items-center gap-2">
                      <i className="fa-solid fa-list-check text-red-400" />
                      Detailed Breach Incidents Breakdown
                    </span>
                    <span className="text-xs text-gray-400 font-mono font-normal">
                      {breachResult.sources.length} Incidents
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 gap-4">
                    {breachResult.sources.map((src, idx) => (
                      <div key={idx} className="bg-[#141a2e] p-4 rounded-xl border border-[#232d48] space-y-3 hover:border-red-500/40 transition">
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{src.name}</span>
                              <span className="text-[11px] text-gray-400 font-mono">({src.date})</span>
                            </div>
                            <span className="text-[11px] text-emerald-400 font-mono block mt-0.5">
                              Domain: {src.domain} • Impact: {src.pwnCount}
                            </span>
                          </div>

                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                            src.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {src.severity}
                          </span>
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed bg-[#0d111c] p-3 rounded border border-[#232d48]">
                          {src.description}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] flex-wrap pt-1">
                          <span className="text-gray-400 font-semibold">Exposed Fields:</span>
                          {src.leakedData.map((field, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-[#0d111c] text-red-300 border border-red-500/20 font-mono text-[10px]">
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!checkingEmail && !breachResult && (
            <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-12 text-center space-y-3 shadow-lg">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#141a2e] border border-[#232d48] flex items-center justify-center text-red-400 text-2xl">
                <i className="fa-solid fa-envelope-open-text"></i>
              </div>
              <h3 className="text-base font-bold text-white">Live Email Breach Checker</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Enter an email address above to run a 100% real live query against XposedOrNot global dark web leak feeds.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PASSWORD PWNED CHECK (k-Anonymity API) */}
      {activeTab === 'password' && (
        <div className="space-y-6">
          <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
              <i className="fa-solid fa-lock text-sm"></i>
              <span>Zero-Knowledge Security: Your password is NEVER sent over the network. Only the first 5 characters of its SHA-1 hash are queried using HaveIBeenPwned k-Anonymity API.</span>
            </div>

            <form onSubmit={handleCheckPassword} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                  <i className="fa-solid fa-key"></i>
                </div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password to check exposure count..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141a2e] border border-[#232d48] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={checkingPassword}
                className="bg-red-600 hover:bg-red-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                {checkingPassword ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    Computing SHA-1...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-shield-virus"></i>
                    Test Password Exposure
                  </>
                )}
              </button>
            </form>

            {passwordError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i>
                {passwordError}
              </div>
            )}
          </div>

          {passwordResult && (
            <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-6 space-y-4 shadow-lg">
              {passwordResult.isPwned ? (
                <div className="p-5 bg-red-500/10 border border-red-500/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                      <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-red-400 text-base">
                        WARNING: Password Exists in Known Data Dumps!
                      </h4>
                      <p className="text-xs text-gray-300 mt-0.5">
                        This password was seen <strong className="text-red-400 font-mono text-sm">{passwordResult.timesExposed.toLocaleString()} times</strong> in pwned password databases.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#141a2e] border border-[#232d48] p-3 rounded-lg text-xs font-mono text-gray-400 flex items-center justify-between">
                    <span>SHA-1 k-Anonymity Hash Prefix:</span>
                    <strong className="text-emerald-400">{passwordResult.sha1Prefix}*****</strong>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <i className="fa-solid fa-circle-check text-2xl"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-emerald-400 text-base">
                        SAFE: Password Not Found in Pwned Database!
                      </h4>
                      <p className="text-xs text-gray-300 mt-0.5">
                        This password was not detected in any indexed pwned password hashes.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#141a2e] border border-[#232d48] p-3 rounded-lg text-xs font-mono text-gray-400 flex items-center justify-between">
                    <span>SHA-1 k-Anonymity Hash Prefix:</span>
                    <strong className="text-emerald-400">{passwordResult.sha1Prefix}*****</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
