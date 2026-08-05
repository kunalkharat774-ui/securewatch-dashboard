// Automatic Multi-Tenant Client Session Manager
export function getClientSessionId(): string {
  let sessionId = localStorage.getItem('securewatch_user_session_id');
  if (!sessionId) {
    sessionId = 'usr_session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('securewatch_user_session_id', sessionId);
  }
  return sessionId;
}

// Global Fetch Interceptor to isolate user data across backend requests safely
if (typeof window !== 'undefined' && window.fetch) {
  try {
    const originalFetch = window.fetch.bind(window);
    const interceptedFetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const sessionId = getClientSessionId();
      const options: RequestInit = init ? { ...init } : {};
      const headers = new Headers(options.headers || {});

      if (!headers.has('X-User-Session-ID')) {
        headers.set('X-User-Session-ID', sessionId);
      }

      options.headers = headers;
      return originalFetch(input, options);
    };

    try {
      Object.defineProperty(window, 'fetch', {
        value: interceptedFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      // Fallback if defineProperty fails
      (window as any).fetch = interceptedFetch;
    }
  } catch (e) {
    console.warn('Could not intercept window.fetch safely:', e);
  }
}

