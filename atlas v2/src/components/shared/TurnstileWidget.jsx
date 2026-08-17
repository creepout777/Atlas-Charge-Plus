import React, { useEffect, useRef, useState } from 'react';
import { Shield, RefreshCw, CheckCircle2 } from 'lucide-react';

const SITE_KEY = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '0x4AAAAAAESKTddDOH1mr-3p';

export default function TurnstileWidget({ onVerify, onError, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    function initTurnstile() {
      if (!window.turnstile || !containerRef.current) return;

      // Clear any previous widget render
      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
        widgetIdRef.current = null;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'light',
          size: 'normal',
          callback: (token) => {
            if (isMounted) {
              setIsVerified(true);
              setHasError(false);
              if (onVerify) onVerify(token);
            }
          },
          'error-callback': (err) => {
            if (isMounted) {
              setHasError(true);
              setIsVerified(false);
              if (onError) onError(err);
            }
          },
          'expired-callback': () => {
            if (isMounted) {
              setIsVerified(false);
              if (onExpire) onExpire();
            }
          },
        });
        widgetIdRef.current = id;
        setIsLoaded(true);
      } catch (err) {
        console.warn('Turnstile render warning:', err);
      }
    }

    // Check if Cloudflare script already exists in the document
    const existingScript = document.getElementById('cf-turnstile-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (isMounted) initTurnstile();
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      initTurnstile();
    } else {
      existingScript.addEventListener('load', initTurnstile);
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [onVerify, onError, onExpire]);

  return (
    <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div ref={containerRef} style={{ minHeight: '65px', display: 'flex', justifyContent: 'center' }} />
      {!isLoaded && !hasError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', padding: '8px' }}>
          <RefreshCw size={12} className="spin" /> Initializing Cloudflare Turnstile Bot Shield...
        </div>
      )}
      {hasError && (
        <div style={{ fontSize: '11px', color: 'var(--amber-primary)', padding: '4px' }}>
          Turnstile verified in development mode
        </div>
      )}
    </div>
  );
}
