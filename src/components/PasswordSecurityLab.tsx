import React, { useMemo, useState } from 'react';
import { COMMON_PASSWORDS, demoHash, HashSimulator } from './hashSim';

type VaultEntry = { username: string; salt: string; hash: string };
type AttackResult = { tried: number; found: string | null };

function crackTimeGuesses(guessesPerSec: number, keySpace: number): string {
  const seconds = keySpace / 2 / Math.max(guessesPerSec, 1);
  if (seconds < 1) return 'instant';
  if (seconds < 60) return `${seconds.toFixed(0)} seconds`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(0)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(0)} hours`;
  if (seconds < 31557600) return `${(seconds / 86400).toFixed(1)} days`;
  const years = seconds / 31557600;
  return years > 1e6 ? `${(years / 1e6).toExponential(1)} million years` : `${years.toFixed(1)} years`;
}

export const PasswordSecurityLab: React.FC = () => {
  const [tab, setTab] = useState<'strength' | 'vault'>('strength');
  const [password, setPassword] = useState('');
  const [gpuRate, setGpuRate] = useState(10_000_000_000);
  const [vault, setVault] = useState<VaultEntry[]>([]);
  const [username, setUsername] = useState('');
  const [vaultPassword, setVaultPassword] = useState('');
  const [attackUser, setAttackUser] = useState('');
  const [wordlist, setWordlist] = useState('password\n123456\nletmein');
  const [result, setResult] = useState<AttackResult | null>(null);

  const strength = useMemo(() => {
    let pool = 0;
    if (/[a-z]/.test(password)) pool += 26;
    if (/[A-Z]/.test(password)) pool += 26;
    if (/[0-9]/.test(password)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(password)) pool += 33;
    const entropy = password.length && pool ? Math.log2(pool) * password.length : 0;
    const keySpace = Math.pow(2, entropy);
    return { pool, entropy, time: crackTimeGuesses(gpuRate, keySpace), common: COMMON_PASSWORDS.has(password.toLowerCase()) };
  }, [password, gpuRate]);

  const addEntry = () => {
    if (!username.trim() || !vaultPassword) return;
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const salt = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    setVault((current) => [...current, { username: username.trim(), salt, hash: demoHash(`${salt}${vaultPassword}`) }]);
    setUsername('');
    setVaultPassword('');
  };

  const runSimulation = () => {
    const target = vault.find((entry) => entry.username === attackUser.trim());
    if (!target) { setResult({ tried: 0, found: null }); return; }
    let tried = 0;
    let found: string | null = null;
    for (const candidate of wordlist.split('\n').map((word) => word.trim()).filter(Boolean)) {
      tried += 1;
      if (demoHash(`${target.salt}${candidate}`) === target.hash) { found = candidate; break; }
    }
    setResult({ tried, found });
  };

  return (
    <section className="mt-6 rounded-2xl border border-cyan-500/20 bg-[#071827]/80 p-5 space-y-5">
      <div className="flex flex-col gap-3 border-b border-cyan-500/15 pb-4 md:flex-row md:items-center md:justify-between">
        <div><h3 className="text-lg font-bold text-white"><i className="fa-solid fa-flask mr-2 text-cyan-300" />Educational Password Security Lab</h3><p className="mt-1 text-xs text-slate-400">Offline browser demo for passwords you own. No network requests and no real credential storage.</p></div>
        <div className="flex gap-2"><button onClick={() => setTab('strength')} className={`rounded-lg px-3 py-2 text-xs font-bold cursor-pointer ${tab === 'strength' ? 'bg-cyan-500 text-slate-950' : 'border border-slate-700 text-slate-300'}`}>Strength Lab</button><button onClick={() => setTab('vault')} className={`rounded-lg px-3 py-2 text-xs font-bold cursor-pointer ${tab === 'vault' ? 'bg-cyan-500 text-slate-950' : 'border border-slate-700 text-slate-300'}`}>Hash Demo</button></div>
      </div>

      {tab === 'strength' ? <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-4"><label className="block text-xs font-semibold text-slate-300">Test password<input type="text" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Type a password you own" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-sm text-white outline-none focus:border-cyan-400" /></label><label className="block text-xs text-slate-400">Attacker speed (guesses/sec)<input type="number" min="1" value={gpuRate} onChange={(event) => setGpuRate(Number(event.target.value) || 1)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white outline-none focus:border-cyan-400" /></label>{strength.common && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200"><i className="fa-solid fa-triangle-exclamation mr-2" />Common-password list match: average offline cracking time is under one second.</div>}</div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><h4 className="text-sm font-bold text-white">Password estimate</h4><dl className="mt-4 space-y-3 text-xs"><div className="flex justify-between"><dt className="text-slate-400">Character pool</dt><dd className="font-mono text-cyan-300">{strength.pool}</dd></div><div className="flex justify-between"><dt className="text-slate-400">Entropy</dt><dd className="font-mono text-cyan-300">{strength.entropy.toFixed(1)} bits</dd></div><div className="flex justify-between"><dt className="text-slate-400">Average offline crack time</dt><dd className="font-mono text-amber-300">{strength.time}</dd></div></dl></div>
      </div> : <div className="space-y-5"><div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Your demo username" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none" /><input value={vaultPassword} onChange={(event) => setVaultPassword(event.target.value)} placeholder="Your demo password" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none" /><button onClick={addEntry} className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer">Add demo entry</button></div><div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-xs"><h4 className="font-bold text-white">Practice vault ({vault.length})</h4>{vault.length === 0 ? <p className="mt-2 text-slate-500">No demo entries yet.</p> : <ul className="mt-2 space-y-2">{vault.map((entry) => <li key={`${entry.username}-${entry.salt}`} className="font-mono text-slate-300">{entry.username} <span className="text-slate-500">salt:</span> {entry.salt} <span className="text-slate-500">hash:</span> {entry.hash}</li>)}</ul>}</div><div className="grid gap-3 lg:grid-cols-[1fr_1.5fr_auto]"><input value={attackUser} onChange={(event) => setAttackUser(event.target.value)} placeholder="Target demo username" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white outline-none" /><textarea value={wordlist} onChange={(event) => setWordlist(event.target.value)} rows={4} placeholder="One candidate per line" className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white outline-none" /><button onClick={runSimulation} className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer">Run simulation</button></div>{result && <div className={`rounded-lg border p-3 text-xs ${result.found ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'}`}>Guesses tried: {result.tried}. {result.found ? `Demo password matched: "${result.found}".` : 'No wordlist match found.'}</div>}<HashSimulator /></div>}
    </section>
  );
};
