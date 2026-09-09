import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SecurityUser } from './SecurityUsersView';

export const Header: React.FC = () => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  // Dynamic User Profile State
  const [activeUser, setActiveUser] = useState<{ id?: string; name: string; role: string; email?: string } | null>(null);
  const [userList, setUserList] = useState<SecurityUser[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const notifications = [
    { id: 1, title: 'SSH Brute Force Blocked', desc: 'IP 185.220.101.5 was blacklisted automatically.', time: '2 mins ago', type: 'critical' },
    { id: 2, title: 'SSL Certificate Renewal', desc: 'API gateway TLS cert updated successfully.', time: '1 hour ago', type: 'success' },
    { id: 3, title: 'Rate Limit Threshold', desc: 'Traffic spike detected on /api/v1/auth', time: '3 hours ago', type: 'warning' },
  ];

  const fetchUsersAndSyncHeader = async () => {
    let users: SecurityUser[] = [];
    
    // First read from local persistent store
    const storedStr = localStorage.getItem('custom_created_security_users');
    if (storedStr) {
      try {
        const parsed = JSON.parse(storedStr);
        if (Array.isArray(parsed)) users = parsed;
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const serverUsers: SecurityUser[] = await res.json();
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          const map = new Map<string, SecurityUser>();
          serverUsers.forEach((u) => map.set(u.id, u));
          users.forEach((u) => map.set(u.id, u));
          users = Array.from(map.values());
        }
      }
    } catch (err) {
      // Offline fallback
    }

    setUserList(users);

    const savedUserStr = localStorage.getItem('activeSecurityUser');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && savedUser.name) {
          setActiveUser(savedUser);
          return;
        }
      } catch (e) {}
    }

    // Default active user if custom created exists
    if (users.length > 0) {
      setActiveUser(users[0]);
      localStorage.setItem('activeSecurityUser', JSON.stringify(users[0]));
    } else {
      const defaultAdmin = {
        id: 'usr-admin',
        name: 'Kunal Kharat',
        role: 'Security Administrator',
        email: 'kunal.kharat@securewatch.io',
      };
      setActiveUser(defaultAdmin);
    }
  };

  useEffect(() => {
    fetchUsersAndSyncHeader();

    const handleUsersChanged = () => {
      fetchUsersAndSyncHeader();
    };

    window.addEventListener('security_users_changed', handleUsersChanged);
    const intervalId = setInterval(fetchUsersAndSyncHeader, 4000); // Polling sync

    return () => {
      window.removeEventListener('security_users_changed', handleUsersChanged);
      clearInterval(intervalId);
    };
  }, []);

  const handleSelectUser = (user: SecurityUser) => {
    setActiveUser(user);
    localStorage.setItem('activeSecurityUser', JSON.stringify(user));
    setShowUserDropdown(false);
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setDate(
        now.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          weekday: 'long',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-orange-500/25 pb-4 relative z-30 p-4 rounded-2xl bg-[#07131d]/85 backdrop-blur-2xl border border-orange-500/25 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.9)]">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <motion.span 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="animated-gradient-text font-extrabold tracking-wide drop-shadow-[0_0_16px_rgba(245,158,11,0.6)]"
            >
              Web Application &amp; API Security Dashboard
            </motion.span>
          </h1>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-gradient-to-r from-orange-500/15 to-sky-500/15 text-orange-200 border border-orange-400/30 font-mono glass-glow-sm tracking-wider">
            v2.6 Version
          </span>
        </div>
        <p className="text-xs text-sky-100/80 mt-0.5">Real-time Cyber Threat Monitoring &amp; Deep Security Intelligence</p>
      </div>

      <div className="flex items-center gap-4 self-end sm:self-auto">
        {/* Live Clock Indicator */}
        <div className="flex items-center gap-3 bg-[#0b1a26]/80 border border-orange-500/30 px-3.5 py-2 rounded-xl backdrop-blur-md shadow-[0_0_15px_rgba(56,189,248,0.2)]">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-[10px] text-emerald-400 font-mono font-bold tracking-wider uppercase">
              <i className="fa-regular fa-clock text-emerald-400"></i>
              LIVE
            </div>
            <strong className="text-base text-orange-200 block leading-tight font-mono drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
              {time || '14:35:42'}
            </strong>
            <span className="text-[10px] text-sky-100/70 font-mono block">
              {date || '26 Jul 2026, Sunday'}
            </span>
          </div>
        </div>

        {/* Notifications Button */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (unreadCount > 0) setUnreadCount(0);
            }}
            className="w-9 h-9 bg-[#0d0a03]/80 hover:bg-amber-500/25 border border-amber-500/40 hover:border-amber-400/60 rounded-xl flex items-center justify-center text-gray-300 relative cursor-pointer transition backdrop-blur-md shadow-lg"
          >
            <i className="fa-solid fa-bell text-sm text-amber-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-black rounded-full text-[9px] font-extrabold flex items-center justify-center animate-bounce shadow-[0_0_10px_#f59e0b]">
                {unreadCount}
              </span>
            )}
          </motion.button>

          {/* Notifications Dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 bg-neutral-900/95 backdrop-blur-2xl border border-amber-500/30 rounded-xl shadow-2xl p-3 z-50 space-y-2"
              >
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                    <i className="fa-solid fa-radar text-xs" /> System Threat Alerts
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                    Live Feed
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-2.5 bg-neutral-800/80 rounded-lg border border-amber-500/20 text-xs space-y-1 backdrop-blur-md">
                      <div className="flex justify-between items-center">
                        <strong className="text-white font-semibold">{n.title}</strong>
                        <span className="text-[10px] text-gray-400">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-snug">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Security User Profile Dropdown */}
        <div className="relative">
          <div
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 bg-neutral-900/80 border border-amber-500/30 hover:border-amber-400/60 px-3 py-1.5 rounded-lg cursor-pointer transition select-none shadow-lg backdrop-blur-md"
          >
            <div className="w-8 h-8 bg-amber-500/20 border border-amber-400/50 rounded-full flex items-center justify-center text-amber-300 font-extrabold text-xs uppercase shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
              {activeUser && activeUser.name ? activeUser.name.charAt(0).toUpperCase() : 'K'}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-white truncate max-w-[130px]">
                {activeUser ? activeUser.name : 'Loading...'}
              </div>
              <div className="text-[10px] text-amber-400 font-semibold truncate max-w-[130px] font-mono">
                {activeUser ? activeUser.role : 'SOC Analyst'}
              </div>
            </div>
            <i className="fa-solid fa-chevron-down text-[10px] text-gray-400 ml-1" />
          </div>

          {/* User Selector Dropdown */}
          <AnimatePresence>
            {showUserDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-64 bg-neutral-900/95 border border-amber-500/30 rounded-xl shadow-2xl p-2 z-50 space-y-1 backdrop-blur-2xl"
              >
                <div className="p-2 border-b border-white/10 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">Active Security User</span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 font-mono">
                    RBAC Synced
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1 pt-1">
                  {userList.map((usr) => (
                    <div
                      key={usr.id}
                      onClick={() => handleSelectUser(usr)}
                      className={`p-2 rounded-lg text-xs cursor-pointer transition flex items-center justify-between ${
                        activeUser?.id === usr.id || activeUser?.email === usr.email
                          ? 'bg-amber-500/20 border border-amber-400/40 text-white font-bold'
                          : 'hover:bg-neutral-800/80 text-gray-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-white truncate">{usr.name}</div>
                        <div className="text-[10px] text-amber-300/80 truncate font-mono">{usr.role}</div>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          usr.status === 'Active' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-gray-500'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

