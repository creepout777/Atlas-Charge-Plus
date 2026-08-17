import React from 'react';

export default function SpeedometerGauge({ currentKw = 145.5, maxKw = 150 }) {
  const pct = Math.min(100, Math.max(0, (currentKw / maxKw) * 100));
  const strokeDash = 251.2;
  const strokeOffset = strokeDash - (strokeDash * (pct / 100)) * 0.75; // 270 degree arc

  return (
    <div style={{ textAlign: 'center', margin: '12px 0' }}>
      <div style={{ position: 'relative', width: '180px', height: '110px', margin: '0 auto', overflow: 'hidden' }}>
        <svg viewBox="0 0 100 60" style={{ width: '100%', height: '100%' }}>
          {/* Background Track */}
          <path
            d="M 15 50 A 35 35 0 0 1 85 50"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active Emerald Delivery Arc */}
          <path
            d="M 15 50 A 35 35 0 0 1 85 50"
            fill="none"
            stroke="url(#emeraldGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="110"
            strokeDashoffset={110 - (110 * (pct / 100))}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
          <defs>
            <linearGradient id="emeraldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ position: 'absolute', bottom: '2px', left: '0', right: '0', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '26px', fontWeight: 900, color: 'var(--slate-900)' }}>
            {currentKw.toFixed(1)}
          </div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--emerald-dark)', letterSpacing: '0.05em' }}>
            kW RAPID OUTPUT
          </div>
        </div>
      </div>
    </div>
  );
}
