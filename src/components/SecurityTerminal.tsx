import React, { useState, useEffect, useRef, useCallback } from 'react';

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
        ctx.fillStyle = Math.random() > 0.98 ? '#00f2ff' : 'rgba(0, 242, 255, 0.2)';
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

  const [activeCreds, setActiveCreds] = useState({ username: '', password: '' });
  const [timeLeft, setTimeLeft] = useState(30);
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

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

  const generateRandomString = (length: number) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const generateNewCredentials = useCallback(() => {
    setActiveCreds({
      username: 'NODE_' + generateRandomString(4),
      password: generateRandomString(8),
    });
    setTimeLeft(30);
    setErrorMsg('');
    setInputUsername('');
    setInputPassword('');
  }, []);

  // Timer Logic - 30 Seconds rotation
  useEffect(() => {
    if (isAuthenticated || isDecrypting) return;
    if (!activeCreds.username) generateNewCredentials();

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateNewCredentials();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [isAuthenticated, isDecrypting, activeCreds.username, generateNewCredentials]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      inputUsername.trim().toUpperCase() === activeCreds.username.toUpperCase() &&
      inputPassword.trim() === activeCreds.password
    ) {
      setIsDecrypting(true);
      setErrorMsg('');

      setTimeout(() => {
        playVoiceFeedback('Access Granted. Welcome to Securewatch Dashboard.');
        setIsAuthenticated(true);
        localStorage.setItem('securewatch_authenticated', 'true');
        setIsDecrypting(false);
      }, 2500);
    } else {
      playVoiceFeedback('Access Denied. Identity verification failed.');
      setErrorMsg('CRITICAL: INVALID_TOKEN_MISMATCH');
      setInputUsername('');
      setInputPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('securewatch_authenticated');
    generateNewCredentials();
  };

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
            position: fixed; bottom: 0; width: 100%; background: rgba(0, 10, 20, 0.95);
            border-top: 1px solid #00f2ff; padding: 12px 0; overflow: hidden; z-index: 100;
          }
          .marquee-text {
            display: inline-block; font-family: monospace; color: #00f2ff;
            white-space: nowrap;
            animation: marquee 30s linear infinite; text-transform: uppercase; font-size: 13px;
          }
          .spinner-animate {
            animation: spin 1s linear infinite;
          }
        `}</style>

        <div style={styles.glassCard}>
          <div style={styles.header}>
            <div style={styles.statusBadge}>SYSTEM REQUIRED</div>
            <h1 style={styles.mainTitle}>🛡️ SECURITY AUTH</h1>
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
                  placeholder="ACCESS ID"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value.toUpperCase())}
                  style={styles.terminalInput}
                  autoComplete="off"
                  required
                />
                <input
                  type="password"
                  placeholder="PASSWORD"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  style={styles.terminalInput}
                  required
                />

                {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}
                <button type="submit" style={styles.authBtn}>
                  AUTHORIZE LOGIN
                </button>
              </form>
            </>
          )}

          <div style={styles.footerBranding}>
            <p style={styles.kunalBranding}>
              DEVELOPED BY <span style={styles.kunalName}>KUNAL KHARAT</span>
            </p>
          </div>
        </div>

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
    height: '100vh',
    width: '100vw',
    backgroundColor: '#000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'monospace',
    overflow: 'hidden',
    position: 'relative',
  },
  glassCard: {
    width: '100%',
    maxWidth: '400px',
    padding: '35px',
    backgroundColor: 'rgba(2, 5, 10, 0.95)',
    border: '1px solid rgba(0, 242, 255, 0.2)',
    position: 'relative',
    zIndex: 10,
    boxShadow: '0 0 50px rgba(0, 0, 0, 1)',
    backdropFilter: 'blur(10px)',
    margin: '20px',
  },
  header: { textAlign: 'center', marginBottom: '25px' },
  statusBadge: {
    fontSize: '8px',
    color: '#00f2ff',
    border: '1px solid #00f2ff',
    display: 'inline-block',
    padding: '2px 8px',
  },
  mainTitle: { color: '#fff', fontSize: '24px', letterSpacing: '4px', margin: '15px 0 5px', fontWeight: 'bold' },
  subTitle: { color: '#00f2ff', fontSize: '9px', opacity: 0.5, letterSpacing: '1px' },
  tokenBox: {
    background: 'rgba(0,0,0,0.8)',
    padding: '20px',
    border: '1px solid #111',
    marginBottom: '25px',
    position: 'relative',
  },
  progressBarWrapper: { position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: '#0a0a0a' },
  progressBar: { height: '100%', background: '#00f2ff', boxShadow: '0 0 10px #00f2ff' },
  credItem: { display: 'flex', justifyContent: 'space-between', margin: '8px 0' },
  label: { color: '#00f2ff', fontSize: '10px' },
  value: { color: '#fff', fontSize: '15px', fontWeight: 'bold' },
  timerText: { fontSize: '9px', color: '#666', textAlign: 'right', marginTop: '10px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  terminalInput: {
    background: '#050505',
    border: '1px solid #222',
    padding: '14px',
    color: '#00f2ff',
    outline: 'none',
    textAlign: 'center',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
  },
  authBtn: {
    background: '#00f2ff',
    color: '#000',
    border: 'none',
    padding: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '2px',
  },
  errorText: { color: '#ff3333', fontSize: '10px', textAlign: 'center', margin: 0, fontWeight: 'bold' },
  loadingArea: { textAlign: 'center', padding: '40px' },
  spinner: {
    width: '40px',
    height: '40px',
    border: '2px solid #0a0a0a',
    borderTopColor: '#00f2ff',
    borderRadius: '50%',
    margin: '0 auto 20px',
  },
  decryptText: { color: '#00f2ff', fontSize: '11px', letterSpacing: '2px' },
  footerBranding: { marginTop: '30px', textAlign: 'center', fontSize: '10px' },
  kunalBranding: { color: '#444' },
  kunalName: { color: '#00f2ff', fontWeight: 'bold' },
};
