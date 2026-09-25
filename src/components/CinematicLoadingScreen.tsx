import React, { useEffect, useRef, useState } from "react";

interface OsirisLoadingScreenProps {
	onComplete: () => void;
}

const STATUS_MESSAGES = [
	"INITIALIZING SECUREWATCH DEFENSE ENGINE...",
	"CALIBRATING ACTIVE RADAR & OPTICAL SENSORS...",
	"ACQUIRING GLOBAL SATELLITE TELEMETRY...",
	"SYNCHRONIZING ZERO-TRUST THREAT MESH...",
	"AUTHENTICATION VERIFIED // ACCESS GRANTED",
];

export const OsirisLoadingScreen: React.FC<OsirisLoadingScreenProps> = ({ onComplete }) => {
	const [progress, setProgress] = useState(0);
	const [statusIndex, setStatusIndex] = useState(0);
	const [isFadingOut, setIsFadingOut] = useState(false);
	const [currentTime, setCurrentTime] = useState("");
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const updateClock = () => setCurrentTime(new Date().toISOString().replace("T", " // ").replace("Z", " UTC"));
		updateClock();
		const interval = window.setInterval(updateClock, 1000);
		return () => window.clearInterval(interval);
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) return;

		let animationFrame = 0;
		let width = (canvas.width = window.innerWidth);
		let height = (canvas.height = window.innerHeight);
		const particles = Array.from({ length: 45 }, () => ({
			x: Math.random() * width,
			y: Math.random() * height,
			size: Math.random() * 1.6 + 0.5,
			speedX: (Math.random() - 0.5) * 0.35,
			speedY: (Math.random() - 0.5) * 0.35 - 0.15,
			opacity: Math.random() * 0.6 + 0.2,
			color: Math.random() > 0.65 ? "#eab308" : "#38bdf8",
		}));
		const resize = () => {
			width = canvas.width = window.innerWidth;
			height = canvas.height = window.innerHeight;
		};
		const render = () => {
			context.clearRect(0, 0, width, height);
			particles.forEach((particle) => {
				particle.x += particle.speedX;
				particle.y += particle.speedY;
				if (particle.x < 0) particle.x = width;
				if (particle.x > width) particle.x = 0;
				if (particle.y < 0) particle.y = height;
				if (particle.y > height) particle.y = 0;
				context.fillStyle = particle.color;
				context.globalAlpha = particle.opacity;
				context.beginPath();
				context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
				context.fill();
			});
			context.globalAlpha = 1;
			animationFrame = window.requestAnimationFrame(render);
		};
		window.addEventListener("resize", resize);
		render();
		return () => {
			window.removeEventListener("resize", resize);
			window.cancelAnimationFrame(animationFrame);
		};
	}, []);

	useEffect(() => {
		const interval = window.setInterval(() => {
			setProgress((current) => {
				const next = Math.min(100, current + 1);
				setStatusIndex(next < 22 ? 0 : next < 50 ? 1 : next < 75 ? 2 : next < 96 ? 3 : 4);
				if (next === 100) {
					window.clearInterval(interval);
					window.setTimeout(() => {
						setIsFadingOut(true);
						window.setTimeout(onComplete, 650);
					}, 350);
				}
				return next;
			});
		}, 30);
		return () => window.clearInterval(interval);
	}, [onComplete]);

	return (
		<div id="cinematic-securewatch-loading-screen" className={`fixed inset-0 z-[9999] bg-[#050608] flex flex-col justify-between select-none overflow-hidden transition-all duration-700 font-mono ${isFadingOut ? "opacity-0 scale-105 blur-sm pointer-events-none" : "opacity-100 scale-100"}`}>
			<canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[1]" />
			<div className="absolute inset-0 opacity-[0.045] pointer-events-none z-[2]" style={{ backgroundImage: "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
			<div className="absolute inset-0 bg-radial from-transparent via-[#050608]/40 to-[#050608]/90 pointer-events-none z-[3]" />
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-[#38bdf8]/45 to-transparent z-[2] blur-[1px] animate-pulse" />
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65vw] max-w-3xl h-[2px] bg-gradient-to-r from-transparent via-[#facc15]/35 to-transparent z-[2] blur-[0.5px]" />

			<header className="relative z-10 w-full px-6 sm:px-10 py-5 sm:py-6 flex items-center justify-between border-b border-white/[0.04] text-[9px] sm:text-[10px] tracking-[0.25em] uppercase">
				<div className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /><span className="text-slate-400 font-semibold">SECUREWATCH // NODE_01</span><span className="hidden md:inline text-slate-600">|</span><span className="hidden md:inline text-slate-500">SYS_ID: 8089-SEC-X</span></div>
				<div className="flex items-center gap-4 text-slate-400"><span className="hidden sm:inline text-amber-500/80 tracking-widest">[ LEVEL 5 RESTRICTED ]</span><span className="text-slate-500">{currentTime || "SEC_LOG :: UTC"}</span></div>
			</header>

			<main className="relative z-10 flex flex-col items-center justify-center my-auto px-4">
				<div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center mb-8">
					<div className="absolute inset-0 rounded-full border border-dashed border-slate-700/30" />
					<div className="absolute inset-2 rounded-full border border-slate-700/40" />
					<div className="absolute inset-2 rounded-full border border-transparent animate-spin" style={{ animationDuration: "16s" }}><div className="absolute top-[16%] right-[14%] w-2.5 h-2.5 rounded-full bg-[#f6c344] shadow-[0_0_12px_#f6c344,0_0_24px_rgba(246,195,68,0.8)]" /></div>
					<div className="absolute inset-7 rounded-full border border-slate-700/35" />
					<div className="absolute inset-7 rounded-full border border-transparent animate-spin" style={{ animationDuration: "10s", animationDirection: "reverse" }}><div className="absolute top-[12%] right-[22%] w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_10px_#38bdf8,0_0_18px_rgba(56,189,248,0.7)]" /><div className="absolute bottom-[10%] left-[20%] w-1.5 h-1.5 rounded-full bg-[#eab308] shadow-[0_0_8px_#eab308]" /></div>
					<div className="absolute inset-12 rounded-full border border-slate-700/30" />
					<div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-emerald-400 bg-[#0a0c12]/95 flex items-center justify-center shadow-[0_0_25px_rgba(52,211,153,0.45),inset_0_0_12px_rgba(52,211,153,0.25)]"><div className="relative w-8 h-8 flex items-center justify-center"><div className="absolute w-full h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent" /><div className="absolute h-full w-[1.5px] bg-gradient-to-b from-transparent via-emerald-300 to-transparent" /><div className="w-1.5 h-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#34d399,0_0_14px_#6ee7b7] animate-ping" /></div></div>
				</div>
				<div className="text-center flex flex-col items-center"><h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-[0.4em] sm:tracking-[0.5em] uppercase text-center pl-1.5 sm:pl-3 font-sans">SECUREWATCH</h1><p className="mt-3.5 text-[10px] sm:text-xs md:text-sm font-semibold text-[#cca854] tracking-[0.25em] sm:tracking-[0.32em] uppercase text-center px-4">WEB APP & API SECURITY DASHBOARD</p></div>
				<div className="mt-8 w-72 sm:w-80 flex flex-col items-center"><div className="w-full flex items-center justify-between text-[11px] font-mono mb-2 text-slate-400"><span className="tracking-widest text-[9px] uppercase text-slate-500 font-semibold">SYSTEM CALIBRATION</span><span className="text-amber-400 font-bold tracking-wider text-xs">{progress.toString().padStart(3, "0")}%</span></div><div className="relative h-[2.5px] w-full bg-slate-900/90 rounded-full overflow-hidden border border-slate-800/80"><div className="h-full bg-gradient-to-r from-[#eab308] via-[#facc15] to-[#38bdf8] transition-all duration-100 shadow-[0_0_12px_rgba(234,179,8,0.8)]" style={{ width: `${progress}%` }} /></div><div className="mt-4 flex items-center gap-2 min-h-[22px]"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" /><p className="text-[10px] sm:text-[11px] text-slate-300 tracking-[0.2em] uppercase font-mono text-center">{STATUS_MESSAGES[statusIndex]}</p></div></div>
			</main>

			<footer className="relative z-10 w-full px-6 sm:px-10 py-5 sm:py-6 flex items-center justify-between border-t border-white/[0.04] text-[9px] sm:text-[10px] text-slate-500 tracking-[0.2em] uppercase"><div className="flex items-center gap-1.5"><span className="text-slate-600 mr-2 hidden sm:inline">FREQ:</span>{[40, 70, 30, 85, 55, 90, 45, 65].map((height, index) => <div key={index} className="w-[2px] bg-cyan-500/50 rounded-full animate-pulse" style={{ height: `${height * 0.16 + 4}px`, animationDuration: `${0.6 + index * 0.15}s` }} />)}</div><div className="text-slate-600 hidden md:block text-center text-[9px]">LAT: 37.7749° N // LONG: 122.4194° W // QUANTUM ENCLAVE ACTIVE</div><div className="text-slate-400 font-mono flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span>FIPS 140-3 COMPLIANT</span></div></footer>
		</div>
	);
};

export const CinematicLoadingScreen = OsirisLoadingScreen;
