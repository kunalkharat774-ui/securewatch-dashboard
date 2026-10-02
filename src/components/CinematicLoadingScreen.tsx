import React, { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

interface CinematicLoadingScreenProps {
	onComplete: () => void;
}

export const CinematicLoadingScreen: React.FC<CinematicLoadingScreenProps> = ({ onComplete }) => {
	const [progress, setProgress] = useState(0);
	const [isFadingOut, setIsFadingOut] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const onCompleteRef = useRef(onComplete);
	onCompleteRef.current = onComplete;

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext('2d');
		if (!canvas || !context) return;

		let animationFrame = 0;
		let width = canvas.width = window.innerWidth;
		let height = canvas.height = window.innerHeight;
		const particles = Array.from({ length: 65 }, () => ({
			x: Math.random() * width,
			y: Math.random() * height,
			vx: (Math.random() - 0.5) * 0.45,
			vy: -Math.random() * 0.7 - 0.2,
			size: Math.random() * 2.2 + 0.8,
			color: Math.random() > 0.4 ? '#00f0ff' : Math.random() > 0.5 ? '#ff007f' : '#a855f7',
			alpha: Math.random() * 0.8 + 0.2,
		}));
		const nodes = Array.from({ length: 30 }, () => ({
			x: Math.random() * width,
			y: Math.random() * height,
			vx: (Math.random() - 0.5) * 0.3,
			vy: (Math.random() - 0.5) * 0.3,
		}));
		let radarAngle = 0;
		let wavePhase = 0;

		const resize = () => {
			width = canvas.width = window.innerWidth;
			height = canvas.height = window.innerHeight;
		};

		const render = () => {
			context.fillStyle = 'rgba(2, 4, 10, 0.25)';
			context.fillRect(0, 0, width, height);
			const cx = width / 2;
			const cy = height / 2 - 20;

			wavePhase += 0.02;
			context.lineWidth = 1.2;
			for (let wave = 0; wave < 3; wave++) {
				context.beginPath();
				context.strokeStyle = ['rgba(0, 240, 255, 0.08)', 'rgba(255, 0, 127, 0.06)', 'rgba(168, 85, 247, 0.06)'][wave];
				for (let x = 0; x < width; x += 8) {
					const y = cy + Math.sin(x * 0.004 + wavePhase + wave * 1.5) * 45 * Math.sin(wavePhase * 0.5) + (wave - 1) * 35;
					if (x === 0) context.moveTo(x, y);
					else context.lineTo(x, y);
				}
				context.stroke();
			}

			context.strokeStyle = 'rgba(0, 240, 255, 0.06)';
			context.lineWidth = 1;
			for (let i = 0; i < nodes.length; i++) {
				for (let j = i + 1; j < nodes.length; j++) {
					const dx = nodes[i].x - nodes[j].x;
					const dy = nodes[i].y - nodes[j].y;
					if (Math.hypot(dx, dy) < 130) {
						const midX = (nodes[i].x + nodes[j].x) / 2;
						context.beginPath();
						context.moveTo(nodes[i].x, nodes[i].y);
						context.lineTo(midX, nodes[i].y);
						context.lineTo(midX, nodes[j].y);
						context.lineTo(nodes[j].x, nodes[j].y);
						context.stroke();
					}
				}
			}
			nodes.forEach((node) => {
				node.x += node.vx;
				node.y += node.vy;
				if (node.x < 0 || node.x > width) node.vx *= -1;
				if (node.y < 0 || node.y > height) node.vy *= -1;
			});

			particles.forEach((particle) => {
				particle.x += particle.vx;
				particle.y += particle.vy;
				if (particle.y < 0) {
					particle.y = height + 10;
					particle.x = Math.random() * width;
				}
				if (particle.x < 0) particle.x = width;
				if (particle.x > width) particle.x = 0;
				context.save();
				context.globalAlpha = particle.alpha;
				context.fillStyle = particle.color;
				context.shadowBlur = 10;
				context.shadowColor = particle.color;
				context.beginPath();
				context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
				context.fill();
				context.restore();
			});

			radarAngle += 0.007;
			const maxRadius = Math.min(width, height) * 0.42;
			context.save();
			context.strokeStyle = 'rgba(0, 240, 255, 0.1)';
			context.lineWidth = 1.5;
			context.beginPath();
			context.arc(cx, cy, maxRadius, 0, Math.PI * 2);
			context.stroke();
			context.translate(cx, cy);
			context.rotate(radarAngle);
			context.setLineDash([6, 16]);
			context.strokeStyle = 'rgba(0, 240, 255, 0.18)';
			context.beginPath();
			context.arc(0, 0, maxRadius * 0.88, 0, Math.PI * 2);
			context.stroke();
			context.rotate(-radarAngle * 2.2);
			context.setLineDash([10, 26]);
			context.strokeStyle = 'rgba(255, 0, 127, 0.14)';
			context.beginPath();
			context.arc(0, 0, maxRadius * 0.72, 0, Math.PI * 2);
			context.stroke();
			const sweepGradient = context.createRadialGradient(0, 0, 10, 0, 0, maxRadius);
			sweepGradient.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
			sweepGradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.06)');
			sweepGradient.addColorStop(1, 'transparent');
			context.fillStyle = sweepGradient;
			context.beginPath();
			context.moveTo(0, 0);
			context.arc(0, 0, maxRadius * 0.85, 0, Math.PI / 4);
			context.closePath();
			context.fill();
			context.restore();
			animationFrame = window.requestAnimationFrame(render);
		};

		window.addEventListener('resize', resize);
		render();
		return () => {
			window.removeEventListener('resize', resize);
			window.cancelAnimationFrame(animationFrame);
		};
	}, []);

	useEffect(() => {
		let fadeTimer = 0;
		let completeTimer = 0;
		const interval = window.setInterval(() => {
			setProgress((current) => {
				const next = Math.min(100, current + 1);
				if (next === 100) {
					window.clearInterval(interval);
					fadeTimer = window.setTimeout(() => {
						setIsFadingOut(true);
						completeTimer = window.setTimeout(() => onCompleteRef.current(), 650);
					}, 450);
				}
				return next;
			});
		}, 30);
		return () => {
			window.clearInterval(interval);
			window.clearTimeout(fadeTimer);
			window.clearTimeout(completeTimer);
		};
	}, []);

	return (
		<div
			id="cinematic-securewatch-loading-screen"
			className={`fixed inset-0 z-[9999] flex select-none flex-col justify-between overflow-hidden bg-[#02040a] font-mono text-slate-100 transition-all duration-700 ${isFadingOut ? 'pointer-events-none scale-105 opacity-0 blur-md' : 'scale-100 opacity-100'}`}
		>
			<canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[1] h-full w-full" />
			<div
				className="pointer-events-none absolute bottom-0 left-0 right-0 z-[2] h-80 opacity-25"
				style={{
					backgroundImage: 'linear-gradient(to right, rgba(0, 240, 255, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 240, 255, 0.15) 1px, transparent 1px)',
					backgroundSize: '44px 44px',
					transform: 'perspective(500px) rotateX(65deg) translateY(60px)',
					maskImage: 'linear-gradient(to top, rgba(0,0,0,1), transparent)',
					WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1), transparent)',
				}}
			/>
			<div className="pointer-events-none absolute inset-0 z-[2] opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(#00f0ff 1px, transparent 1px), radial-gradient(#ff007f 1px, transparent 1px)', backgroundSize: '32px 32px', backgroundPosition: '0 0, 16px 16px' }} />
			<div className="pointer-events-none absolute left-1/2 top-1/4 z-[2] h-[450px] w-[700px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-gradient-to-r from-cyan-500/15 via-purple-600/10 to-pink-500/15 blur-[150px]" />
			<div className="pointer-events-none absolute bottom-1/4 left-1/3 z-[2] h-[350px] w-[500px] rounded-full bg-blue-600/10 blur-[130px]" />
			<div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-px w-[95vw] max-w-7xl -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
			<div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] h-1 w-48 -translate-x-1/2 -translate-y-1/2 animate-pulse bg-cyan-400/70 blur-sm" />
			<div className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(2,4,10,0.5)_65%,#02040a_100%)]" />

			<div className="relative z-10 h-8 w-full" />
			<main className="relative z-10 my-auto flex flex-col items-center justify-center px-4 py-2">
				<div className="group relative mb-6 flex flex-col items-center justify-center">
					<div className="pointer-events-none absolute -inset-6 -z-10 animate-pulse rounded-full bg-gradient-to-r from-cyan-500/20 via-purple-500/10 to-pink-500/20 blur-2xl" />
					<div className="z-0 mb-[-8px] flex w-64 justify-between px-6 sm:w-80">
						{[0, 1].map((antenna) => (
							<div className="flex flex-col items-center" key={antenna}>
								<div className={`h-2.5 w-2.5 animate-ping rounded-full ${antenna === 0 ? 'bg-pink-500 shadow-[0_0_12px_#ff007f]' : 'bg-cyan-400 shadow-[0_0_12px_#00f0ff]'}`} />
								<div className={`h-7 w-1.5 border border-cyan-400 bg-gradient-to-b ${antenna === 0 ? 'from-cyan-400 via-pink-500' : 'from-cyan-400 via-purple-500'} to-slate-700`} />
							</div>
						))}
					</div>

					<div className="relative z-10 flex w-72 flex-col items-center rounded-3xl border-2 border-cyan-400/70 bg-gradient-to-b from-[#141e33] via-[#090f1d] to-[#03060e] p-4 shadow-[0_0_60px_rgba(0,240,255,0.35),inset_0_0_30px_rgba(0,0,0,0.9)] sm:w-96 sm:p-5">
						{[false, true].map((rightSide) => (
							<div key={String(rightSide)} className={`absolute ${rightSide ? '-right-4 rounded-r-md border-r-2' : '-left-4 rounded-l-md border-l-2'} top-1/2 flex h-16 w-4 -translate-y-1/2 flex-col items-center justify-around border-y-2 border-cyan-400 bg-gradient-to-r from-slate-900 via-[#162035] to-cyan-950 py-1 shadow-[0_0_20px_rgba(0,240,255,0.5)]`}>
								<span className="h-2 w-1.5 rounded-sm bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
								<span className="h-2 w-1.5 rounded-sm bg-pink-500 shadow-[0_0_6px_#ff007f]" />
								<span className="h-2 w-1.5 rounded-sm bg-yellow-400 shadow-[0_0_6px_#ffe600]" />
							</div>
						))}

						<div className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-cyan-400 bg-[#010206] px-3 py-4 shadow-[inset_0_0_40px_rgba(0,240,255,0.55),0_0_30px_rgba(0,240,255,0.45)] sm:px-6">
							<div className="pointer-events-none absolute -left-14 -top-14 h-64 w-36 rotate-45 bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" />
							<div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 240, 255, 0.25) 4px, rgba(0, 240, 255, 0.25) 5px)' }} />
							<div className="relative z-10 flex h-20 w-44 items-center justify-center gap-5 text-cyan-300 drop-shadow-[0_0_25px_#00f0ff] sm:h-24 sm:w-56">
								{[0, 1].map((eye) => (
									<div key={eye} className="robot-eye-blink relative h-11 w-11 overflow-hidden rounded-[50%] border-2 border-cyan-300 bg-cyan-950/70 shadow-[0_0_20px_rgba(0,240,255,0.8)] sm:h-14 sm:w-14">
										<div className="robot-eye-pupil absolute left-1/2 top-1/2 h-5 w-5 rounded-full bg-cyan-100 shadow-[0_0_15px_#00f0ff] sm:h-6 sm:w-6">
											<div className="absolute left-[65%] top-[18%] h-2 w-2 rounded-full bg-white" />
										</div>
										<div className="robot-eye-lid pointer-events-none absolute inset-x-0 top-0 h-full rounded-[50%] border-b border-cyan-200/80 bg-gradient-to-b from-cyan-400 to-cyan-800" />
									</div>
								))}
							</div>
						</div>

						<div className="mt-3 flex w-full items-center justify-between px-6">
							{[0, 1].map((cheek) => <div key={cheek} className="flex items-center gap-1.5"><span className="h-2 w-3.5 animate-pulse rounded-full bg-pink-500 shadow-[0_0_10px_#ff007f]" /><span className="h-1.5 w-2 rounded-full bg-pink-400/80" /></div>)}
						</div>
						<div className="relative mt-2.5 flex w-full flex-col items-center justify-center rounded-2xl border border-cyan-400/50 bg-black/85 px-4 py-2 shadow-[inset_0_0_20px_rgba(0,240,255,0.3)]">
							<svg className="h-8 w-36 drop-shadow-[0_0_12px_#00f0ff] sm:w-44" viewBox="0 0 160 36" fill="none" aria-hidden="true">
								<path d="M16 8 Q 80 40 144 8" stroke="#00f0ff" strokeWidth="4.5" strokeLinecap="round" strokeOpacity="0.45" />
								<path d="M18 8 Q 80 38 142 8" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" />
								<path d="M48 20 Q 80 36 112 20" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
								<circle cx="16" cy="8" r="3.5" fill="#ff007f" className="animate-pulse" />
								<circle cx="144" cy="8" r="3.5" fill="#ff007f" className="animate-pulse" />
							</svg>
						</div>
					</div>
					<div className="z-0 -mt-1 flex h-5 w-36 items-center justify-around rounded-b-lg border-x-2 border-b-2 border-cyan-500/50 bg-gradient-to-b from-slate-900 to-black px-3 shadow-lg sm:w-44">
						<div className="h-3 w-2.5 rounded-sm bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
						<div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-slate-600" /><span className="h-1.5 w-1.5 rounded-full bg-cyan-400/60" /><span className="h-1.5 w-1.5 rounded-full bg-slate-600" /></div>
						<div className="h-3 w-2.5 rounded-sm bg-pink-500 shadow-[0_0_8px_#ff007f]" />
					</div>
					<div className="-mt-1 flex h-9 w-64 items-center justify-center rounded-t-2xl border-2 border-cyan-500/50 bg-gradient-to-b from-[#111827] to-[#060a14] px-6 shadow-[0_0_35px_rgba(0,240,255,0.25)] sm:w-80">
						<div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-cyan-400 bg-cyan-950 shadow-[0_0_18px_#00f0ff] animate-pulse"><div className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#00f0ff]" /></div>
					</div>
				</div>

				<div className="flex flex-col items-center text-center">
					<h1 className="select-none text-3xl font-black uppercase text-white sm:text-5xl md:text-6xl" style={{ textShadow: '3px 3px 0px #ff007f, -3px -3px 0px #00f0ff, 0 0 30px rgba(0, 240, 255, 0.9), 0 0 60px rgba(168, 85, 247, 0.5)' }}>SECUREWATCH</h1>
					<p className="mt-2.5 text-[10px] font-bold uppercase text-cyan-300 drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] sm:text-xs md:text-sm">WEB APPLICATION AND API SECURITY DASHBOARD</p>
				</div>
				<div className="mt-6 flex w-72 flex-col items-center sm:w-88">
					<div className="relative h-2.5 w-full overflow-hidden rounded-full border border-cyan-400/50 bg-[#070b16] p-[1.5px] shadow-[0_0_20px_rgba(0,240,255,0.35)]">
						<div className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#00f0ff] via-[#a855f7] to-[#ff007f] shadow-[0_0_15px_#ff007f] transition-all duration-100" style={{ width: `${progress}%` }}>
							<div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent)]" />
						</div>
					</div>
				</div>
			</main>

			<footer className="relative z-10 flex w-full items-center justify-between border-t border-cyan-500/20 bg-[#040712]/90 px-6 py-4 text-[9px] uppercase text-slate-400 backdrop-blur-md sm:px-10 sm:text-[10px]">
				<div className="flex items-center gap-2.5">
					<div className="flex h-5 w-5 items-center justify-center rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)]"><Activity className="h-3 w-3 animate-pulse" /></div>
					<span className="font-bold text-cyan-400">FREQ:</span>
					<div className="flex items-center gap-1">{[40, 75, 25, 90, 55, 80, 45, 65, 85].map((barHeight, index) => <div key={index} className="w-[2px] animate-pulse rounded-full" style={{ height: `${barHeight * 0.16 + 4}px`, backgroundColor: index % 2 === 0 ? '#00f0ff' : '#ff007f', boxShadow: `0 0 6px ${index % 2 === 0 ? '#00f0ff' : '#ff007f'}`, animationDuration: `${0.6 + index * 0.12}s` }} />)}</div>
					<span className="ml-1 font-bold text-emerald-400">142.85 MHz</span>
				</div>
				<div className="flex items-center gap-2 text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]" /><span className="font-bold text-white">DEVELOPED BY K2V STUDIO</span></div>
			</footer>
		</div>
	);
};
