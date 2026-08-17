import React from 'react';

export default function TelemetryTerminal({ logs = [] }) {
  return (
    <div style={{
      background: 'var(--slate-900)',
      color: '#10b981',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      borderRadius: 'var(--radius-md)',
      padding: '14px',
      maxHeight: '260px',
      overflowY: 'auto',
      border: '1px solid var(--slate-700)',
      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
    }}>
      <div style={{ color: 'var(--slate-400)', borderBottom: '1px solid var(--slate-800)', paddingBottom: '6px', marginBottom: '8px', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
        <span>LIVE TELEMETRY STREAM (CAN BUS / CCS PLC)</span>
        <span style={{ color: '#10b981' }}>● CONNECTED</span>
      </div>
      {logs.length === 0 ? (
        <div style={{ color: 'var(--slate-500)', textAlign: 'center', padding: '20px 0' }}>
          Waiting for active high-voltage charging session...
        </div>
      ) : (
        logs.map((l, i) => (
          <div key={i} style={{ marginBottom: '4px', lineHeight: 1.4 }}>
            <span style={{ color: 'var(--slate-500)' }}>[{new Date(l.recorded_at).toLocaleTimeString()}]</span>{' '}
            <span style={{ color: '#38bdf8' }}>OUTPUT:</span> {l.current_kw?.toFixed(1) || l.current_output_kw}kW |{' '}
            <span style={{ color: '#f59e0b' }}>DELIV:</span> {l.delivered_kwh?.toFixed(2) || l.energy_deliv_kwh}kWh |{' '}
            <span style={{ color: '#a7f3d0' }}>BATTERY:</span> {l.battery_pct?.toFixed(1) || l.vehicle_battery_pct}% |{' '}
            <span style={{ color: '#94a3b8' }}>{l.current_amps || l.charging_amps}A @ {l.voltage_volts}V</span>
          </div>
        ))
      )}
    </div>
  );
}
