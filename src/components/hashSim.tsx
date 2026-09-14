import React, { useMemo, useState } from 'react';

export const COMMON_PASSWORDS = new Set([
  '123456', 'password', '123456789', 'qwerty', '12345678', '111111', 'abc123', 'admin', 'letmein', 'welcome',
  'password1', 'iloveyou', 'monkey', 'dragon', 'football', 'master', 'login', 'princess', 'qwerty123', 'passw0rd',
]);

function demoHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0') + Math.imul(hash ^ 0xdeadbeef, 0x85ebca6b).toString(16).padStart(8, '0');
}

export const HashSimulator: React.FC = () => {
  const [input, setInput] = useState('password');
  const [salt, setSalt] = useState('secure-salt');
  const hash = useMemo(() => demoHash(`${salt}${input}`), [salt, input]);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-[#050d18] p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-white"><i className="fa-solid fa-fingerprint mr-2 text-cyan-300" />Salted Hash Simulator</h4>
        <p className="mt-1 text-[11px] text-slate-400">Demo-only FNV-style hash for learning. This is not cryptography and never leaves your browser.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-[11px] text-slate-400">Demo password<input value={input} onChange={(event) => setInput(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white outline-none focus:border-cyan-400" /></label>
        <label className="text-[11px] text-slate-400">Salt<input value={salt} onChange={(event) => setSalt(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white outline-none focus:border-cyan-400" /></label>
      </div>
      <div className="rounded-lg border border-emerald-500/20 bg-slate-950 p-3"><span className="block text-[10px] uppercase tracking-wider text-slate-500">Demo hash</span><code className="break-all font-mono text-xs text-emerald-300">{hash}</code></div>
    </div>
  );
};

export { demoHash };
