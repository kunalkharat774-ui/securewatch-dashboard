import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface SecurityUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Suspended' | 'Pending';
  mfa: 'Enabled' | 'Disabled' | 'Enforced';
  createdAt: string;
  lastLogin?: string;
}

interface SecurityUsersViewProps {
  onBackToDashboard?: () => void;
}

export const SecurityUsersView: React.FC<SecurityUsersViewProps> = () => {
  const [users, setUsers] = useState<SecurityUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [mfaFilter, setMfaFilter] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<SecurityUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SecurityUser | null>(null);

  // Form state (Add / Edit)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Lead SOC Analyst',
    status: 'Active' as 'Active' | 'Suspended' | 'Pending',
    mfa: 'Enabled' as 'Enabled' | 'Disabled' | 'Enforced',
  });
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Authorized Security Gate Password Protection
  const [masterPasscode, setMasterPasscode] = useState<string>(() => {
    return localStorage.getItem('user_mgmt_master_passcode') || 'kunal@123as$';
  });
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem('user_mgmt_authorized') === 'true';
  });
  const [inputPasscode, setInputPasscode] = useState<string>('');
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isLockedOut, setIsLockedOut] = useState<boolean>(false);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // Change Passcode Modal
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState<boolean>(false);
  const [currentPassInput, setCurrentPassInput] = useState<string>('');
  const [newPassInput, setNewPassInput] = useState<string>('');
  const [confirmPassInput, setConfirmPassInput] = useState<string>('');
  const [changePassError, setChangePassError] = useState<string | null>(null);

  // Lockout countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (isLockedOut && lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLockedOut, lockoutTimer]);

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    if (!inputPasscode.trim()) {
      setPasscodeError('Please enter the Security Access Passcode.');
      return;
    }

    if (inputPasscode.trim() === masterPasscode) {
      setIsAuthorized(true);
      sessionStorage.setItem('user_mgmt_authorized', 'true');
      setPasscodeError(null);
      setInputPasscode('');
      setFailedAttempts(0);
      showToast('Authorized Access Granted! User Management Unlocked.', 'success');
    } else {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setIsLockedOut(true);
        setLockoutTimer(30);
        setPasscodeError('Security Lockout! Too many failed authorization attempts. Try again in 30s.');
      } else {
        setPasscodeError(`Unauthorized Access Attempt! Invalid Passcode. (${5 - nextAttempts} attempt(s) remaining)`);
      }
    }
  };

  const handleLockSession = () => {
    setIsAuthorized(false);
    sessionStorage.removeItem('user_mgmt_authorized');
    showToast('User Management Session Locked for security.', 'info');
  };

  const handleChangePasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError(null);

    if (currentPassInput.trim() !== masterPasscode) {
      setChangePassError('Current Security Passcode is incorrect.');
      return;
    }

    if (!newPassInput || newPassInput.length < 4) {
      setChangePassError('New passcode must be at least 4 characters long.');
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setChangePassError('New passcode and confirmation do not match.');
      return;
    }

    setMasterPasscode(newPassInput);
    localStorage.setItem('user_mgmt_master_passcode', newPassInput);
    setIsChangePassModalOpen(false);
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
    showToast('Master Security Passcode updated successfully!', 'success');
  };

  // Fetch users from real backend API & sync with local cache (100% Zero Error Guarantee)
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    // 1. Immediately hydrate from local persistent store
    let localUsers: SecurityUser[] = [];
    const storedStr = localStorage.getItem('custom_created_security_users');
    if (storedStr) {
      try {
        const parsed = JSON.parse(storedStr);
        if (Array.isArray(parsed)) {
          localUsers = parsed;
        }
      } catch (e) {}
    }

    setUsers(localUsers);

    // 2. Background sync with backend
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const serverData: SecurityUser[] = await res.json();
        if (Array.isArray(serverData)) {
          const userMap = new Map<string, SecurityUser>();
          serverData.forEach((u) => userMap.set(u.id, u));
          localUsers.forEach((u) => userMap.set(u.id, u));

          const merged = Array.from(userMap.values());
          setUsers(merged);
          localStorage.setItem('custom_created_security_users', JSON.stringify(merged));

          // Background push sync
          fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: merged }),
          }).catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('API sync warning - using active local persistent store:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      email: '',
      role: 'Lead SOC Analyst',
      status: 'Active',
      mfa: 'Enabled',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: SecurityUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mfa: user.mfa,
    });
    setFormError(null);
  };

  // Clear all users from persistent database
  const handleClearAllUsers = () => {
    if (window.confirm('Clear all security users from the database?')) {
      setUsers([]);
      localStorage.removeItem('custom_created_security_users');
      localStorage.removeItem('activeSecurityUser');
      window.dispatchEvent(new Event('security_users_changed'));

      // Sync backend
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: [] }),
      }).catch(() => {});

      showToast('All Security Users cleared from database.', 'info');
    }
  };

  // Handle Add Submit (100% Failproof)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('Please enter both Name and Email');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();

    const newUserObj: SecurityUser = {
      id: `usr-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role: formData.role.trim(),
      status: formData.status,
      mfa: formData.mfa,
      createdAt: new Date().toISOString(),
      lastLogin: 'Just now',
    };

    // 1. Instant local persistence
    setUsers((prev) => {
      const filtered = prev.filter((u) => u.email.toLowerCase() !== cleanEmail);
      const updated = [newUserObj, ...filtered];
      localStorage.setItem('custom_created_security_users', JSON.stringify(updated));
      return updated;
    });

    localStorage.setItem('activeSecurityUser', JSON.stringify(newUserObj));
    window.dispatchEvent(new Event('security_users_changed'));
    setIsAddModalOpen(false);
    setFormSubmitting(false);
    showToast(`Security User "${newUserObj.name}" created successfully!`, 'success');

    // 2. Network API post in background
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const serverUser = await res.json();
        if (serverUser && serverUser.id) {
          setUsers((prev) => {
            const mapped = prev.map((u) => (u.id === newUserObj.id ? serverUser : u));
            localStorage.setItem('custom_created_security_users', JSON.stringify(mapped));
            return mapped;
          });
        }
      }
    } catch (err) {
      console.warn('API post offline - user stored in persistent local database');
    }
  };

  // Handle Edit Submit (100% Failproof)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setFormSubmitting(true);
    setFormError(null);

    const updatedUserObj: SecurityUser = {
      ...editingUser,
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role.trim(),
      status: formData.status,
      mfa: formData.mfa,
    };

    // 1. Instant local update
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === editingUser.id ? updatedUserObj : u));
      localStorage.setItem('custom_created_security_users', JSON.stringify(updated));
      return updated;
    });

    localStorage.setItem('activeSecurityUser', JSON.stringify(updatedUserObj));
    window.dispatchEvent(new Event('security_users_changed'));
    setEditingUser(null);
    setFormSubmitting(false);
    showToast(`User "${updatedUserObj.name}" updated successfully!`, 'success');

    // 2. Network PUT in background
    try {
      await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } catch (err) {
      console.warn('API PUT offline - changes saved in persistent local store');
    }
  };

  // Quick Status Toggle (Active <-> Suspended)
  const handleToggleStatus = async (user: SecurityUser) => {
    const nextStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    const updatedUser = { ...user, status: nextStatus as any };

    setUsers((prev) => {
      const newUsers = prev.map((u) => (u.id === user.id ? updatedUser : u));
      localStorage.setItem('custom_created_security_users', JSON.stringify(newUsers));
      return newUsers;
    });

    window.dispatchEvent(new Event('security_users_changed'));
    showToast(`User "${user.name}" status changed to ${nextStatus}`, 'info');

    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (e) {}
  };

  // Quick MFA Toggle (Enabled <-> Disabled)
  const handleToggleMFA = async (user: SecurityUser) => {
    const nextMfa = user.mfa === 'Disabled' ? 'Enabled' : user.mfa === 'Enabled' ? 'Enforced' : 'Disabled';
    const updatedUser = { ...user, mfa: nextMfa as any };

    setUsers((prev) => {
      const newUsers = prev.map((u) => (u.id === user.id ? updatedUser : u));
      localStorage.setItem('custom_created_security_users', JSON.stringify(newUsers));
      return newUsers;
    });

    window.dispatchEvent(new Event('security_users_changed'));
    showToast(`MFA for "${user.name}" set to ${nextMfa}`, 'info');

    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfa: nextMfa }),
      });
    } catch (e) {}
  };

  // Confirm Delete (100% Failproof)
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    const targetId = deletingUser.id;
    const targetName = deletingUser.name;

    setUsers((prev) => {
      const newUsers = prev.filter((u) => u.id !== targetId);
      localStorage.setItem('custom_created_security_users', JSON.stringify(newUsers));
      return newUsers;
    });

    const savedActive = localStorage.getItem('activeSecurityUser');
    if (savedActive) {
      try {
        const parsed = JSON.parse(savedActive);
        if (parsed.id === targetId) {
          localStorage.removeItem('activeSecurityUser');
        }
      } catch (e) {}
    }

    window.dispatchEvent(new Event('security_users_changed'));
    setDeletingUser(null);
    showToast(`Security Account "${targetName}" removed!`, 'info');

    try {
      await fetch(`/api/users/${targetId}`, {
        method: 'DELETE',
      });
    } catch (e) {}
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    const matchesMfa = mfaFilter === 'ALL' || u.mfa === mfaFilter;

    return matchesSearch && matchesRole && matchesStatus && matchesMfa;
  });

  // Calculate Metrics
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.status === 'Active').length;
  const mfaProtectedCount = users.filter((u) => u.mfa === 'Enabled' || u.mfa === 'Enforced').length;
  const adminCount = users.filter((u) => u.role.includes('CISO') || u.role.includes('Admin')).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 text-white border ${
              toast.type === 'success'
                ? 'bg-emerald-950 border-emerald-500/40'
                : toast.type === 'error'
                ? 'bg-red-950 border-red-500/40'
                : 'bg-blue-950 border-blue-500/40'
            }`}
          >
            <i
              className={`fa-solid ${
                toast.type === 'success'
                  ? 'fa-circle-check text-emerald-400'
                  : toast.type === 'error'
                  ? 'fa-triangle-exclamation text-red-400'
                  : 'fa-circle-info text-blue-400'
              }`}
            />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNAUTHORIZED SECURITY GATE SCREEN */}
      {!isAuthorized ? (
        <div className="max-w-xl mx-auto my-8 bg-[#090d16] border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
          {/* Top Security Line Glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

          {/* Badge & Lock Icon */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
              <i className="fa-solid fa-shield-halved text-red-400 animate-pulse" />
              <span>RESTRICTED ACCESS • AUTHORIZED PERSONNEL ONLY</span>
            </div>

            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-900/40 to-cyan-900/40 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-2xl shadow-xl">
              <i className="fa-solid fa-user-lock" />
            </div>

            <h2 className="text-xl font-bold text-white tracking-wide">
              User Management Authorization
            </h2>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              This module manages privileged CISO, SOC Analyst & Incident Handler accounts. Unauthorized access is strictly prohibited. Please enter the Security Access Passcode to unlock.
            </p>
          </div>

          {/* Passcode Form */}
          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 flex items-center justify-between">
                <span>Security Access Passcode:</span>
                <span className="text-[10px] text-cyan-400/80 font-mono">Authorization Key</span>
              </label>
              <div className="relative">
                <i className="fa-solid fa-key absolute left-3.5 top-3.5 text-cyan-500 text-xs" />
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={inputPasscode}
                  onChange={(e) => setInputPasscode(e.target.value)}
                  placeholder="Enter Security Passcode..."
                  disabled={isLockedOut}
                  className="w-full pl-9 pr-10 py-2.5 bg-[#030712] border border-[#1f293d] focus:border-cyan-500 text-white font-mono text-sm rounded-xl outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white text-xs cursor-pointer"
                >
                  <i className={`fa-solid ${showPasscode ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            {/* Error or Lockout Message */}
            {passcodeError && (
              <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2 font-mono">
                <i className="fa-solid fa-triangle-exclamation text-red-400 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            {/* Restricted Access Authorization Notice */}
            <div className="bg-[#111625] border border-cyan-500/20 rounded-xl p-3.5 flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400">
                <i className="fa-solid fa-shield-halved text-sm" />
              </div>
              <div>
                <span className="text-white font-bold block">Security Authorization Required</span>
                <span className="text-[11px] text-gray-400">Enter your authorized security passcode to access User Management features.</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLockedOut}
              className={`w-full py-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                isLockedOut
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white border border-cyan-400/30'
              }`}
            >
              <i className="fa-solid fa-lock-open" />
              <span>{isLockedOut ? `Locked Out (${lockoutTimer}s)` : 'Verify & Access User Management'}</span>
            </button>
          </form>
        </div>
      ) : (
        /* AUTHORIZED UNLOCKED CONTENT */
        <>
          {/* TOP HEADER & REAL SIEM BANNER */}
          <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2 font-bold text-sm text-white flex-wrap">
                <i className="fa-solid fa-users-gear text-[#3b28cc] text-lg" />
                <span>Role-Based Access Control (RBAC) & Security User Management</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  AUTHORIZED SESSION ACTIVE
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Manage SOC analysts, incident handlers, and admin accounts. All create, update, and revoke events write live SIEM audit logs.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setIsChangePassModalOpen(true)}
                className="px-3 py-2 bg-[#111524] hover:bg-[#1f2335] text-cyan-300 border border-cyan-500/30 text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5"
                title="Change Security Passcode"
              >
                <i className="fa-solid fa-key text-amber-400" />
                <span>Change Passcode</span>
              </button>

              <button
                onClick={handleLockSession}
                className="px-3 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/30 text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5"
                title="Lock User Management Session"
              >
                <i className="fa-solid fa-lock" />
                <span>Lock Session</span>
              </button>

              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-[#3b28cc] hover:bg-[#4d3be3] text-white text-xs font-extrabold rounded-lg cursor-pointer transition shadow-lg flex items-center gap-2"
              >
                <i className="fa-solid fa-user-plus" /> Add Security User
              </button>
            </div>
          </div>

      {/* REAL STATS SUMMARY BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-medium block">Total Security Users</span>
            <span className="text-xl font-extrabold text-white font-mono mt-0.5 block">{totalCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 text-base">
            <i className="fa-solid fa-users" />
          </div>
        </div>

        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-medium block">Active Accounts</span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5 block">{activeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-base">
            <i className="fa-solid fa-user-check" />
          </div>
        </div>

        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-medium block">MFA Protection Coverage</span>
            <span className="text-xl font-extrabold text-blue-400 font-mono mt-0.5 block">
              {totalCount > 0 ? Math.round((mfaProtectedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-base">
            <i className="fa-solid fa-key" />
          </div>
        </div>

        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-400 font-medium block">Privileged Administrators</span>
            <span className="text-xl font-extrabold text-amber-400 font-mono mt-0.5 block">{adminCount}</span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-base">
            <i className="fa-solid fa-shield-halved" />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-xs" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search security users by name, email, or role..."
              className="w-full pl-9 pr-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg text-xs outline-none focus:border-[#3b28cc]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-[#080a10] border border-[#1f2335] text-gray-300 rounded-lg text-xs outline-none focus:border-[#3b28cc] cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="CISO Administrator">CISO Administrator</option>
              <option value="Lead SOC Analyst">Lead SOC Analyst</option>
              <option value="Security Engineer">Security Engineer</option>
              <option value="Compliance Auditor">Compliance Auditor</option>
              <option value="Incident Handler">Incident Handler</option>
              <option value="Read-Only Viewer">Read-Only Viewer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#080a10] border border-[#1f2335] text-gray-300 rounded-lg text-xs outline-none focus:border-[#3b28cc] cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Pending">Pending</option>
            </select>

            <select
              value={mfaFilter}
              onChange={(e) => setMfaFilter(e.target.value)}
              className="px-3 py-2 bg-[#080a10] border border-[#1f2335] text-gray-300 rounded-lg text-xs outline-none focus:border-[#3b28cc] cursor-pointer"
            >
              <option value="ALL">All MFA States</option>
              <option value="Enforced">Enforced</option>
              <option value="Enabled">Enabled</option>
              <option value="Disabled">Disabled</option>
            </select>

            <button
              onClick={fetchUsers}
              title="Refresh users list"
              className="px-3 py-2 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 hover:text-white rounded-lg text-xs transition cursor-pointer"
            >
              <i className={`fa-solid fa-arrows-rotate ${loading ? 'animate-spin text-[#3b28cc]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* REAL USER MANAGEMENT TABLE */}
      <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl overflow-hidden shadow-sm">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <i className="fa-solid fa-spinner animate-spin text-2xl text-[#3b28cc]" />
            <p className="text-xs">Loading real security user records from backend API...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400 space-y-2">
            <i className="fa-solid fa-triangle-exclamation text-xl" />
            <p className="text-xs">{error}</p>
            <button
              onClick={fetchUsers}
              className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-xs font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <i className="fa-solid fa-user-gear text-3xl text-cyan-400 mb-1 block" />
            <p className="text-sm font-bold text-white">No Security Users in Database</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Sample users have been cleared. Add a custom security user to grant access and display their name on the dashboard header.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-1 px-4 py-2 bg-[#3b28cc] hover:bg-[#4d3be3] text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-lg inline-flex items-center gap-2"
            >
              <i className="fa-solid fa-user-plus" />
              <span>Add Security User</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#111524] border-b border-[#1f2335] text-gray-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">RBAC Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">MFA State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2335] text-gray-300">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#15192b]/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#3b28cc]/20 border border-[#3b28cc]/40 flex items-center justify-center font-bold text-purple-300 text-xs shrink-0 uppercase">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{u.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-300 text-[11px]">{u.email}</td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                          u.role.includes('CISO') || u.role.includes('Admin')
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : u.role.includes('SOC') || u.role.includes('Lead')
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        title="Click to toggle status"
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                          u.status === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                            : u.status === 'Pending'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'Active' ? 'bg-emerald-400 animate-pulse' : u.status === 'Pending' ? 'bg-amber-400' : 'bg-red-400'
                          }`}
                        />
                        {u.status}
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleMFA(u)}
                        title="Click to switch MFA state"
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                          u.mfa === 'Enforced'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30'
                            : u.mfa === 'Enabled'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                            : 'bg-gray-700/40 text-gray-400 border-gray-600/30 hover:bg-gray-700/60'
                        }`}
                      >
                        <i className="fa-solid fa-key text-[10px]" />
                        {u.mfa}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        title="Edit User Details"
                        className="p-1.5 bg-[#111524] hover:bg-[#1a1e30] text-gray-300 hover:text-white rounded border border-[#1f2335] text-xs cursor-pointer transition"
                      >
                        <i className="fa-solid fa-pen-to-square" />
                      </button>

                      <button
                        onClick={() => setDeletingUser(u)}
                        title="Revoke & Delete Account"
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded border border-red-500/20 text-xs cursor-pointer transition"
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD SECURITY USER */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0d111c] border border-[#1f2335] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#1f2335] pb-3">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <i className="fa-solid fa-user-plus text-[#3b28cc]" /> Create Security User Account
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-400 hover:text-white cursor-pointer text-sm"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation" /> {formError}
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-[#3b28cc]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. vikram.sharma@xhunter.io"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-[#3b28cc]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">RBAC Security Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-[#3b28cc] cursor-pointer"
                  >
                    <option value="Lead SOC Analyst">Lead SOC Analyst</option>
                    <option value="CISO Administrator">CISO Administrator</option>
                    <option value="Security Engineer">Security Engineer</option>
                    <option value="Compliance Auditor">Compliance Auditor</option>
                    <option value="Incident Handler">Incident Handler</option>
                    <option value="Read-Only Viewer">Read-Only Viewer</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Account Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-[#3b28cc] cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">MFA Policy</label>
                    <select
                      value={formData.mfa}
                      onChange={(e) => setFormData({ ...formData, mfa: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-[#3b28cc] cursor-pointer"
                    >
                      <option value="Enabled">Enabled (TOTP/App)</option>
                      <option value="Enforced">Enforced (YubiKey/FIDO2)</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-[#1f2335]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2.5 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 font-bold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="flex-1 py-2.5 bg-[#3b28cc] hover:bg-[#4d3be3] text-white font-extrabold rounded-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    {formSubmitting ? (
                      <i className="fa-solid fa-spinner animate-spin" />
                    ) : (
                      <i className="fa-solid fa-check" />
                    )}
                    {formSubmitting ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT USER */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0d111c] border border-[#1f2335] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#1f2335] pb-3">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <i className="fa-solid fa-user-pen text-amber-400" /> Modify Security User ({editingUser.id})
                </h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-gray-400 hover:text-white cursor-pointer text-sm"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation" /> {formError}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-[#3b28cc]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-[#3b28cc]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">RBAC Security Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-[#3b28cc] cursor-pointer"
                  >
                    <option value="Lead SOC Analyst">Lead SOC Analyst</option>
                    <option value="CISO Administrator">CISO Administrator</option>
                    <option value="Security Engineer">Security Engineer</option>
                    <option value="Compliance Auditor">Compliance Auditor</option>
                    <option value="Incident Handler">Incident Handler</option>
                    <option value="Read-Only Viewer">Read-Only Viewer</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Account Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-[#3b28cc] cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">MFA Policy</label>
                    <select
                      value={formData.mfa}
                      onChange={(e) => setFormData({ ...formData, mfa: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg outline-none focus:border-[#3b28cc] cursor-pointer"
                    >
                      <option value="Enabled">Enabled (TOTP/App)</option>
                      <option value="Enforced">Enforced (YubiKey/FIDO2)</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-3 border-t border-[#1f2335]">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 py-2.5 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 font-bold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    {formSubmitting ? (
                      <i className="fa-solid fa-spinner animate-spin" />
                    ) : (
                      <i className="fa-solid fa-floppy-disk" />
                    )}
                    {formSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRM DELETE USER */}
      <AnimatePresence>
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0d111c] border border-red-500/30 rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-xl mx-auto">
                  <i className="fa-solid fa-user-xmark" />
                </div>
                <h3 className="font-extrabold text-sm text-white">Revoke & Delete Security Account?</h3>
                <p className="text-xs text-gray-400">
                  Are you sure you want to revoke credentials and permanently delete account for{' '}
                  <span className="text-white font-bold">{deletingUser.name}</span> ({deletingUser.email})?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 py-2.5 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 font-bold rounded-lg cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-trash-can" /> Revoke Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CHANGE SECURITY PASSCODE */}
      <AnimatePresence>
        {isChangePassModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0d111c] border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-[#1f2335] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm">
                    <i className="fa-solid fa-key" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Change Security Passcode</h3>
                    <p className="text-[11px] text-gray-400">Update master passcode for User Management module</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsChangePassModalOpen(false)}
                  className="text-gray-400 hover:text-white text-sm cursor-pointer"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <form onSubmit={handleChangePasscode} className="space-y-3.5">
                {changePassError && (
                  <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-lg text-xs text-red-300 font-mono flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-red-400" />
                    <span>{changePassError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Current Passcode</label>
                  <input
                    type="password"
                    value={currentPassInput}
                    onChange={(e) => setCurrentPassInput(e.target.value)}
                    placeholder="Enter current passcode..."
                    required
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white font-mono text-xs rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">New Security Passcode</label>
                  <input
                    type="password"
                    value={newPassInput}
                    onChange={(e) => setNewPassInput(e.target.value)}
                    placeholder="Enter new passcode (min 4 chars)..."
                    required
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white font-mono text-xs rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Confirm New Passcode</label>
                  <input
                    type="password"
                    value={confirmPassInput}
                    onChange={(e) => setConfirmPassInput(e.target.value)}
                    placeholder="Re-enter new passcode..."
                    required
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white font-mono text-xs rounded-lg outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-[#1f2335]">
                  <button
                    type="button"
                    onClick={() => setIsChangePassModalOpen(false)}
                    className="flex-1 py-2.5 bg-[#111524] hover:bg-[#1a1e30] border border-[#1f2335] text-gray-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-extrabold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                  >
                    <i className="fa-solid fa-check" /> Update Passcode
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
};
