import React, { useEffect, useRef, useState } from "react";

interface OsirisLoadingScreenProps {
  onComplete: () => void;
}

const STATUS_MESSAGES = [
  "INITIALIZING SECUREWATCH DEFENSE ENGINE...",
  "CALIBRATING ACTIVE RADAR & OPTICAL SENSORS...",
  "ACQUIRING GLOBAL SATELLITE TELEMETRY...",
  "SYNCHRONIZING ZERO-TRUST THREAT MESH...",
  "AUTHENTICATION VERIFIED",
];

export const OsirisLoadingScreen: React.FC<OsirisLoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live UTC military timestamp
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const utc = now.toISOString().replace("T", " // ").replace("Z", " UTC");
      setCurrentTime(utc);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cinematic floating stardust bokeh particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particlesCount = 45;
    const particles = Array.from({ length: particlesCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 1.6 + 0.5,
      speedX: (Math.random() - 0.5) * 0.35,
      speedY: (Math.random() - 0.5) * 0.35 - 0.15,
      opacity: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.65 ? "#eab308" : "#38bdf8",
    }));

    const render = () => {
      animId = requestAnimationFrame(render);
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Main Loading Sequence Timer
  useEffect(() => {
    const durationMs = 3000;
    const intervalMs = 25;
    const totalSteps = durationMs / intervalMs;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentPct = Math.min(100, Math.round((step / totalSteps) * 100));
      setProgress(currentPct);

      if (currentPct < 22) {
        setStatusIndex(0);
      } else if (currentPct < 50) {
        setStatusIndex(1);
      } else if (currentPct < 75) {
        setStatusIndex(2);
      } else if (currentPct < 96) {
        setStatusIndex(3);
      } else {
        setStatusIndex(4);
      }

      if (step >= totalSteps) {
        clearInterval(timer);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            onComplete();
          }, 650);
        }, 350);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div
      id="cinematic-securewatch-loading-screen"
      className={`fixed inset-0 z-[9999] bg-[#050608] flex flex-col justify-between select-none overflow-hidden transition-all duration-700 font-mono ${
        isFadingOut ? "opacity-0 scale-105 filter blur-sm pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* ========================================================================= */}
      {/* CINEMATIC LAYER 1: AMBIENT OPTICAL FLARES & PARTICLES */}
      {/* ========================================================================= */}
      {/* Stardust bokeh particles */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />

      {/* Horizontal Anamorphic Lens Flare Streaks */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-[#38bdf8]/45 to-transparent pointer-events-none z-[2] blur-[1px] animate-pulse" 
        style={{ animationDuration: "4s" }} 
      />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65vw] max-w-3xl h-[2px] bg-gradient-to-r from-transparent via-[#facc15]/35 to-transparent pointer-events-none z-[2] blur-[0.5px]" 
      />

      {/* Soft Ambient Cinematic Radial Core Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-amber-500/[0.04] rounded-full blur-[140px] pointer-events-none z-[1]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/[0.035] rounded-full blur-[100px] pointer-events-none z-[1]" />

      {/* Subtle Tactical Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.045] pointer-events-none z-[2]" 
        style={{
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px"
        }}
      />

      {/* Cinematic Screen Vignette */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#050608]/40 to-[#050608]/90 pointer-events-none z-[3]" />

      {/* ========================================================================= */}
      {/* CINEMATIC TOP LETTERBOX & TELEMETRY BANNER */}
      {/* ========================================================================= */}
      <header className="relative z-10 w-full px-6 sm:px-10 py-5 sm:py-6 flex items-center justify-between border-b border-white/[0.04] text-[9px] sm:text-[10px] text-slate-500 tracking-[0.25em] uppercase">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-400 font-semibold">SECUREWATCH</span>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* CENTER MASTERPIECE: CINEMATIC ORBITAL RETICLE & GLOWING BRANDING */}
      {/* ========================================================================= */}
      <main className="relative z-10 flex flex-col items-center justify-center my-auto px-4">
        
        {/* Cinematic Concentric Orbital Reticle */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center mb-8">
          
          {/* Subtle Outer Scope Tick Marks */}
          <div className="absolute inset-0 rounded-full border border-dashed border-slate-700/30" />
          
          {/* Outer Ring 1 with Golden Drone */}
          <div className="absolute inset-2 rounded-full border border-slate-700/40 shadow-[0_0_15px_rgba(255,255,255,0.02)]" />
          <div
            className="absolute inset-2 rounded-full animate-spin"
            style={{ animationDuration: "16s", animationTimingFunction: "linear" }}
          >
            <div className="absolute top-[16%] right-[14%] w-2.5 h-2.5 rounded-full bg-[#f6c344] shadow-[0_0_12px_#f6c344,0_0_24px_rgba(246,195,68,0.8)]" />
            <div className="absolute bottom-[22%] left-[12%] w-1.5 h-1.5 rounded-full bg-slate-600" />
          </div>

          {/* Mid Ring 2 with Cyan & Amber Drones */}
          <div className="absolute inset-7 rounded-full border border-slate-700/35" />
          <div
            className="absolute inset-7 rounded-full animate-spin"
            style={{ animationDuration: "10s", animationDirection: "reverse", animationTimingFunction: "linear" }}
          >
            <div className="absolute top-[12%] right-[22%] w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_10px_#38bdf8,0_0_18px_rgba(56,189,248,0.7)]" />
            <div className="absolute bottom-[10%] left-[20%] w-1.5 h-1.5 rounded-full bg-[#eab308]/90 shadow-[0_0_8px_#eab308]" />
          </div>

          {/* Inner Ring 3 with High-Speed Micro Node */}
          <div className="absolute inset-12 rounded-full border border-slate-700/30" />
          <div
            className="absolute inset-12 rounded-full animate-spin"
            style={{ animationDuration: "6s", animationTimingFunction: "linear" }}
          >
            <div className="absolute bottom-[12%] right-[20%] w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
            <div className="absolute top-[48%] right-[-2px] w-2 h-2 rounded-full bg-[#facc15] shadow-[0_0_10px_#facc15]" />
          </div>

          {/* Center Golden Reactor Target Core */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#eab308] bg-[#0a0c12]/95 flex items-center justify-center shadow-[0_0_25px_rgba(234,179,8,0.35),inset_0_0_12px_rgba(234,179,8,0.2)]">
            {/* Delicate 4-Point Target Star */}
            <div className="relative w-8 h-8 flex items-center justify-center text-[#eab308]">
              {/* Horizontal crosshair */}
              <div className="absolute w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#fde047] to-transparent" />
              {/* Vertical crosshair */}
              <div className="absolute h-full w-[1.5px] bg-gradient-to-b from-transparent via-[#fde047] to-transparent" />
              {/* Center radiant diamond point */}
              <div 
                className="w-1.5 h-1.5 rounded-full bg-[#ffffff] shadow-[0_0_8px_#ffffff,0_0_14px_#fde047] animate-ping" 
                style={{ animationDuration: "2.5s" }} 
              />
            </div>
          </div>
        </div>

        {/* Cinematic Title & High-Precision Tracking */}
        <div className="text-center flex flex-col items-center">
          <h1 
            className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-[0.4em] sm:tracking-[0.5em] uppercase text-center pl-1.5 sm:pl-3 font-sans drop-shadow-[0_0_25px_rgba(255,255,255,0.25)]"
          >
            SECUREWATCH
          </h1>

          {/* Cinematic Subtitle */}
          <p className="mt-3.5 text-[10px] sm:text-xs md:text-sm font-semibold text-[#cca854] tracking-[0.25em] sm:tracking-[0.32em] uppercase text-center px-4 drop-shadow-[0_0_10px_rgba(204,168,84,0.3)]">
            WEB APP & API SECURITY DASHBOARD
          </p>
        </div>

        {/* Cinematic Progress & Status Section */}
        <div className="mt-8 w-72 sm:w-80 flex flex-col items-center">
          
          {/* Numerical Precision Meter */}
          <div className="w-full flex items-center justify-between text-[11px] font-mono mb-2 text-slate-400">
            <span className="tracking-widest text-[9px] uppercase text-slate-500 font-semibold">
              SYSTEM CALIBRATION
            </span>
            <span className="text-amber-400 font-bold tracking-wider text-xs">
              {progress.toString().padStart(3, "0")}%
            </span>
          </div>

          {/* Precision Laser Progress Track */}
          <div className="relative h-[2.5px] w-full bg-slate-900/90 rounded-full overflow-hidden border border-slate-800/80">
            <div
              className="h-full bg-gradient-to-r from-[#eab308] via-[#facc15] to-[#38bdf8] transition-all duration-100 ease-out shadow-[0_0_12px_rgba(234,179,8,0.8),0_0_20px_rgba(56,189,248,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Cinematic Cycling Status Console Text */}
          <div className="mt-4 flex items-center gap-2 min-h-[22px]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <p className="text-[10px] sm:text-[11px] text-slate-300 tracking-[0.2em] uppercase font-mono transition-all duration-200 text-center">
              {STATUS_MESSAGES[statusIndex]}
            </p>
          </div>
        </div>

      </main>

      {/* ========================================================================= */}
      {/* CINEMATIC BOTTOM LETTERBOX & EQUALIZER HUD */}
      {/* ========================================================================= */}
      <footer className="relative z-10 w-full px-6 sm:px-10 py-5 sm:py-6 flex items-center justify-between border-t border-white/[0.04] text-[9px] sm:text-[10px] text-slate-500 tracking-[0.2em] uppercase">
        {/* Left: Audio/Telemetry Frequency Spectrum */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-600 mr-2 hidden sm:inline">FREQ:</span>
          {[40, 70, 30, 85, 55, 90, 45, 65].map((height, i) => (
            <div
              key={i}
              className="w-[2px] bg-cyan-500/50 rounded-full animate-pulse"
              style={{
                height: `${height * 0.16 + 4}px`,
                animationDuration: `${0.6 + i * 0.15}s`,
              }}
            />
          ))}
        </div>

        {/* Center: System Classification */}
        <div className="text-slate-600 hidden md:block text-center text-[9px]">
                     © 2026 SecureWatch Dashboard. All Rights Reserved.
        </div>

        {/* Right: Security Standard */}
        <div className="text-slate-400 font-mono flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Designed & Developed by K2V Studio</span>
        </div>
      </footer>

    </div>
  );
};

export const CinematicLoadingScreen = OsirisLoadingScreen;
