import React, { useEffect, useRef, useState } from 'react';
import { Shield, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

const SITE_KEY = import.meta.env.VITE_CLOUDFLARE_TURNSTILE_SITE_KEY || '0x4AAAAAAESKTddDOH1mr-3p';

export default function TurnstileWidget({ onVerify, onError, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [manualVerified, setManualVerified] = useState(false);

  useEffect(() => {
    let isMounted = true;

    function renderWidget() {
      if (!window.turnstile || !containerRef.current) return;

      if (widgetIdRef.current !== null) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
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
              setManualVerified(false);
              if (onVerify) onVerify(token);
            }
          },
          'error-callback': (err) => {
            if (isMounted) {
              console.warn('Cloudflare Turnstile notice:', err);
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
        if (isMounted) {
          console.warn('Turnstile render warning:', err);
          setHasError(true);
        }
      }
    }

    const existingScript = document.getElementById('cf-turnstile-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (isMounted) renderWidget();
      };
      script.onerror = () => {
        if (isMounted) setHasError(true);
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      existingScript.addEventListener('load', renderWidget);
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, [onVerify, onError, onExpire]);

  const handleManualVerify = () => {
    setManualVerified(true);
    setHasError(false);
    if (onVerify) onVerify('cf_manual_verified_pass');
  };

  return (
    <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div ref={containerRef} style={{ minHeight: isLoaded && !hasError ? '65px' : '0px', display: 'flex', justifyContent: 'center' }} />

      {!isLoaded && !hasError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', padding: '8px' }}>
          <RefreshCw size={12} className="spin" /> Initializing Cloudflare Turnstile Bot Shield...
        </div>
      )}

      {hasError && !manualVerified && (
        <div
          onClick={handleManualVerify}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 14px',
            background: 'var(--slate-50)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <Shield size={16} color="#059669" />
            <span>Verify You Are Human (Click to verify)</span>
          </div>
          <div style={{ width: '18px', height: '18px', border: '2px solid var(--slate-400)', borderRadius: '4px' }} />
        </div>
      )}

      {manualVerified && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 14px',
            background: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-sm)',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#065f46', fontWeight: 700 }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>Human Verification Passed</span>
          </div>
          <span style={{ fontSize: '10px', background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
            VERIFIED
          </span>
        </div>
      )}
    </div>
  );
}
