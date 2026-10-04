import React, { useState } from 'react';
import { motion } from 'motion/react';
import { NavView } from '../types';
import { TextEncryptView } from './TextEncryptView';
import { SteganographyView } from './SteganographyView';
import { IpLocationView } from './IpLocationView';
import { DomainInfoView } from './DomainInfoView';
import { EmailBreachView } from './EmailBreachView';
import { VulnerabilityScannerView } from './VulnerabilityScannerView';
import { SecurityAlertsView } from './SecurityAlertsView';
import { ApiMonitoringView } from './ApiMonitoringView';
import { SecurityLogsView } from './SecurityLogsView';
import { ReportsView } from './ReportsView';
import { SecurityUsersView } from './SecurityUsersView';
import { SettingsView } from './SettingsView';

interface ExtraViewsProps {
  view: NavView;
  onBackToDashboard: () => void;
}

type Rating = 'WEAK' | 'STRONG' | 'MILITARY-GRADE';

interface PasswordEvaluation {
  score: number;
  rating: Rating;
  crackTime: string;
  badgeBg: string;
  progressBg: string;
  feedback: string;
  criteria: {
    length: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    symbol: boolean;
  };
}

/* ---------- Helpers (outside the component so they are not recreated on every render) ---------- */

const secureRandomInt = (max: number): number => {
  if (max <= 0) return 0;
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    // Never fall back to Math.random for password generation.
    throw new Error('Web Crypto API is not available in this environment.');
  }

  const range = 0x100000000;
  const limit = range - (range % max);
  const buffer = new Uint32Array(1);
  do {
    cryptoApi.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
};

const buildPassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + symbols;

  const chars: string[] = [
    uppercase.charAt(secureRandomInt(uppercase.length)),
    lowercase.charAt(secureRandomInt(lowercase.length)),
    numbers.charAt(secureRandomInt(numbers.length)),
    symbols.charAt(secureRandomInt(symbols.length)),
  ];

  for (let i = 0; i < 14; i++) {
    chars.push(all.charAt(secureRandomInt(all.length)));
  }

  // Unbiased Fisher-Yates shuffle
  for (let index = chars.length - 1; index > 0; index--) {
    const swapIndex = secureRandomInt(index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join('');
};

const evaluatePasswordStrength = (pass: string): PasswordEvaluation => {
  if (!pass) {
    return {
      score: 0,
      rating: 'WEAK',
      crackTime: 'Instant',
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
  const hasSymbol = /[^A-Za-z0-9]/.test(pass);

  const normalized = pass.toLowerCase();
  const commonWeak = ['password', '123456', '12345678', 'qwerty', 'admin', 'welcome', 'letmein', 'iloveyou', 'p@ssw0rd', 'secure'];
  const isCommon = commonWeak.some((word) => normalized.includes(word));
  const hasSequence = /(?:abc|bcd|cde|123|234|345|456|567|678|789|987|876|765|654|543|432|321)/i.test(pass);
  const hasRepeatedRun = /(.)\1{2,}/.test(pass);

  const poolSize =
    (hasUpper ? 26 : 0) + (hasLower ? 26 : 0) + (hasNumber ? 10 : 0) + (hasSymbol ? 32 : 0);
  const entropyBits = Math.max(
    0,
    Math.round(
      length * Math.log2(Math.max(poolSize, 1)) -
        (isCommon ? 35 : 0) -
        (hasSequence ? 12 : 0) -
        (hasRepeatedRun ? 10 : 0)
    )
  );
  const score = Math.min(100, Math.max(0, Math.round((entropyBits / 128) * 100)));

  // Average attacker needs half the keyspace; assume 10 billion guesses/second.
  const crackSeconds = Math.pow(2, Math.max(entropyBits - 1, 0)) / 10_000_000_000;
  const formatCrackTime = (): string => {
    if (crackSeconds < 1) return 'Instant';
    if (crackSeconds < 60) return `${Math.round(crackSeconds)} seconds`;
    if (crackSeconds < 3600) return `${Math.round(crackSeconds / 60)} minutes`;
    if (crackSeconds < 86400) return `${Math.round(crackSeconds / 3600)} hours`;
    if (crackSeconds < 31536000) return `${Math.round(crackSeconds / 86400)} days`;
    if (crackSeconds < 31536000 * 1000) return `${Math.round(crackSeconds / 31536000).toLocaleString()} years`;
    return '1,000+ years';
  };

  let rating: Rating;
  let badgeBg: string;
  let progressBg: string;
  let feedback: string;

  if (isCommon || length < 8 || entropyBits < 40) {
    rating = 'WEAK';
    badgeBg = 'bg-red-500/20 text-red-400 border-red-500/40';
    progressBg = 'bg-red-500';
    feedback = isCommon
      ? 'WEAK: Contains a commonly guessed password pattern. Use a unique passphrase or generate a new password.'
      : 'WEAK: Increase length and character diversity to resist automated brute-force attacks.';
  } else if (entropyBits < 80) {
    rating = 'STRONG';
    badgeBg = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    progressBg = 'bg-emerald-500';
    feedback = 'STRONG: Good character diversity and length. A longer unique passphrase would provide more protection.';
  } else {
    rating = 'MILITARY-GRADE';
    badgeBg = 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(159,134,255,0.3)] animate-pulse';
    progressBg = 'bg-gradient-to-r from-[#3b28cc] via-[#9f86ff] to-emerald-400';
    feedback = 'MILITARY-GRADE: High estimated entropy and no common patterns detected.';
  }

  return {
    score,
    rating,
    crackTime: formatCrackTime(),
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

/* ---------- Component ---------- */

export const ExtraViews: React.FC<ExtraViewsProps> = ({ view, onBackToDashboard }) => {
  // Password Analyzer State
  const [testPassword, setTestPassword] = useState('');
  const [generatedPass, setGeneratedPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const generatePassword = () => {
    try {
      const res = buildPassword();
      setGeneratedPass(res);
      setTestPassword(res);
    } catch (error) {
      console.error(error);
      alert('Secure random generation is not supported in this browser.');
    }
  };

  const handleCopyPassword = async () => {
    const value = generatedPass || testPassword;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    } catch (error) {
      console.error('Clipboard write failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[#1f2335] pb-4">
        <div>
          <h2 className="text-xl font-bold text-white capitalize">{view.replace(/-/g, ' ')}</h2>
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
      {view === 'api-monitoring' && <ApiMonitoringView onBackToDashboard={onBackToDashboard} />}

      {/* 2. SECURITY ALERTS */}
      {view === 'alerts' && (
        <SecurityAlertsView onBackToDashboard={onBackToDashboard} onAlertCountChange={() => undefined} />
      )}

      {/* 3. VULNERABILITY SCANNER */}
      {view === 'vulnerability-scanner' && <VulnerabilityScannerView onBackToDashboard={onBackToDashboard} />}

      {/* 6. EMAIL BREACH CHECKER */}
      {view === 'email-breach' && <EmailBreachView onBackToDashboard={onBackToDashboard} />}

      {/* 7. PASSWORD STRENGTH & GENERATOR */}
      {view === 'password-strength' &&
        (() => {
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
                    Real-time entropy analysis, character set validation & brute-force time estimation.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Security Rating:</span>
                  <span className={`px-3.5 py-1 rounded-full text-xs font-bold border transition-all ${passEval.badgeBg}`}>
                    {passEval.rating === 'MILITARY-GRADE'
                      ? '🛡️ MILITARY-GRADE'
                      : passEval.rating === 'STRONG'
                      ? '⚡ STRONG'
                      : '⚠️ WEAK'}
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
                        autoComplete="off"
                        className="w-full px-3.5 py-2.5 pr-10 bg-[#080a10] border border-[#1f2335] text-white rounded-lg text-xs outline-none focus:border-[#3b28cc] font-mono tracking-wider transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                      <i
                        className={`fa-solid ${
                          passEval.rating === 'MILITARY-GRADE'
                            ? 'fa-shield-halved text-purple-400'
                            : passEval.rating === 'STRONG'
                            ? 'fa-bolt text-emerald-400'
                            : 'fa-triangle-exclamation text-red-400'
                        } mt-0.5 text-base`}
                      />
                      <div>
                        <span className="font-bold text-white block mb-0.5">{passEval.feedback}</span>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Estimated Crack Time:{' '}
                          <strong className="text-emerald-400 font-mono font-bold">{passEval.crackTime}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Requirements Checklist */}
                  <div className="p-3.5 bg-[#080a10] border border-[#1f2335] rounded-xl space-y-2.5 text-xs">
                    <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">
                      Security Requirements Checklist
                    </span>
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
                    <label className="text-xs text-gray-300 font-semibold block">Generate Strong Password</label>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Generate an 18-character cryptographically secure password with high entropy for servers,
                      databases, and encryption keys.
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
                        onClick={handleCopyPassword}
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

                  {/* Rating Guide Card (matches the actual entropy thresholds) */}
                  <div className="p-4 bg-[#111524] border border-[#1f2335] rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-white block">Password Strength Tiers:</span>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex items-center justify-between gap-2 p-1.5 bg-[#080a10] rounded border border-red-500/20">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">WEAK</span>
                        <span className="text-gray-400 text-right">Under 8 chars, common patterns, or below 40 bits of entropy.</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 p-1.5 bg-[#080a10] rounded border border-emerald-500/20">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">STRONG</span>
                        <span className="text-gray-400 text-right">40 to 79 bits of estimated entropy with mixed character sets.</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 p-1.5 bg-[#080a10] rounded border border-purple-500/30">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">MILITARY-GRADE</span>
                        <span className="text-gray-400 text-right">80+ bits of estimated entropy and no common patterns.</span>
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