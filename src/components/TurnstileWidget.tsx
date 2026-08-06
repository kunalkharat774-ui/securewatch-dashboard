import React, { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify?: (token: string) => void;
  onError?: (err: any) => void;
  onExpire?: () => void;
  className?: string;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey = '0x4AAAAAAEH7OhPz94KURs75',
  onVerify,
  onError,
  onExpire,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

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
      scriptElement.crossOrigin = 'anonymous';
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
      if (window.turnstile && containerRef.current && !widgetIdRef.current) {
        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: 'dark',
            size: 'normal',
            callback: (token: string) => {
              setHasError(false);
              setIsLoaded(true);
              if (onVerify) onVerify(token);
            },
            'error-callback': (err: any) => {
              console.warn('Turnstile error callback:', err);
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

    if (window.turnstile) {
      renderWidget();
    } else if (document.getElementById('cf-turnstile-script')) {
      intervalId = window.setInterval(() => {
        if (window.turnstile) {
          renderWidget();
        }
      }, 250);
    } else {
      loadScript();
      intervalId = window.setInterval(() => {
        if (window.turnstile) {
          renderWidget();
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
  }, [siteKey, onVerify, onError, onExpire]);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col gap-2">
        <div ref={containerRef} className="w-full min-h-[80px] flex justify-center" />
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
