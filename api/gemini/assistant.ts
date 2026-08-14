import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generai';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
};

export default async (req: VercelRequest, res: VercelResponse) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, history } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });

    // Build conversation history
    const contents = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    // System instruction
    const systemInstruction = `You are Osiris, an advanced AI security assistant for SecureWatch, a cybersecurity monitoring dashboard. Your role is to provide expert guidance on cybersecurity topics, network security, threat analysis, and defensive strategies. Always prioritize security best practices and ethical considerations. Respond with clear, actionable insights. Be concise but thorough.`;

    const response = await model.generateContent({
      contents,
      systemInstruction
    });

    const text = response.response.text();

    return res.status(200).json({ responseText: text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);

    // Fallback response
    const fallbackResponse = `**System Status**: Osiris AI is currently processing requests through backup systems. Please try your query again in a moment. Error Details: ${error.message}`;

    return res.status(200).json({ responseText: fallbackResponse });
  }
};
