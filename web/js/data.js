// =============================================================
// Atlas Charge Plus+ — Mock Data
// =============================================================

const APP_DATA = {
  // ── User Profile ─────────────────────────────────────────────
  user: {
    name: 'Alex Morgan',
    initials: 'AM',
    email: 'alex.morgan@email.com',
    paymentMethod: {
      type: 'Visa',
      last4: '4829',
      expiry: '09/27',
    },
    location: null, // populated at runtime
  },

  // ── Company Fleet (small fleet, not always visible) ──────────
  fleet: [
    {
      id: 'truck-01',
      name: 'Atlas Titan #01',
      depot: [51.4652, -0.1195],  // Depot: South London
      chargeSpeed: 150,
      connectors: ['CCS', 'CHAdeMO', 'Type 2'],
      driver: 'Marcus Webb',
      rating: 4.9,
      jobsCompleted: 312,
      photo: null,
    },
    {
      id: 'truck-02',
      name: 'Atlas Bolt #02',
      depot: [52.4862, -1.8904],  // Depot: Birmingham
      chargeSpeed: 100,
      connectors: ['CCS', 'Type 2'],
      driver: 'Priya Shah',
      rating: 4.8,
      jobsCompleted: 278,
      photo: null,
    },
    {
      id: 'truck-03',
      name: 'Atlas Spark #03',
      depot: [53.4808, -2.2426],  // Depot: Manchester
      chargeSpeed: 150,
      connectors: ['CCS', 'CHAdeMO', 'Type 2'],
      driver: 'Fiona McGregor',
      rating: 5.0,
      jobsCompleted: 456,
      photo: null,
    },
  ],

  // ── Pricing ──────────────────────────────────────────────────
  pricing: {
    baseCallout: 5.00,      // £5 callout fee
    pricePerKwh: 0.35,      // £0.35 per kWh
    peakMultiplier: 1.2,    // 20% surge during peak hours (17:00-20:00)
    getPeakMultiplier() {
      const hour = new Date().getHours();
      return (hour >= 17 && hour < 20) ? this.peakMultiplier : 1.0;
    },
    getEffectivePrice() {
      return this.pricePerKwh * this.getPeakMultiplier();
    },
  },

  // ── Charge Level Options ─────────────────────────────────────
  chargeLevels: [
    {
      id: 'quick',
      name: 'Quick Boost',
      description: 'Add ~25% battery — get going fast',
      icon: 'bolt',
      kwhEstimate: 18,
      timeEstimate: '~15 min',
    },
    {
      id: 'standard',
      name: 'Standard Charge',
      description: 'Charge to 80% — best for battery health',
      icon: 'battery',
      kwhEstimate: 38,
      timeEstimate: '~35 min',
    },
    {
      id: 'full',
      name: 'Full Power',
      description: 'Charge to 100% — takes longer above 80%',
      icon: 'plug',
      kwhEstimate: 52,
      timeEstimate: '~55 min',
    },
  ],

  // ── Connector Types ──────────────────────────────────────────
  connectorTypes: ['CCS', 'CHAdeMO', 'Type 2'],

  // ── Charging History ─────────────────────────────────────────
  history: [
    {
      id: 'hist-01',
      date: '2026-08-12',
      location: 'Canary Wharf, London',
      truckName: 'Atlas Titan #01',
      kwhDelivered: 42.3,
      cost: 19.81,
      duration: '38 min',
      chargeFrom: 18,
      chargeTo: 82,
    },
    {
      id: 'hist-02',
      date: '2026-08-08',
      location: 'Victoria Park, Manchester',
      truckName: 'Atlas Spark #03',
      kwhDelivered: 28.1,
      cost: 14.84,
      duration: '24 min',
      chargeFrom: 35,
      chargeTo: 72,
    },
    {
      id: 'hist-03',
      date: '2026-08-03',
      location: 'Harbourside, Bristol',
      truckName: 'Atlas Bolt #02',
      kwhDelivered: 55.0,
      cost: 24.25,
      duration: '52 min',
      chargeFrom: 8,
      chargeTo: 100,
    },
    {
      id: 'hist-04',
      date: '2026-07-29',
      location: 'Princes Street, Edinburgh',
      truckName: 'Atlas Spark #03',
      kwhDelivered: 18.5,
      cost: 11.48,
      duration: '14 min',
      chargeFrom: 52,
      chargeTo: 77,
    },
    {
      id: 'hist-05',
      date: '2026-07-24',
      location: 'Bullring, Birmingham',
      truckName: 'Atlas Bolt #02',
      kwhDelivered: 36.7,
      cost: 17.85,
      duration: '32 min',
      chargeFrom: 22,
      chargeTo: 71,
    },
  ],

  // ── Active Request State ─────────────────────────────────────
  activeRequest: {
    carLocation: null,        // { lat, lng }
    chargeLevel: 'standard',
    connector: 'CCS',
    assignedTruck: null,      // fleet truck object
    truckPosition: null,      // simulated moving position
    eta: null,
    status: null,             // null | 'pending' | 'dispatched' | 'arriving' | 'charging' | 'complete'
  },
};

// ── Helper Functions ───────────────────────────────────────────
function getFuelClass(level) {
  if (level >= 60) return 'high';
  if (level >= 30) return 'medium';
  return 'low';
}

function formatPrice(price) {
  return `£${price.toFixed(2)}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function estimateCost(chargeLevel) {
  const level = APP_DATA.chargeLevels.find(l => l.id === chargeLevel);
  if (!level) return 0;
  const price = APP_DATA.pricing.getEffectivePrice();
  return APP_DATA.pricing.baseCallout + (level.kwhEstimate * price);
}
