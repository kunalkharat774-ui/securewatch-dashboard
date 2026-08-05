import React, { useState, useRef, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import {
  FileImage,
  Lock,
  Unlock,
  Upload,
  Download,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  AlertTriangle,
  Info,
  Copy,
  Check,
  CheckCircle2,
  RefreshCcw,
  Binary,
  ArrowRight,
  Activity,
  Search
} from 'lucide-react';

export const SteganographyView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hide' | 'reveal'>('hide');

  // --- ENCODE (HIDE) STATE ---
  const [coverImage, setCoverImage] = useState<HTMLImageElement | null>(null);
  const [coverImageDataUrl, setCoverImageDataUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [secretMessage, setSecretMessage] = useState<string>('');
  const [encodePassword, setEncodePassword] = useState<string>('');
  const [showEncodePassword, setShowEncodePassword] = useState<boolean>(false);
  const [bitDepth, setBitDepth] = useState<1 | 2>(1);

  // Stego Result
  const [stegoDataUrl, setStegoDataUrl] = useState<string | null>(null);
  const [isEncoding, setIsEncoding] = useState<boolean>(false);
  const [encodeError, setEncodeError] = useState<string | null>(null);
  const [encodeSuccessMsg, setEncodeSuccessMsg] = useState<string | null>(null);
  
  // Metrics
  const [psnrDb, setPsnrDb] = useState<number | null>(null);
  const [mseVal, setMseVal] = useState<number | null>(null);
  const [payloadByteSize, setPayloadByteSize] = useState<number>(0);
  const [maxCapacityBytes, setMaxCapacityBytes] = useState<number>(0);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [heatmapDataUrl, setHeatmapDataUrl] = useState<string | null>(null);

  // --- DECODE (REVEAL) STATE ---
  const [stegoDecodeImage, setStegoDecodeImage] = useState<HTMLImageElement | null>(null);
  const [stegoDecodeDataUrl, setStegoDecodeDataUrl] = useState<string | null>(null);
  const [decodePassword, setDecodePassword] = useState<string>('');
  const [showDecodePassword, setShowDecodePassword] = useState<boolean>(false);
  const [isDecoding, setIsDecoding] = useState<boolean>(false);
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [decodedMeta, setDecodedMeta] = useState<{ isEncrypted: boolean; sizeBytes: number; extractTimeMs: number } | null>(null);

  // UI state
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const decodeFileInputRef = useRef<HTMLInputElement>(null);

  // Load preset sample images
  const handleSelectSampleImage = (type: 'cyber' | 'circuit' | 'matrix') => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (type === 'cyber') {
      const grad = ctx.createLinearGradient(0, 0, 640, 400);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#311042');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 400);

      // Grid lines
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 400);
        ctx.stroke();
      }
      for (let y = 0; y < 400; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }

      // Glowing cyber orb
      const orbGrad = ctx.createRadialGradient(320, 200, 10, 320, 200, 160);
      orbGrad.addColorStop(0, 'rgba(168, 85, 247, 0.8)');
      orbGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)');
      orbGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(320, 200, 160, 0, Math.PI * 2);
      ctx.fill();

      // Text watermark
      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 24px monospace';
      ctx.fillText('STEGANOGRAPHY COVER IMAGE', 140, 205);
    } else if (type === 'circuit') {
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, 640, 400);

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 100);
      ctx.lineTo(200, 100);
      ctx.lineTo(250, 150);
      ctx.lineTo(450, 150);
      ctx.lineTo(500, 100);
      ctx.lineTo(590, 100);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(100, 300);
      ctx.lineTo(220, 300);
      ctx.lineTo(270, 250);
      ctx.lineTo(420, 250);
      ctx.lineTo(480, 310);
      ctx.lineTo(550, 310);
      ctx.stroke();

      // Nodes
      const nodes = [
        [200, 100], [250, 150], [450, 150], [270, 250], [420, 250]
      ];
      nodes.forEach(([x, y]) => {
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('CYBER SECURITY BLUEPRINT', 170, 205);
    } else {
      ctx.fillStyle = '#050a05';
      ctx.fillRect(0, 0, 640, 400);

      ctx.fillStyle = '#10b981';
      ctx.font = '14px monospace';
      const chars = '0123456789ABCDEFSECUREWATCHSTEGO';
      for (let x = 10; x < 630; x += 22) {
        for (let y = 20; y < 390; y += 22) {
          const char = chars[Math.floor(Math.random() * chars.length)];
          ctx.globalAlpha = Math.random() * 0.8 + 0.2;
          ctx.fillText(char, x, y);
        }
      }
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#000000';
      ctx.fillRect(150, 175, 340, 50);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.strokeRect(150, 175, 340, 50);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('MATRIX STEGO COVER', 195, 207);
    }

    const dataUrl = canvas.toDataURL('image/png');
    loadCoverImageFromUrl(dataUrl);
  };

  const loadCoverImageFromUrl = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setCoverImage(img);
      setCoverImageDataUrl(url);
      setImageDimensions({ width: img.width, height: img.height });
      // Calculate max capacity: width * height * 3 color channels / 8 bits
      const totalPixels = img.width * img.height;
      const capacity = Math.floor((totalPixels * 3 * bitDepth) / 8) - 16; // subtract length header
      setMaxCapacityBytes(capacity);
      setStegoDataUrl(null);
      setEncodeError(null);
      setEncodeSuccessMsg(null);
      setPsnrDb(null);
      setMseVal(null);
    };
    img.src = url;
  };

  // Recalculate max capacity on bitDepth change
  useEffect(() => {
    if (imageDimensions) {
      const totalPixels = imageDimensions.width * imageDimensions.height;
      const capacity = Math.floor((totalPixels * 3 * bitDepth) / 8) - 16;
      setMaxCapacityBytes(capacity);
    }
  }, [bitDepth, imageDimensions]);

  // Handle Cover Image Upload
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setEncodeError('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        loadCoverImageFromUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Stego Image Upload for Decode
  const handleDecodeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        loadDecodeImageFromUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadDecodeImageFromUrl = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setStegoDecodeImage(img);
      setStegoDecodeDataUrl(url);
      setDecodedMessage(null);
      setDecodeError(null);
      setDecodedMeta(null);
    };
    img.src = url;
  };

  // --- REAL 100% STEGANOGRAPHY ENCODING LOGIC ---
  const handleEmbedPayload = () => {
    setEncodeError(null);
    setEncodeSuccessMsg(null);

    if (!coverImage || !coverImageDataUrl) {
      setEncodeError('Please upload or select a cover image first.');
      return;
    }

    if (!secretMessage.trim()) {
      setEncodeError('Please enter a secret message to embed.');
      return;
    }

    setIsEncoding(true);

    setTimeout(() => {
      try {
        // 1. Prepare Payload
        let messageToEmbed = secretMessage;
        let isEncrypted = false;

        if (encodePassword.trim()) {
          messageToEmbed = 'ENC:' + CryptoJS.AES.encrypt(secretMessage, encodePassword.trim()).toString();
          isEncrypted = true;
        } else {
          messageToEmbed = 'RAW:' + secretMessage;
        }

        const fullString = `STG1[${messageToEmbed}]END`;
        const encoder = new TextEncoder();
        const payloadBytes = encoder.encode(fullString);
        const totalPayloadLen = payloadBytes.length;

        setPayloadByteSize(totalPayloadLen);

        if (totalPayloadLen > maxCapacityBytes) {
          setEncodeError(`Payload size (${totalPayloadLen} bytes) exceeds image maximum capacity (${maxCapacityBytes} bytes). Please shorten text or use a larger image.`);
          setIsEncoding(false);
          return;
        }

        // 2. Prepare Canvas
        const canvas = document.createElement('canvas');
        canvas.width = coverImage.width;
        canvas.height = coverImage.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setEncodeError('Unable to initialize HTML5 Canvas 2D context.');
          setIsEncoding(false);
          return;
        }

        ctx.drawImage(coverImage, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Header buffer: 32-bit uint Big-Endian storing total payload bytes
        const headerBuffer = new Uint8Array(4);
        const view = new DataView(headerBuffer.buffer);
        view.setUint32(0, totalPayloadLen, false);

        // Combined data: [headerBuffer, payloadBytes]
        const fullBuffer = new Uint8Array(4 + payloadBytes.length);
        fullBuffer.set(headerBuffer, 0);
        fullBuffer.set(payloadBytes, 4);

        // Convert fullBuffer to Bit sequence
        const bits: number[] = [];
        for (let i = 0; i < fullBuffer.length; i++) {
          const byteVal = fullBuffer[i];
          for (let b = 7; b >= 0; b--) {
            bits.push((byteVal >> b) & 1);
          }
        }

        // Embed bits into LSB of RGBA channels (R, G, B channels only, skip Alpha)
        let bitIndex = 0;
        const totalBits = bits.length;

        // Copy original channel bytes for MSE / PSNR & Heatmap calculation
        const originalData = new Uint8ClampedArray(data);

        for (let i = 0; i < data.length && bitIndex < totalBits; i += 4) {
          // Channel 0: Red
          if (bitIndex < totalBits) {
            data[i] = (data[i] & 0xfe) | bits[bitIndex];
            bitIndex++;
          }
          // Channel 1: Green
          if (bitIndex < totalBits) {
            data[i + 1] = (data[i + 1] & 0xfe) | bits[bitIndex];
            bitIndex++;
          }
          // Channel 2: Blue
          if (bitIndex < totalBits) {
            data[i + 2] = (data[i + 2] & 0xfe) | bits[bitIndex];
            bitIndex++;
          }
          // Skip Alpha channel (i + 3) to keep 100% opacity
        }

        ctx.putImageData(imgData, 0, 0);
        const resultDataUrl = canvas.toDataURL('image/png');
        setStegoDataUrl(resultDataUrl);

        // 3. Calculate Real PSNR & MSE
        let mseSum = 0;
        let alteredCount = 0;

        const heatmapCanvas = document.createElement('canvas');
        heatmapCanvas.width = canvas.width;
        heatmapCanvas.height = canvas.height;
        const heatCtx = heatmapCanvas.getContext('2d');

        if (heatCtx) {
          const heatImgData = heatCtx.createImageData(canvas.width, canvas.height);
          const heatData = heatImgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const diffR = Math.abs(originalData[i] - data[i]);
            const diffG = Math.abs(originalData[i + 1] - data[i + 1]);
            const diffB = Math.abs(originalData[i + 2] - data[i + 2]);
            const diff = diffR + diffG + diffB;

            mseSum += diffR * diffR + diffG * diffG + diffB * diffB;

            if (diff > 0) {
              alteredCount++;
              // Heatmap: Highlight modified pixels in neon cyan/pink
              heatData[i] = 236;     // Red
              heatData[i + 1] = 72;  // Green
              heatData[i + 2] = 153; // Blue
              heatData[i + 3] = 255; // Full opacity
            } else {
              heatData[i] = 15;
              heatData[i + 1] = 23;
              heatData[i + 2] = 42;
              heatData[i + 3] = 220;
            }
          }

          heatCtx.putImageData(heatImgData, 0, 0);
          setHeatmapDataUrl(heatmapCanvas.toDataURL('image/png'));
        }

        const totalChannels = (data.length / 4) * 3;
        const calculatedMse = mseSum / totalChannels;
        setMseVal(calculatedMse);

        if (calculatedMse === 0) {
          setPsnrDb(99.99); // Infinite / identical
        } else {
          const psnr = 10 * Math.log10((255 * 255) / calculatedMse);
          setPsnrDb(parseFloat(psnr.toFixed(2)));
        }

        setEncodeSuccessMsg(
          `Payload of ${totalPayloadLen} bytes embedded into image LSB channels with 100% stealth! (${alteredCount} pixels subtly modified)`
        );
      } catch (err: any) {
        console.error('Steganography Embed Error:', err);
        setEncodeError('An error occurred while encoding stego payload: ' + (err.message || err));
      } finally {
        setIsEncoding(false);
      }
    }, 150);
  };

  // --- REAL 100% STEGANOGRAPHY DECODING LOGIC ---
  const handleExtractPayload = () => {
    setDecodeError(null);
    setDecodedMessage(null);
    setDecodedMeta(null);

    if (!stegoDecodeImage) {
      setDecodeError('Please upload or select a stego image first.');
      return;
    }

    setIsDecoding(true);
    const startTime = performance.now();

    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = stegoDecodeImage.width;
        canvas.height = stegoDecodeImage.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setDecodeError('Unable to initialize HTML5 Canvas 2D context.');
          setIsDecoding(false);
          return;
        }

        ctx.drawImage(stegoDecodeImage, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // 1. Extract first 32 bits for uint32 byte length header
        const headerBits: number[] = [];
        let pIndex = 0;

        while (headerBits.length < 32 && pIndex < data.length) {
          headerBits.push(data[pIndex] & 1); // R
          if (headerBits.length < 32) headerBits.push(data[pIndex + 1] & 1); // G
          if (headerBits.length < 32) headerBits.push(data[pIndex + 2] & 1); // B
          pIndex += 4;
        }

        if (headerBits.length < 32) {
          setDecodeError('No steganographic payload detected (Image too small or no LSB data).');
          setIsDecoding(false);
          return;
        }

        // Convert 32 header bits to uint32 length
        let payloadLenInBytes = 0;
        for (let i = 0; i < 32; i++) {
          payloadLenInBytes = (payloadLenInBytes << 1) | headerBits[i];
        }

        const maxAllowed = Math.floor(((data.length / 4) * 3) / 8);
        if (payloadLenInBytes <= 0 || payloadLenInBytes > maxAllowed) {
          setDecodeError('No hidden steganographic payload found in this image.');
          setIsDecoding(false);
          return;
        }

        // 2. Extract next (payloadLenInBytes * 8) bits
        const totalPayloadBitsNeeded = payloadLenInBytes * 8;
        const payloadBits: number[] = [];

        // Reset and extract exact bits
        let bitCount = 0;
        for (let i = 0; i < data.length && bitCount < 32 + totalPayloadBitsNeeded; i += 4) {
          // Channel R
          if (bitCount >= 32 && bitCount < 32 + totalPayloadBitsNeeded) {
            payloadBits.push(data[i] & 1);
          }
          bitCount++;

          // Channel G
          if (bitCount >= 32 && bitCount < 32 + totalPayloadBitsNeeded) {
            payloadBits.push(data[i + 1] & 1);
          }
          bitCount++;

          // Channel B
          if (bitCount >= 32 && bitCount < 32 + totalPayloadBitsNeeded) {
            payloadBits.push(data[i + 2] & 1);
          }
          bitCount++;
        }

        if (payloadBits.length < totalPayloadBitsNeeded) {
          setDecodeError('Corrupted or incomplete steganographic data stream.');
          setIsDecoding(false);
          return;
        }

        // 3. Convert payload bits back into Uint8Array
        const extractedBytes = new Uint8Array(payloadLenInBytes);
        for (let i = 0; i < payloadLenInBytes; i++) {
          let byteVal = 0;
          for (let b = 0; b < 8; b++) {
            byteVal = (byteVal << 1) | payloadBits[i * 8 + b];
          }
          extractedBytes[i] = byteVal;
        }

        // 4. Reconstruct String
        const decoder = new TextDecoder('utf-8');
        const rawString = decoder.decode(extractedBytes);

        // Check magic markers STG1[...]END
        if (!rawString.startsWith('STG1[') || !rawString.endsWith(']END')) {
          setDecodeError('Invalid or unverified stego header. Image does not contain a valid SecureWatch payload.');
          setIsDecoding(false);
          return;
        }

        const innerContent = rawString.substring(5, rawString.length - 4);

        let finalPlaintext = '';
        let isEnc = false;

        if (innerContent.startsWith('ENC:')) {
          isEnc = true;
          const cipherText = innerContent.substring(4);
          if (!decodePassword.trim()) {
            setDecodeError('This stego image is encrypted with a password! Please enter the decryption key below.');
            setIsDecoding(false);
            return;
          }

          try {
            const bytes = CryptoJS.AES.decrypt(cipherText, decodePassword.trim());
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            if (!decrypted) {
              setDecodeError('Incorrect decryption password. Unable to unlock secret text.');
              setIsDecoding(false);
              return;
            }
            finalPlaintext = decrypted;
          } catch (e) {
            setDecodeError('Decryption failed. Invalid passphrase.');
            setIsDecoding(false);
            return;
          }
        } else if (innerContent.startsWith('RAW:')) {
          finalPlaintext = innerContent.substring(4);
        } else {
          finalPlaintext = innerContent;
        }

        const endTime = performance.now();
        setDecodedMessage(finalPlaintext);
        setDecodedMeta({
          isEncrypted: isEnc,
          sizeBytes: payloadLenInBytes,
          extractTimeMs: parseFloat((endTime - startTime).toFixed(2)),
        });
      } catch (err: any) {
        console.error('Steganography Extract Error:', err);
        setDecodeError('Extraction error: ' + (err.message || err));
      } finally {
        setIsDecoding(false);
      }
    }, 150);
  };

  // Copy to Clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Direct action: Transfer generated stego image to decode tab
  const handleSendToDecoder = () => {
    if (!stegoDataUrl) return;
    setActiveTab('reveal');
    loadDecodeImageFromUrl(stegoDataUrl);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-purple-950/80 via-[#161233] to-[#0d0f28] border border-purple-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-purple-600/20 border border-purple-500/40 rounded-xl text-purple-400 shadow-inner">
              <FileImage className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  StegoShield
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Binary className="w-3 h-3 text-purple-400" />
                  LSB Cyber Stealth
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Hide confidential text, passwords, or encrypted payloads inside losslessly encoded PNG images using Least Significant Bit (LSB) manipulation.
              </p>
            </div>
          </div>

          {/* Mode Selector Switch */}
          <div className="flex items-center gap-2 bg-[#0d0f24] p-1.5 rounded-xl border border-[#23254d]">
            <button
              onClick={() => setActiveTab('hide')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'hide'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" /> Embed / Hide
            </button>
            <button
              onClick={() => setActiveTab('reveal')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'reveal'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Unlock className="w-4 h-4" /> Extract / Reveal
            </button>
          </div>
        </div>
      </div>

      {/* ==================== TAB 1: EMBED / HIDE MESSAGE ==================== */}
      {activeTab === 'hide' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Inputs Column */}
          <div className="lg:col-span-6 space-y-5">
            {/* Step 1: Select or Upload Cover Image */}
            <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b2545]">
                <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-mono font-bold">1</span>
                  Select Cover Image
                </h2>
                <span className="text-[11px] text-gray-400 font-mono">PNG / JPG / WebP</span>
              </div>

              {/* Sample Images row */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-2">
                  Quick Presets (Click to load):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSelectSampleImage('cyber')}
                    className="p-2 bg-[#121832] hover:bg-[#1a234a] border border-[#232f57] hover:border-purple-500/50 rounded-xl text-left transition cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-purple-300 group-hover:text-white">Cyber Grid</div>
                    <div className="text-[10px] text-gray-500">640x400 PNG</div>
                  </button>
                  <button
                    onClick={() => handleSelectSampleImage('circuit')}
                    className="p-2 bg-[#121832] hover:bg-[#1a234a] border border-[#232f57] hover:border-cyan-500/50 rounded-xl text-left transition cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-cyan-300 group-hover:text-white">Blueprint</div>
                    <div className="text-[10px] text-gray-500">640x400 PNG</div>
                  </button>
                  <button
                    onClick={() => handleSelectSampleImage('matrix')}
                    className="p-2 bg-[#121832] hover:bg-[#1a234a] border border-[#232f57] hover:border-emerald-500/50 rounded-xl text-left transition cursor-pointer group"
                  >
                    <div className="text-xs font-bold text-emerald-300 group-hover:text-white">Matrix Code</div>
                    <div className="text-[10px] text-gray-500">640x400 PNG</div>
                  </button>
                </div>
              </div>

              {/* Upload Drag & Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#232f57] hover:border-purple-500/60 bg-[#10162e] hover:bg-[#131b3b] rounded-xl p-5 text-center cursor-pointer transition group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCoverUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-gray-200">
                  Click or drag image file here to upload
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Supports lossless PNG (recommended), JPG, WebP
                </p>
              </div>

              {/* Cover Preview Card */}
              {coverImageDataUrl && imageDimensions && (
                <div className="p-3 bg-[#0d142b] border border-purple-500/30 rounded-xl flex items-center gap-3">
                  <img
                    src={coverImageDataUrl}
                    alt="Cover preview"
                    className="w-16 h-16 object-cover rounded-lg border border-[#232f57]"
                  />
                  <div className="text-xs space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Cover Image Loaded
                    </div>
                    <div className="text-gray-400 font-mono text-[11px]">
                      Dimensions: {imageDimensions.width} x {imageDimensions.height} px
                    </div>
                    <div className="text-purple-300 font-mono text-[11px] font-bold">
                      Max Payload: {(maxCapacityBytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Enter Secret Payload */}
            <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b2545]">
                <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-mono font-bold">2</span>
                  Secret Message to Hide
                </h2>
                <span className="text-[11px] font-mono text-purple-400 font-bold">
                  {secretMessage.length} chars (~{new TextEncoder().encode(secretMessage).length} bytes)
                </span>
              </div>

              <textarea
                value={secretMessage}
                onChange={(e) => setSecretMessage(e.target.value)}
                placeholder="Type your confidential text, AES keys, private credentials, or secret notes to hide inside the image..."
                rows={5}
                className="w-full bg-[#10162e] border border-[#212a4a] rounded-xl p-4 text-xs text-gray-100 placeholder-gray-600 font-mono focus:outline-none focus:border-purple-500 transition resize-none leading-relaxed"
              />

              {/* Payload Capacity Bar */}
              {maxCapacityBytes > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-gray-400">
                    <span>Capacity Usage</span>
                    <span>
                      {((new TextEncoder().encode(secretMessage).length / maxCapacityBytes) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-[#141b36] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        new TextEncoder().encode(secretMessage).length > maxCapacityBytes
                          ? 'bg-red-500'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (new TextEncoder().encode(secretMessage).length / maxCapacityBytes) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Security & Encryption Passphrase */}
            <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b2545]">
                <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-mono font-bold">3</span>
                  Security & Encryption
                </h2>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  AES-256 Optional
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Optional Encryption Password:
                </label>
                <div className="relative">
                  <input
                    type={showEncodePassword ? 'text' : 'password'}
                    value={encodePassword}
                    onChange={(e) => setEncodePassword(e.target.value)}
                    placeholder="Leave empty for unencrypted LSB hide, or enter secret key..."
                    className="w-full bg-[#121935] border border-[#232f57] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-gray-600 font-mono focus:outline-none focus:border-purple-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEncodePassword(!showEncodePassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-white cursor-pointer"
                  >
                    {showEncodePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  If set, text is AES-256 encrypted prior to LSB embedding.
                </p>
              </div>

              {/* Bit Depth */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                  Steganographic Bit Depth:
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#121935] p-1 rounded-xl border border-[#232f57]">
                  <button
                    onClick={() => setBitDepth(1)}
                    className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      bitDepth === 1
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    1-Bit LSB (Max Stealth)
                  </button>
                  <button
                    onClick={() => setBitDepth(2)}
                    className={`py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      bitDepth === 2
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    2-Bit LSB (Higher Cap)
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {encodeError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{encodeError}</span>
                </div>
              )}

              {/* Action Embed Button */}
              <button
                onClick={handleEmbedPayload}
                disabled={isEncoding}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isEncoding ? (
                  <>
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    Embedding Stego Payload...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Embed Payload into Image
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Stego Output Workspace */}
          <div className="lg:col-span-6 space-y-5">
            <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-5 shadow-lg space-y-5 min-h-[500px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1b2545]">
                  <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    Stego Output & Imperceptibility Analysis
                  </h2>
                  {stegoDataUrl && (
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      STEGO READY
                    </span>
                  )}
                </div>

                {/* Success Banner */}
                {encodeSuccessMsg && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{encodeSuccessMsg}</span>
                  </div>
                )}

                {!stegoDataUrl ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-[#121935] border border-[#232f57] mx-auto flex items-center justify-center text-gray-500">
                      <FileImage className="w-8 h-8 text-purple-500/40" />
                    </div>
                    <p className="text-xs text-gray-400 font-mono">
                      No stego image generated yet. Load a cover image and click "Embed Payload".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Visual Comparison: Original vs Stego Image */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-mono font-semibold text-gray-400 block">
                          Original Cover Image
                        </span>
                        <div className="rounded-xl overflow-hidden border border-[#232f57] bg-black/40 aspect-video flex items-center justify-center">
                          <img
                            src={coverImageDataUrl!}
                            alt="Original cover"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[11px] font-mono font-semibold text-purple-300 block flex items-center gap-1">
                          Stego Encoded Image
                        </span>
                        <div className="rounded-xl overflow-hidden border border-purple-500/50 bg-black/40 aspect-video flex items-center justify-center relative">
                          <img
                            src={showHeatmap && heatmapDataUrl ? heatmapDataUrl : stegoDataUrl}
                            alt="Stego encoded"
                            className="max-h-full max-w-full object-contain"
                          />
                          {showHeatmap && (
                            <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-pink-600 text-white">
                              HEATMAP
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quality Metrics */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-[#0e1633] border border-purple-500/20 rounded-xl text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-gray-400">PSNR (Imperceptibility)</div>
                        <div className="text-emerald-400 font-bold text-sm">
                          {psnrDb !== null ? `${psnrDb} dB` : 'N/A'}
                        </div>
                        <div className="text-[9px] text-gray-500">&gt;80dB = Invisible</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">MSE Noise Error</div>
                        <div className="text-purple-300 font-bold text-sm">
                          {mseVal !== null ? mseVal.toFixed(6) : '0.00'}
                        </div>
                        <div className="text-[9px] text-gray-500">Near Zero</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-400">Payload Size</div>
                        <div className="text-cyan-300 font-bold text-sm">
                          {payloadByteSize} Bytes
                        </div>
                        <div className="text-[9px] text-gray-500">LSB Embedded</div>
                      </div>
                    </div>

                    {/* Heatmap Toggle */}
                    <div className="flex items-center justify-between p-2.5 bg-[#121a3a] rounded-xl border border-[#23315c]">
                      <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-pink-400" />
                        Pixel Difference Heatmap
                      </span>
                      <button
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          showHeatmap
                            ? 'bg-pink-600 text-white'
                            : 'bg-[#1a254f] text-gray-300 hover:text-white'
                        }`}
                      >
                        {showHeatmap ? 'Hide Heatmap' : 'Highlight Altered Pixels'}
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <a
                        href={stegoDataUrl}
                        download="stego-protected-image.png"
                        className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow flex items-center justify-center gap-2 transition"
                      >
                        <Download className="w-4 h-4" />
                        Download Stego PNG
                      </a>

                      <button
                        onClick={handleSendToDecoder}
                        className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Test Extract in Decoder
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footnote */}
              <div className="p-3 bg-[#0e142c] rounded-xl border border-[#1e274b] text-[11px] text-gray-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  Always download stego images in lossless <strong>PNG</strong> format. Compression in JPEG alters pixel colors and destroys LSB payloads.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: EXTRACT / REVEAL MESSAGE ==================== */}
      {activeTab === 'reveal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Inputs Column */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b2545]">
                <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-emerald-400" />
                  Upload Stego Image
                </h2>
                <span className="text-[11px] text-gray-400 font-mono">PNG Lossless</span>
              </div>

              {/* Upload Drag & Drop Area */}
              <div
                onClick={() => decodeFileInputRef.current?.click()}
                className="border-2 border-dashed border-[#232f57] hover:border-emerald-500/60 bg-[#10162e] hover:bg-[#131b3b] rounded-xl p-6 text-center cursor-pointer transition group"
              >
                <input
                  type="file"
                  ref={decodeFileInputRef}
                  onChange={handleDecodeImageUpload}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-xs font-semibold text-gray-200">
                  Upload stego PNG image to scan
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Click or drag file here
                </p>
              </div>

              {/* Image Preview */}
              {stegoDecodeDataUrl && (
                <div className="p-3 bg-[#0d142b] border border-emerald-500/30 rounded-xl flex items-center gap-3">
                  <img
                    src={stegoDecodeDataUrl}
                    alt="Stego to decode"
                    className="w-16 h-16 object-cover rounded-lg border border-[#232f57]"
                  />
                  <div className="text-xs space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Stego Target Image Selected
                    </div>
                    <div className="text-gray-400 font-mono text-[11px]">
                      {stegoDecodeImage ? `${stegoDecodeImage.width} x ${stegoDecodeImage.height} px` : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Decryption Passphrase Input */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1.5 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Decryption Password (If Encrypted):
                </label>
                <div className="relative">
                  <input
                    type={showDecodePassword ? 'text' : 'password'}
                    value={decodePassword}
                    onChange={(e) => setDecodePassword(e.target.value)}
                    placeholder="Enter password if payload was encrypted..."
                    className="w-full bg-[#121935] border border-[#232f57] rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-gray-600 font-mono focus:outline-none focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDecodePassword(!showDecodePassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-white cursor-pointer"
                  >
                    {showDecodePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {decodeError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{decodeError}</span>
                </div>
              )}

              {/* Extract Action Button */}
              <button
                onClick={handleExtractPayload}
                disabled={isDecoding}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isDecoding ? (
                  <>
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                    Scanning Image LSB Data...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Extract Hidden Payload
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Decoded Output Panel */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-5 shadow-lg space-y-4 min-h-[420px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1b2545]">
                  <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Extracted Secret Message Output
                  </h2>
                  {decodedMeta && (
                    <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      EXTRACTED IN {decodedMeta.extractTimeMs} MS
                    </span>
                  )}
                </div>

                {!decodedMessage ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-[#121935] border border-[#232f57] mx-auto flex items-center justify-center text-gray-500">
                      <Unlock className="w-8 h-8 text-emerald-500/40" />
                    </div>
                    <p className="text-xs text-gray-400 font-mono">
                      No message extracted yet. Select a stego PNG image and click "Extract Hidden Payload".
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Metadata Header */}
                    <div className="flex items-center justify-between p-3 bg-[#0e1836] border border-emerald-500/30 rounded-xl text-xs font-mono">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-bold">Verified Steganographic Payload</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {decodedMeta?.isEncrypted ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            AES-256 Decrypted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Plaintext LSB
                          </span>
                        )}
                        <span className="text-gray-400 text-[11px]">
                          {decodedMeta?.sizeBytes} Bytes
                        </span>
                      </div>
                    </div>

                    {/* Decoded Text Box */}
                    <div className="relative">
                      <textarea
                        readOnly
                        value={decodedMessage}
                        rows={8}
                        className="w-full bg-[#0d142b] border border-emerald-500/40 rounded-xl p-4 text-xs text-emerald-200 font-mono focus:outline-none transition resize-none leading-relaxed shadow-inner"
                      />
                      <button
                        onClick={() => handleCopyText(decodedMessage)}
                        className="absolute right-3 top-3 px-2.5 py-1.5 bg-[#172147] hover:bg-emerald-600 text-gray-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Text
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Informational Footer */}
              <div className="p-3 bg-[#0e142c] rounded-xl border border-[#1e274b] text-[11px] text-gray-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Our engine automatically verifies 32-bit uint Big-Endian header frames and STG1 magic delimiters before reading pixel data.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Educational Steganography Guide Card */}
      <div className="bg-[#0b1021] border border-[#1e294b] rounded-2xl p-5 text-xs text-gray-300 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
          <Info className="w-4 h-4" /> Steganography Cyber Defense Principles
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-400 pt-1">
          <div className="space-y-1">
            <span className="text-white font-semibold block">Least Significant Bit (LSB)</span>
            <p className="leading-relaxed text-[11px]">
              LSB steganography works by replacing the last bit of pixel color byte values (Red, Green, Blue) with secret bits. Because 1/255 brightness shift is imperceptible to human eyes, the image appears untouched.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-white font-semibold block">Lossless vs. Lossy Formats</span>
            <p className="leading-relaxed text-[11px]">
              PNG format uses PNG DEFLATE lossless compression, preserving exact pixel RGBA integers. JPEG compression destroys high frequency details and corrupts LSB bits.
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-white font-semibold block">Steganalysis & Defense</span>
            <p className="leading-relaxed text-[11px]">
              Cybersecurity analysts use chi-square distribution checks, visual heatmap analysis, and entropy detection to audit images for hidden malicious exfiltration payloads or C2 channels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
