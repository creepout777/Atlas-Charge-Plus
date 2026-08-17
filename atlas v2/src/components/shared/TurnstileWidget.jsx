import React, { useEffect, useRef } from 'react';

const SITE_KEY = '0x4AAAAAAESKTddDOH1mr-3p';

const TurnstileWidget = React.memo(function TurnstileWidget({ onVerify, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);

  // Keep references fresh without causing re-mounts
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    let isMounted = true;
    let timer = null;

    // Define global callback handler once
    window._onTurnstileSuccess = (token) => {
      if (isMounted && onVerifyRef.current) {
        onVerifyRef.current(token);
      }
    };

    window._onTurnstileExpired = () => {
      if (isMounted && onExpireRef.current) {
        onExpireRef.current();
      }
    };

    function renderWidget() {
      if (!window.turnstile || !containerRef.current || widgetIdRef.current !== null) return;

      // If already rendered into the element, don't duplicate
      if (containerRef.current.hasChildNodes()) return;

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'light',
          size: 'normal',
          callback: (token) => {
            if (isMounted && onVerifyRef.current) {
              onVerifyRef.current(token);
            }
          },
          'expired-callback': () => {
            if (isMounted && onExpireRef.current) {
              onExpireRef.current();
            }
          },
          'error-callback': (code) => {
            console.error('Turnstile challenge notice code:', code);
          },
        });
      } catch (err) {
        console.warn('Turnstile render attempt:', err);
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      timer = setInterval(() => {
        if (window.turnstile) {
          renderWidget();
          clearInterval(timer);
        }
      }, 150);
    }

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, []); // Run strictly ONCE on mount!

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
});

export default TurnstileWidget;
