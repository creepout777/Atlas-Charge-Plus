import React, { useEffect, useRef } from 'react';

const SITE_KEY = '0x4AAAAAAESKTddDOH1mr-3p';

export default function TurnstileWidget({ onVerify, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // Register global callbacks for Cloudflare Turnstile declarative render
    window._onTurnstileSuccess = (token) => {
      if (isMounted && onVerify) onVerify(token);
    };

    window._onTurnstileExpired = () => {
      if (isMounted && onExpire) onExpire();
    };

    function renderWidget() {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current !== null) return;

      // Check if Cloudflare already rendered into the element via data- attributes
      if (containerRef.current.hasChildNodes()) return;

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
          'error-callback': (code) => {
            console.error('Turnstile challenge error code:', code);
          },
        });
      } catch (err) {
        console.warn('Turnstile render attempt:', err);
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const timer = setInterval(() => {
        if (window.turnstile) {
          renderWidget();
          clearInterval(timer);
        }
      }, 150);
      return () => clearInterval(timer);
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [onVerify, onExpire]);

  return (
    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', width: '100%', minHeight: '65px' }}>
      <div
        ref={containerRef}
        className="cf-turnstile"
        data-sitekey={SITE_KEY}
        data-callback="_onTurnstileSuccess"
        data-expired-callback="_onTurnstileExpired"
        data-theme="light"
      />
    </div>
  );
}
