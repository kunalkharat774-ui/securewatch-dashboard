import React, { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import {
  LockKeyhole,
  Lock,
  Unlock,
  RotateCcw,
  ArrowDownUp,
  Key,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Info,
  Sparkles,
  Sliders,
  FileCode2,
} from 'lucide-react';

export const TextEncryptView: React.FC = () => {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [algorithm, setAlgorithm] = useState<string>('AES');
  
  // MUST start completely empty - NO prefilled sample or fake text/keys!
  const [inputText, setInputText] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [iv, setIv] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<'base64' | 'hex'>('base64');
  const [caesarShift, setCaesarShift] = useState<number>(3);

  const [outputText, setOutputText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [processingTime, setProcessingTime] = useState<number | null>(null);

  // Check if algorithm requires secret key
  const requiresKey = ['AES', '3DES', 'DES', 'RC4', 'Rabbit', 'HMAC-SHA256'].includes(algorithm);
  const isSymmetric = ['AES', '3DES', 'DES', 'RC4', 'Rabbit'].includes(algorithm);
  const isOneWayHash = ['SHA-256', 'SHA-512', 'MD5', 'HMAC-SHA256'].includes(algorithm);

  // Caesar cipher helper
  const caesarCipher = (str: string, shift: number): string => {
    return str
      .split('')
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) {
          return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
        } else if (code >= 97 && code <= 122) {
          return String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
        }
        return char;
      })
      .join('');
  };

  // Generate random 16-character key
  const handleGenerateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSecretKey(result);
  };

  // Generate random 16-byte IV in hex
  const handleGenerateIv = () => {
    const randIv = CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex);
    setIv(randIv);
  };

  // Safe symmetric decryption helper
  const decryptSymmetric = (
    algo: 'AES' | '3DES' | 'DES' | 'RC4' | 'Rabbit',
    cipherStr: string,
    key: string,
    hexFormat: boolean,
    ivHex?: string
  ): string => {
    const cipherTrim = cipherStr.trim();
    if (!cipherTrim || !key) return '';

    let decryptedBytes;
    const options: any = {};
    if (ivHex && algo === 'AES') {
      options.iv = CryptoJS.enc.Hex.parse(ivHex);
    }

    if (hexFormat) {
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Hex.parse(cipherTrim),
      });
      if (algo === 'AES') decryptedBytes = CryptoJS.AES.decrypt(cipherParams, key, options);
      else if (algo === '3DES') decryptedBytes = CryptoJS.TripleDES.decrypt(cipherParams, key);
      else if (algo === 'DES') decryptedBytes = CryptoJS.DES.decrypt(cipherParams, key);
      else if (algo === 'RC4') decryptedBytes = CryptoJS.RC4.decrypt(cipherParams, key);
      else if (algo === 'Rabbit') decryptedBytes = CryptoJS.Rabbit.decrypt(cipherParams, key);
    } else {
      if (algo === 'AES') decryptedBytes = CryptoJS.AES.decrypt(cipherTrim, key, options);
      else if (algo === '3DES') decryptedBytes = CryptoJS.TripleDES.decrypt(cipherTrim, key);
      else if (algo === 'DES') decryptedBytes = CryptoJS.DES.decrypt(cipherTrim, key);
      else if (algo === 'RC4') decryptedBytes = CryptoJS.RC4.decrypt(cipherTrim, key);
      else if (algo === 'Rabbit') decryptedBytes = CryptoJS.Rabbit.decrypt(cipherTrim, key);
    }

    if (!decryptedBytes) return '';
    return decryptedBytes.toString(CryptoJS.enc.Utf8);
  };

  // Core Process logic
  const handleProcess = () => {
    setErrorMsg(null);
    if (!inputText.trim()) {
      setOutputText('');
      setProcessingTime(null);
      return;
    }

    const startTime = performance.now();
    try {
      let result = '';

      if (isSymmetric) {
        if (!secretKey) {
          setErrorMsg(`Secret key is required for ${algorithm}.`);
          setOutputText('');
          return;
        }

        const isHex = outputFormat === 'hex';
        const algoName = algorithm as 'AES' | '3DES' | 'DES' | 'RC4' | 'Rabbit';

        if (mode === 'encrypt') {
          let encrypted;
          const options: any = {};
          if (iv && algorithm === 'AES') {
            options.iv = CryptoJS.enc.Hex.parse(iv);
          }

          if (algorithm === 'AES') encrypted = CryptoJS.AES.encrypt(inputText, secretKey, options);
          else if (algorithm === '3DES') encrypted = CryptoJS.TripleDES.encrypt(inputText, secretKey);
          else if (algorithm === 'DES') encrypted = CryptoJS.DES.encrypt(inputText, secretKey);
          else if (algorithm === 'RC4') encrypted = CryptoJS.RC4.encrypt(inputText, secretKey);
          else if (algorithm === 'Rabbit') encrypted = CryptoJS.Rabbit.encrypt(inputText, secretKey);

          if (encrypted) {
            result = isHex ? encrypted.ciphertext.toString(CryptoJS.enc.Hex) : encrypted.toString();
          }
        } else {
          result = decryptSymmetric(algoName, inputText, secretKey, isHex, iv);
          if (!result) {
            setErrorMsg('Invalid secret key, mismatching IV, or corrupted ciphertext.');
            setOutputText('');
            return;
          }
        }
      } else if (algorithm === 'Base64') {
        if (mode === 'encrypt') {
          result = CryptoJS.enc.Utf8.parse(inputText).toString(CryptoJS.enc.Base64);
        } else {
          const parsed = CryptoJS.enc.Base64.parse(inputText.trim());
          result = parsed.toString(CryptoJS.enc.Utf8);
          if (!result) {
            setErrorMsg('Invalid Base64 input text.');
            setOutputText('');
            return;
          }
        }
      } else if (algorithm === 'Hex') {
        if (mode === 'encrypt') {
          result = CryptoJS.enc.Utf8.parse(inputText).toString(CryptoJS.enc.Hex);
        } else {
          const parsed = CryptoJS.enc.Hex.parse(inputText.trim());
          result = parsed.toString(CryptoJS.enc.Utf8);
          if (!result) {
            setErrorMsg('Invalid Hexadecimal input text.');
            setOutputText('');
            return;
          }
        }
      } else if (algorithm === 'Caesar') {
        const shift = mode === 'encrypt' ? caesarShift : -caesarShift;
        result = caesarCipher(inputText, shift);
      } else if (algorithm === 'SHA-256') {
        if (mode === 'decrypt') {
          setErrorMsg('SHA-256 is a 1-way cryptographic hash function and cannot be decrypted.');
          setOutputText('');
          return;
        }
        result = CryptoJS.SHA256(inputText).toString();
      } else if (algorithm === 'SHA-512') {
        if (mode === 'decrypt') {
          setErrorMsg('SHA-512 is a 1-way cryptographic hash function and cannot be decrypted.');
          setOutputText('');
          return;
        }
        result = CryptoJS.SHA512(inputText).toString();
      } else if (algorithm === 'MD5') {
        if (mode === 'decrypt') {
          setErrorMsg('MD5 is a 1-way cryptographic hash function and cannot be decrypted.');
          setOutputText('');
          return;
        }
        result = CryptoJS.MD5(inputText).toString();
      } else if (algorithm === 'HMAC-SHA256') {
        if (mode === 'decrypt') {
          setErrorMsg('HMAC is a 1-way keyed hash function and cannot be decrypted.');
          setOutputText('');
          return;
        }
        if (!secretKey) {
          setErrorMsg('Secret key is required for HMAC-SHA256.');
          setOutputText('');
          return;
        }
        result = CryptoJS.HmacSHA256(inputText, secretKey).toString();
      }

      setOutputText(result);
      const endTime = performance.now();
      setProcessingTime(parseFloat((endTime - startTime).toFixed(2)));
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Error executing process. Please check parameters or key.');
      setOutputText('');
    }
  };

  // Trigger real-time calculation when inputs change
  useEffect(() => {
    handleProcess();
  }, [inputText, secretKey, iv, algorithm, mode, outputFormat, caesarShift]);

  // Mode Toggle
  const handleToggleMode = (newMode: 'encrypt' | 'decrypt') => {
    if (newMode === mode) return;
    if (newMode === 'decrypt' && outputText && !errorMsg) {
      setInputText(outputText);
      setOutputText('');
    }
    setMode(newMode);
  };

  // Swap Input and Output
  const handleSwap = () => {
    if (!outputText) return;
    setInputText(outputText);
    setOutputText('');
    setMode(mode === 'encrypt' ? 'decrypt' : 'encrypt');
  };

  // Clear ALL (clears input, output, secret key, iv, messages)
  const handleClearAll = () => {
    setInputText('');
    setSecretKey('');
    setIv('');
    setOutputText('');
    setErrorMsg(null);
    setProcessingTime(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-[#101735] to-[#0c1228] border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-inner">
              <LockKeyhole className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Text Encryption & Decryption Tool
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Securewatch
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Real-time client-side cryptographic engine. Supports AES, 3DES, DES, RC4, Rabbit, Base64, Hex & Hashes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#0d142c] p-1.5 rounded-xl border border-[#232f57]">
            <button
              onClick={() => handleToggleMode('encrypt')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                mode === 'encrypt'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" /> Encrypt Mode
            </button>
            <button
              onClick={() => handleToggleMode('decrypt')}
              disabled={isOneWayHash}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                mode === 'decrypt'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Unlock className="w-4 h-4" /> Decrypt Mode
            </button>
          </div>
        </div>
      </div>

      {/* Main Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Configuration Panel */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-5 shadow-lg space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#1b2545]">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
                Algorithm & Parameters
              </h2>
            </div>

            {/* Algorithm Selector */}
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-2">
                Select Algorithm:
              </label>
              <select
                value={algorithm}
                onChange={(e) => {
                  setAlgorithm(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full bg-[#121935] border border-[#232f57] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition"
              >
                <optgroup label="Symmetric Ciphers (Secret Key Required)">
                  <option value="AES">AES (Advanced Encryption Standard)</option>
                  <option value="3DES">Triple DES (3DES)</option>
                  <option value="DES">DES (Data Encryption Standard)</option>
                  <option value="RC4">RC4 Stream Cipher</option>
                  <option value="Rabbit">Rabbit Stream Cipher</option>
                </optgroup>
                <optgroup label="Encoding Utilities">
                  <option value="Base64">Base64 Encode / Decode</option>
                  <option value="Hex">Hexadecimal Encode / Decode</option>
                  <option value="Caesar">Caesar Cipher (Shift)</option>
                </optgroup>
                <optgroup label="Cryptographic Hashes (One-Way)">
                  <option value="SHA-256">SHA-256 Hash</option>
                  <option value="SHA-512">SHA-512 Hash</option>
                  <option value="MD5">MD5 Hash</option>
                  <option value="HMAC-SHA256">HMAC SHA-256 (Keyed Hash)</option>
                </optgroup>
              </select>
            </div>

            {/* Secret Key Input Box */}
            {requiresKey && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Secret Passphrase / Key:
                  </label>
                  <button
                    onClick={handleGenerateRandomKey}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition"
                  >
                    <Sparkles className="w-3 h-3" /> Generate Key
                  </button>
                </div>
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter your secret key here..."
                  className="w-full bg-[#121935] border border-[#232f57] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            )}

            {/* AES Specific Options: IV & Output Format */}
            {algorithm === 'AES' && (
              <div className="space-y-4 pt-2 border-t border-[#1b2545]/60">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-gray-400">
                      Initialization Vector (IV Hex - Optional):
                    </label>
                    <button
                      onClick={handleGenerateIv}
                      className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      Gen 16-Byte IV
                    </button>
                  </div>
                  <input
                    type="text"
                    value={iv}
                    onChange={(e) => setIv(e.target.value)}
                    placeholder="e.g. 2b7e151628aed2a6abf7158809cf4f3c"
                    className="w-full bg-[#121935] border border-[#232f57] rounded-xl px-3.5 py-2 text-[11px] text-white placeholder-gray-600 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Output Cipher Format Selection */}
            {isSymmetric && (
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-2">
                  Ciphertext Output Encoding:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#121935] p-1 rounded-xl border border-[#232f57]">
                  <button
                    onClick={() => setOutputFormat('base64')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      outputFormat === 'base64'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Base64 String
                  </button>
                  <button
                    onClick={() => setOutputFormat('hex')}
                    className={`py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      outputFormat === 'hex'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Hexadecimal
                  </button>
                </div>
              </div>
            )}

            {/* Caesar Shift Control */}
            {algorithm === 'Caesar' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    Caesar Shift Value:
                  </label>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-500/30">
                    {caesarShift}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="25"
                  value={caesarShift}
                  onChange={(e) => setCaesarShift(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            )}

            {/* Processing Stats */}
            {processingTime !== null && (
              <div className="p-3 bg-[#0d152d] border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Processing Speed:
                </span>
                <span className="font-mono text-emerald-400 font-bold">{processingTime} ms</span>
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-4 text-xs text-gray-400 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Info className="w-4 h-4" /> Securewatch Cryptography Rules
            </div>
            <p className="leading-relaxed">
              Symmetric algorithms (AES, 3DES, DES) encrypt and decrypt data using the exact same secret passphrase. Ensure secret key matches during decryption.
            </p>
          </div>
        </div>

        {/* Right Input and Output Workspace */}
        <div className="lg:col-span-8 space-y-5">
          {/* Input Text Section */}
          <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-indigo-400" />
                {mode === 'encrypt' ? 'Input Text (Plaintext):' : 'Ciphertext Input to Decrypt:'}
              </label>

              {/* Action Buttons: Clear All */}
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 bg-[#121935] hover:bg-red-500/20 text-gray-300 hover:text-red-300 border border-[#232f57] hover:border-red-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear All
              </button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                mode === 'encrypt'
                  ? 'Enter plaintext here to encrypt...'
                  : 'Enter ciphertext or Base64 string here to decrypt...'
              }
              rows={6}
              className="w-full bg-[#10162e] border border-[#212a4a] rounded-xl p-4 text-sm text-gray-100 placeholder-gray-600 font-mono focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
            />
          </div>

          {/* Output Controls Banner */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleProcess}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {mode === 'encrypt' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              {mode === 'encrypt' ? `Encrypt with ${algorithm}` : `Decrypt with ${algorithm}`}
            </button>

            {outputText && (
              <button
                onClick={handleSwap}
                title="Swap Output to Input"
                className="px-4 py-3 bg-[#121935] hover:bg-[#1c2750] text-gray-200 border border-[#232f57] rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <ArrowDownUp className="w-4 h-4 text-indigo-400" /> Swap Input/Output
              </button>
            )}
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-300 text-xs shadow-inner">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Result Output Section */}
          <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {mode === 'encrypt' ? 'Encrypted Result Output:' : 'Decrypted Output Text:'}
              </label>
            </div>

            <textarea
              readOnly
              value={outputText}
              placeholder="Processed result will appear here..."
              rows={6}
              className="w-full bg-[#0d1326] border border-[#1d2747] rounded-xl p-4 text-sm text-emerald-300 font-mono focus:outline-none transition resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
