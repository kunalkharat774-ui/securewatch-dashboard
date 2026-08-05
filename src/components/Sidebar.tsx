import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { NavView } from '../types';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  alertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, alertCount }) => {
  const [cpu, setCpu] = useState(24);
  const [memory, setMemory] = useState(48);
  const [network, setNetwork] = useState(62);

  useEffect(() => {
    const timer = setInterval(() => {
      setCpu(Math.floor(18 + Math.random() * 15));
      setMemory(Math.floor(42 + Math.random() * 10));
      setNetwork(Math.floor(55 + Math.random() * 25));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const navItems: { id: NavView; label: string; icon: string; badge?: { text: string; type: 'live' | 'new' | 'count' | 'green' } }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
    { id: 'ai-assistant', label: 'AI Security Assistant', icon: 'fa-robot', badge: { text: 'AI', type: 'new' } },
    { id: 'tv-garden', label: 'World TV Garden', icon: 'fa-tv', badge: { text: 'LIVE TV', type: 'green' } },
    { id: 'live-map', label: 'Live Attack Map', icon: 'fa-map-location-dot', badge: { text: 'LIVE', type: 'live' } },
    { id: 'api-monitoring', label: 'API Monitoring', icon: 'fa-network-wired' },
    { id: 'alerts', label: 'Security Alerts', icon: 'fa-bell', badge: { text: `${alertCount}`, type: 'count' } },
    { id: 'vulnerability-scanner', label: 'Vulnerability Scanner', icon: 'fa-bug' },
    { id: 'risk-assessment', label: 'Risk Assessment', icon: 'fa-clipboard-check' },
    { id: 'email-breach', label: 'Email Breach Checker', icon: 'fa-envelope', badge: { text: 'NEW', type: 'new' } },
    { id: 'password-strength', label: 'Password Strength', icon: 'fa-key', badge: { text: 'NEW', type: 'new' } },
    { id: 'text-encrypt', label: 'Text Encryption', icon: 'fa-lock', badge: { text: 'CRYPTO', type: 'new' } },
    { id: 'steganography', label: 'Steganography', icon: 'fa-file-image', badge: { text: 'LSB', type: 'new' } },
    { id: 'ip-location', label: 'IP Location Lookup', icon: 'fa-location-dot', badge: { text: 'MAP', type: 'green' } },
    { id: 'domain-info', label: 'Domain Information', icon: 'fa-globe', badge: { text: 'NEW', type: 'green' } },
    { id: 'url-reputation', label: 'URL Reputation', icon: 'fa-link', badge: { text: 'NEW', type: 'green' } },
    { id: 'file-security', label: 'File Security', icon: 'fa-file-shield', badge: { text: 'NEW', type: 'green' } },
    { id: 'logs', label: 'Security Logs', icon: 'fa-file-lines' },
    { id: 'reports', label: 'Reports', icon: 'fa-chart-pie' },
    { id: 'users', label: 'User Management', icon: 'fa-users' },
    { id: 'database-store', label: 'Database Store', icon: 'fa-database', badge: { text: 'PERSISTENT', type: 'green' } },
    { id: 'settings', label: 'Settings', icon: 'fa-gear' },
  ];

  return (
    <aside className="w-64 bg-[#031326]/85 backdrop-blur-2xl border-r border-blue-500/25 flex flex-col p-4 shrink-0 overflow-y-auto relative z-20 shadow-[0_0_40px_rgba(2,11,24,0.8)]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-blue-500/25">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 glass-glow-sm">
          <i className="fa-solid fa-shield-halved text-lg text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
        </div>
        <div>
          <div className="font-extrabold text-white text-base leading-tight tracking-wide bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
            SecureWatch
          </div>
          <span className="text-[10px] text-blue-300/90 block font-mono tracking-wider font-semibold">WEB APP &amp; API SECURITY</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center px-3 py-2.5 text-xs rounded-xl transition-all cursor-pointer text-left relative ${
                isActive
                  ? 'text-white font-bold bg-blue-600/25 border border-blue-400/50 shadow-[0_0_24px_rgba(37,99,235,0.45)] backdrop-blur-md'
                  : 'text-gray-300 hover:bg-[#062442]/60 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400 rounded-r shadow-[0_0_12px_#3b82f6]"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}

              <i className={`fa-solid ${item.icon} w-5 text-center mr-2.5 text-sm ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>

              {item.badge && (
                <span
                  className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    item.badge.type === 'live'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : item.badge.type === 'new'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : item.badge.type === 'count'
                      ? 'bg-red-500/20 text-red-400 rounded-full px-2'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {item.badge.text}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* System Status Panel */}
      <div className="mt-6 p-3.5 bg-[#041a33]/70 backdrop-blur-xl rounded-xl border border-blue-500/25 shadow-lg">
        <div className="flex justify-between items-center text-xs font-semibold mb-3 text-white">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_10px_#3b82f6]" />
            System Status
          </span>
          <span className="text-blue-300 text-[11px] font-medium font-mono">Protected</span>
        </div>

        <div className="space-y-2.5 text-[11px]">
          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>CPU Usage</span>
              <span className="text-white font-mono">{cpu}%</span>
            </div>
            <div className="h-1 bg-[#02101c] rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400 rounded-full transition-all duration-500 shadow-[0_0_6px_#22d3ee]" style={{ width: `${cpu}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>Memory Usage</span>
              <span className="text-white font-mono">{memory}%</span>
            </div>
            <div className="h-1 bg-[#02101c] rounded-full overflow-hidden">
              <div className="h-full bg-teal-400 rounded-full transition-all duration-500 shadow-[0_0_6px_#2dd4bf]" style={{ width: `${memory}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>Disk Usage</span>
              <span className="text-white font-mono">31%</span>
            </div>
            <div className="h-1 bg-[#02101c] rounded-full overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full" style={{ width: '31%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-gray-300 mb-1">
              <span>Network Traffic</span>
              <span className="text-white font-mono">{network}%</span>
            </div>
            <div className="h-1 bg-[#02101c] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${network}%` }} />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

