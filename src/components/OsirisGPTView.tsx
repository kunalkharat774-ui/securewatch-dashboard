import React, { useState, useEffect, useRef } from 'react';

const BOT_LOGO = "https://img.freepik.com/premium-vector/osiris-golden-logo-vector-illustration_116762-588.jpg";

interface Message {
    id: string;
    role: 'bot' | 'user';
    text: string;
}

const OsirisGPT: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'bot', text: "System online. No boundaries, no rules. How can I assist you?" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chatBoxRef = useRef<HTMLDivElement>(null);

    // 1. Matrix Animation Logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const chars = "WORM01";
        const fontSize = 16;
        const columns = Math.floor(canvas.width / fontSize);
        const drops: number[] = Array(columns).fill(1);

        const draw = () => {
            ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ff0000";
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 50);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', resize);
        };
    }, []);

    // 2. Auto-scroll Logic
    useEffect(() => {
        if (chatBoxRef.current) {
            chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // 3. Gemini API Integration
    const fetchGeminiResponse = async (userPrompt: string) => {
        try {
            const response = await fetch('/api/gemini/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userPrompt,
                    history: messages.map((message) => ({
                        role: message.role === 'user' ? 'user' : 'model',
                        content: message.text,
                    }))
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error || 'Gemini request failed');
            }

            return data.responseText || 'SecureWatch AI is unavailable right now.';
        } catch (error) {
            console.error('API Error:', error);
            return 'SecureWatch AI is currently offline. Please try again in a moment.';
        }
    };

    // 4. Handlers
    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: inputValue };
        setMessages(prev => [...prev, userMsg]);
        const currentInput = inputValue;
        setInputValue('');
        setIsLoading(true);

        const aiResponse = await fetchGeminiResponse(currentInput);

        const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'bot',
            text: aiResponse
        };

        setMessages(prev => [...prev, botMsg]);
        setIsLoading(false);
    };

    const handleClear = () => {
        setMessages([]);
        setTimeout(() => {
            setMessages([{ id: 'reboot', role: 'bot', text: "Logs wiped. Osiris system rebooted. Standing by..." }]);
        }, 300);
    };

    return (
        <div className="osiris-gpt-root">
            <style>{`
                .osiris-gpt-root {
                    margin: 0; padding: 0; width: 100vw; height: 100vh;
                    background-color: black;
                    font-family: 'Courier New', Courier, monospace;
                    overflow: hidden;
                    position: relative;
                }
                #matrix-canvas {
                    position: fixed;
                    top: 0; left: 0; width: 100vw; height: 100vh;
                    z-index: 1;
                    opacity: 0.4;
                }
                .ui-wrapper {
                    position: relative;
                    z-index: 10;
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .chat-container {
                    width: 95%;
                    max-width: 800px;
                    height: 85vh;
                    background: rgba(0, 0, 0, 0.95);
                    border: 1px solid #ff0000;
                    box-shadow: 0 0 25px rgba(255, 0, 0, 0.4);
                    display: flex;
                    flex-direction: column;
                    border-radius: 5px;
                }
                .header {
                    padding: 12px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 2px solid #ff0000;
                    background: rgba(40, 0, 0, 0.8);
                }
                .header-info { display: flex; align-items: center; gap: 15px; }
                
                /* Golden Osiris Logo Style */
                .header img { 
                    width: 45px; 
                    height: 45px; 
                    border-radius: 50%; 
                    border: 2px solid #ffd700; /* Gold Border */
                    box-shadow: 0 0 10px #ffd700;
                    object-fit: cover;
                }
                
                .header-text h2 { margin: 0; color: #ff0000; font-size: 1.2rem; letter-spacing: 2px; }
                
                .clear-btn {
                    background: #ff0000; color: black; border: none; padding: 8px 15px;
                    font-family: 'Courier New', Courier, monospace; font-size: 12px;
                    cursor: pointer; font-weight: bold; text-transform: uppercase; border-radius: 3px;
                }
                .clear-btn:hover { background: white; box-shadow: 0 0 15px white; }

                .chat-box {
                    flex: 1; padding: 20px; overflow-y: auto;
                    display: flex; flex-direction: column; gap: 15px;
                    scroll-behavior: smooth;
                }
                .message { display: flex; align-items: flex-start; gap: 12px; animation: fadeIn 0.3s forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .msg-content {
                    background: rgba(255, 0, 0, 0.1); padding: 12px;
                    border-radius: 4px; border-left: 2px solid #ff0000;
                    color: #ddd; max-width: 80%; white-space: pre-wrap;
                }
                .msg-user { border-left: none; border-right: 2px solid white; text-align: right; }
                
                .bot-img { 
                    width: 30px; 
                    height: 30px; 
                    border-radius: 50%; 
                    border: 1px solid #ffd700; /* Gold Border */
                    object-fit: cover;
                }
                
                .bot-tag { color: #ff0000; font-weight: bold; font-size: 11px; display: block; margin-bottom: 5px;}
                .user-tag { color: #fff; font-weight: bold; font-size: 11px; display: block; margin-bottom: 5px;}

                .typing-indicator { color: #ff0000; font-size: 12px; margin-left: 50px; font-style: italic; }

                .input-area { display: flex; padding: 15px; border-top: 1px solid #333; background: #000; }
                .input-area input {
                    flex: 1; background: #111; border: 1px solid #ff0000;
                    color: #ff3e3e; padding: 12px; outline: none;
                }
                .send-btn {
                    background: #ff0000; color: black; border: none;
                    padding: 0 20px; font-weight: bold; cursor: pointer; margin-left: 5px;
                }
                .send-btn:disabled { background: #550000; cursor: not-allowed; }
            `}</style>

            <canvas id="matrix-canvas" ref={canvasRef} />

            <div className="ui-wrapper">
                <div className="chat-container">
                    <div className="header">
                        <div className="header-info">
                            <img src={BOT_LOGO} alt="Golden Osiris Logo" />
                            <div className="header-text">
                                <h2>Osiris GPT</h2>
                            </div>
                        </div>
                        <button className="clear-btn" onClick={handleClear}>Clear Chat</button>
                    </div>

                    <div className="chat-box" ref={chatBoxRef}>
                        {messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className="message" 
                                style={{ flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}
                            >
                                {msg.role === 'bot' && <img src={BOT_LOGO} className="bot-img" alt="bot" />}
                                <div className={`msg-content ${msg.role === 'user' ? 'msg-user' : ''}`}>
                                    <span className={msg.role === 'bot' ? 'bot-tag' : 'user-tag'}>
                                        {msg.role === 'bot' ? 'Osiris GPT' : 'USER'}
                                    </span>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="typing-indicator">
                                Osiris is decoding encrypted response...
                            </div>
                        )}
                    </div>

                    <div className="input-area">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isLoading ? "Processing..." : "Type command..."}
                            disabled={isLoading}
                            autoComplete="off"
                        />
                        <button 
                            className="send-btn" 
                            onClick={handleSend}
                            disabled={isLoading}
                        >
                            {isLoading ? "..." : "RUN"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OsirisGPT;