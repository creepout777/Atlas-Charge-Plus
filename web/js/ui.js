// =============================================================
// Atlas Charge Plus+ — B2B Professional UI Module
// Enterprise EV fleet & charging management interface
// Clean vector SVG icons — professional B2B aesthetic
// =============================================================

const UI = (() => {
  let currentView = 'home';
  let selectedChargeLevel = 'standard';
  let selectedConnector = 'CCS';
  let sheetState = 'peek';
  let sessionInterval = null;
  let trackingInterval = null;

  // ── SVG Vector Icon Library (Lucide / B2B Enterprise style) ──
  const icons = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    locate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>',
    creditCard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    helpCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    navigation: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>',
    crosshair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    alertTriangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    xCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>',
    battery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="18" height="12" rx="2"/><line x1="23" y1="10" x2="23" y2="14"/><line x1="5" y1="10" x2="5" y2="14"/></svg>',
    plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6m0 8v6M6 8v4a6 6 0 0 0 12 0V8M9 2v6m6-6v6"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    maximize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
  };

  // ── Toast System ───────────────────────────────────────────
  function showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    const iconSvgMap = {
      success: icons.checkCircle,
      info: icons.zap,
      warning: icons.alertTriangle,
      error: icons.xCircle,
    };
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-icon ${type}">${iconSvgMap[type] || icons.zap}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('visible'));
    });
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 500);
    }, 4000);
  }

  // ── Bottom Sheet Control ───────────────────────────────────
  function setSheetState(state) {
    const sheet = document.getElementById('bottom-sheet');
    sheet.className = 'bottom-sheet ' + state;
    sheetState = state;
  }

  function initSheetDrag() {
    const handle = document.querySelector('.sheet-handle-area');
    if (!handle) return;
    let startY = 0, moved = false;
    handle.addEventListener('pointerdown', (e) => {
      startY = e.clientY; moved = false;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (Math.abs(e.clientY - startY) > 10) moved = true;
    });
    handle.addEventListener('pointerup', (e) => {
      if (!moved) return;
      const dy = e.clientY - startY;
      if (dy < -50) {
        if (sheetState === 'peek') setSheetState('half');
        else if (sheetState === 'half') setSheetState('full');
      } else if (dy > 50) {
        if (sheetState === 'full') setSheetState('half');
        else if (sheetState === 'half') setSheetState('peek');
      }
    });
  }

  // ── Drawer ─────────────────────────────────────────────────
  function openDrawer() {
    document.getElementById('drawer').classList.add('active');
    document.getElementById('drawer-overlay').classList.add('active');
  }

  function closeDrawer() {
    document.getElementById('drawer').classList.remove('active');
    document.getElementById('drawer-overlay').classList.remove('active');
  }

  // ══════════════════════════════════════════════════════════
  //  VIEW RENDERERS
  // ══════════════════════════════════════════════════════════

  // ── HOME: "Where is your car?" ─────────────────────────────
  function renderHome() {
    const carPos = MapModule.getCarPosition();
    const hasPin = !!carPos;

    return `
      <div class="sheet-header">
        <div>
          <div class="sheet-title">Request Mobile Charging</div>
          <div class="sheet-subtitle">Specify your vehicle location</div>
        </div>
      </div>
      <div class="sheet-content">
        <div class="animate-fade-in">
          <!-- Location Options -->
          <div style="display:flex;flex-direction:column;gap:var(--sp-3);margin-bottom:var(--sp-5)">
            <button class="btn-primary" style="width:100%;padding:var(--sp-4)" onclick="App.useCurrentLocation()">
              ${icons.locate}
              Use Current Location
            </button>
            <button class="btn-secondary" style="width:100%;padding:var(--sp-4)" onclick="App.pinOnMap()">
              ${icons.crosshair}
              Pin Location on Map
            </button>
          </div>

          ${hasPin ? `
            <!-- Location Set Confirmation -->
            <div style="padding:var(--sp-4);background:var(--emerald-dim);border:1px solid rgba(5,150,105,0.2);border-radius:var(--radius-lg);margin-bottom:var(--sp-5)">
              <div style="display:flex;align-items:center;gap:var(--sp-3)">
                <div style="color:var(--emerald);flex-shrink:0;width:20px;height:20px">${icons.checkCircle}</div>
                <div>
                  <div style="font-weight:var(--fw-bold);font-size:var(--fs-sm);color:var(--emerald-dark)">Car Location Confirmed</div>
                  <div style="font-size:var(--fs-xs);color:var(--text-secondary);margin-top:2px">
                    GPS Coordinates: ${carPos.lat.toFixed(5)}, ${carPos.lng.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>

            <button class="btn-primary" style="width:100%;padding:var(--sp-4);font-size:var(--fs-md);display:flex;align-items:center;justify-content:center;gap:8px" onclick="App.goToSetup()">
              <span style="width:18px;height:18px;display:inline-block">${icons.zap}</span>
              Configure Charging Request
            </button>
          ` : `
            <!-- Instruction -->
            <div style="text-align:center;padding:var(--sp-6) 0;color:var(--text-tertiary)">
              <div style="width:48px;height:48px;margin:0 auto var(--sp-3);color:var(--emerald);background:var(--emerald-dim);border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;padding:12px">${icons.mapPin}</div>
              <div style="font-size:var(--fs-sm);font-weight:var(--fw-medium);color:var(--text-primary)">Set vehicle coordinates to get started</div>
              <div style="font-size:var(--fs-xs);margin-top:var(--sp-1)">Select auto-detect GPS or tap the map to drop a pin</div>
            </div>
          `}

          <!-- Pin Mode Indicator -->
          <div id="pin-mode-banner" style="display:none;padding:var(--sp-3) var(--sp-4);background:var(--emerald-dim);border:1px solid rgba(5,150,105,0.2);border-radius:var(--radius-md);text-align:center;margin-top:var(--sp-3)">
            <div style="font-size:var(--fs-sm);color:var(--emerald-dark);font-weight:var(--fw-semibold);display:flex;align-items:center;justify-content:center;gap:6px">
              <span style="width:16px;height:16px">${icons.mapPin}</span> Tap on the map to set vehicle position
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── SETUP: Configure charge level & connector ──────────────
  function renderSetup() {
    const effectivePrice = APP_DATA.pricing.getEffectivePrice();
    const isPeak = APP_DATA.pricing.getPeakMultiplier() > 1;

    return `
      <div class="sheet-header">
        <div style="display:flex;align-items:center;gap:var(--sp-3)">
          <button class="btn-icon" onclick="App.goHome()">
            ${icons.arrowLeft}
          </button>
          <div>
            <div class="sheet-title">Configure Charging</div>
            <div class="sheet-subtitle">Select capacity & connector specification</div>
          </div>
        </div>
      </div>
      <div class="sheet-content">
        <div class="animate-fade-in">


          ${isPeak ? `
            <div style="padding:var(--sp-3) var(--sp-4);background:var(--amber-dim);border:1px solid rgba(217,119,6,0.2);border-radius:var(--radius-md);margin-bottom:var(--sp-4);display:flex;align-items:center;gap:var(--sp-2)">
              <span style="width:16px;height:16px;color:var(--amber)">${icons.clock}</span>
              <span style="font-size:var(--fs-xs);color:var(--amber);font-weight:var(--fw-medium)">Peak hours surcharge (5–8 PM) — 20% tariff applies</span>
            </div>
          ` : ''}

          <!-- Charge Level -->
          <div style="margin-bottom:var(--sp-5)">
            <div style="font-size:var(--fs-sm);color:var(--text-secondary);margin-bottom:var(--sp-3);font-weight:var(--fw-semibold)">Target Energy Output</div>
            <div class="charge-level-selector">
              ${APP_DATA.chargeLevels.map(level => {
                const cost = APP_DATA.pricing.baseCallout + (level.kwhEstimate * effectivePrice);
                const levelIconSvg = icons[level.icon] || icons.zap;
                return `
                  <div class="charge-option ${selectedChargeLevel === level.id ? 'selected' : ''}" onclick="UI.selectChargeLevel('${level.id}')">
                    <div class="charge-option-icon" style="color:var(--emerald)">${levelIconSvg}</div>
                    <div class="charge-option-details">
                      <div class="charge-option-title">${level.name}</div>
                      <div class="charge-option-desc">${level.description}</div>
                    </div>
                    <div class="charge-option-price">£${cost.toFixed(2)}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Connector -->
          <div style="margin-bottom:var(--sp-6)">
            <div style="font-size:var(--fs-sm);color:var(--text-secondary);margin-bottom:var(--sp-3);font-weight:var(--fw-semibold)">Connector Specification</div>
            <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap">
              ${APP_DATA.connectorTypes.map(c => `
                <button class="filter-chip ${selectedConnector === c ? 'active' : ''}" onclick="UI.selectConnector('${c}')">${c}</button>
              `).join('')}
            </div>
          </div>

          <!-- Price Breakdown -->
          <div style="margin-bottom:var(--sp-5)">
            <div style="font-size:var(--fs-sm);color:var(--text-secondary);margin-bottom:var(--sp-3);font-weight:var(--fw-semibold)">Cost Summary</div>
            <div style="display:flex;flex-direction:column;gap:var(--sp-2);background:var(--bg-tertiary);padding:var(--sp-4);border-radius:var(--radius-lg);border:1px solid var(--glass-border)">
              ${renderPriceRow('Service Callout Fee', formatPrice(APP_DATA.pricing.baseCallout))}
              ${renderPriceRow(
                `Energy Output (${APP_DATA.chargeLevels.find(l => l.id === selectedChargeLevel)?.kwhEstimate || 0} kWh @ £${effectivePrice.toFixed(2)}/kWh)`,
                formatPrice((APP_DATA.chargeLevels.find(l => l.id === selectedChargeLevel)?.kwhEstimate || 0) * effectivePrice)
              )}
              ${isPeak ? renderPriceRow('Peak Tariff Surcharge', 'Included', 'var(--amber)') : ''}
              <div style="border-top:1px solid var(--glass-border);padding-top:var(--sp-2);margin-top:var(--sp-1);display:flex;justify-content:space-between">
                <span style="font-weight:var(--fw-bold)">Estimated Total</span>
                <span style="font-family:var(--font-display);font-weight:var(--fw-bold);font-size:var(--fs-lg);color:var(--emerald)">${formatPrice(estimateCost(selectedChargeLevel))}</span>
              </div>
            </div>
          </div>

          <button class="btn-primary" style="width:100%;padding:var(--sp-4);font-size:var(--fs-md)" onclick="App.goToPayment()">
            Proceed to Checkout
          </button>
        </div>
      </div>
    `;
  }

  function renderPriceRow(label, value, color) {
    return `
      <div style="display:flex;justify-content:space-between;font-size:var(--fs-sm)">
        <span style="color:var(--text-secondary)">${label}</span>
        <span style="color:${color || 'var(--text-primary)'};font-weight:var(--fw-medium)">${value}</span>
      </div>
    `;
  }

  // ── PAYMENT: Confirm & Pay ─────────────────────────────────
  function renderPayment() {
    const level = APP_DATA.chargeLevels.find(l => l.id === selectedChargeLevel);
    const totalCost = estimateCost(selectedChargeLevel);
    const pm = APP_DATA.user.paymentMethod;
    const levelIconSvg = icons[level?.icon] || icons.zap;

    return `
      <div class="sheet-header">
        <div style="display:flex;align-items:center;gap:var(--sp-3)">
          <button class="btn-icon" onclick="App.goToSetup()">
            ${icons.arrowLeft}
          </button>
          <div>
            <div class="sheet-title">Order Confirmation</div>
            <div class="sheet-subtitle">Review payment details</div>
          </div>
        </div>
      </div>
      <div class="sheet-content">
        <div class="animate-fade-in">
          <!-- Summary -->
          <div style="display:flex;flex-direction:column;gap:var(--sp-2);margin-bottom:var(--sp-5)">
            ${renderSummaryRow(icons.mapPin, 'Service Target Location', `${MapModule.getCarPosition()?.lat.toFixed(4)}, ${MapModule.getCarPosition()?.lng.toFixed(4)}`)}
            ${renderSummaryRow(levelIconSvg, 'Charge Profile', `${level?.name} (${level?.timeEstimate})`)}
            ${renderSummaryRow(icons.plug, 'Connector Standard', selectedConnector)}
          </div>

          <!-- Payment Method -->
          <div style="padding:var(--sp-4);background:var(--bg-tertiary);border-radius:var(--radius-lg);border:1px solid var(--glass-border);margin-bottom:var(--sp-5)">
            <div style="font-size:var(--fs-xs);color:var(--text-secondary);margin-bottom:var(--sp-2);font-weight:var(--fw-semibold);letter-spacing:0.05em">PAYMENT ACCOUNT</div>
            <div style="display:flex;align-items:center;gap:var(--sp-3)">
              <div style="width:40px;height:28px;background:#0f172a;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:bold">${pm.type}</div>
              <div style="flex:1">
                <div style="font-size:var(--fs-sm);font-weight:var(--fw-semibold)">•••• •••• •••• ${pm.last4}</div>
                <div style="font-size:var(--fs-xs);color:var(--text-secondary)">Corporate Account · Exp ${pm.expiry}</div>
              </div>
              <div style="color:var(--emerald);width:20px;height:20px">${icons.checkCircle}</div>
            </div>
          </div>

          <!-- Total -->
          <div style="text-align:center;margin-bottom:var(--sp-6)">
            <div style="font-size:var(--fs-xs);color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.1em;font-weight:var(--fw-semibold)">Total Authorized Charge</div>
            <div style="font-family:var(--font-display);font-weight:var(--fw-black);font-size:var(--fs-hero);color:var(--emerald)">${formatPrice(totalCost)}</div>
            <div style="font-size:var(--fs-xs);color:var(--text-tertiary);margin-top:var(--sp-1)">Final charge adjusted based on actual energy delivered</div>
          </div>

          <button class="btn-primary" style="width:100%;padding:var(--sp-4);font-size:var(--fs-md)" onclick="App.confirmAndPay()">
            ${icons.bolt}
            Authorize & Dispatch Unit
          </button>

          <div style="text-align:center;margin-top:var(--sp-3)">
            <button style="font-size:var(--fs-xs);color:var(--text-tertiary);text-decoration:underline" onclick="App.goHome()">Cancel Request</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSummaryRow(iconSvg, label, value) {
    return `
      <div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3) var(--sp-4);background:var(--bg-tertiary);border-radius:var(--radius-md);border:1px solid var(--glass-border)">
        <span style="width:18px;height:18px;color:var(--emerald);flex-shrink:0">${iconSvg}</span>
        <span style="font-size:var(--fs-sm);color:var(--text-secondary);flex:1">${label}</span>
        <span style="font-size:var(--fs-sm);font-weight:var(--fw-semibold)">${value}</span>
      </div>
    `;
  }

  // ── DISPATCHING: Finding a truck ───────────────────────────
  function renderDispatching() {
    return `
      <div class="sheet-header">
        <div>
          <div class="sheet-title">Dispatching Mobile Unit...</div>
          <div class="sheet-subtitle">Routing nearest Atlas Charge truck</div>
        </div>
      </div>
      <div class="sheet-content">
        <div class="animate-fade-in" style="text-align:center;padding:var(--sp-8) 0">
          <div style="width:56px;height:56px;margin:0 auto var(--sp-5);border:3px solid var(--bg-elevated);border-top-color:var(--emerald);border-radius:50%;animation:spin 1s linear infinite"></div>
          <div style="font-family:var(--font-display);font-weight:var(--fw-bold);font-size:var(--fs-lg);margin-bottom:var(--sp-2)">Payment Authorized</div>
          <div style="font-size:var(--fs-sm);color:var(--text-secondary)">Routing nearest available unit to target GPS coordinates...</div>
        </div>
      </div>
    `;
  }

  // ── TRACKING: Truck on its way ─────────────────────────────
  function renderTracking(truck, eta, progress) {
    return `
      <div class="sheet-header">
        <div>
          <div class="sheet-title">Unit En Route</div>
          <div class="sheet-subtitle">Mobile charging truck dispatched</div>
        </div>
      </div>
      <div class="sheet-content">
        <div class="tracking-panel animate-fade-in">
          <!-- Truck Info Card -->
          <div class="tracking-truck-info">
            <div class="tracking-truck-icon" style="color:var(--emerald)">${icons.truck}</div>
            <div style="flex:1">
              <div class="tracking-truck-name">${truck.name}</div>
              <div class="tracking-truck-status">● Navigating to vehicle</div>
              <div style="font-size:var(--fs-xs);color:var(--text-secondary);margin-top:2px">Operated by ${truck.driver} · Rating ${truck.rating} / 5.0</div>
            </div>
          </div>

          <!-- ETA -->
          <div class="tracking-eta-large" id="tracking-eta">${eta}</div>
          <div class="tracking-eta-label">Estimated Arrival (Minutes)</div>

          <!-- Progress Bar -->
          <div class="tracking-progress" style="margin-bottom:var(--sp-4)">
            <div class="tracking-progress-fill" id="tracking-progress" style="width:${progress}%"></div>
          </div>

          <!-- Camera Focus Controls -->
          <div style="display:flex;gap:6px;margin-bottom:var(--sp-5);justify-content:center;flex-wrap:wrap">
            <button class="filter-chip active" style="font-size:11px;padding:4px 10px;display:inline-flex;align-items:center;gap:4px" onclick="MapModule.centerOnCar()">
              <span style="width:14px;height:14px;display:inline-block">${icons.mapPin}</span> Charger Location Focus
            </button>
            <button class="filter-chip" style="font-size:11px;padding:4px 10px;display:inline-flex;align-items:center;gap:4px" onclick="MapModule.focusBoth()">
              <span style="width:14px;height:14px;display:inline-block">${icons.maximize}</span> Both Units
            </button>
            <button class="filter-chip" style="font-size:11px;padding:4px 10px;display:inline-flex;align-items:center;gap:4px" onclick="MapModule.focusTruck()">
              <span style="width:14px;height:14px;display:inline-block">${icons.truck}</span> Track Truck
            </button>
          </div>

          <!-- Details -->
          <div class="session-stats" style="margin-bottom:var(--sp-6)">
            <div class="session-stat">
              <div class="session-stat-value">${truck.chargeSpeed} kW</div>
              <div class="session-stat-label">Output Capacity</div>
            </div>
            <div class="session-stat">
              <div class="session-stat-value">${APP_DATA.chargeLevels.find(l => l.id === selectedChargeLevel)?.name || 'Standard'}</div>
              <div class="session-stat-label">Profile</div>
            </div>
            <div class="session-stat">
              <div class="session-stat-value">${selectedConnector}</div>
              <div class="session-stat-label">Standard</div>
            </div>
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:var(--sp-3)">
            <button class="btn-secondary" style="flex:1" onclick="App.shareCarLocation()">
              ${icons.share}
              Share Location Link
            </button>
            <button class="btn-icon" onclick="MapModule.centerOnCar()">
              ${icons.locate}
            </button>
          </div>

          <div style="text-align:center;margin-top:var(--sp-4)">
            <button style="font-size:var(--fs-xs);color:var(--red);text-decoration:underline" onclick="App.cancelRequest()">Cancel Service Request</button>
          </div>
        </div>
      </div>
    `;
  }

  // ── SESSION: Charging in Progress ──────────────────────────
  function renderSession(truck) {
    const level = APP_DATA.chargeLevels.find(l => l.id === selectedChargeLevel);
    return `
      <div class="sheet-header">
        <div>
          <div class="sheet-title" style="display:flex;align-items:center;gap:8px">
            <span style="width:20px;height:20px;color:var(--emerald)">${icons.zap}</span> Charging Session Active
          </div>
          <div class="sheet-subtitle">${truck.name} · ${level?.name || 'Standard Charge'}</div>
        </div>
      </div>
      <div class="sheet-content">
        <div class="session-panel animate-fade-in">
          <!-- Charging Ring -->
          <div class="session-ring-container">
            <svg class="session-ring" viewBox="0 0 180 180">
              <defs>
                <linearGradient id="session-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#059669"/>
                  <stop offset="100%" stop-color="#10b981"/>
                </linearGradient>
              </defs>
              <circle class="session-ring-bg" cx="90" cy="90" r="80"/>
              <circle class="session-ring-fill" id="session-ring-fill" cx="90" cy="90" r="80"/>
            </svg>
            <div class="session-center">
              <div class="session-percent" id="session-percent">0%</div>
              <div class="session-label">Session Progress</div>
            </div>
          </div>

          <!-- Stats -->
          <div class="session-stats">
            <div class="session-stat">
              <div class="session-stat-value" id="session-kwh">0.0</div>
              <div class="session-stat-label">Energy (kWh)</div>
            </div>
            <div class="session-stat">
              <div class="session-stat-value" id="session-cost">£0.00</div>
              <div class="session-stat-label">Total Cost</div>
            </div>
            <div class="session-stat">
              <div class="session-stat-value" id="session-time">0:00</div>
              <div class="session-stat-label">Elapsed Time</div>
            </div>
          </div>

          <button class="btn-secondary" style="width:100%" onclick="App.endSession()">
            Terminate Session
          </button>
        </div>
      </div>
    `;
  }

  // ── HISTORY ────────────────────────────────────────────────
  function renderHistory() {
    return `
      <div class="sheet-header">
        <div style="display:flex;align-items:center;gap:var(--sp-3)">
          <button class="btn-icon" onclick="App.goHome()">
            ${icons.arrowLeft}
          </button>
          <div>
            <div class="sheet-title">Charging History</div>
            <div class="sheet-subtitle">${APP_DATA.history.length} completed sessions</div>
          </div>
        </div>
      </div>
      <div class="sheet-content">
        <div class="history-list animate-fade-in">
          ${APP_DATA.history.map(h => `
            <div class="history-card">
              <div class="history-icon" style="color:var(--emerald)">${icons.zap}</div>
              <div class="history-details">
                <div class="history-location">${h.location}</div>
                <div class="history-date">${formatDate(h.date)} · ${h.truckName} · ${h.duration}</div>
              </div>
              <div class="history-stats">
                <div class="history-kwh">${h.kwhDelivered} kWh</div>
                <div class="history-cost">£${h.cost.toFixed(2)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ══════════════════════════════════════════════════════════
  //  VIEW MANAGEMENT
  // ══════════════════════════════════════════════════════════

  function render(view, data) {
    const sheetBody = document.getElementById('sheet-body');
    currentView = view;
    let html = '';

    switch (view) {
      case 'home':
        html = renderHome();
        setSheetState('half');
        break;
      case 'setup':
        html = renderSetup();
        setSheetState('full');
        break;
      case 'payment':
        html = renderPayment();
        setSheetState('full');
        break;
      case 'dispatching':
        html = renderDispatching();
        setSheetState('half');
        break;
      case 'tracking':
        html = renderTracking(data.truck, data.eta, data.progress || 5);
        setSheetState('half');
        break;
      case 'session':
        html = renderSession(data.truck);
        setSheetState('half');
        startSessionSimulation(data.truck);
        break;
      case 'history':
        html = renderHistory();
        setSheetState('full');
        break;
    }

    sheetBody.innerHTML = `
      <div class="sheet-handle-area"><div class="sheet-handle"></div></div>
      ${html}
    `;
    initSheetDrag();
  }

  // ── Pin Mode Banner ────────────────────────────────────────
  function showPinBanner() {
    const banner = document.getElementById('pin-mode-banner');
    if (banner) banner.style.display = 'block';
  }

  function hidePinBanner() {
    const banner = document.getElementById('pin-mode-banner');
    if (banner) banner.style.display = 'none';
  }

  // ── Selection Helpers ──────────────────────────────────────
  function selectChargeLevel(id) {
    selectedChargeLevel = id;
    render('setup');
  }

  function selectConnector(c) {
    selectedConnector = c;
    render('setup');
  }

  let trackingAnimationFrame = null;

  // ── Tracking Simulation (60 FPS OSRM Real-Time Road Path) ─────
  async function startTracking(truck) {
    if (trackingAnimationFrame) {
      cancelAnimationFrame(trackingAnimationFrame);
      trackingAnimationFrame = null;
    }
    if (trackingInterval) clearInterval(trackingInterval);

    const carPos = MapModule.getCarPosition();
    if (!carPos) return;

    MapModule.showTruck(truck.depot[0], truck.depot[1]);
    await MapModule.drawRoute(truck.depot[0], truck.depot[1], carPos.lat, carPos.lng);

    const initialETA = MapModule.estimateETA(truck.depot[0], truck.depot[1], carPos.lat, carPos.lng);
    let eta = initialETA;
    let progress = 5;

    render('tracking', { truck, eta, progress });

    const tripDurationMs = 22000;
    const startTime = performance.now();

    function step60fps(now) {
      const elapsed = now - startTime;
      const t = Math.min(1.0, elapsed / tripDurationMs);

      const point = MapModule.getPathPointAt(t);
      if (point) {
        MapModule.moveTruckSmooth(point.lat, point.lng, point.bearing);
      }

      progress = Math.min(100, Math.round(t * 100));
      eta = Math.max(0, Math.round(initialETA * (1 - t)));

      const etaEl = document.getElementById('tracking-eta');
      const progressEl = document.getElementById('tracking-progress');
      if (etaEl) etaEl.textContent = eta;
      if (progressEl) progressEl.style.width = progress + '%';

      if (t < 1.0) {
        trackingAnimationFrame = requestAnimationFrame(step60fps);
      } else {
        trackingAnimationFrame = null;
        if (carPos) MapModule.moveTruckSmooth(carPos.lat, carPos.lng, point ? point.bearing : 0);
        showToast('Unit Arrived', `${truck.name} has reached your target location`, 'success');
        Bridge.showNotification(
          'Mobile Unit Arrived',
          `${truck.name} has arrived at your target location and is preparing the charger.`
        );
        MapModule.clearRoute();
        setTimeout(() => {
          renderSession(truck);
        }, 2000);
      }
    }

    trackingAnimationFrame = requestAnimationFrame(step60fps);
  }

  // ── Session Simulation ─────────────────────────────────────
  function startSessionSimulation(truck) {
    if (sessionInterval) clearInterval(sessionInterval);

    const level = APP_DATA.chargeLevels.find(l => l.id === selectedChargeLevel) || APP_DATA.chargeLevels[1];
    let kwh = 0;
    let seconds = 0;
    const totalKwh = level.kwhEstimate;
    const circumference = 2 * Math.PI * 80;
    const effectivePrice = APP_DATA.pricing.getEffectivePrice();

    sessionInterval = setInterval(() => {
      seconds++;
      const fraction = Math.min(seconds / 40, 1);
      const progressPercent = Math.round(fraction * 100);
      kwh = +(totalKwh * fraction).toFixed(1);
      const cost = (APP_DATA.pricing.baseCallout + kwh * effectivePrice).toFixed(2);
      const mins = Math.floor(seconds * 1.5 / 60);
      const secs = Math.floor((seconds * 1.5) % 60);
      const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

      const ringFill = document.getElementById('session-ring-fill');
      const percentEl = document.getElementById('session-percent');
      const kwhEl = document.getElementById('session-kwh');
      const costEl = document.getElementById('session-cost');
      const timeEl = document.getElementById('session-time');

      if (ringFill) {
        const offset = circumference - (progressPercent / 100) * circumference;
        ringFill.style.strokeDashoffset = offset;
      }
      if (percentEl) percentEl.textContent = progressPercent + '%';
      if (kwhEl) kwhEl.textContent = kwh.toFixed(1);
      if (costEl) costEl.textContent = '£' + cost;
      if (timeEl) timeEl.textContent = timeStr;

      if (fraction >= 1) {
        clearInterval(sessionInterval);
        sessionInterval = null;
        showToast('Charging Complete', `${kwh} kWh delivered · £${cost}`, 'success');
        Bridge.showNotification(
          'Charging Complete',
          `Your charging session has completed. ${kwh} kWh delivered for total £${cost}.`
        );
      }
    }, 800);
  }

  function stopAll() {
    if (sessionInterval) { clearInterval(sessionInterval); sessionInterval = null; }
    if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
  }

  // ── Drawer Content ─────────────────────────────────────────
  function renderDrawer() {
    const user = APP_DATA.user;
    return `
      <div class="drawer-header">
        <div class="drawer-user">
          <div class="drawer-user-avatar">${user.initials}</div>
          <div class="drawer-user-info">
            <div class="drawer-user-name">${user.name}</div>
            <div class="drawer-user-vehicle">Enterprise Account</div>
          </div>
        </div>
      </div>
      <div class="drawer-nav">
        <div class="drawer-nav-item active" onclick="App.goHome(); UI.closeDrawer();">
          ${icons.zap}
          Request Mobile Charging
        </div>
        <div class="drawer-nav-item" onclick="App.showHistory(); UI.closeDrawer();">
          ${icons.history}
          Charging History
        </div>
        <div class="drawer-nav-item">
          ${icons.creditCard}
          Payment Accounts
        </div>
        <div class="drawer-divider"></div>
        <div class="drawer-nav-item" onclick="UI.openNotificationsModal(); UI.closeDrawer();">
          ${icons.bell}
          Notifications & Alerts
        </div>
        <div class="drawer-nav-item">
          ${icons.settings}
          Enterprise Settings
        </div>
        <div class="drawer-nav-item">
          ${icons.helpCircle}
          Support & Escalation
        </div>
      </div>
    `;
  }

  function initDrawer() {
    const drawerEl = document.getElementById('drawer-content');
    if (drawerEl) drawerEl.innerHTML = renderDrawer();
  }

  // ── Modal & Notifications Center ───────────────────────────
  async function openNotificationsModal() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    if (!overlay || !modal) return;

    let isGranted = false;
    if ('Notification' in window) {
      isGranted = Notification.permission === 'granted';
    }

    modal.className = 'modal-container';
    modal.innerHTML = `
      <div class="modal-header">
        <div style="display:flex;align-items:center;gap:var(--sp-2)">
          <div style="width:20px;height:20px;color:var(--emerald)">${icons.bell}</div>
          <div style="font-weight:var(--fw-bold);font-size:var(--fs-md)">Notifications & Alerts</div>
        </div>
        <button class="btn-icon" style="width:32px;height:32px" onclick="UI.closeModal()">${icons.x}</button>
      </div>

      <div class="modal-body">
        <!-- Permission Control -->
        <div style="padding:var(--sp-4);background:${isGranted ? 'var(--emerald-dim)' : 'var(--amber-dim)'};border:1px solid ${isGranted ? 'rgba(5,150,105,0.2)' : 'rgba(217,119,6,0.2)'};border-radius:var(--radius-lg);margin-bottom:var(--sp-5)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-2)">
            <div style="font-weight:var(--fw-bold);font-size:var(--fs-sm);color:${isGranted ? 'var(--emerald-dark)' : 'var(--amber)'}">
              Push Notifications: ${isGranted ? 'Enabled & Active' : 'Permission Required'}
            </div>
            <span style="font-size:10px;padding:2px 8px;border-radius:var(--radius-full);background:${isGranted ? 'var(--emerald)' : 'var(--amber)'};color:white;font-weight:bold">
              ${isGranted ? 'ACTIVE' : 'ACTION NEEDED'}
            </span>
          </div>
          <div style="font-size:var(--fs-xs);color:var(--text-secondary);margin-bottom:var(--sp-3)">
            ${isGranted ? "You'll receive live system alerts when mobile units are dispatched, arrive, or finish charging." : 'Allow notifications to receive real-time updates when your truck is en route.'}
          </div>
          <div style="display:flex;gap:var(--sp-2)">
            <button class="btn-primary" style="flex:1;padding:var(--sp-2) var(--sp-4);font-size:var(--fs-xs)" onclick="UI.requestAndRefreshNotifications()">
              ${isGranted ? 'Refresh Permission' : 'Enable Push Notifications'}
            </button>
            <button class="btn-secondary" style="padding:var(--sp-2) var(--sp-4);font-size:var(--fs-xs)" onclick="UI.sendTestNotification()">
              Send Test Alert
            </button>
          </div>
        </div>

        <!-- Recent Alerts Stream -->
        <div style="font-size:var(--fs-xs);color:var(--text-secondary);font-weight:var(--fw-semibold);letter-spacing:0.05em;margin-bottom:var(--sp-3)">SYSTEM ALERTS & ACTIVITY</div>
        
        <div class="notification-card">
          <div class="notification-icon">${icons.truck}</div>
          <div style="flex:1">
            <div style="font-weight:var(--fw-bold);font-size:var(--fs-sm)">Mobile Dispatch System Ready</div>
            <div style="font-size:var(--fs-xs);color:var(--text-secondary);margin-top:2px">Fleet units active in South London, West London & Central Manchester.</div>
          </div>
        </div>

        <div class="notification-card">
          <div class="notification-icon">${icons.mapPin}</div>
          <div style="flex:1">
            <div style="font-weight:var(--fw-bold);font-size:var(--fs-sm)">GPS Location Detection</div>
            <div style="font-size:var(--fs-xs);color:var(--text-secondary);margin-top:2px">Proximity routing active. Coordinates will be shared upon checkout.</div>
          </div>
        </div>

        <div class="notification-card">
          <div class="notification-icon">${icons.creditCard}</div>
          <div style="flex:1">
            <div style="font-weight:var(--fw-bold);font-size:var(--fs-sm)">Enterprise Billing Active</div>
            <div style="font-size:var(--fs-xs);color:var(--text-secondary);margin-top:2px">Corporate Visa account configured for instant callout dispatch.</div>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add('active');
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  async function requestAndRefreshNotifications() {
    const granted = await Bridge.requestNotifications();
    if (granted) {
      showToast('Notifications Enabled', 'Push alerts active for dispatch & arrival updates', 'success');
    } else {
      showToast('Notifications Disabled', 'Please enable notification permissions in browser settings', 'warning');
    }
    openNotificationsModal();
  }

  function sendTestNotification() {
    Bridge.showNotification(
      'Test System Alert',
      'Atlas Charge Plus+ push notifications are configured and working cleanly!'
    );
    showToast('Test Notification Sent', 'Check your device or browser alert banner', 'info');
  }

  return {
    render,
    showToast,
    setSheetState,
    openDrawer,
    closeDrawer,
    initDrawer,
    initSheetDrag,
    openNotificationsModal,
    closeModal,
    requestAndRefreshNotifications,
    sendTestNotification,
    selectChargeLevel,
    selectConnector,
    startTracking,
    stopAll,
    showPinBanner,
    hidePinBanner,
    icons,
    getSelectedChargeLevel: () => selectedChargeLevel,
    getSelectedConnector: () => selectedConnector,
    getCurrentView: () => currentView,
  };
})();
