import React, { useState } from 'react';

export interface BreachDetail {
  name: string;
}

export interface BreachQueryResult {
  email: string;
  isBreached: boolean;
  foundInBreaches: number;
  checkedAt: string;
  sources: BreachDetail[];
  recommendations: string[];
  provider?: string;
  degraded?: boolean;
}

interface EmailBreachViewProps {
  onBackToDashboard?: () => void;
}

export const EmailBreachView: React.FC<EmailBreachViewProps> = ({ onBackToDashboard }) => {
  const [activeTab, setActiveTab] = useState<'email' | 'password'>('email');

  // Email Breach States
  const [emailInput, setEmailInput] = useState<string>('');
  const [emailLookupConsent, setEmailLookupConsent] = useState<boolean>(false);
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

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Helper SHA-1 calculation using browser Crypto API
  const sha1 = async (message: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  // Submit only after explaining that the address is sent to the breach-data provider.
  const handleCheckEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!emailLookupConsent) {
      setEmailError('Please confirm that you want to send this address to XposedOrNot for a breach-data lookup.');
      return;
    }

    const cleanEmail = emailInput.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setEmailError('Please enter a valid email address (e.g. name@domain.com)');
      return;
    }

    setEmailError(null);
    setCheckingEmail(true);
    setBreachResult(null);
    setEmailProgressStep('Connecting to XposedOrNot breach-data search...');

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
      setEmailProgressStep('Checking whether this address appears in reported breach datasets...');
      const response = await fetch('/api/email-breach', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const responseText = await response.text();
      let data: Partial<BreachQueryResult> & { error?: string } = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`The breach service returned an invalid response (HTTP ${response.status}).`);
      }

      if (!response.ok) throw new Error(data.error || `Live leak lookup failed (HTTP ${response.status}).`);
      if (typeof data.isBreached !== 'boolean' || !Array.isArray(data.sources)) {
        throw new Error('The breach service returned incomplete result data.');
      }

      const checkedAt = data.checkedAt ? new Date(data.checkedAt) : new Date();
      const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];

      setBreachResult({
        email: typeof data.email === 'string' ? data.email : cleanEmail,
        isBreached: data.isBreached,
        foundInBreaches: Number.isFinite(data.foundInBreaches) ? Number(data.foundInBreaches) : data.sources.length,
        checkedAt: Number.isNaN(checkedAt.getTime()) ? 'Time unavailable' : checkedAt.toLocaleString(),
        sources: data.sources,
        recommendations,
        provider: typeof data.provider === 'string' ? data.provider : undefined,
        degraded: data.degraded === true,
      });

      triggerToast(`Breach-data lookup complete for ${cleanEmail}`);
    } catch (err: unknown) {
      setEmailError(err instanceof DOMException && err.name === 'AbortError'
        ? 'The breach query timed out. Please try again.'
        : err instanceof Error
          ? err.message
          : 'Failed to complete breach query. Please try again.');
    } finally {
      window.clearTimeout(timeoutId);
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

      // 2. Send only the five-character hash prefix to our server proxy.
      const res = await fetch('/api/password-pwned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/plain, application/json' },
        body: JSON.stringify({ prefix }),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || `Password intelligence lookup failed (HTTP ${res.status}).`);
      }

      const text = await res.text();
      const lines = text.split(/\r?\n/);

      let timesExposed = 0;
      let isPwned = false;

      for (const line of lines) {
        const [hashSuffix, count] = line.trim().split(':');
        const parsedCount = Number.parseInt(count, 10);
        if (hashSuffix === suffix && Number.isSafeInteger(parsedCount) && parsedCount > 0) {
          isPwned = true;
          timesExposed = parsedCount;
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
              SecureWatch Breach Exposure & Password Checks
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Check known breach datasets. This does not enumerate which websites an address has registered with.
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
                  placeholder="Enter an email address to check (e.g., user@domain.com)..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#141a2e] border border-[#232d48] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={checkingEmail || !emailLookupConsent}
                className="bg-red-600 hover:bg-red-500 text-white font-medium px-6 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md"
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

            <label className="flex items-start gap-2 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={emailLookupConsent}
                onChange={(e) => setEmailLookupConsent(e.target.checked)}
                className="mt-0.5 accent-red-500"
              />
              <span>
                I own this email address or have permission to check it. I understand the address will be sent to XposedOrNot for a breach-data lookup; it is not used to check website sign-ups.
              </span>
            </label>

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
              <h3 className="text-sm font-bold text-white">Checking XposedOrNot Breach Datasets</h3>
              <p className="text-xs text-gray-400 font-mono">{emailProgressStep}</p>
            </div>
          )}

          {/* Result Banner */}
          {!checkingEmail && breachResult && (
            <div className="space-y-6">
              {breachResult.degraded && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation" />
                  {breachResult.provider || 'Primary breach provider'} returned a degraded result. Treat a clean result as unverified and try again later.
                </div>
              )}
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
                          Email Found in Reported Breach Datasets
                        </h4>
                        <p className="text-xs text-gray-300 mt-0.5">
                          <span className="font-mono text-white font-bold">{breachResult.email}</span> matched {breachResult.foundInBreaches} breach dataset{breachResult.foundInBreaches === 1 ? '' : 's'} reported by the provider.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">
                        Checked: {breachResult.checkedAt}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-[#080a10] border border-red-500/20 rounded-lg">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Matching Datasets</span>
                      <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                        {breachResult.foundInBreaches}
                      </div>
                    </div>

                    <div className="p-3 bg-[#080a10] border border-red-500/20 rounded-lg">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Lookup Provider</span>
                      <div className="text-xs font-semibold text-emerald-400 mt-1 font-mono">
                        {breachResult.provider || 'XposedOrNot'}
                      </div>
                    </div>

                    <div className="p-3 bg-[#080a10] border border-red-500/20 rounded-lg">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Breach Dates</span>
                      <div className="text-xs font-semibold text-gray-300 mt-1">
                        Not provided by this lookup
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
                          No Match in This Provider's Indexed Datasets
                        </h4>
                        <p className="text-xs text-gray-300 mt-0.5">
                          No matching dataset was returned for <span className="font-mono text-white font-bold">{breachResult.email}</span>.
                        </p>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-md text-xs font-bold border ${breachResult.degraded ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'}`}>
                      PROVIDER RESULT
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
                      Breach Datasets Reported by Provider
                    </span>
                    <span className="text-xs text-gray-400 font-mono font-normal">
                      {breachResult.sources.length} Datasets
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 gap-4">
                    {breachResult.sources.map((src, idx) => (
                      <div key={`${src.name}-${idx}`} className="bg-[#141a2e] p-4 rounded-xl border border-[#232d48]">
                        <span className="font-bold text-white text-sm">{src.name}</span>
                        <p className="text-xs text-gray-400 mt-2">
                          The provider did not return breach date, exposed-field, or incident-size details for this dataset.
                        </p>
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
              <h3 className="text-base font-bold text-white">Email Breach Exposure Check</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                With your permission, check whether this email appears in XposedOrNot's indexed breach datasets. This does not reveal whether an address has an account on a website, and a clean result is not proof that it has never been exposed.
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
