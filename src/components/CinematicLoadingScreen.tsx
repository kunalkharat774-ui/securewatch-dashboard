import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface CinematicLoadingScreenProps {
  onComplete: () => void;
}

const loadingImageUrl = '/eye_providence_symbol.svg';

export const CinematicLoadingScreen: React.FC<CinematicLoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [glitchText, setGlitchText] = useState('WEB APPLICATION & API SECURITY INTELLIGENCE DASHBOARD');

  const steps = [
    'INITIALIZING QUANTUM ENCRYPTION TUNNEL...',
    'DECRYPTING THREAT TELEMETRY & ATTACK VECTORS...',
    'CONNECTING TO SECUREWATCH NEURAL GATEWAY...',
    'LOADING WEB APPLICATION & API SECURITY INTELLIGENCE DASHBOARD...',
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
    <div className="fixed inset-0 z-[9999] bg-[#020201] text-white flex flex-col items-center justify-center overflow-hidden select-none font-mono">
      {/* Background Matrix Particle FX */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/40 via-[#080603] to-[#020201]" />

      {/* Cyber Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#d977060d_1px,transparent_1px),linear-gradient(to_bottom,#d977060d_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Scanline CRT FX */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] pointer-events-none z-10 opacity-70" />

      {/* Golden Pulse Aura centered directly behind symbol */}
      <div className="absolute w-64 h-64 sm:w-80 sm:h-80 bg-amber-500/25 rounded-full blur-[60px] animate-pulse pointer-events-none" />
      <div className="absolute w-56 h-56 sm:w-72 sm:h-72 bg-yellow-400/20 rounded-full blur-[40px] pointer-events-none" />

      {/* Main Center Container */}
      <div className="relative z-20 flex flex-col items-center text-center px-4 max-w-4xl w-full">
        {/* Emblem Box with Golden Triangle & Eye of Providence */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-8 flex items-center justify-center"
        >
          {/* Outer Glowing Golden Aura */}
          <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-amber-500/20 rounded-full blur-[70px] animate-pulse pointer-events-none" />

          {/* Concentric Rotating Outer HUD Rings surrounding the image circle cleanly */}
          <div className="absolute -inset-4 sm:-inset-6 rounded-full border-2 border-dashed border-amber-400/50 animate-[spin_20s_linear_infinite] pointer-events-none" />
          <div className="absolute -inset-8 sm:-inset-10 rounded-full border border-amber-500/30 animate-[spin_32s_linear_infinite_reverse] pointer-events-none" />

          {/* Main Golden Circle Frame containing the Eye of Horus image */}
          <div className="relative aspect-square w-64 sm:w-80 rounded-full p-1.5 bg-gradient-to-b from-amber-400 via-amber-600 to-amber-950 shadow-[0_0_70px_rgba(245,158,11,0.5)] overflow-hidden flex items-center justify-center border-2 border-amber-300">
            <motion.img
              initial={{ scale: 1.15, opacity: 0.3 }}
              animate={{ scale: [1.1, 1, 1.03, 1], opacity: 1 }}
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
              className="block w-full h-full aspect-square object-cover rounded-full shadow-2xl filter brightness-105 contrast-110"
            />

            {/* Subtle Golden Scan Beam */}
            <motion.div
              animate={{ y: ['-120%', '120%'] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-amber-300/30 to-transparent border-y border-amber-300/60 pointer-events-none z-20"
            />

            {/* Subtle Protective Gradient Ring */}
            <div className="absolute inset-0 bg-gradient-to-b from-amber-400/10 via-transparent to-black/30 pointer-events-none rounded-full" />
          </div>
        </motion.div>

        {/* System Subtitle Badge */}
        <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 text-[11px] font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(245,158,11,0.25)]">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          SECUREWATCH SYSTEM INITIATED
        </div>

        {/* Glitch Title text */}
        <div className="relative mb-6">
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-500 uppercase font-mono filter drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] glitch-text-effect"
            data-text={glitchText}
          >
            {glitchText}
          </h1>
        </div>

        {/* High Tech Cyber Progress Bar */}
        <div className="w-full max-w-xl bg-black/80 border border-amber-500/40 rounded-xl p-4 shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Header Progress Info */}
          <div className="flex justify-between items-center text-xs font-bold mb-2">
            <span className="text-amber-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              SYSTEM DECRYPTION & LOADING
            </span>
            <span className="text-yellow-300 font-mono text-sm tracking-wider">
              {progress}%
            </span>
          </div>

          {/* Bar track */}
          <div className="w-full h-3 bg-gray-950 rounded-full border border-amber-900/60 overflow-hidden relative p-0.5">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-300 rounded-full shadow-[0_0_15px_#f59e0b]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>

          {/* Live Step Status Log */}
          <div className="mt-3 text-[11px] text-gray-300 font-mono text-left flex items-center justify-between border-t border-amber-900/40 pt-2.5">
            <span className="text-amber-200/90 truncate flex items-center gap-2">
              <span className="text-amber-500">&gt;&gt;</span>
              {steps[currentStepIndex]}
            </span>
            <span className="text-amber-400 font-bold ml-2 shrink-0">
              STATUS: RUNNING
            </span>
          </div>
        </div>

        {/* Footer Credit & Status */}
        <div className="mt-8 text-[11px] text-gray-400 flex flex-col sm:flex-row items-center gap-3 border-t border-amber-500/20 pt-4 w-full max-w-xl justify-between">
          <span className="text-amber-400/80 font-semibold tracking-wider">
            AUTHORIZATION NODE: <span className="text-white">ADMIN_NODE_01</span>
          </span>
          <span className="text-gray-400 font-bold">
            DEVELOPED BY <span className="text-amber-300">KUNAL KHARAT</span>
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