import { VercelRequest, VercelResponse } from '@vercel/node';

export default async (_req: VercelRequest, res: VercelResponse) => {
  return res.status(410).json({
    error: 'Osiris GPT has been removed from SecureWatch.'
  });
};
