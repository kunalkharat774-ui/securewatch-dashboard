import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 30,
};

function getRequestPath(req: VercelRequest): string {
  return String(req.url || '').split('?')[0].replace(/\/$/, '');
}

async function handleUrlReputation(req: VercelRequest, res: VercelResponse) {
  let body: Record<string, unknown> = {};
  if (typeof req.body === 'string') {
    try {
      const parsedBody = JSON.parse(req.body || '{}');
      if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
        return res.status(400).json({ error: 'A JSON object body is required.' });
      }
      body = parsedBody as Record<string, unknown>;
    } catch {
      return res.status(400).json({ error: 'Request body contains invalid JSON.' });
    }
  } else if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    body = req.body as Record<string, unknown>;
  }

  const rawUrl = String(body.url || '').trim();
  let targetUrl: URL;

  try {
    targetUrl = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
    if (!['http:', 'https:'].includes(targetUrl.protocol) || targetUrl.username || targetUrl.password) {
      throw new Error('unsupported URL');
    }
  } catch {
    return res.status(400).json({ error: 'Enter a valid HTTP or HTTPS URL.' });
  }

  const indicators: string[] = [];
  const hostname = targetUrl.hostname.toLowerCase();
  const suspiciousPattern = /(login|signin|verify|verification|wallet|crypto|password|credential|bonus|free[-_ ]?gift|reset)/i;
  const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work', '.date'];
  const brands = ['sbi', 'hdfc', 'icici', 'axisbank', 'paytm', 'phonepe', 'irctc', 'aadhaar', 'gpay', 'upi'];
  const isIpAddress = /^[\d.]+$/.test(hostname);
  const isBrandImpersonation = brands.some((brand) => hostname.includes(brand) && !hostname.endsWith(`.${brand}.com`) && hostname !== `${brand}.com` && !hostname.endsWith(`.${brand}.in`) && hostname !== `${brand}.in`);

  if (targetUrl.protocol !== 'https:') indicators.push('unencrypted HTTP');
  if (isIpAddress) indicators.push('direct IP address');
  if (hostname.includes('xn--')) indicators.push('internationalized/punycode hostname');
  if (suspiciousPattern.test(`${hostname}${targetUrl.pathname}`)) indicators.push('credential or reward themed URL');
  if (suspiciousTlds.some((tld) => hostname.endsWith(tld))) indicators.push('suspicious top-level domain');
  if (isBrandImpersonation) indicators.push('possible brand impersonation');

  let httpStatus: number | null = null;
  let responseTimeMs: number | null = null;
  const startedAt = Date.now();
  try {
    const response = await fetch(targetUrl, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(7000),
    });
    httpStatus = response.status;
    responseTimeMs = Date.now() - startedAt;
    if (response.status >= 500) indicators.push(`HTTP server error (${response.status})`);
  } catch {
    responseTimeMs = Date.now() - startedAt;
    indicators.push('HTTP endpoint could not be reached');
  }

  const malicious = indicators.some((item) => /credential|punycode|direct IP|brand impersonation/i.test(item));
  const suspicious = !malicious && indicators.length > 0;
  const overallResult = malicious ? 'Malicious' : suspicious ? 'Suspicious' : 'Safe';
  const reputationScore = malicious ? 20 : suspicious ? 55 : 92;
  const threatLevel = malicious ? 'High' : suspicious ? 'Medium' : 'Low';
  const category = indicators.length > 0 ? indicators.join(', ') : 'No obvious risk indicators detected';

  return res.status(200).json({
    id: `vercel-live-inspection-${Date.now()}`,
    url: targetUrl.toString(),
    domain: hostname,
    blacklistStatus: indicators.length > 0 ? `Review required: ${category}` : 'Not checked: external threat-intelligence provider is not configured',
    ipAddress: 'N/A',
    phishing: malicious ? 'Malicious' : suspicious ? 'Suspicious' : 'Clean',
    category,
    malware: 'Clean',
    reputationScore,
    spam: suspicious ? 'Flagged' : 'Clean',
    lastScanned: new Date().toISOString(),
    threatLevel,
    overallResult,
    sslIssuer: 'N/A',
    sslValid: targetUrl.protocol === 'https:',
    serverLocation: 'Vercel live HTTP inspection',
    httpStatus,
    responseTimeMs,
    redirectUrl: null,
    screenshot_url: `https://api.urlmeta.org/?url=${encodeURIComponent(targetUrl.toString())}`,
    enginesDetected: [{ name: 'SecureWatch live inspection', result: malicious ? 'Flagged' : 'Clean' }],
    recommendation: malicious
      ? 'Do not visit this URL or submit credentials. Live inspection found high-risk indicators.'
      : suspicious
        ? 'Treat this URL with caution and verify the destination independently before continuing.'
        : 'No obvious risk indicators were found by the live inspection. This is not a guarantee of safety.',
    provider: 'SecureWatch Vercel live inspection',
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Keep a route-level failure from becoming Vercel's generic HTTP 500 page.
  // Individual handlers still return their diagnostic JSON, but the deployment
  // exposes a controlled temporary-unavailability status to the browser.
  const originalStatus = res.status.bind(res);
  res.status = ((statusCode: number) => originalStatus(statusCode === 500 ? 503 : statusCode)) as typeof res.status;

  try {
    if (getRequestPath(req) === '/api/scan-url-reputation') {
      if (req.method === 'OPTIONS') return res.status(204).end();
      if (req.method !== 'POST') {
        return res.status(200).json({
          service: 'SecureWatch URL reputation inspection',
          method: 'POST',
          body: { url: 'https://example.com' },
          message: 'Submit a URL with POST to run a live reputation inspection.',
        });
      }
      return await handleUrlReputation(req, res);
    }

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

    return res.status(503).json({
      error: 'SecureWatch API is temporarily unavailable.',
      degraded: true,
      details: message,
    });
  }
}