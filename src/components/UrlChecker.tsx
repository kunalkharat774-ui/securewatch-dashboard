import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UrlScanResult } from '../types';

interface UrlCheckerProps {
	onScanComplete: (result: UrlScanResult) => void;
	recentScans?: UrlScanResult[];
}

interface EngineResult {
	name: string;
	result: string;
}

export const UrlChecker: React.FC<UrlCheckerProps> = ({ onScanComplete, recentScans = [] }) => {
	const [inputUrl, setInputUrl] = useState('');
	const [isScanning, setIsScanning] = useState(false);
	const [scanProgress, setScanProgress] = useState(0);
	const [scanStep, setScanStep] = useState('');
	const [activeTab, setActiveTab] = useState<'overview' | 'ssl' | 'engines'>('overview');
	const [scanError, setScanError] = useState('');
	const [scanResult, setScanResult] = useState<UrlScanResult | null>(null);
	const [showJsonModal, setShowJsonModal] = useState(false);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [screenshotError, setScreenshotError] = useState(false);
	const [copiedToast, setCopiedToast] = useState(false);

	const handleScan = async (targetUrl = inputUrl) => {
		const trimmedUrl = targetUrl.trim();
		if (!trimmedUrl) return;
		const normalizedUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
		try {
			new URL(normalizedUrl);
		} catch {
			setScanError('Enter a valid website URL or domain.');
			return;
		}
		setInputUrl(trimmedUrl);
		setIsScanning(true);
		setScanError('');
		setScanResult(null);
		setScreenshotError(false);
		setScanProgress(15);
		setScanStep('Initializing DNS lookup & TLS handshake...');
		const stepOne = window.setTimeout(() => { setScanProgress(45); setScanStep('Querying global threat feeds & reputation databases...'); }, 400);
		const stepTwo = window.setTimeout(() => { setScanProgress(75); setScanStep('Running deep threat heuristics & URL safety evaluation...'); }, 800);

		try {
			const response = await fetch('/api/scan-url-reputation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: normalizedUrl }),
				signal: AbortSignal.timeout(30000),
			});
			if (!response.ok) {
				const errorBody = await response.json().catch(() => ({}));
				throw new Error(errorBody.error || `URL reputation scan failed (HTTP ${response.status}).`);
			}
			const data = await response.json() as Partial<UrlScanResult>;
			if (!data.id || !data.url || !data.domain || !data.overallResult || typeof data.reputationScore !== 'number') {
				throw new Error('Scanner returned an incomplete reputation report. Please try again.');
			}
			setScanProgress(100);
			setScanResult(data as UrlScanResult);
			onScanComplete(data as UrlScanResult);
		} catch (error) {
			setScanError(error instanceof DOMException && error.name === 'TimeoutError'
				? 'URL reputation scan timed out. Check the backend connection and try again.'
				: error instanceof Error ? error.message : 'Unable to complete the URL reputation scan.');
		} finally {
			window.clearTimeout(stepOne);
			window.clearTimeout(stepTwo);
			setIsScanning(false);
			setScanProgress(0);
			setScanStep('');
		}
	};

	const status = scanResult?.overallResult === 'Safe'
		? { color: '#10b981', panel: 'bg-emerald-950/60 border-emerald-500/60', text: 'text-emerald-400', icon: 'fa-regular fa-circle-check', title: 'VERDICT: SAFE & SECURE WEBSITE', severity: 'Low' }
		: scanResult?.overallResult === 'Suspicious'
			? { color: '#f59e0b', panel: 'bg-amber-950/60 border-amber-500/60', text: 'text-amber-400', icon: 'fa-solid fa-triangle-exclamation', title: 'VERDICT: SUSPICIOUS / UNTRUSTED ENDPOINT', severity: 'Medium' }
			: { color: '#ef4444', panel: 'bg-red-950/60 border-red-500/60', text: 'text-red-400', icon: 'fa-solid fa-shield-virus', title: 'VERDICT: DANGEROUS / MALICIOUS THREAT DETECTED', severity: 'Critical' };

	const copyReport = () => {
		if (!scanResult) return;
		navigator.clipboard.writeText(JSON.stringify(scanResult, null, 2));
		setCopiedToast(true);
		window.setTimeout(() => setCopiedToast(false), 2000);
	};

	return (
		<div className="bg-[#0a0803]/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-5 shadow-xl flex flex-col h-full relative overflow-hidden">
			<div className="flex items-center justify-between mb-3 flex-wrap gap-2">
				<div className="flex items-center gap-2 font-bold text-sm text-white"><i className="fa-solid fa-globe text-amber-400" /><span>URL Reputation Checker</span><span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">LIVE ENGINE</span></div>
				<span className="text-[11px] text-amber-300/80 font-mono">{scanResult?.provider || 'Backend connected'}</span>
			</div>
			<p className="text-amber-200/70 text-xs mb-3">Analyze domain safety, phishing risks, malware payloads, SSL chains, and blacklist databases in real-time.</p>
			<div className="flex mb-4">
				<input value={inputUrl} onChange={(event) => setInputUrl(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleScan()} placeholder="Enter website domain or full URL (e.g., google.com)..." className="flex-1 px-3.5 py-2.5 bg-[#050505] border border-amber-500/30 text-white rounded-l-md outline-none text-xs focus:border-amber-400 font-mono" />
				<button onClick={() => handleScan()} disabled={isScanning || !inputUrl.trim()} className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold rounded-r-md text-xs cursor-pointer disabled:opacity-50"><i className={`fa-solid ${isScanning ? 'fa-spinner animate-spin' : 'fa-radar'}`} /> {isScanning ? ' Scanning...' : ' Check URL'}</button>
			</div>
			<button onClick={() => handleScan('https://www.phishguard.co.in/')} disabled={isScanning} className="self-start mb-4 text-[11px] text-cyan-300 hover:text-cyan-200 font-mono cursor-pointer disabled:opacity-50"></button>
			<AnimatePresence>{isScanning && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3.5 mb-4 bg-[#141008] border border-amber-500/40 rounded-lg text-xs font-mono text-amber-300"><div className="flex justify-between"><span>{scanStep}</span><b>{scanProgress}%</b></div><div className="w-full h-1.5 bg-gray-800 rounded-full mt-2"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${scanProgress}%` }} /></div></motion.div>}</AnimatePresence>
			{scanError && <div className="p-3 mb-4 bg-red-950/30 border border-red-500/40 rounded-lg text-xs text-red-300"><i className="fa-solid fa-circle-exclamation mr-2" />{scanError}</div>}
			{!scanResult && !isScanning && !scanError && <div className="border border-dashed border-cyan-500/20 rounded-lg p-6 text-center text-xs text-cyan-200/60 bg-[#020b18]/40 mb-4"><i className="fa-solid fa-magnifying-glass-chart text-3xl text-cyan-400/40 mb-2 block" /><p className="font-semibold text-white mb-1">No URL Scan Active</p><p>Enter any website URL above and click Check URL to analyze its reputation.</p></div>}
			{scanResult && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`border rounded-xl mb-4 overflow-hidden ${status.panel}`}>
				{scanResult.screenshot_url && !screenshotError ? <img src={scanResult.screenshot_url} alt={`Preview of ${scanResult.domain}`} className="w-full h-44 object-cover border-b border-white/5" onError={() => setScreenshotError(true)} /> : <div className="h-24 bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center"><span className="text-gray-500 font-mono text-xs">{scanResult.domain}</span></div>}
				<div className="p-4">
					<div className="flex items-center justify-between pb-4 border-b border-white/10 gap-2">
						<div className="flex items-center gap-3 flex-1">
							<div className="flex-shrink-0">
								<div className={`p-3 rounded-full ${status.text === 'text-emerald-400' ? 'bg-emerald-500/20' : status.text === 'text-amber-400' ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
									<i className={`${status.icon} ${status.text} text-2xl`} />
								</div>
							</div>
							<div className="flex-1">
								<h4 className={`font-black text-sm ${status.text} uppercase tracking-wider`}>{status.title}</h4>
								<p className="text-xs text-gray-300 font-mono mt-1">{scanResult.domain}</p>
									<div className="flex gap-2 mt-2 text-xs flex-wrap">
										<span className={`px-2 py-1 rounded-full font-bold ${status.text === 'text-emerald-400' ? 'bg-emerald-500/20 text-emerald-300' : status.text === 'text-amber-400' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'}`}>
											Severity: {status.severity}
										</span>
										<span className="px-2 py-1 rounded-full bg-slate-700/50 text-gray-300">IP: {scanResult.ipAddress}</span>
										{scanResult.domain.toLowerCase().includes('trycloudflare.com') && (
											<span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
												Temporary tunnel domain
											</span>
										)}
								</div>
							</div>
						</div>
						<div className="flex gap-2">
							<button onClick={() => setShowPreviewModal(true)} className="px-2.5 py-1 bg-slate-800 text-emerald-300 rounded text-[11px] cursor-pointer hover:bg-slate-700"><i className="fa-regular fa-eye" /> Preview</button>
							<button onClick={copyReport} className="px-2.5 py-1 bg-slate-800 text-gray-200 rounded text-[11px] cursor-pointer hover:bg-slate-700"><i className="fa-regular fa-copy" /> {copiedToast ? 'Copied!' : 'Copy'}</button>
							<button onClick={() => setShowJsonModal(true)} className="px-2.5 py-1 bg-slate-800 text-cyan-300 rounded text-[11px] cursor-pointer hover:bg-slate-700"><i className="fa-solid fa-code" /> JSON</button>
						</div>
					</div>
					<div className="flex gap-2 border-b border-white/10 py-3 text-xs">{(['overview', 'ssl', 'engines'] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 rounded-md cursor-pointer font-bold transition ${activeTab === tab ? status.text === 'text-emerald-400' ? 'bg-emerald-500/30 text-emerald-300' : status.text === 'text-amber-400' ? 'bg-amber-500/30 text-amber-300' : 'bg-red-500/30 text-red-300' : 'text-gray-400 hover:text-gray-300'}`}>{tab === 'overview' ? 'Overview & Risk Score' : tab === 'ssl' ? 'SSL & Server' : 'Detection Sources'}</button>)}</div>
					{activeTab === 'overview' && <div className="pt-3 space-y-3">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#020b18]/60 p-3 rounded-lg border border-white/5">
							<div className="flex flex-col items-center p-2 border-r border-white/10 sm:border-b sm:border-r-0">
								<span className="text-[10px] text-gray-400 uppercase font-bold">Reputation Score</span>
								<div className="flex items-center justify-center gap-2 mt-2">
									<strong className="text-3xl font-black font-mono" style={{ color: status.color }}>{scanResult.reputationScore}</strong>
									<span className="text-xs text-gray-500">/100</span>
								</div>
								<div className="w-full h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
									<div className="h-full transition-all duration-500" style={{ width: `${scanResult.reputationScore}%`, backgroundColor: status.color }} />
								</div>
								<span className="text-[10px] text-gray-500 mt-2 font-bold">Threat Level: <span style={{ color: status.color }}>{scanResult.threatLevel}</span></span>
							</div>
							<div className="sm:col-span-2 border-t border-white/10 sm:border-t-0 pt-2 sm:pt-0">
								<b className={`${status.text} text-sm font-black`}>Security Assessment</b>
								<p className="text-gray-300 mt-2 text-xs leading-relaxed">{scanResult.recommendation || 'No recommendation available'}</p>
								{scanResult.overallResult !== 'Safe' && <div className="mt-2 p-2 bg-red-500/20 border border-red-500/40 rounded text-red-300 text-xs font-bold">⚠️ WARNING: This URL has been flagged as potentially dangerous. Exercise caution.</div>}
							</div>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
							{[
								['Blacklist Status', scanResult.blacklistStatus || 'Not listed'],
								['Phishing Risk', scanResult.phishing === 'Clean' ? '✓ No threat detected' : scanResult.phishing === 'Suspicious' ? '⚠ Suspicious indicators' : '✗ Malicious confirmed'],
								['Malware Risk', scanResult.malware === 'Clean' ? '✓ No threat detected' : scanResult.malware === 'Suspicious' ? '⚠ Suspicious indicators' : '✗ Malicious confirmed'],
								['Category', scanResult.category || 'Uncategorized'],
								['Last Scanned', scanResult.lastScanned || 'N/A'],
								['Provider', scanResult.provider || 'Multiple sources'],
							].map(([label, value]) => (
								<div key={label} className={`p-3 rounded-lg border flex justify-between gap-2 ${
									value.includes('✓') ? 'bg-emerald-500/10 border-emerald-500/30' :
									value.includes('⚠') ? 'bg-amber-500/10 border-amber-500/30' :
									value.includes('✗') ? 'bg-red-500/10 border-red-500/30' :
									'bg-slate-800/50 border-slate-700/50'
								}`}>
									<span className="text-gray-400 font-bold">{label}:</span>
									<span className="text-white truncate text-right">{value}</span>
								</div>
							))}
						</div>
					</div>}
					{activeTab === 'ssl' && <div className="pt-3 space-y-2 text-xs">{[['SSL Certificate Authority', scanResult.sslIssuer || 'N/A'], ['SSL Status', scanResult.sslValid ? '✓ Valid & Encrypted' : '✗ Invalid / Untrusted'], ['HTTP Status', scanResult.httpStatus ?? 'Not reached'], ['Response Time', scanResult.responseTimeMs != null ? `${scanResult.responseTimeMs} ms` : 'N/A'], ['Redirect', scanResult.redirectUrl || 'None'], ['Server Location', scanResult.serverLocation || 'N/A'], ['Resolved IP', scanResult.ipAddress]].map(([label, value]) => {
										const valueStr = String(value);
										return <div key={label} className={`p-2.5 rounded-lg border flex justify-between gap-2 ${valueStr.includes('✓') ? 'bg-emerald-500/10 border-emerald-500/30' : valueStr.includes('✗') ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}><span className="text-gray-400 font-bold">{label}:</span><span className="text-white font-mono">{value}</span></div>;
									})}</div>}
					{activeTab === 'engines' && <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">{(scanResult.enginesDetected as EngineResult[] | undefined)?.map((engine, index) => <div key={index} className={`p-3 rounded-lg border-2 font-bold ${engine.result === 'Clean' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}><span className="text-gray-300 block text-xs mb-1">{engine.name}</span><span className="text-lg">{engine.result === 'Clean' ? '✓ CLEAN' : '✗ FLAGGED'}</span></div>)}</div>}
				</div>
			</motion.div>}
			<div className="mt-auto border-t border-cyan-500/20 pt-3"><div className="flex justify-between mb-2 text-xs font-bold text-white"><span>Recent URL Scans</span><span className="text-cyan-300">Total Scanned: {recentScans.length}</span></div>{recentScans.length > 0 && <div className="overflow-x-auto max-h-[180px]"><table className="w-full text-left text-xs"><tbody>{recentScans.map((scan) => <tr key={scan.id} onClick={() => { setScanResult(scan); setActiveTab('overview'); setScreenshotError(false); }} className="border-b border-[#1f2335] cursor-pointer"><td className="py-2 font-mono text-white">{scan.url}</td><td className="py-2 px-2">{scan.overallResult}</td><td className="py-2 font-mono">{scan.reputationScore}/100</td></tr>)}</tbody></table></div>}</div>
			<AnimatePresence>{showJsonModal && scanResult && <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"><div className="bg-[#0b1329] border border-cyan-500/40 rounded-xl p-5 max-w-lg w-full"><div className="flex justify-between text-cyan-300 font-bold mb-3"><span>Raw Telemetry JSON</span><button onClick={() => setShowJsonModal(false)}>X</button></div><pre className="p-3 bg-[#030814] text-[11px] text-cyan-300 max-h-80 overflow-y-auto">{JSON.stringify(scanResult, null, 2)}</pre></div></div>}</AnimatePresence>
			<AnimatePresence>{showPreviewModal && scanResult && <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3 sm:p-6"><div className="relative w-full h-full max-w-[96vw] max-h-[94vh] bg-[#070d1b] border border-amber-500/40 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(251,191,36,0.2)]">
				<div className="flex items-center justify-between border-b border-[#1f2335] px-4 py-3 bg-[#0a0f1a]">
					<div>
						<div className="text-[10px] uppercase tracking-[0.2em] text-amber-300 font-bold">Website Preview</div>
						<div className="text-xs text-gray-300 font-mono mt-1 truncate max-w-[70vw]">{scanResult.url}</div>
					</div>
					<button onClick={() => setShowPreviewModal(false)} className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold cursor-pointer">Close</button>
				</div>
				{scanResult.screenshot_url && !screenshotError ? (
					<img src={scanResult.screenshot_url} alt={`Website preview of ${scanResult.domain}`} className="w-full h-[calc(100%-60px)] object-cover" onError={() => setScreenshotError(true)} />
				) : (
					<iframe
						src={scanResult.url}
						title={`Preview of ${scanResult.domain}`}
						className="w-full h-[calc(100%-60px)] border-0 bg-white"
						loading="lazy"
						allowFullScreen
						referrerPolicy="no-referrer-when-downgrade"
						sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
					/> 
				)}
			</div></div>}</AnimatePresence>
		</div>
	);
};
