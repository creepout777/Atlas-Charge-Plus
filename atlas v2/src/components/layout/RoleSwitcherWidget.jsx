import React from 'react';
import { Crown, Shield, Truck, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function RoleSwitcherWidget() {
  const { currentUser, switchRole } = useAuth();
  const currentRole = currentUser?.role || 'GUEST';

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: 'var(--radius-full)',
      padding: '6px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    }}>
      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', padding: '0 6px', letterSpacing: '0.05em' }}>
        SWITCH ROLE:
      </span>

      <button
        onClick={() => switchRole('SUPER_ADMIN')}
        style={{
          background: currentRole === 'SUPER_ADMIN' ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
          color: currentRole === 'SUPER_ADMIN' ? '#022c22' : '#ffffff',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: '5px 10px',
          fontSize: '11px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.15s ease',
        }}
        title="Switch to Super Admin (Full Edit Access)"
      >
        <Crown size={12} /> Admin
      </button>

      <button
        onClick={() => switchRole('FLEET_DISPATCHER')}
        style={{
          background: currentRole === 'FLEET_DISPATCHER' ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
          color: currentRole === 'FLEET_DISPATCHER' ? '#082f49' : '#ffffff',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: '5px 10px',
          fontSize: '11px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.15s ease',
        }}
        title="Switch to Fleet Dispatcher"
      >
        <Shield size={12} /> Dispatcher
      </button>

      <button
        onClick={() => switchRole('DRIVER')}
        style={{
          background: currentRole === 'DRIVER' ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
          color: currentRole === 'DRIVER' ? '#451a03' : '#ffffff',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: '5px 10px',
          fontSize: '11px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.15s ease',
        }}
        title="Switch to Driver"
      >
        <Truck size={12} /> Driver
      </button>

      <button
        onClick={() => switchRole('CLIENT')}
        style={{
          background: currentRole === 'CLIENT' ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
          color: currentRole === 'CLIENT' ? '#022c22' : '#ffffff',
          border: 'none',
          borderRadius: 'var(--radius-full)',
          padding: '5px 10px',
          fontSize: '11px',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'all 0.15s ease',
        }}
        title="Switch to Client EV Owner"
      >
        <UserCheck size={12} /> Client
      </button>
    </div>
  );
}
