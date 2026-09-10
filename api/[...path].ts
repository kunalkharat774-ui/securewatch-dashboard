import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { default: app } = await import('../server.ts');
    return await app(req, res);
  } catch (error: unknown) {
    console.error('Vercel API request failed:', error);

    if (res.headersSent) {
      return res.end();
    }

    const message = error instanceof Error && error.message
      ? error.message
      : 'Internal Server Error';

    return res.status(500).json({ error: message });
  }
}