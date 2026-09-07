import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 30,
};

let appPromise: Promise<(req: VercelRequest, res: VercelResponse) => unknown> | null = null;

function loadApp() {
  appPromise ??= import('../server').then((module) => module.default as (req: VercelRequest, res: VercelResponse) => unknown);
  return appPromise;
}

function sendFallback(req: VercelRequest, res: VercelResponse, error: unknown) {
  console.error('SecureWatch API initialization failed:', error);
  const route = String(req.url || '').split('?')[0];

  if (req.method === 'GET' && route === '/api/health') {
    return res.status(200).json({
      status: 'DEGRADED',
      service: 'SecureWatch Backend API',
      error: 'API initialization is temporarily unavailable.',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === 'GET' && (route === '/api/threats' || route === '/api/security-logs')) {
    return res.status(200).json(route === '/api/threats'
      ? { source: 'No verified live attacks currently available', fetchedAt: new Date().toISOString(), threats: [] }
      : { sessionId: 'unavailable', totalLogs: 0, logs: [] });
  }

  if (req.method === 'GET' && (route === '/api/url-scans' || route === '/api/file-activities')) {
    return res.status(200).json([]);
  }

  return res.status(503).json({ error: 'SecureWatch API is temporarily unavailable. Please retry shortly.' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (error) {
    return sendFallback(req, res, error);
  }
}