import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });
dotenv.config({ override: true });

function buildLocalAssistantResponse(prompt: string) {
  const lower = prompt.toLowerCase();
  const topic = lower.includes('sql') || lower.includes('injection')
    ? 'SQL Injection'
    : lower.includes('phish') || lower.includes('email')
      ? 'Phishing'
      : lower.includes('tls') || lower.includes('ssl')
        ? 'TLS/SSL'
        : lower.includes('hash') || lower.includes('bcrypt') || lower.includes('argon2')
          ? 'Password Hashing'
          : 'Cybersecurity';

  return `### 🛡️ SecureWatch AI Guidance\n\nHere is a practical explanation of **${topic}** in a defensive and educational way:\n\n1. **Core concept**: ${topic} is best understood by identifying its purpose, the risk it introduces, and the safe implementation pattern.\n2. **Why it matters**: Poor handling can lead to data leakage, weak access control, unstable systems, or exploitable flaws.\n3. **Strong defenses**: Validate inputs, enforce least privilege, use strong authentication, encrypt sensitive data, and keep systems patched.\n4. **Good practice**: Prefer well-documented libraries, secure defaults, and layered protections over brittle shortcuts.\n\n#### Helpful next step\nIf you want, I can turn this into a beginner-friendly explanation, a technical deep dive, or a remediation checklist for your specific scenario.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, history } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY;
    const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

    const systemInstruction = `You are SecureWatch AI, a dedicated AI Security & Knowledge Assistant. Provide clear, educational, defensive answers about cybersecurity, networking, programming, and system hardening.`;

    const contents: any[] = [];
    if (Array.isArray(history)) {
      history.forEach((m: any) => {
        if (m.content && (m.role === 'user' || m.role === 'model')) {
          contents.push({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(m.content) }]
          });
        }
      });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    let responseText = '';

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash-exp',
          contents,
          config: { systemInstruction, temperature: 0.7 }
        });
        if (response?.text) {
          responseText = response.text;
        }
      } catch (err) {
        console.warn('Gemini request failed in Vercel handler:', err);
      }
    }

    if (!responseText) {
      responseText = buildLocalAssistantResponse(prompt);
    }

    return res.status(200).json({ responseText });
  } catch (error: any) {
    console.error('Vercel AI assistant error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
