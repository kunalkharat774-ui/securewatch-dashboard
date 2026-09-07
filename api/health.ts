import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function health(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'OK',
    service: 'SecureWatch Backend API',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',
  });
}
