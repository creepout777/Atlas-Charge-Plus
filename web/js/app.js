// =============================================================
// Atlas Charge Plus+ — App Controller
// Request-first flow: Location → Setup → Pay → Track → Charge
// =============================================================

const App = (() => {
  let initialized = false;

  // ── Initialize ─────────────────────────────────────────────
  async function init() {
    if (initialized) return;
    initialized = true;

    console.log('[Atlas Charge Plus+] Initializing...');
    console.log('[Atlas Charge Plus+] Platform:', Bridge.getPlatform());

    // 1. Initialize map
    MapModule.init();

    // 2. Initialize UI components & render home view instantly
    UI.initDrawer();
    UI.render('home');

    // 3. Bind events
    bindEvents();

    // 4. Request location in background (non-blocking)
    Bridge.requestLocation().then(pos => {
      MapModule.setUserPosition(pos.latitude, pos.longitude);
      APP_DATA.user.location = pos;
    }).catch(err => {
      console.warn('[Atlas Charge Plus+] Location unavailable:', err.message);
    });

    console.log('[Atlas Charge Plus+] Ready.');
  }

  // ── Event Bindings ─────────────────────────────────────────
  function bindEvents() {
    document.querySelector('.header-logo')?.addEventListener('click', goHome);
    document.getElementById('btn-menu')?.addEventListener('click', UI.openDrawer);
    document.getElementById('drawer-overlay')?.addEventListener('click', UI.closeDrawer);
    document.getElementById('btn-profile')?.addEventListener('click', UI.openDrawer);

    // UK Cities Geocoding Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      const cities = {
        'london': [51.5074, -0.1278],
        'birmingham': [52.4862, -1.8904],
        'manchester': [53.4808, -2.2426],
        'leeds': [53.8008, -1.5491],
        'bristol': [51.4545, -2.5879],
        'edinburgh': [55.9533, -3.1883],
        'glasgow': [55.8642, -4.2518],
        'cardiff': [51.4816, -3.1791],
        'belfast': [54.5973, -5.9301],
        'newcastle': [54.9783, -1.6178],
      };

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim().toLowerCase();
          const match = Object.keys(cities).find(c => query.includes(c));
          if (match) {
            const coords = cities[match];
            MapModule.setCarPosition(coords[0], coords[1]);
            UI.showToast(`Found ${match.toUpperCase()}`, 'Car location updated on map', 'success');
            if (UI.getCurrentView() === 'home') UI.render('home');
          } else {
            UI.showToast('City search', 'Try searching London, Manchester, Birmingham, Leeds, etc.', 'info');
          }
        }
      });
    }

    document.getElementById('btn-notifications')?.addEventListener('click', UI.openNotificationsModal);

    document.getElementById('btn-locate')?.addEventListener('click', async () => {
      try {
        const pos = await Bridge.requestLocation();
        MapModule.setUserPosition(pos.latitude, pos.longitude);
        MapModule.centerOnUser();
        APP_DATA.user.location = pos;
        UI.showToast('Location found', `${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}`, 'info');
      } catch (err) {
        UI.showToast('Location error', 'Could not get your location', 'error');
      }
    });

    document.getElementById('btn-map-style')?.addEventListener('click', MapModule.toggleMapStyle);
    document.getElementById('btn-tilt-3d')?.addEventListener('click', MapModule.toggle3DView);
    document.getElementById('btn-zoom-in')?.addEventListener('click', MapModule.zoomIn);
    document.getElementById('btn-zoom-out')?.addEventListener('click', MapModule.zoomOut);

    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') UI.closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        UI.closeDrawer();
        UI.closeModal();
        if (MapModule.isPinMode()) {
          MapModule.disablePinMode();
          UI.hidePinBanner();
          UI.showToast('Pin mode cancelled', '', 'info');
        }
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  FLOW ACTIONS
  // ══════════════════════════════════════════════════════════

  // ── Step 1: Set Car Location ───────────────────────────────
  async function useCurrentLocation() {
    try {
      const pos = await Bridge.requestLocation();
      MapModule.setUserPosition(pos.latitude, pos.longitude);
      MapModule.setCarPosition(pos.latitude, pos.longitude);
      APP_DATA.user.location = pos;
      UI.showToast('Car location set', 'Using your current GPS position', 'success');
      UI.render('home'); // Re-render to show confirmation
    } catch (err) {
      UI.showToast('Location error', 'Please enable location access or pin on map', 'error');
    }
  }

  function pinOnMap() {
    UI.showToast('Tap the map', 'Tap where your car is located', 'info');
    UI.setSheetState('peek');

    MapModule.enablePinMode((lat, lng) => {
      UI.showToast('Car pinned!', `${lat.toFixed(4)}, ${lng.toFixed(4)}`, 'success');
      UI.render('home'); // Re-render to show confirmation
      UI.setSheetState('half');
    });

    // Zoom in if user has location
    const userPos = MapModule.getUserPosition();
    if (userPos) {
      MapModule.centerOnUser();
    }
  }

  // ── Step 2: Setup ──────────────────────────────────────────
  function goToSetup() {
    if (!MapModule.getCarPosition()) {
      UI.showToast('Set your car location first', 'Use GPS or pin on the map', 'warning');
      return;
    }
    UI.render('setup');
  }

  // ── Step 3: Payment ────────────────────────────────────────
  function goToPayment() {
    UI.render('payment');
  }

  // ── Step 4: Confirm & Dispatch ─────────────────────────────
  async function confirmAndPay() {
    // Show dispatching spinner
    UI.render('dispatching');

    // 1. Request notification permission for updates
    const notificationPermGranted = await Bridge.requestNotifications();

    // 2. Find nearest truck from fleet
    const carPos = MapModule.getCarPosition();
    let bestTruck = null;
    let bestDist = Infinity;

    APP_DATA.fleet.forEach(truck => {
      const dist = MapModule.getDistance(
        truck.depot[0], truck.depot[1],
        carPos.lat, carPos.lng
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestTruck = truck;
      }
    });

    if (!bestTruck) {
      UI.showToast('No trucks available', 'Please try again later', 'error');
      goHome();
      return;
    }

    // Save to active request
    APP_DATA.activeRequest.assignedTruck = bestTruck;
    APP_DATA.activeRequest.status = 'dispatched';
    APP_DATA.activeRequest.chargeLevel = UI.getSelectedChargeLevel();
    APP_DATA.activeRequest.connector = UI.getSelectedConnector();

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    UI.showToast('Payment confirmed!', `${bestTruck.name} is on its way`, 'success');

    // System & Native Notification
    Bridge.showNotification(
      'Mobile Unit Dispatched',
      `${bestTruck.name} is en route to your location.`
    );

    if (!notificationPermGranted) {
      setTimeout(() => {
        UI.showToast(
          'Enable Notifications',
          'Turn on notifications to get arrival & completion alerts',
          'warning'
        );
      }, 3000);
    }

    // Start tracking
    UI.startTracking(bestTruck);
  }

  // ── Cancel ─────────────────────────────────────────────────
  function cancelRequest() {
    UI.stopAll();
    MapModule.removeTruck();
    MapModule.clearRoute();
    APP_DATA.activeRequest.status = null;
    APP_DATA.activeRequest.assignedTruck = null;
    UI.showToast('Request cancelled', 'Your charge request has been cancelled', 'info');
    goHome();
  }

  // ── End Session ────────────────────────────────────────────
  function endSession() {
    UI.stopAll();
    MapModule.removeTruck();
    MapModule.clearAll();

    showModal(
      'Session Complete',
      'Thank you for using Atlas Charge Plus+! Your charging session has ended successfully.',
      [
        { label: 'View History', action: () => { closeModal(); showHistory(); }, primary: true },
        { label: 'New Request', action: () => { closeModal(); goHome(); }, primary: false },
      ]
    );
  }

  // ── Navigation ─────────────────────────────────────────────
  function goHome() {
    MapModule.disablePinMode();
    UI.hidePinBanner();
    UI.render('home');
  }

  function showHistory() {
    UI.render('history');
  }

  // ── Share Car Location ─────────────────────────────────────
  function shareCarLocation() {
    const carPos = MapModule.getCarPosition();
    if (carPos) {
      Bridge.shareLocation(carPos.lat, carPos.lng);
      UI.showToast('Location shared', 'Car location copied/shared', 'success');
    }
  }

  // ── Notifications ──────────────────────────────────────────
  async function enableNotifications() {
    const granted = await Bridge.requestNotifications();
    if (granted) {
      UI.showToast('Notifications enabled', "You'll receive charge updates", 'success');
    } else {
      UI.showToast('Notifications blocked', 'Enable in your device settings', 'warning');
    }
  }

  // ── Modal ──────────────────────────────────────────────────
  function showModal(title, text, actions) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    modal.innerHTML = `
      <div class="modal-title">${title}</div>
      <div class="modal-text">${text}</div>
      <div class="modal-actions">
        ${actions.map(a => `
          <button class="${a.primary ? 'btn-primary' : 'btn-secondary'}" id="modal-action-${a.label.replace(/\s/g, '-').toLowerCase()}">${a.label}</button>
        `).join('')}
      </div>
    `;
    overlay.classList.add('active');
    actions.forEach(a => {
      const btn = document.getElementById(`modal-action-${a.label.replace(/\s/g, '-').toLowerCase()}`);
      if (btn) btn.addEventListener('click', a.action);
    });
  }

  function closeModal() {
    document.getElementById('modal-overlay')?.classList.remove('active');
  }

  return {
    init,
    useCurrentLocation,
    pinOnMap,
    goHome,
    goToSetup,
    goToPayment,
    confirmAndPay,
    cancelRequest,
    endSession,
    showHistory,
    shareCarLocation,
    enableNotifications,
    showModal,
    closeModal,
  };
})();

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', App.init);
