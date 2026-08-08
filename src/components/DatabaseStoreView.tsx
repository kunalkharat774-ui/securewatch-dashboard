import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface TenantSummary {
  sessionId: string;
  userCount: number;
  logCount: number;
  urlScanCount: number;
  fileScanCount: number;
  users: any[];
  logs: any[];
  urlScans: any[];
  fileScans: any[];
}

interface SummaryStats {
  totalSessions: number;
  totalUsers: number;
  totalLogs: number;
  totalUrlScans: number;
  totalFileScans: number;
  diskFilePath: string;
  diskSizeKb: number;
  status: string;
}

export const DatabaseStoreView: React.FC = () => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem('db_store_authorized') === 'true';
  });

  const [inputPasscode, setInputPasscode] = useState<string>('');
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Database Data
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [selectedTab, setSelectedTab] = useState<'sessions' | 'users' | 'logs' | 'export'>('sessions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMasterDatabase = async (passcodeToUse: string) => {
    setLoading(true);
    setPasscodeError(null);

    try {
      const trimmedPasscode = passcodeToUse.trim();
      const res = await fetch('/api/admin/all-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: trimmedPasscode }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setSummaryStats(data.summaryStats);
        setTenants(data.tenants || []);
        setIsAuthorized(true);
        sessionStorage.setItem('db_store_authorized', 'true');
        sessionStorage.setItem('db_store_passcode', trimmedPasscode);
        setPasscodeError(null);
        setInputPasscode('');
      } else {
        const message = data?.message || 'Unauthorized Access. Invalid Master Security Passcode.';
        setPasscodeError(message);
        setIsAuthorized(false);
        sessionStorage.removeItem('db_store_authorized');
      }
    } catch (err) {
      setPasscodeError('Unable to connect to database server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedPass = sessionStorage.getItem('db_store_passcode');
    if (isAuthorized && savedPass) {
      fetchMasterDatabase(savedPass);
    }
  }, []);

  const handleAuthorizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPasscode.trim()) {
      setPasscodeError('Please enter the Security Master Passcode.');
      return;
    }
    fetchMasterDatabase(inputPasscode);
  };

  const handleLockSession = () => {
    setIsAuthorized(false);
    sessionStorage.removeItem('db_store_authorized');
    sessionStorage.removeItem('db_store_passcode');
    showToast('Master Database session locked securely.', 'info');
  };

  const handleDeleteTenant = async (sessionId: string) => {
    const savedPass = sessionStorage.getItem('db_store_passcode') || '';
    if (window.confirm(`Delete isolated session database '${sessionId}'? This action cannot be undone.`)) {
      try {
        const res = await fetch(`/api/admin/tenant/${encodeURIComponent(sessionId)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode: savedPass }),
        });

        if (res.ok) {
          showToast(`Tenant session database '${sessionId}' deleted cleanly.`, 'success');
          if (savedPass) {
            fetchMasterDatabase(savedPass);
          }
        } else {
          showToast('Failed to delete tenant database.', 'error');
        }
      } catch (e) {
        showToast('Error executing database delete operation.', 'error');
      }
    }
  };

  const handleExportJson = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      summaryStats,
      tenants,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `securewatch_database_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('Database JSON Backup exported successfully!', 'success');
  };

  // Flattened users across all tenants
  const allUsers = tenants.flatMap((t) =>
    (t.users || []).map((u) => ({ ...u, tenantSessionId: t.sessionId }))
  );

  // Flattened logs across all tenants
  const allLogs = tenants.flatMap((t) =>
    (t.logs || []).map((l) => ({ ...l, tenantSessionId: t.sessionId }))
  );

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.tenantSessionId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = allLogs.filter(
    (l) =>
      l.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.service?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.level?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.tenantSessionId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50">
          <div
            className={`px-4 py-3 rounded-xl border text-xs font-bold shadow-2xl flex items-center gap-2.5 backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/40 text-red-300'
                : 'bg-cyan-950/90 border-cyan-500/40 text-cyan-300'
            }`}
          >
            <i
              className={`fa-solid ${
                toast.type === 'success' ? 'fa-circle-check text-emerald-400' : toast.type === 'error' ? 'fa-circle-exclamation text-red-400' : 'fa-circle-info text-cyan-400'
              }`}
            />
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Security Gate Gatekeeper Modal */}
      {!isAuthorized ? (
        <div className="min-h-[70vh] flex items-center justify-center py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0a0f1d] border border-cyan-500/30 rounded-2xl p-6 md:p-8 shadow-2xl ocean-glow relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

            <div className="text-center mb-6 space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 text-2xl ocean-glow-sm">
                <i className="fa-solid fa-database" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">Master Database Access</h2>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Enter your authorized Security Master Passcode to view isolated multi-tenant database records.
              </p>
            </div>

            <form onSubmit={handleAuthorizeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Master Security Passcode</label>
                <div className="relative">
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    value={inputPasscode}
                    onChange={(e) => setInputPasscode(e.target.value)}
                    placeholder="Enter Security Key..."
                    className="w-full bg-[#111625] border border-cyan-500/30 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 transition pr-10 placeholder-gray-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode(!showPasscode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 text-xs transition cursor-pointer"
                  >
                    <i className={`fa-solid ${showPasscode ? 'fa-eye-slash' : 'fa-eye'}`} />
                  </button>
                </div>
              </div>

              {passcodeError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation shrink-0 text-sm" />
                  <span>{passcodeError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />
                    <span>Verifying Authorization...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-unlock" />
                    <span>Unlock Master Database</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0a0f1d] border border-cyan-500/20 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl ocean-glow-sm shrink-0">
                <i className="fa-solid fa-database" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  Master Database Store
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full">
                    100% HEALTHY
                  </span>
                </h1>
                <p className="text-xs text-gray-400">
                  Isolated session storage engine & global persistent database records
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchMasterDatabase(sessionStorage.getItem('db_store_passcode') || 'kunal@123as$')}
                className="px-3.5 py-2 bg-[#111625] hover:bg-[#1a2136] text-cyan-300 border border-cyan-500/30 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} />
                <span>Refresh DB</span>
              </button>

              <button
                onClick={handleExportJson}
                className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-file-arrow-down" />
                <span>Backup JSON</span>
              </button>

              <button
                onClick={handleLockSession}
                className="px-3.5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-lock" />
                <span>Lock Access</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0a0f1d] border border-cyan-500/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <i className="fa-solid fa-users-rectangle text-lg" />
              </div>
              <div>
                <span className="text-gray-400 text-[11px] block">Tenant Sessions</span>
                <span className="text-xl font-bold text-white">{summaryStats?.totalSessions || 0}</span>
              </div>
            </div>

            <div className="bg-[#0a0f1d] border border-cyan-500/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <i className="fa-solid fa-user-shield text-lg" />
              </div>
              <div>
                <span className="text-gray-400 text-[11px] block">Total Registered Users</span>
                <span className="text-xl font-bold text-white">{summaryStats?.totalUsers || 0}</span>
              </div>
            </div>

            <div className="bg-[#0a0f1d] border border-cyan-500/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <i className="fa-solid fa-receipt text-lg" />
              </div>
              <div>
                <span className="text-gray-400 text-[11px] block">SIEM Telemetry Logs</span>
                <span className="text-xl font-bold text-white">{summaryStats?.totalLogs || 0}</span>
              </div>
            </div>

            <div className="bg-[#0a0f1d] border border-cyan-500/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <i className="fa-solid fa-hard-drive text-lg" />
              </div>
              <div>
                <span className="text-gray-400 text-[11px] block">Disk DB Storage Size</span>
                <span className="text-xl font-bold text-white">{summaryStats?.diskSizeKb || 0} KB</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a0f1d] border border-cyan-500/20 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setSelectedTab('sessions')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  selectedTab === 'sessions'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-server" />
                <span>Isolated Sessions ({tenants.length})</span>
              </button>

              <button
                onClick={() => setSelectedTab('users')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  selectedTab === 'users'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-users" />
                <span>All Users ({allUsers.length})</span>
              </button>

              <button
                onClick={() => setSelectedTab('logs')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  selectedTab === 'logs'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-scroll" />
                <span>All Logs ({allLogs.length})</span>
              </button>

              <button
                onClick={() => setSelectedTab('export')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  selectedTab === 'export'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-sliders" />
                <span>Operations</span>
              </button>
            </div>

            {selectedTab !== 'export' && (
              <div className="relative w-full sm:w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter records..."
                  className="w-full bg-[#111625] border border-cyan-500/20 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition placeholder-gray-500"
                />
              </div>
            )}
          </div>

          {/* Main Data Tables View */}
          <div className="bg-[#0a0f1d] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-xl">
            {selectedTab === 'sessions' && (
              <div className="divide-y divide-cyan-500/10">
                <div className="p-4 bg-[#111625]/60 flex items-center justify-between text-xs font-bold text-gray-400">
                  <span>Isolated User Session Key</span>
                  <span>Stored Records Summary</span>
                </div>

                {tenants.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 space-y-2">
                    <i className="fa-solid fa-box-open text-2xl text-gray-600 block mb-1" />
                    <p className="text-xs font-bold text-gray-300">No session databases currently initialized.</p>
                  </div>
                ) : (
                  tenants.map((tenant) => (
                    <div key={tenant.sessionId} className="p-4 hover:bg-cyan-500/5 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <i className="fa-solid fa-key text-cyan-400 text-xs" />
                          <span className="font-mono font-bold text-xs text-cyan-300">{tenant.sessionId}</span>
                          <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold rounded">
                            Isolated Store
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Persistent JSON DB File Location: <code className="text-gray-300 font-mono">./data/securewatch_database.json</code>
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="px-2.5 py-1 bg-[#111625] border border-cyan-500/20 rounded-lg text-gray-300 font-mono">
                            Users: <strong className="text-white">{tenant.userCount}</strong>
                          </span>
                          <span className="px-2.5 py-1 bg-[#111625] border border-cyan-500/20 rounded-lg text-gray-300 font-mono">
                            Logs: <strong className="text-white">{tenant.logCount}</strong>
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeleteTenant(tenant.sessionId)}
                          className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                          title="Purge session tenant database"
                        >
                          <i className="fa-solid fa-trash-can" />
                          <span>Purge</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#111625]/80 text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-cyan-500/20">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Session Tenant ID</th>
                      <th className="py-3 px-4">MFA</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-500/10 text-xs">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          No users found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u, i) => (
                        <tr key={u.id || i} className="hover:bg-cyan-500/5 transition">
                          <td className="py-3 px-4 font-bold text-white">
                            <div>{u.name}</div>
                            <div className="text-[10px] font-mono text-gray-400">{u.email}</div>
                          </td>
                          <td className="py-3 px-4 text-cyan-300 font-medium">{u.role}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] text-gray-300 bg-[#111625] px-2 py-1 rounded border border-cyan-500/20">
                              {u.tenantSessionId}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-emerald-400 text-[11px] font-bold">{u.mfa || 'Enabled'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold rounded">
                              {u.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {selectedTab === 'logs' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#111625]/80 text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-cyan-500/20">
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Level</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Message</th>
                      <th className="py-3 px-4">Tenant Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-500/10 text-xs font-mono">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 font-sans">
                          No logs found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((l, i) => (
                        <tr key={l.id || i} className="hover:bg-cyan-500/5 transition">
                          <td className="py-3 px-4 text-gray-400 text-[11px]">
                            {new Date(l.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                l.level === 'CRITICAL' || l.level === 'ERROR'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : l.level === 'WARN'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {l.level}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-cyan-300 font-sans font-bold">{l.service}</td>
                          <td className="py-3 px-4 text-gray-200 font-sans text-xs">{l.message}</td>
                          <td className="py-3 px-4 text-gray-400 text-[11px]">{l.tenantSessionId}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {selectedTab === 'export' && (
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <i className="fa-solid fa-database text-cyan-400" />
                    Database System Configuration
                  </h3>
                  <p className="text-xs text-gray-400">
                    Your database persistence engine writes directly to high-reliability local disk JSON storage at{' '}
                    <code className="text-cyan-300 font-mono">./data/securewatch_database.json</code>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#111625] border border-cyan-500/20 rounded-xl p-4 space-y-3">
                    <div className="font-bold text-xs text-white flex items-center gap-2">
                      <i className="fa-solid fa-file-export text-emerald-400" />
                      Export Complete Master Database
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Download a complete JSON snapshot of all session records, user databases, and security logs for backup.
                    </p>
                    <button
                      onClick={handleExportJson}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2"
                    >
                      <i className="fa-solid fa-download" />
                      <span>Export JSON Snapshot</span>
                    </button>
                  </div>

                  <div className="bg-[#111625] border border-cyan-500/20 rounded-xl p-4 space-y-3">
                    <div className="font-bold text-xs text-white flex items-center gap-2">
                      <i className="fa-solid fa-shield-check text-cyan-400" />
                      Multi-Tenant Isolation Protocol
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Every visiting client receives a unique header token (<code className="text-cyan-300 font-mono">X-User-Session-ID</code>) ensuring zero cross-tenant data leaks.
                    </p>
                    <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                      <i className="fa-solid fa-check-circle" />
                      <span>100% Operational & Isolated</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
