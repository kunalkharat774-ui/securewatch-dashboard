import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CinematicLoadingScreen } from './CinematicLoadingScreen';

// --- Matrix Rain Animation Canvas ---
const BinaryBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const fontSize = 14;
    let columns = Math.floor(width / fontSize);
    let drops = new Array(columns).fill(1);
    let animationFrameId: number;

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = Math.random() > 0.5 ? '0' : '1';
        ctx.fillStyle = Math.random() > 0.98 ? '#fbbf24' : 'rgba(245, 158, 11, 0.22)';
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      setTimeout(() => {
        animationFrameId = requestAnimationFrame(draw);
      }, 50);
    };

    draw();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(1);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={styles.canvas} />;
};

interface SecurityTerminalProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export const SecurityTerminal: React.FC<SecurityTerminalProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('securewatch_authenticated') === 'true';
  });
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [activeCreds, setActiveCreds] = useState({ username: '', password: '', token: '' });
  const [timeLeft, setTimeLeft] = useState(30);
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice Feedback logic
  const playVoiceFeedback = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        const speak = () => {
          const voices = window.speechSynthesis.getVoices();
          // Priority to Google/English voices for better quality
          const humanVoice = voices.find((v) => v.name.includes('Google') || v.lang.startsWith('en'));
          if (humanVoice) utterance.voice = humanVoice;
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = speak;
        } else {
          speak();
        }
      } catch (e) {
        console.warn('Speech synthesis not available:', e);
      }
    }
  }, []);

  const generateNewCredentials = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/challenge', { cache: 'no-store' });
      if (!response.ok) throw new Error('Challenge unavailable');
      const challenge = await response.json() as { username: string; password: string; expiresAt: number; token: string };
      if (!challenge.username || !challenge.password || !challenge.token) throw new Error('Invalid challenge response');
      setActiveCreds({ username: challenge.username, password: challenge.password, token: challenge.token });
      setTimeLeft(Math.max(1, Math.ceil((challenge.expiresAt - Date.now()) / 1000)));
      setErrorMsg('');
      setInputUsername('');
      setInputPassword('');
    } catch {
      setErrorMsg('CRITICAL: AUTH_SERVICE_UNAVAILABLE');
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : { authenticated: false })
      .then((session: { authenticated?: boolean }) => {
        const authenticated = session.authenticated === true;
        setIsAuthenticated(authenticated);
        if (authenticated) localStorage.setItem('securewatch_authenticated', 'true');
        else localStorage.removeItem('securewatch_authenticated');
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsCheckingSession(false));
  }, []);

  // Preload intro image in memory for zero-latency display
  useEffect(() => {
    const img = new Image();
    img.src = '/eye_providence_symbol.svg';
  }, []);

  // Timer Logic - 30 Seconds rotation
  useEffect(() => {
    if (isAuthenticated || isDecrypting) return;
    if (!activeCreds.username) void generateNewCredentials();

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          void generateNewCredentials();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isAuthenticated, isDecrypting, activeCreds.username, generateNewCredentials]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !activeCreds.username) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessId: inputUsername, password: inputPassword, challengeToken: activeCreds.token }),
      });
      if (response.ok) {
        setIsDecrypting(true);
      } else {
        throw new Error('Invalid credentials');
      }
    } catch {
      playVoiceFeedback('Access Denied. Identity verification failed.');
      setErrorMsg('CRITICAL: INVALID_TOKEN_MISMATCH_OR_EXPIRED');
      setInputUsername('');
      setInputPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCinematicComplete = useCallback(() => {
    playVoiceFeedback('Access Granted. Welcome to Web Application and API Security Intelligence Dashboard.');
    setIsAuthenticated(true);
    localStorage.setItem('securewatch_authenticated', 'true');
    setIsDecrypting(false);
  }, [playVoiceFeedback]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('securewatch_authenticated');
    void fetch('/api/auth/logout', { method: 'POST' });
    void generateNewCredentials();
  };

  if (isCheckingSession) return null;

  if (isDecrypting) {
    return <CinematicLoadingScreen onComplete={handleCinematicComplete} />;
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.terminalWrapper}>
        <BinaryBackground />
        <div className="scanline-overlay"></div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
          
          .scanline-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), 
                        linear-gradient(90deg, rgba(255, 0, 0, 0.02), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.02));
            background-size: 100% 3px, 3px 100%; pointer-events: none; z-index: 5;
          }
          .marquee-container {
            position: fixed; bottom: 0; left: 0; width: 100%; background: rgba(5, 5, 5, 0.95);
            border-top: 1px solid #f59e0b; padding: 10px 0; overflow: hidden; z-index: 100;
          }
          .marquee-text {
            display: inline-block; font-family: monospace; color: #fbbf24;
            white-space: nowrap;
            animation: marquee 30s linear infinite; text-transform: uppercase; font-size: 12px;
          }
          .spinner-animate {
            animation: spin 1s linear infinite;
          }
        `}</style>

        <main style={styles.glassCard} aria-labelledby="security-auth-title">
          <div style={styles.header}>
            <div style={styles.statusBadge}>SYSTEM REQUIRED</div>
            <h1 id="security-auth-title" style={styles.mainTitle}>SECURITY AUTH</h1>
            <p style={styles.subTitle}>MULTI-FACTOR ENCRYPTION ENABLED</p>
          </div>

          {isDecrypting ? (
            <div style={styles.loadingArea}>
              <div className="spinner-animate" style={styles.spinner}></div>
              <p style={styles.decryptText}>ESTABLISHING SECURE TUNNEL...</p>
            </div>
          ) : (
            <>
              <div style={styles.tokenBox}>
                <div style={styles.progressBarWrapper}>
                  <div
                    style={{
                      ...styles.progressBar,
                      width: `${(timeLeft / 30) * 100}%`,
                      transition: timeLeft === 30 ? 'none' : 'width 1s linear',
                    }}
                  ></div>
                </div>
                <div style={styles.credItem}>
                  <span style={styles.label}>ACCESS_ID:</span>
                  <span style={styles.value}>{activeCreds.username}</span>
                </div>
                <div style={styles.credItem}>
                  <span style={styles.label}>SECRET_KEY:</span>
                  <span style={styles.value}>{activeCreds.password}</span>
                </div>
                <p style={styles.timerText}>RE-SYNC IN {timeLeft}s</p>
              </div>

              <form onSubmit={handleLogin} style={styles.form}>
                <input
                  type="text"
                  aria-label="Access ID"
                  placeholder="ACCESS ID"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value.toUpperCase())}
                  style={styles.terminalInput}
                  autoComplete="off"
                  required
                />
                <input
                  type="password"
                  aria-label="Password"
                  placeholder="PASSWORD"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  style={styles.terminalInput}
                  required
                />

                {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}
                <button type="submit" style={{ ...styles.authBtn, ...(isSubmitting ? styles.authBtnDisabled : {}) }} disabled={isSubmitting || !activeCreds.username}>
                  {isSubmitting ? 'VERIFYING...' : 'AUTHORIZE LOGIN'}
                </button>
              </form>
            </>
          )}

          <div style={styles.footerBranding}>
            <p style={styles.kunalBranding}>
              DEVELOPED BY <span style={styles.kunalName}>KUNAL KHARAT</span>
            </p>
          </div>
        </main>

        <div className="marquee-container">
          <div className="marquee-text">
            &gt;&gt;&gt; Warning: To run the Web Application & API Security website, you will need to access the login page. &gt;&gt;&gt;
          </div>
        </div>
      </div>
    );
  }

  // Inject handleLogout callback capability so Header or Sidebar can trigger logout
  return (
    <div className="relative min-h-screen">
      {/* Top Banner indicating authenticated node session & Quick Terminal Logout */}
      <div className="bg-[#050812] border-b border-[#1f2335] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-gray-400 z-40 relative">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-cyan-400 font-bold">ADMIN@LOCAL_NODE:~#</span>
          <span className="hidden sm:inline text-gray-400">| SESSION_ENCRYPTED_AES256</span>
          <span className="text-emerald-400 font-bold">DEVELOPED BY KUNAL KHARAT</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-bold rounded transition cursor-pointer flex items-center gap-1.5 text-[10px]"
          title="Return to Security Authentication Gate"
        >
          <i className="fa-solid fa-power-off text-[10px]" />
          <span>TERMINAL LOGOUT</span>
        </button>
      </div>

      {children}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  canvas: { position: 'fixed', top: 0, left: 0, zIndex: 0, opacity: 0.6, pointerEvents: 'none' },
  terminalWrapper: {
    minHeight: '100vh',
    height: '100dvh',
    width: '100vw',
    backgroundColor: '#000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'monospace',
    overflow: 'auto',
    position: 'relative',
    padding: '24px 16px 64px',
    boxSizing: 'border-box',
  },
  glassCard: {
    width: '100%',
    maxWidth: '400px',
    padding: 'clamp(22px, 6vw, 35px)',
    backgroundColor: 'rgba(5, 5, 5, 0.95)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    position: 'relative',
    zIndex: 10,
    boxShadow: '0 0 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(245, 158, 11, 0.15)',
    backdropFilter: 'blur(10px)',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  header: { textAlign: 'center', marginBottom: '22px' },
  statusBadge: {
    fontSize: '8px',
    color: '#f59e0b',
    border: '1px solid #f59e0b',
    display: 'inline-block',
    padding: '2px 8px',
    letterSpacing: '1px',
  },
  mainTitle: { color: '#ffffff', fontSize: 'clamp(19px, 6vw, 24px)', letterSpacing: 'clamp(2px, 1vw, 4px)', margin: '15px 0 5px', fontWeight: 'bold' },
  subTitle: { color: '#fbbf24', fontSize: '9px', opacity: 0.8, letterSpacing: '1px' },
  tokenBox: {
    background: 'rgba(10, 8, 2, 0.9)',
    padding: '18px 14px',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    marginBottom: '25px',
    position: 'relative',
  },
  progressBarWrapper: { position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: '#111' },
  progressBar: { height: '100%', background: 'linear-gradient(90deg, #d97706, #fbbf24)', boxShadow: '0 0 10px #f59e0b' },
  credItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', margin: '8px 0' },
  label: { color: '#f59e0b', fontSize: '10px' },
  value: { color: '#ffffff', fontSize: 'clamp(12px, 4vw, 15px)', fontWeight: 'bold', overflowWrap: 'anywhere', textAlign: 'right' },
  timerText: { fontSize: '9px', color: '#888', textAlign: 'right', marginTop: '10px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  terminalInput: {
    background: '#0a0802',
    border: '1px solid rgba(245, 158, 11, 0.35)',
    padding: '14px',
    color: '#fbbf24',
    outline: 'none',
    textAlign: 'center',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
  },
  authBtn: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#000000',
    border: 'none',
    padding: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '2px',
    boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)',
  },
  authBtnDisabled: { opacity: 0.55, cursor: 'wait' },
  errorText: { color: '#ff4444', fontSize: '10px', textAlign: 'center', margin: 0, fontWeight: 'bold' },
  loadingArea: { textAlign: 'center', padding: '40px' },
  spinner: {
    width: '40px',
    height: '40px',
    border: '2px solid #1a1a1a',
    borderTopColor: '#f59e0b',
    borderRadius: '50%',
    margin: '0 auto 20px',
  },
  decryptText: { color: '#fbbf24', fontSize: '11px', letterSpacing: '2px' },
  footerBranding: { marginTop: '30px', textAlign: 'center', fontSize: '10px' },
  kunalBranding: { color: '#777' },
  kunalName: { color: '#fbbf24', fontWeight: 'bold' },
};
