import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server.ts';

export const config = {
  maxDuration: 30,
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}