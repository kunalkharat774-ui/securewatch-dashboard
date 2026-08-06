import React, { useState, useRef, useEffect } from 'react';
import { HackerIcon } from '../HackerIcon';
import {
  User,
  Send,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Cpu,
  Zap,
  Terminal,
  Code,
  Layers,
  Trash2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const STARTER_PROMPTS = [
  {
    icon: ShieldCheck,
    label: 'Defending Against SQL Injection',
    query: 'Explain how SQL Injection works theoretically and how to defend against it using prepared statements.'
  },
  {
    icon: Lock,
    label: 'OWASP Top 10 Breakdown',
    query: 'Provide an educational summary of the top OWASP web application security risks and defense best practices.'
  },
  {
    icon: Cpu,
    label: 'TCP 3-Way Handshake',
    query: 'Explain the networking concepts behind the TCP 3-Way Handshake and SYN Flood mitigation techniques.'
  },
  {
    icon: Code,
    label: 'Secure Password Hashing',
    query: 'What is the difference between encryption and hashing? How do bcrypt and Argon2 protect passwords?'
  },
  {
    icon: Layers,
    label: 'Ethical Hacking vs Cyber Attacks',
    query: 'What is the fundamental difference between Ethical Hacking / Cyber Defense and unauthorized cyberattacks?'
  }
];

interface AiAssistantViewProps {
  onBackToDashboard?: () => void;
}

const buildLocalAssistantReply = (prompt: string) => {
  const lower = prompt.toLowerCase().trim();
  const cleaned = prompt
    .replace(/^(explain|what is|tell me about|describe|how does|how can i|why does|can you explain)\s+/i, '')
    .trim();
  const topic = cleaned || 'your security topic';

  if (/(login|sign in|auth|brute force|rate limit|lockout|captcha|mfa|password)/i.test(lower)) {
    return `### 🛡️ Brute-Force Protection for Login Pages

To protect a login page against brute-force attacks, combine **rate limiting**, **account lockout**, **multi-factor authentication**, **CAPTCHA or bot detection**, and **strong password policy**.

1. **Rate limiting**: restrict repeated failed attempts per IP or per account.
2. **Account lockout / backoff**: slow down repeated guesses after a few errors.
3. **MFA**: require a second factor for high-risk sign-ins.
4. **CAPTCHA / bot checks**: reduce automated password spraying.
5. **Monitoring**: alert on bursty failure patterns and suspicious IP reputation.

A strong login flow should also log suspicious attempts and enforce long, unique credentials.`;
  }

  if (/(phish|email|spoof|scam|sender|link|domain)/i.test(lower)) {
    return `### 🎣 Phishing Awareness and Detection

Phishing works by tricking a user into trusting a fake sender, link, or website.

1. **Check the sender**: verify the address and look for subtle domain spoofing.
2. **Hover before you click**: inspect the actual destination URL rather than the displayed text.
3. **Verify requests**: use known contact channels to confirm urgent requests.
4. **Report suspicious messages**: alert your security team or email provider quickly.
5. **Use protections**: email filtering, MFA, and security awareness training help reduce risk.`;
  }

  if (/(tls|ssl|https|certificate|hsts|encryption in transit)/i.test(lower)) {
    return `### 🔐 TLS/SSL and Secure Communication

TLS protects data while it moves between a user and a server by encrypting traffic and validating server identity.

1. **HTTPS everywhere**: use TLS for all web traffic and redirect HTTP to HTTPS.
2. **TLS 1.3**: prefer modern versions and disable weak legacy protocols.
3. **Certificate validation**: ensure certificates are issued by trusted authorities and renewed on time.
4. **HSTS**: enforce HTTPS with HTTP Strict Transport Security.
5. **Secure configuration**: disable insecure ciphers and keep infrastructure patched.`;
  }

  if (/(sql|injection|prepared|parameterized|query)/i.test(lower)) {
    return `### 🧱 SQL Injection Defense

SQL Injection happens when untrusted user input changes the logic of a SQL query.

1. **Use prepared statements**: parameterize queries so input is treated as data, not code.
2. **Prefer ORMs**: modern database libraries often handle safe query construction.
3. **Validate input**: restrict allowed values and reject unexpected formats.
4. **Limit database permissions**: use least-privilege accounts for application access.
5. **Monitor and test**: review logs and run regular security testing.`;
  }

  if (/(owasp|top 10|xss|csrf|access control)/i.test(lower)) {
    return `### 🛡️ OWASP and Secure Web Development

The OWASP Top 10 highlights common web application weaknesses such as injection, broken access control, and security misconfiguration.

1. **Broken access control**: enforce server-side authorization checks.
2. **Injection flaws**: use parameterized queries and safe output encoding.
3. **Security misconfiguration**: harden defaults and remove unnecessary features.
4. **Sensitive data exposure**: encrypt data in transit and at rest.
5. **Monitoring**: log suspicious behavior and review failures regularly.`;
  }

  if (/(hash|bcrypt|argon2|password hashing|encryption and hashing)/i.test(lower)) {
    return `### 🔑 Password Hashing and Encryption

Encryption is reversible, while hashing is designed to be one-way for password storage.

1. **Use Argon2id or bcrypt** for password hashing instead of fast general-purpose hashes.
2. **Add a unique salt** to prevent rainbow-table attacks.
3. **Use strong encryption** for sensitive data in transit and at rest.
4. **Do not store plaintext passwords** or weakly hashed credentials.
5. **Keep libraries updated** to benefit from the latest security fixes.`;
  }

  return `### 🛡️ SecureWatch AI Guidance

Here is a practical explanation of **${topic}** in a defensive and educational way:

1. **Core concept**: ${topic} is best understood by identifying its purpose, the risk it introduces, and the safe implementation pattern.
2. **Why it matters**: Poor handling can lead to data leakage, weak access control, unstable systems, or exploitable flaws.
3. **Strong defenses**: Validate inputs, enforce least privilege, use strong authentication, encrypt sensitive data, and keep systems patched.
4. **Good practice**: Prefer well-documented libraries, secure defaults, and layered protections over brittle shortcuts.

#### Helpful next step
If you want, I can turn this into a beginner-friendly explanation, a technical deep dive, or a remediation checklist for your specific scenario.`;
};

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({ onBackToDashboard }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: `### Welcome to SecureWatch AI Assistant!

I am your dedicated **AI Security & Knowledge Assistant**. My primary goal is to provide clear, accurate, and detailed answers to all educational, conceptual, technical, and general queries regarding **Cybersecurity, Ethical Hacking concepts, Computer Networking, Programming, and System Hardening**.

#### Core Guidelines & Focus:
- 💡 **Information & Concepts**: Clear theoretical breakdowns formatted with lists and code snippets.
- 🛡️ **Defense & Safety Focus**: Always explaining security from an **Ethical Hacking, Cyber Defense, and Best Practices** perspective.
- 🔐 **Ethical Boundaries**: Politeness and non-assistance regarding live unauthorized attacks, focusing instead on theoretical mechanics and protective countermeasures.

*Feel free to pick one of the quick starter topics below or type your question!*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-msg')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: m.text
        }));

      const res = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          history: historyPayload
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned error status ${res.status}`);
      }

      const data = await res.json();
      const rawReply = typeof data.responseText === 'string' ? data.responseText.trim() : '';
      const botMsgText = rawReply || buildLocalAssistantReply(textToSend);

      const botMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: botMsgText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Error fetching AI assistant response:', err);
      
      const fallbackText = buildLocalAssistantReply(textToSend);

      const errorMsg: ChatMessage = {
        id: `assistant-fallback-${Date.now()}`,
        sender: 'assistant',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        sender: 'assistant',
        text: 'Chat history cleared. How can I assist you with cybersecurity, ethical hacking concepts, or networking today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const formatBoldText = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="text-cyan-200 font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="bg-[#121b3b] text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#23356e]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-base font-bold font-mono text-cyan-300 mt-3 mb-1.5 flex items-center gap-2">
            <span className="p-0.5 rounded bg-cyan-400 flex items-center justify-center">
              <HackerIcon className="w-3.5 h-3.5 text-black" />
            </span>
            <span>{line.replace('### ', '')}</span>
          </h3>
        );
      }
      if (line.startsWith('#### ')) {
        return (
          <h4 key={idx} className="text-sm font-semibold font-mono text-indigo-300 mt-2.5 mb-1">
            {line.replace('#### ', '')}
          </h4>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.replace(/^[-*]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-gray-200 text-xs leading-relaxed my-0.5">
            {formatBoldText(itemText)}
          </li>
        );
      }
      if (/^\d+\.\s+/.test(line)) {
        return (
          <li key={idx} className="ml-4 list-decimal text-gray-200 text-xs leading-relaxed my-0.5">
            {formatBoldText(line.replace(/^\d+\.\s+/, ''))}
          </li>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2"></div>;
      }
      return (
        <p key={idx} className="text-xs text-gray-200 leading-relaxed my-1">
          {formatBoldText(line)}
        </p>
      );
    });
  };

  return (
    <div className="space-y-5 flex flex-col h-[calc(100vh-100px)]">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0c1330] via-[#101c48] to-[#0c1433] border border-[#22356b] rounded-2xl p-5 shadow-xl shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white via-cyan-50 to-slate-200 flex items-center justify-center text-black shadow-lg shadow-cyan-500/10 shrink-0 mt-0.5 border border-cyan-400/40">
              <HackerIcon className="w-7 h-7 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-wide stylish-ai-title">
                  AI Security &amp; Knowledge Assistant
                </h1>
              </div>
              <p className="text-xs text-gray-300 mt-1 font-sans leading-relaxed">
                Educational, technical &amp; defensive AI helper for Cybersecurity, Ethical Hacking concepts, Networking, and Code Protection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="px-3.5 py-1.5 bg-[#111a3b] hover:bg-[#1a2754] text-cyan-300 hover:text-cyan-200 text-xs rounded-xl border border-[#233870] transition flex items-center gap-2 cursor-pointer font-mono font-medium shadow-md"
              >
                <i className="fa-solid fa-arrow-left text-xs" /> Back to Dashboard
              </button>
            )}
            <div className="px-3 py-1.5 rounded-xl bg-[#080d24] border border-[#1d2d5c] flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Defense Guardrails Active</span>
            </div>
            <button
              onClick={handleClearChat}
              title="Clear Conversation"
              className="p-2 rounded-xl bg-[#111a3b] hover:bg-rose-950/60 text-gray-400 hover:text-rose-300 border border-[#213264] hover:border-rose-800/60 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-[#0b122c] border border-[#1b2b5a] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Messages Container */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-mono font-bold shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/20'
                    : 'bg-white text-black shadow-white/10 border border-slate-200'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <HackerIcon className="w-5 h-5 text-black" />}
              </div>

              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-lg text-xs leading-relaxed relative group ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white rounded-tr-xs border border-cyan-400/30 font-medium'
                    : 'bg-[#0e173a] border border-[#1d2d5e] text-gray-200 rounded-tl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-4 pb-1 mb-1 border-b border-white/10 text-[10px] font-mono text-gray-400">
                  <span className="font-bold tracking-wider">
                    {msg.sender === 'user' ? 'YOU' : 'SECUREWATCH AI'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{msg.timestamp}</span>
                    {msg.sender === 'assistant' && (
                      <button
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        title="Copy message text"
                        className="text-gray-400 hover:text-cyan-300 transition"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {msg.sender === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div>{renderFormattedText(msg.text)}</div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-3 flex-row animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-white text-black border border-slate-200 flex items-center justify-center shrink-0 text-xs font-mono font-bold shadow-md">
                <HackerIcon className="w-5 h-5 text-black animate-pulse" />
              </div>
              <div className="bg-[#0e173a] border border-[#1d2d5e] text-gray-300 rounded-2xl rounded-tl-xs p-4 text-xs font-mono flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-gray-400 text-[11px]">Analyzing question under defense guidelines...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Starter Chips */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 border-t border-[#182752] bg-[#070d24]">
            <div className="text-[11px] font-mono text-gray-400 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Suggested Security Topics:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((starter, idx) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(starter.query)}
                    className="px-3 py-1.5 rounded-xl bg-[#0e1738] hover:bg-[#152352] border border-[#1f3063] hover:border-cyan-500/50 text-xs font-mono text-cyan-300 flex items-center gap-2 transition cursor-pointer text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{starter.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Controls Bar */}
        <div className="p-3 bg-[#080d24] border-t border-[#182752]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Ask any educational, technical, networking, or cybersecurity question..."
                disabled={isLoading}
                className="w-full bg-[#0f1738] border border-[#203164] text-white rounded-xl pl-4 pr-10 py-3 text-xs font-mono focus:outline-none focus:border-cyan-500 placeholder-gray-500"
              />
              <Terminal className="w-4 h-4 text-gray-500 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="h-[42px] px-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-mono font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-lg shadow-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 px-1 pt-2">
            <span>Press Enter to submit • Follows Ethical Hacking & Defensive Standards</span>
            <span>SecureWatch AI Engine v3.6</span>
          </div>
        </div>
      </div>
    </div>
  );
};
