import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileActivity } from '../types';

interface FileSecurityProps {
  onFileActivity: (activity: FileActivity) => void;
}

export interface FileScanResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  scannedAt: string;
  sha256: string;
  entropy: number;
  status: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS';
  threatScore: number;
  mimeMismatch: boolean;
  detectedThreats: string[];
  sandboxVerdict: string;
  integrityCertificate: {
    certifiedBy: string;
    signature: string;
    hashAlgorithm: string;
    complianceStatus: string;
  };
}

export const FileSecurity: React.FC<FileSecurityProps> = ({ onFileActivity }) => {
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt' | 'scan'>('encrypt');

  // Encrypt state
  const [encryptFile, setEncryptFile] = useState<File | null>(null);
  const [encPassword, setEncPassword] = useState<string>('SecurewatchPass2026!');
  const [encConfirmPassword, setEncConfirmPassword] = useState<string>('SecurewatchPass2026!');
  const [showEncPassword, setShowEncPassword] = useState<boolean>(false);
  const [showEncConfirm, setShowEncConfirm] = useState<boolean>(false);
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);

  // Decrypt state
  const [decryptFile, setDecryptFile] = useState<File | null>(null);
  const [decPassword, setDecPassword] = useState<string>('');
  const [showDecPassword, setShowDecPassword] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [decError, setDecError] = useState<string | null>(null);

  // Malware Scanner state
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<FileScanResult | null>(null);

  const encFileInputRef = useRef<HTMLInputElement>(null);
  const decFileInputRef = useRef<HTMLInputElement>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Password strength calculator (WEAK, STRONG, MILITARY-GRADE)
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'None', color: 'bg-gray-600', text: 'text-gray-400', width: '0%' };

    const length = pwd.length;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
    const commonWeak = ['password', '123456', '12345678', 'qwerty', 'admin', 'welcome', '123456789', 'p@ssw0rd'];
    const isCommon = commonWeak.some((w) => pwd.toLowerCase().includes(w));

    let score = 0;
    if (length >= 16) score += 40;
    else if (length >= 12) score += 30;
    else if (length >= 8) score += 18;
    else score += length * 2;

    if (hasUpper) score += 15;
    if (hasLower) score += 15;
    if (hasNumber) score += 15;
    if (hasSymbol) score += 15;

    if (isCommon) score = Math.min(score, 25);

    if (isCommon || length < 8 || score < 50) {
      return { label: 'WEAK', color: 'bg-red-500', text: 'text-red-400 font-bold', width: `${Math.max(15, score)}%` };
    }
    if (score >= 50 && score < 85) {
      return { label: 'STRONG', color: 'bg-emerald-500', text: 'text-emerald-400 font-bold', width: `${score}%` };
    }
    return { label: 'MILITARY-GRADE (AES-256)', color: 'bg-purple-500', text: 'text-purple-300 font-bold', width: '100%' };
  };

  const strength = getPasswordStrength(encPassword);

  // File size formatter
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Real Shannon Entropy Calculation
  const calculateEntropy = (buffer: Uint8Array): number => {
    if (buffer.length === 0) return 0;
    const freq = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) {
      freq[buffer[i]]++;
    }
    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / buffer.length;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  };

  // Real SHA-256 Hex Hash Calculation via Web Crypto API
  const calculateSHA256 = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  // Helper for derive Key using Web Crypto API
  const getKeyFromPassword = async (password: string, salt: Uint8Array) => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  // Handle Real Encrypt
  const handleEncrypt = async () => {
    const file = encryptFile || new File(['Sample Confidential Securewatch Audit Payload\nClassification: RESTRICTED'], 'Securewatch_Security_Audit.pdf', { type: 'application/pdf' });

    if (!encPassword) {
      showToast('Please set a encryption password', 'error');
      return;
    }
    if (encPassword !== encConfirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setIsEncrypting(true);

    try {
      const fileBuffer = await file.arrayBuffer();
      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const key = await getKeyFromPassword(encPassword, salt);
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        fileBuffer
      );

      // Concatenate salt + iv + encryptedBuffer
      const result = new Uint8Array(salt.byteLength + iv.byteLength + encryptedBuffer.byteLength);
      result.set(salt, 0);
      result.set(iv, salt.byteLength);
      result.set(new Uint8Array(encryptedBuffer), salt.byteLength + iv.byteLength);

      // Download encrypted file
      const blob = new Blob([result], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name}.enc`;
      a.click();
      URL.revokeObjectURL(url);

      const now = new Date();
      onFileActivity({
        id: Date.now().toString(),
        fileName: file.name,
        action: 'Encrypted',
        status: 'Success',
        size: formatSize(file.size),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });

      showToast(`File "${file.name}" encrypted with AES-256-GCM & downloaded!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Encryption failed', 'error');
    } finally {
      setIsEncrypting(false);
    }
  };

  // Handle Real Decrypt
  const handleDecrypt = async () => {
    if (!decryptFile) {
      showToast('Please upload an encrypted file (.enc)', 'error');
      return;
    }
    if (!decPassword) {
      showToast('Please enter the decryption password', 'error');
      return;
    }

    setIsDecrypting(true);
    setDecError(null);

    try {
      const fileBuffer = await decryptFile.arrayBuffer();
      const data = new Uint8Array(fileBuffer);

      if (data.length < 28) {
        throw new Error('Invalid encrypted file header');
      }

      const salt = data.subarray(0, 16);
      const iv = data.subarray(16, 28);
      const ciphertext = data.subarray(28);

      const key = await getKeyFromPassword(decPassword, salt);
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      const originalName = decryptFile.name.endsWith('.enc')
        ? decryptFile.name.slice(0, -4)
        : `decrypted_${decryptFile.name}`;

      const blob = new Blob([decryptedBuffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      a.click();
      URL.revokeObjectURL(url);

      const now = new Date();
      onFileActivity({
        id: Date.now().toString(),
        fileName: originalName,
        action: 'Decrypted',
        status: 'Success',
        size: formatSize(decryptedBuffer.byteLength),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });

      showToast(`Successfully decrypted "${originalName}"!`, 'success');
    } catch (err) {
      console.error(err);
      setDecError('Incorrect password or corrupted file payload');
      showToast('Decryption failed: Incorrect password', 'error');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Handle Real Malware & Threat Scanning
  const handleScanFile = async (selectedFile?: File) => {
    const fileToScan = selectedFile || scanFile;
    if (!fileToScan) {
      showToast('Please select a file to scan', 'error');
      return;
    }

    setIsScanning(true);
    showToast(`Scanning "${fileToScan.name}" for embedded malware & threats...`, 'info');

    try {
      // 1. Calculate Real SHA-256 Hash
      const hashHex = await calculateSHA256(fileToScan);

      // 2. Calculate Real Byte Entropy
      const arrayBuffer = await fileToScan.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer.slice(0, 500000)); // sample first 500KB for speed
      const calculatedEntropy = calculateEntropy(bytes);

      // 3. Post to backend `/api/scan-file-security`
      const res = await fetch('/api/scan-file-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileToScan.name,
          fileSize: fileToScan.size,
          fileType: fileToScan.type || 'application/octet-stream',
          fileHash: hashHex,
          entropy: calculatedEntropy,
        }),
      });

      if (res.ok) {
        const result: FileScanResult = await res.json();
        setScanResult(result);

        const now = new Date();
        onFileActivity({
          id: Date.now().toString(),
          fileName: fileToScan.name,
          action: `Scanned (${result.status})`,
          status: result.status === 'CLEAN' ? 'Success' : 'Failed',
          size: formatSize(fileToScan.size),
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });

        if (result.status === 'CLEAN') {
          showToast(`File "${fileToScan.name}" is CLEAN! SHA-256 verified.`, 'success');
        } else if (result.status === 'SUSPICIOUS') {
          showToast(`WARNING: File "${fileToScan.name}" flagged as SUSPICIOUS!`, 'info');
        } else {
          showToast(`CRITICAL: "${fileToScan.name}" MALICIOUS THREAT DETECTED!`, 'error');
        }
      } else {
        showToast('File threat scan request failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error executing file threat analysis', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Download SHA-256 Cryptographic Certificate
  const handleDownloadCertificate = () => {
    if (!scanResult) return;
    const certContent = JSON.stringify(
      {
        header: 'Securewatch CRYPTOGRAPHIC FILE INTEGRITY CERTIFICATE',
        timestamp: scanResult.scannedAt,
        fileName: scanResult.fileName,
        fileSize: scanResult.fileSize,
        sha256Hash: scanResult.sha256,
        byteEntropy: `${scanResult.entropy} / 8.0`,
        threatVerdict: scanResult.status,
        threatScore: scanResult.threatScore,
        certificateToken: scanResult.integrityCertificate.signature,
        verifiedBy: scanResult.integrityCertificate.certifiedBy,
      },
      null,
      2
    );

    const blob = new Blob([certContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scanResult.fileName}_SHA256_Certificate.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded Cryptographic SHA-256 Integrity Certificate', 'success');
  };

  return (
    <div className="space-y-6 mb-6">
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

      {/* HEADER TABS NAVBAR */}
      <div className="bg-[#0a0803]/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-amber-400/50 transition shadow-xl">
        <div>
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <i className="fa-solid fa-file-shield text-amber-400 text-lg" />
            <span>Securewatch File Security & Cryptographic Integrity Suite</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
              AES-256 GCM + SHA-256
            </span>
          </div>
          <p className="text-xs text-amber-200/70 mt-1">
            Client-side Web Crypto AES-256 encryption, PBKDF2 key derivation, real-time SHA-256 hashing, byte-entropy analysis & AI threat scanning.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#050505] border border-amber-500/30 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('encrypt')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'encrypt'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-lock" /> Encrypt
          </button>
          <button
            onClick={() => setActiveTab('decrypt')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'decrypt'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-lock-open" /> Decrypt
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scan'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-bug" /> Malware Scan
          </button>
        </div>
      </div>

      {/* TAB 1: ENCRYPT FILE */}
      {activeTab === 'encrypt' && (
        <div className="bg-[#0a0803]/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-lock text-amber-400" /> AES-256-GCM Military-Grade File Encryption
              </h3>
              <p className="text-xs text-amber-200/70 mt-0.5">
                Uses Web Crypto PBKDF2 (100,000 iterations) with SHA-256 & 256-bit AES-GCM authenticated cipher.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => encFileInputRef.current?.click()}
              className="border-2 border-dashed border-amber-500/30 hover:border-amber-400/70 transition rounded-xl p-8 text-center bg-[#050505] cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <i className="fa-solid fa-cloud-arrow-up text-4xl text-amber-400 mb-1 block" />
              <div>
                <p className="text-xs font-semibold text-white">
                  {encryptFile ? encryptFile.name : 'Drag & Drop file to encrypt'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {encryptFile ? formatSize(encryptFile.size) : 'Supports PDF, DOCX, XLSX, Images, ZIP, Exe (Max 500MB)'}
                </p>
              </div>
              <button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                Choose File
              </button>
              <input
                ref={encFileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setEncryptFile(e.target.files[0])}
              />
            </div>

            <div className="flex flex-col justify-between space-y-4">
              <div className="bg-[#141008] border border-amber-500/30 p-3.5 rounded-xl flex items-center gap-3">
                <i className="fa-solid fa-file-contract text-2xl text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-white truncate">
                    {encryptFile ? encryptFile.name : 'Securewatch_Security_Audit.pdf'}
                  </h5>
                  <p className="text-[11px] text-gray-400">
                    {encryptFile ? formatSize(encryptFile.size) : 'PDF - 2.45 MB'}
                  </p>
                  <span className="text-emerald-400 text-[10px] flex items-center gap-1 mt-0.5 font-medium">
                    <i className="fa-solid fa-check-circle" /> Ready for authenticated AES encryption
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <label className="text-[11px] text-gray-400 block mb-1 font-semibold">Set Decryption Password</label>
                  <input
                    type={showEncPassword ? 'text' : 'password'}
                    value={encPassword}
                    onChange={(e) => setEncPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#050505] border border-amber-500/30 text-white rounded-lg text-xs outline-none focus:border-amber-400 font-mono"
                  />
                  <i
                    onClick={() => setShowEncPassword(!showEncPassword)}
                    className={`fa-regular ${showEncPassword ? 'fa-eye-slash' : 'fa-eye'} absolute right-3 top-8 text-gray-400 text-xs cursor-pointer`}
                  />
                </div>

                <div className="relative">
                  <label className="text-[11px] text-gray-400 block mb-1 font-semibold">Confirm Password</label>
                  <input
                    type={showEncConfirm ? 'text' : 'password'}
                    value={encConfirmPassword}
                    onChange={(e) => setEncConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#080a10] border border-[#1f2335] text-white rounded-lg text-xs outline-none focus:border-[#3b28cc] font-mono"
                  />
                  <i
                    onClick={() => setShowEncConfirm(!showEncConfirm)}
                    className={`fa-regular ${showEncConfirm ? 'fa-eye-slash' : 'fa-eye'} absolute right-3 top-8 text-gray-400 text-xs cursor-pointer`}
                  />
                </div>

                <div className="text-[11px] flex items-center gap-2 pt-1">
                  <span className="text-gray-400 font-medium">Cipher Strength:</span>
                  <span className={`font-mono ${strength.text}`}>{strength.label}</span>
                  <div className="h-1.5 bg-[#1f2335] flex-1 rounded overflow-hidden max-w-[120px]">
                    <div className={`h-full ${strength.color}`} style={{ width: strength.width }} />
                  </div>
                </div>
              </div>

              <button
                onClick={handleEncrypt}
                disabled={isEncrypting}
                className="w-full py-3 bg-[#3b28cc] hover:bg-[#4d3be3] text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <i className={`fa-solid ${isEncrypting ? 'fa-spinner animate-spin' : 'fa-lock'}`} />
                {isEncrypting ? 'Encrypting with Web Crypto...' : 'Encrypt & Download (.enc)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DECRYPT FILE */}
      {activeTab === 'decrypt' && (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-lock-open text-blue-400" /> Decrypt Encrypted File Payload (.enc)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload your encrypted file and supply PBKDF2 passkey to unpack original byte stream.
              </p>
            </div>
          </div>

          <div
            onClick={() => decFileInputRef.current?.click()}
            className="border-2 border-dashed border-[#1f2335] hover:border-[#3b28cc] transition rounded-xl p-8 text-center bg-[#080a10] cursor-pointer space-y-2"
          >
            <i className="fa-solid fa-file-shield text-4xl text-blue-400 mb-1 block" />
            <p className="text-xs text-gray-300 font-semibold">
              {decryptFile ? (
                <span className="text-emerald-400 font-mono">{decryptFile.name} ({formatSize(decryptFile.size)})</span>
              ) : (
                <>Drag & Drop encrypted file (.enc) here or click to browse</>
              )}
            </p>
            <button className="bg-[#3b28cc] hover:bg-[#4d3be3] text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer mt-2">
              Choose Encrypted File (.enc)
            </button>
            <input
              ref={decFileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && setDecryptFile(e.target.files[0])}
            />
          </div>

          {decError && (
            <div className="text-red-400 text-xs flex items-center gap-2 bg-red-500/10 p-3 rounded-lg border border-red-500/20 font-medium">
              <i className="fa-solid fa-triangle-exclamation text-sm" /> {decError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 items-end pt-2">
            <div className="relative flex-1 w-full">
              <label className="text-[11px] text-gray-400 block mb-1 font-semibold">Decryption Password</label>
              <input
                type={showDecPassword ? 'text' : 'password'}
                value={decPassword}
                onChange={(e) => setDecPassword(e.target.value)}
                placeholder="Enter password used during encryption"
                className="w-full px-3.5 py-2.5 bg-[#080a10] border border-[#1f2335] text-white rounded-lg text-xs outline-none focus:border-[#3b28cc] font-mono"
              />
              <i
                onClick={() => setShowDecPassword(!showDecPassword)}
                className={`fa-regular ${showDecPassword ? 'fa-eye-slash' : 'fa-eye'} absolute right-3 top-8 text-gray-400 text-xs cursor-pointer`}
              />
            </div>

            <button
              onClick={handleDecrypt}
              disabled={isDecrypting || !decryptFile}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                decryptFile && decPassword
                  ? 'bg-[#3b28cc] hover:bg-[#4d3be3] text-white'
                  : 'bg-[#1a1e30] text-gray-500 cursor-not-allowed'
              }`}
            >
              <i className={`fa-solid ${isDecrypting ? 'fa-spinner animate-spin' : 'fa-lock-open'}`} />
              {isDecrypting ? 'Decrypting...' : 'Decrypt & Restore File'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: REAL MALWARE & THREAT SCANNER */}
      {activeTab === 'scan' && (
        <div className="bg-[#0d111c] border border-[#1f2335] rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#1f2335] pb-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-bug text-purple-400" /> Real-Time Malware, Heuristic & SHA-256 Threat Scanner
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Computes SHA-256 checksums, byte entropy distributions, double-extension Trojan checks, and Gemini AI malware analysis.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => scanFileInputRef.current?.click()}
              className="border-2 border-dashed border-[#1f2335] hover:border-purple-500 transition rounded-xl p-8 text-center bg-[#080a10] cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <i className="fa-solid fa-shield-cat text-4xl text-purple-400 mb-1 block" />
              <div>
                <p className="text-xs font-semibold text-white">
                  {scanFile ? scanFile.name : 'Select or drop file to perform security audit'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {scanFile ? `${formatSize(scanFile.size)} | ${scanFile.type || 'Binary/Data'}` : 'Scans executables, archives, scripts, documents'}
                </p>
              </div>
              <button className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer">
                Select File to Scan
              </button>
              <input
                ref={scanFileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setScanFile(e.target.files[0]);
                    handleScanFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            <div className="flex flex-col justify-between space-y-4">
              <div className="bg-[#111524] border border-[#1f2335] p-4 rounded-xl space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">Threat Audit Engine Status</span>
                <p className="text-xs text-gray-300">
                  Select any file on your computer to calculate real-time SHA-256 hashes, measure byte entropy, check double-extension spoofing, and trigger sandbox inspection.
                </p>
              </div>

              <button
                onClick={() => handleScanFile()}
                disabled={isScanning || !scanFile}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <i className={`fa-solid ${isScanning ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'}`} />
                {isScanning ? 'Executing Heuristic Scan...' : 'Run SHA-256 & Threat Analysis'}
              </button>
            </div>
          </div>

          {/* SCAN RESULTS PANEL */}
          {scanResult && (
            <div className="bg-[#111524] border border-[#1f2335] rounded-xl p-5 space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#1f2335] pb-3 gap-2">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 block">File Under Audit:</span>
                  <div className="text-base font-bold text-white font-mono">{scanResult.fileName}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold font-mono border ${
                      scanResult.status === 'CLEAN'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : scanResult.status === 'SUSPICIOUS'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        : 'bg-red-500/20 text-red-400 border-red-500/40'
                    }`}
                  >
                    VERDICT: {scanResult.status}
                  </span>

                  <button
                    onClick={handleDownloadCertificate}
                    className="px-3 py-1 bg-[#1a1e30] hover:bg-[#252b42] text-purple-300 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 border border-purple-500/30"
                  >
                    <i className="fa-solid fa-certificate text-emerald-400" /> SHA-256 Certificate
                  </button>
                </div>
              </div>

              {/* Hashes & Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <div className="bg-[#080a10] border border-[#1f2335] p-3 rounded-lg">
                  <span className="text-[10px] text-gray-400 block font-sans">SHA-256 Checksum</span>
                  <div className="text-purple-300 font-bold truncate text-[11px] mt-0.5" title={scanResult.sha256}>
                    {scanResult.sha256}
                  </div>
                </div>

                <div className="bg-[#080a10] border border-[#1f2335] p-3 rounded-lg">
                  <span className="text-[10px] text-gray-400 block font-sans">Shannon Byte Entropy</span>
                  <div className="text-white font-bold text-xs mt-0.5">
                    {scanResult.entropy} / 8.0{' '}
                    <span className="text-[10px] text-gray-400 font-sans">
                      ({scanResult.entropy > 7.5 ? 'High / Compressed' : 'Normal Text/Data'})
                    </span>
                  </div>
                </div>

                <div className="bg-[#080a10] border border-[#1f2335] p-3 rounded-lg">
                  <span className="text-[10px] text-gray-400 block font-sans">Threat Severity Index</span>
                  <div className="text-xs font-bold mt-0.5 font-mono">
                    <span className={scanResult.threatScore > 50 ? 'text-red-400' : 'text-emerald-400'}>
                      {scanResult.threatScore} / 100
                    </span>
                  </div>
                </div>
              </div>

              {/* Detected Findings */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <i className="fa-solid fa-microscope text-purple-400" /> Forensic Threat & Signature Findings
                </span>
                <ul className="space-y-1.5 text-xs">
                  {scanResult.detectedThreats.map((finding, idx) => (
                    <li
                      key={idx}
                      className="p-2.5 bg-[#080a10] border border-[#1f2335] rounded-lg text-gray-300 flex items-center gap-2"
                    >
                      <i
                        className={`fa-solid ${
                          scanResult.status === 'CLEAN'
                            ? 'fa-circle-check text-emerald-400'
                            : 'fa-triangle-exclamation text-amber-400'
                        }`}
                      />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sandbox Verdict */}
              <div className="p-3 bg-[#080a10] border border-[#1f2335] rounded-lg text-xs space-y-1">
                <span className="text-purple-300 font-bold block">Sandbox Execution Verdict</span>
                <p className="text-gray-300">{scanResult.sandboxVerdict}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
