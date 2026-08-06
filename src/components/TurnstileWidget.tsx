import React, { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify?: (token: string) => void;
  onError?: (err: any) => void;
  onExpire?: () => void;
  className?: string;
}

const DEFAULT_TURNSTILE_SITE_KEY = '0x4AAAAAAEH7OhPz94KURs75';
const DEV_FALLBACK_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
 siteKey = DEFAULT_TURNSTILE_SITE_KEY,
 onVerify,
 onError,
 onExpire,
 className = '',
}) => {
 const widgetContainerId = 'turnstile-widget-container';
 const containerRef = useRef<HTMLDivElement | null>(null);
 const widgetIdRef = useRef<string | null>(null);
 const [isLoaded, setIsLoaded] = useState(false);
 const [hasError, setHasError] = useState(false);

 const effectiveSiteKey = (() => {
   const localOrigins = ['localhost', '127.0.0.1', '[::1]'];
   if (typeof window !== 'undefined' && localOrigins.includes(window.location.hostname) && siteKey === DEFAULT_TURNSTILE_SITE_KEY) {
     return DEV_FALLBACK_TURNSTILE_SITE_KEY;
   }
   return siteKey;
 })();

 useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let scriptElement: HTMLScriptElement | null = null;

    const loadScript = () => {
      if (document.getElementById('cf-turnstile-script')) {
        return;
      }

      scriptElement = document.createElement('script');
      scriptElement.id = 'cf-turnstile-script';
      scriptElement.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      scriptElement.async = true;
      scriptElement.defer = true;
      scriptElement.onload = () => {
        setHasError(false);
        renderWidget();
      };
      scriptElement.onerror = (event) => {
        console.error('Failed to load Cloudflare Turnstile script:', event);
        setHasError(true);
        if (onError) onError(new Error('Cloudflare Turnstile script load failed'));
      };
      document.head.appendChild(scriptElement);
    };

    const renderWidget = () => {
      const turnstile = (window as any).turnstile;
      if (turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          const id = turnstile.render(containerRef.current, {
            sitekey: effectiveSiteKey,
            theme: 'dark',
            size: 'normal',
            callback: (token: string) => {
              setHasError(false);
              setIsLoaded(true);
              if (onVerify) onVerify(token);
            },
            'error-callback': (err: any) => {
              console.warn('Turnstile error callback:', err);
              if (turnstile && widgetIdRef.current) {
                try {
                  turnstile.reset(widgetIdRef.current);
                } catch (resetErr) {
                  console.warn('Turnstile reset failed:', resetErr);
                }
              }
              setHasError(true);
              if (onError) onError(err);
            },
            'expired-callback': () => {
              setIsLoaded(false);
              if (onExpire) onExpire();
            },
          });
          widgetIdRef.current = id;
          setIsLoaded(true);
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        } catch (error) {
          console.warn('Turnstile initialization failed:', error);
          setHasError(true);
          if (onError) onError(error);
        }
      }
    };

    const initializeWidget = () => {
      if (!window.turnstile) {
        return;
      }
      renderWidget();
    };

    if (window.turnstile) {
      initializeWidget();
    } else if (document.getElementById('cf-turnstile-script')) {
      intervalId = window.setInterval(() => {
        if (window.turnstile) {
          initializeWidget();
        }
      }, 250);
    } else {
      loadScript();
      intervalId = window.setInterval(() => {
        if (window.turnstile) {
          initializeWidget();
        }
      }, 250);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (err) {
          console.warn('Failed to remove Turnstile widget:', err);
        }
        widgetIdRef.current = null;
      }
    };
  }, [effectiveSiteKey, onVerify, onError, onExpire]);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col gap-2">
        <div ref={containerRef} id={widgetContainerId} className="w-full min-h-[80px] flex justify-center" />
        {!isLoaded && !hasError && (
          <div className="text-[11px] text-slate-400 text-center">Loading Cloudflare Turnstile...</div>
        )}
        {hasError && (
          <div className="text-[11px] text-rose-400 text-center">
            Unable to load Cloudflare Turnstile. Please refresh the page.
          </div>
        )}
      </div>
    </div>
  );
};

export default TurnstileWidget;
