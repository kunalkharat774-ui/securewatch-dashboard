import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BinaryBackground } from './BinaryBackground';

interface CinematicLoadingScreenProps {
  onComplete: () => void;
}

const loadingImageUrl = '/eye_providence_symbol.svg';

export const CinematicLoadingScreen: React.FC<CinematicLoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [glitchText, setGlitchText] = useState('WEB APPLICATION & API SECURITY INTELLIGENCE DASHBOARD');

  const steps = [
    'INITIALIZING ORANGE-BLUE SECURITY TUNNEL...',
    'DECRYPTING THREAT TELEMETRY & ATTACK VECTORS...',
    'CONNECTING TO SECUREWATCH NEURAL GATEWAY...',
    'LOADING SECUREWATCH THREAT INTELLIGENCE CONSOLE...',
    'VERIFYING ZERO-TRUST IDENTITY CREDENTIALS...',
    'AUTHENTICATION COMPLETE. GRANTED ACCESS TO SECUREWATCH.'
  ];

  // Glitch Effect Generator for Text
  useEffect(() => {
    const original = 'WEB APPLICATION & API SECURITY INTELLIGENCE DASHBOARD';
    const glitchChars = '01#X%@&*!?<>$/\\';

    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        let glitched = original
          .split('')
          .map((char) => {
            if (char === ' ') return ' ';
            return Math.random() < 0.15
              ? glitchChars.charAt(Math.floor(Math.random() * glitchChars.length))
              : char;
          })
          .join('');
        setGlitchText(glitched);

        setTimeout(() => {
          setGlitchText(original);
        }, 120);
      }
    }, 400);

    return () => clearInterval(glitchInterval);
  }, []);

  // Progress Bar & Step Progression
  useEffect(() => {
    const startTime = Date.now();
    const duration = 4800; // 4.8 seconds duration

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(100, Math.floor((elapsed / duration) * 100));

      setProgress(rawProgress);

      const stepIdx = Math.min(
        steps.length - 1,
        Math.floor((rawProgress / 100) * steps.length)
      );
      setCurrentStepIndex(stepIdx);

      if (rawProgress >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          onComplete();
        }, 400);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="cinematic-loading-screen dark-blue-theme fixed inset-0 z-[9999] text-white flex flex-col items-center justify-center overflow-hidden select-none font-mono">
      <BinaryBackground />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_30%,rgba(249,115,22,0.22),transparent_28%),radial-gradient(circle_at_70%_65%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.12),transparent_28%),rgba(5,10,18,0.88)]" />

      <div className="absolute inset-0 z-[2] bg-[linear-gradient(to_right,rgba(249,115,22,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.12)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-70" />

      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.32)_50%)] bg-[size:100%_4px] pointer-events-none z-10 opacity-90" />

      <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-orange-500/15 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute w-60 h-60 sm:w-80 sm:h-80 bg-sky-500/15 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute w-48 h-48 sm:w-64 sm:h-64 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Main Center Container */}
      <div className="relative z-20 flex flex-col items-center text-center px-4 max-w-4xl w-full">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-8 flex items-center justify-center"
        >
          <div className="absolute w-72 h-72 sm:w-[28rem] sm:h-[28rem] bg-gradient-to-r from-orange-500/20 via-sky-500/10 to-emerald-500/10 rounded-full blur-[90px] animate-pulse pointer-events-none" />

          <div className="absolute -inset-5 sm:-inset-7 rounded-full border-2 border-dashed border-orange-400/60 animate-[spin_20s_linear_infinite] pointer-events-none shadow-[0_0_30px_rgba(56,189,248,0.2)]" />
          <div className="absolute -inset-8 sm:-inset-10 rounded-full border border-sky-400/35 animate-[spin_32s_linear_infinite_reverse] pointer-events-none" />
          <div className="absolute -inset-12 sm:-inset-16 rounded-full border border-white/10 animate-[spin_50s_linear_infinite] pointer-events-none" />

          <div className="relative aspect-square w-64 sm:w-80 rounded-full p-1.5 bg-[radial-gradient(circle_at_center,_rgba(249,115,22,0.22),_rgba(8,15,23,0.96)_58%,_rgba(59,130,246,0.18))] shadow-[0_0_80px_rgba(56,189,248,0.45)] overflow-hidden flex items-center justify-center border border-orange-300/70">
            <div className="absolute inset-1.5 z-10 overflow-hidden rounded-full bg-[#070d17] ring-1 ring-sky-400/30">
              <motion.img
                initial={{ scale: 1.08, opacity: 0.3 }}
                animate={{ scale: [1.04, 1, 1.02, 1], opacity: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                src={loadingImageUrl}
                alt="SecureWatch loading symbol"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = '/eye_providence_symbol.svg';
                }}
                className="block h-full w-full aspect-square object-contain rounded-full shadow-[0_0_35px_rgba(249,115,22,0.35)]"
              />
            </div>

            <motion.div
              animate={{ y: ['-120%', '120%'] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="absolute inset-x-0 h-14 bg-gradient-to-b from-transparent via-orange-300/35 via-sky-300/20 to-transparent border-y border-orange-300/60 pointer-events-none z-20"
            />

            <div className="absolute inset-0 bg-gradient-to-b from-orange-400/10 via-sky-400/5 to-emerald-400/10 pointer-events-none rounded-full" />
          </div>
        </motion.div>

        <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-400/40 text-orange-200 text-[11px] font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(249,115,22,0.25)]">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          SECUREWATCH SYSTEM INITIATED
        </div>

        <div className="relative mb-6">
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-300 via-sky-300 to-emerald-300 uppercase font-mono filter drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] glitch-text-effect"
            data-text={glitchText}
          >
            {glitchText}
          </h1>
        </div>

        <div className="w-full max-w-xl bg-black/80 border border-orange-500/40 rounded-xl p-4 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="flex justify-between items-center text-xs font-bold mb-2">
            <span className="text-orange-300 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              SYSTEM DECRYPTION & LOADING
            </span>
            <span className="text-sky-300 font-mono text-sm tracking-wider">
              {progress}%
            </span>
          </div>

          <div className="w-full h-3 bg-gray-950 rounded-full border border-orange-900/60 overflow-hidden relative p-0.5">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 via-sky-400 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.9)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>

          <div className="mt-3 text-[11px] text-gray-300 font-mono text-left flex items-center justify-between border-t border-orange-900/40 pt-2.5">
            <span className="text-sky-100/90 truncate flex items-center gap-2">
              <span className="text-orange-400">&gt;&gt;</span>
              {steps[currentStepIndex]}
            </span>
            <span className="text-emerald-400 font-bold ml-2 shrink-0">
              STATUS: RUNNING
            </span>
          </div>
        </div>

        <div className="mt-8 text-[11px] text-gray-400 flex flex-col sm:flex-row items-center gap-3 border-t border-orange-500/20 pt-4 w-full max-w-xl justify-between">
          <span className="text-orange-300/80 font-semibold tracking-wider">
            AUTHORIZATION NODE: <span className="text-white">ADMIN_NODE_01</span>
          </span>
          <span className="text-gray-400 font-bold">
            DEVELOPED BY <span className="text-sky-300">KUNAL KHARAT</span>
          </span>
        </div>
      </div>

      {/* CSS Styles for Glitch text */}
      <style>{`
        .glitch-text-effect {
          position: relative;
          display: inline-block;
        }
        .glitch-text-effect::before,
        .glitch-text-effect::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          clip: rect(0, 0, 0, 0);
        }
        .glitch-text-effect::before {
          left: -2px;
          text-shadow: 2px 0 #f59e0b;
          animation: glitch-anim-1 2s infinite linear alternate-reverse;
        }
        .glitch-text-effect::after {
          left: 2px;
          text-shadow: -2px 0 #fbbf24;
          animation: glitch-anim-2 3s infinite linear alternate-reverse;
        }
        @keyframes glitch-anim-1 {
          0% { clip: rect(10px, 9999px, 30px, 0); }
          20% { clip: rect(40px, 9999px, 60px, 0); }
          40% { clip: rect(15px, 9999px, 45px, 0); }
          60% { clip: rect(50px, 9999px, 80px, 0); }
          80% { clip: rect(25px, 9999px, 55px, 0); }
          100% { clip: rect(65px, 9999px, 95px, 0); }
        }
        @keyframes glitch-anim-2 {
          0% { clip: rect(20px, 9999px, 50px, 0); }
          25% { clip: rect(60px, 9999px, 90px, 0); }
          50% { clip: rect(10px, 9999px, 35px, 0); }
          75% { clip: rect(45px, 9999px, 75px, 0); }
          100% { clip: rect(30px, 9999px, 65px, 0); }
        }
      `}</style>
    </div>
  );
};