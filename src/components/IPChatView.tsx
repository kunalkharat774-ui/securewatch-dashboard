import React, { useState, useEffect } from 'react';

interface IpChatViewProps {
  onBackToDashboard?: () => void;
}

export const IpChatView: React.FC<IpChatViewProps> = ({ onBackToDashboard }) => {
  const [userIp, setUserIp] = useState('152.58.112.42');
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    const fakeIp = `${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    setUserIp(fakeIp);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0803]/80 backdrop-blur-md border border-amber-500/30 rounded-xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-amber-500/20 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-comments text-amber-400 text-lg" /> IP Chat Portal
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                SECURE CHAT
              </span>
            </div>
            <p className="text-xs text-amber-200/70 mt-1">
              Direct IP-based messaging and peer-to-peer security chat channel.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="px-3.5 py-2 bg-[#141008] hover:bg-[#20180a] border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-arrow-left" /> Back to Dashboard
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 flex-wrap gap-3">
          <div className="text-xs font-mono text-amber-300 flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <i className="fa-solid fa-wifi text-emerald-400" />
            <span>My Network IP: <strong>{userIp}</strong></span>
          </div>

          <button
            onClick={() => {
              setIsIframeLoading(true);
              setIframeError(false);
              const iframe = document.getElementById('ipchat-frame') as HTMLIFrameElement;
              if (iframe) iframe.src = 'https://ipchat.in/';
            }}
            className="px-3 py-1.5 bg-[#141008] hover:bg-[#20180a] text-amber-300 text-xs rounded-lg border border-amber-500/30 transition cursor-pointer flex items-center gap-1.5 font-mono"
          >
            <i className="fa-solid fa-rotate-right" /> Reload Chat Frame
          </button>
        </div>
      </div>

      <div className="bg-[#0a0803]/90 backdrop-blur-md border border-amber-500/30 rounded-xl p-4 shadow-2xl flex flex-col min-h-[620px] relative">
        <div className="flex-1 relative rounded-lg overflow-hidden border border-amber-500/20 bg-black min-h-[580px]">
          {isIframeLoading && (
            <div className="absolute inset-0 z-10 bg-[#050505] flex flex-col items-center justify-center space-y-3">
              <i className="fa-solid fa-spinner animate-spin text-amber-400 text-3xl" />
              <p className="text-xs text-amber-300 font-mono">Connecting to IP Chat live channel...</p>
            </div>
          )}

          {iframeError && (
            <div className="absolute inset-0 z-10 bg-[#0a0803] flex flex-col items-center justify-center p-6 text-center space-y-4">
              <i className="fa-solid fa-triangle-exclamation text-amber-400 text-4xl" />
              <h3 className="text-base font-bold text-white">Frame Connection Restricted</h3>
              <p className="text-xs text-amber-200/70 max-w-md">
                The embedded chat service cannot be displayed within iframe containers due to browser security policy rules.
              </p>
            </div>
          )}

          <iframe
            id="ipchat-frame"
            src="https://ipchat.in/"
            title="IP Chat Portal"
            className="w-full h-full min-h-[580px] border-0"
            onLoad={() => setIsIframeLoading(false)}
            onError={() => {
              setIsIframeLoading(false);
              setIframeError(true);
            }}
          />
        </div>
      </div>
    </div>
  );
};
