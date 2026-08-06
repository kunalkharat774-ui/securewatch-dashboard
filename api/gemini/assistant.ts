import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true });
dotenv.config({ override: true });

export function buildLocalAssistantResponse(prompt: string) {
  const lower = prompt.toLowerCase();
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
