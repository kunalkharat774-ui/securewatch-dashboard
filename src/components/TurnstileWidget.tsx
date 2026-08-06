import React, { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  siteKey?: string;
  onVerify?: (token: string) => void;
  onError?: (err: any) => void;
  onExpire?: () => void;
  className?: string;
}

const DEFAULT_TURNSTILE_SITE_KEY = '0x4AAAAAAEH7OhPz94KURs75';

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

 const effectiveSiteKey = siteKey;

 useEffect(() => {
    let intervalId: number | null = null;
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

    const onSuccess = (token: string) => {
      setHasError(false);
      setIsLoaded(true);
      if (onVerify) onVerify(token);
    };

    const onExpired = () => {
      setIsLoaded(false);
      if (onExpire) onExpire();
    };

    const onErrorCallback = (err: any) => {
      console.warn('Turnstile error callback:', err);
      if ((window as any).turnstile && widgetIdRef.current) {
        try {
          (window as any).turnstile.reset(widgetIdRef.current);
        } catch (resetErr) {
          console.warn('Turnstile reset failed:', resetErr);
        }
      }
      setHasError(true);
      if (onError) onError(err);
    };

    const renderWidget = () => {
      const turnstile = (window as any).turnstile;
      if (turnstile && containerRef.current) {
        try {
          if (widgetIdRef.current && typeof turnstile.remove === 'function') {
            turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          }

          containerRef.current.innerHTML = '';
          const widgetId = turnstile.render(containerRef.current, {
            sitekey: effectiveSiteKey,
            theme: 'dark',
            size: 'normal',
            callback: onSuccess,
            'error-callback': onErrorCallback,
            'expired-callback': onExpired,
          });
          widgetIdRef.current = widgetId;
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
          if (typeof window.turnstile.remove === 'function') {
            window.turnstile.remove(widgetIdRef.current);
          }
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
        <div
          ref={containerRef}
          id={widgetContainerId}
          className="w-full min-h-[80px] flex justify-center"
        />
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
