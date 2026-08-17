import React, { useEffect, useRef } from 'react';

const SITE_KEY = '0x4AAAAAAESKTddDOH1mr-3p';

export default function TurnstileWidget({ onVerify, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    let intervalId = null;
    let isMounted = true;

    function renderTurnstile() {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current !== null) return;

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'light',
          size: 'normal',
          callback: (token) => {
            if (isMounted && onVerify) onVerify(token);
          },
          'expired-callback': () => {
            if (isMounted && onExpire) onExpire();
          },
          'error-callback': (err) => {
            console.error('Cloudflare Turnstile Error:', err);
          },
        });
      } catch (err) {
        console.error('Turnstile render failed:', err);
      }
    }

    if (window.turnstile) {
      renderTurnstile();
    } else {
      intervalId = setInterval(() => {
        if (window.turnstile) {
          renderTurnstile();
          clearInterval(intervalId);
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, onExpire]);

  return (
    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', width: '100%', minHeight: '65px' }}>
      <div ref={containerRef} />
    </div>
  );
}
