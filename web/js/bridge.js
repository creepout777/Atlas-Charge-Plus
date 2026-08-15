// =============================================================
// Atlas Charge Plus+ — Flutter ↔ Web Bridge
// Detects NativeApp (Flutter WebView) or falls back to Web APIs
// =============================================================

const Bridge = (() => {
  const isNative = () => !!window.NativeApp;

  // ── Location ───────────────────────────────────────────────
  function requestLocation() {
    return new Promise((resolve, reject) => {
      if (isNative()) {
        // Flutter bridge — result comes via callback
        window.onLocationResult = (lat, lng) => {
          resolve({ latitude: lat, longitude: lng });
        };
        window.NativeApp.requestLocation();
      } else {
        // Browser Web API
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      }
    });
  }

  // ── Watch Location (continuous) ────────────────────────────
  let watchId = null;
  function watchLocation(callback) {
    if (isNative()) {
      // For native, poll periodically
      const interval = setInterval(() => {
        window.onLocationResult = (lat, lng) => {
          callback({ latitude: lat, longitude: lng });
        };
        window.NativeApp.requestLocation();
      }, 5000);
      return () => clearInterval(interval);
    } else {
      if (!navigator.geolocation) return () => {};
      watchId = navigator.geolocation.watchPosition(
        (pos) => callback({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
        () => {},
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }

  // ── Notifications ──────────────────────────────────────────
  function requestNotifications() {
    return new Promise((resolve) => {
      if (isNative()) {
        window.onNotificationResult = (granted) => {
          resolve(granted);
        };
        window.NativeApp.requestNotifications();
      } else {
        if (!('Notification' in window)) {
          resolve(false);
          return;
        }
        if (Notification.permission === 'granted') {
          resolve(true);
          return;
        }
        Notification.requestPermission().then((perm) => {
          resolve(perm === 'granted');
        });
      }
    });
  }

  function showNotification(title, body) {
    if (isNative()) {
      if (window.NativeApp && window.NativeApp.showNotification) {
        window.NativeApp.showNotification(JSON.stringify({ title, body }));
      }
    } else if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body });
        } catch (e) {
          console.warn('[Bridge Notification Error]', e);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            try {
              new Notification(title, { body });
            } catch (e) {}
          }
        });
      }
    }
  }

  // ── Camera ─────────────────────────────────────────────────
  function requestCamera() {
    return new Promise((resolve) => {
      if (isNative()) {
        window.onCameraResult = (granted) => {
          resolve(granted);
        };
        window.NativeApp.requestCamera();
      } else {
        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then(() => resolve(true))
          .catch(() => resolve(false));
      }
    });
  }

  // ── Share Location ─────────────────────────────────────────
  function shareLocation(lat, lng) {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    if (navigator.share) {
      navigator.share({
        title: 'My Location — Atlas Charge Plus+',
        text: `I'm here and need a charge! Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
        url: url,
      }).catch(() => {});
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  // ── Platform Info ──────────────────────────────────────────
  function getPlatform() {
    if (isNative()) return 'native';
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return 'ios-web';
    if (/Android/.test(navigator.userAgent)) return 'android-web';
    return 'desktop-web';
  }

  return {
    isNative,
    requestLocation,
    watchLocation,
    requestNotifications,
    showNotification,
    requestCamera,
    shareLocation,
    getPlatform,
  };
})();
