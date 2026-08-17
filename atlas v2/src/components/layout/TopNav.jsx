import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Zap, Navigation, Shield, Truck, Clock, Layers, Car, CreditCard, Star, Activity, User, LogOut, LogIn, Crown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useOrder } from '../../context/OrderContext';

export default function TopNav() {
  const navigate = useNavigate();
  const { currentUser, session, signOut } = useAuth();
  const { vehicles, invoices, trucks } = useData();
  const { ordersList, activeOrder } = useOrder();

  const activeOrdersCount = ordersList.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELED').length;
  const role = currentUser?.role;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="top-nav">
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <NavLink to="/home" className="brand-badge">
          <img
            src="/logo.png"
            alt="Atlas Charge Plus+ Logo"
            style={{ width: '38px', height: '38px', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(5, 150, 105, 0.25))' }}
          />
          <div>
            <div className="brand-name">Atlas <span>CHARGE+</span></div>
          </div>
        </NavLink>
      </div>

      {/* Main Navigation Links */}
      <nav className="nav-links">
        {/* Unauthenticated View */}
        {!session && (
          <>
            <NavLink to="/tariffs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Clock size={15} /> Tariffs
            </NavLink>
            <NavLink to="/connectors" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Layers size={15} /> Hardware
            </NavLink>
            <NavLink to="/reviews" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Star size={15} /> Reviews
            </NavLink>
          </>
        )}

        {/* CLIENT NAV */}
        {session && role === 'CLIENT' && (
          <>
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Navigation size={15} /> Dispatch Map
              {activeOrder && <span className="status-dot emerald pulse" style={{ width: '6px', height: '6px' }} />}
            </NavLink>
            <NavLink to="/vehicles" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Car size={15} /> Garage ({vehicles.length})
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <CreditCard size={15} /> Invoices ({invoices.length})
            </NavLink>
            <NavLink to="/tariffs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Clock size={15} /> Tariffs
            </NavLink>
            <NavLink to="/connectors" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Layers size={15} /> Hardware
            </NavLink>
            <NavLink to="/reviews" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Star size={15} /> Reviews
            </NavLink>
          </>
        )}

        {/* DRIVER / TECHNICIAN NAV */}
        {session && role === 'DRIVER' && (
          <>
            <NavLink to="/driver" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Truck size={15} /> Driver Cockpit
              {activeOrdersCount > 0 && (
                <span className="brand-pill" style={{ background: 'var(--amber-light)', color: 'var(--amber-primary)', padding: '2px 6px', fontSize: '10px' }}>
                  {activeOrdersCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/tariffs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Clock size={15} /> Tariffs
            </NavLink>
            <NavLink to="/connectors" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Layers size={15} /> Hardware
            </NavLink>
            <NavLink to="/reviews" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Star size={15} /> Reviews
            </NavLink>
          </>
        )}

        {/* FLEET DISPATCHER NAV */}
        {session && role === 'FLEET_DISPATCHER' && (
          <>
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Shield size={15} /> Fleet Console ({trucks.length})
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Activity size={15} /> Telemetry
            </NavLink>
            <NavLink to="/tariffs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Clock size={15} /> Tariffs
            </NavLink>
            <NavLink to="/connectors" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Layers size={15} /> Hardware
            </NavLink>
            <NavLink to="/reviews" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Star size={15} /> Reviews
            </NavLink>
          </>
        )}

        {/* SUPER ADMIN NAV */}
        {session && role === 'SUPER_ADMIN' && (
          <>
            <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Crown size={15} color="#10b981" /> Fleet Console ({trucks.length})
            </NavLink>
            <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Activity size={15} /> Telemetry
            </NavLink>
            <NavLink to="/tariffs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Clock size={15} /> Tariffs
            </NavLink>
            <NavLink to="/connectors" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Layers size={15} /> Hardware
            </NavLink>
            <NavLink to="/reviews" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Star size={15} /> Reviews
            </NavLink>
          </>
        )}
      </nav>

      {/* Right User Bar & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {!session ? (
          <NavLink to="/login" className="btn-emerald" style={{ padding: '8px 18px', fontSize: '13px', width: 'auto' }}>
            <LogIn size={15} /> Sign In
          </NavLink>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* User Profile Pill */}
            <NavLink
              to="/profile"
              className="metric-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                textDecoration: 'none',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: role === 'SUPER_ADMIN' ? 'var(--slate-900)' : 'var(--emerald-light)',
                color: role === 'SUPER_ADMIN' ? '#10b981' : 'var(--emerald-darker)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '11px'
              }}>
                {role === 'SUPER_ADMIN' ? <Crown size={12} /> : currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>
                {currentUser?.full_name?.split(' ')[0] || 'User'}
              </span>
              <span className="brand-pill" style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: role === 'SUPER_ADMIN' ? 'var(--slate-900)' : role === 'CLIENT' ? 'var(--emerald-light)' : role === 'DRIVER' ? 'var(--amber-light)' : 'var(--slate-100)',
                color: role === 'SUPER_ADMIN' ? '#10b981' : role === 'CLIENT' ? 'var(--emerald-darker)' : role === 'DRIVER' ? 'var(--amber-primary)' : 'var(--slate-800)'
              }}>
                {role?.replace('_', ' ')}
              </span>
            </NavLink>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="btn-outline"
              style={{ padding: '7px 10px', borderRadius: 'var(--radius-full)', color: 'var(--red-primary)', border: '1px solid var(--border-subtle)' }}
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
