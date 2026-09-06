import type express from 'express';

export const config = {
  maxDuration: 30,
};

let appPromise: Promise<typeof import('../server').default> | undefined;

export default async function handler(req: express.Request, res: express.Response) {
  try {
    appPromise ??= import('../server').then((module) => module.default);
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error('Unable to initialize SecureWatch API:', error);
    return res.status(500).json({ error: 'Unable to initialize SecureWatch API.' });
  }
}