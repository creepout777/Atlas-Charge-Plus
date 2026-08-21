import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoLoadingScreen from '../shared/LogoLoadingScreen';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { session, currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LogoLoadingScreen message="Loading" />;
  }

  // Not logged in -> Redirect to login page
  // A currentUser alone (even without a real Supabase session) means we are in
  // fallback/demo mode — allow access so the UI is usable.
  if (!session && !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check if specified
  if (allowedRoles.length > 0 && currentUser && !allowedRoles.includes(currentUser.role)) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="card-glass" style={{ borderTop: '4px solid var(--amber-primary)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>Access Restricted</h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            This page requires the <b>{allowedRoles.join(' or ')}</b> role. Your current role is <b>{currentUser.role}</b>.
          </div>
          <Navigate to="/login" replace />
        </div>
      </div>
    );
  }

  return children;
}
