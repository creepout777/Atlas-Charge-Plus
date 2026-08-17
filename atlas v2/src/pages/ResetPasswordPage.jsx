import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { authService } from '../services/api/authService';
import { useAuth } from '../context/AuthContext';
import { formatErrorMessage } from '../utils/errorHandler';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password Policy Analysis
  const passwordCriteria = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
  const passedCriteriaCount = Object.values(passwordCriteria).filter(Boolean).length;
  const strengthLevel = passedCriteriaCount <= 2 ? 'Weak' : passedCriteriaCount <= 4 ? 'Good' : 'Strong';
  const strengthColor = passedCriteriaCount <= 2 ? '#ef4444' : passedCriteriaCount <= 4 ? '#f59e0b' : '#10b981';

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both password entries.');
      return;
    }

    if (passedCriteriaCount < 3) {
      setErrorMsg('Please choose a stronger password with at least 8 characters including numbers and letters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await authService.updateUserPassword(password);
      if (error) throw error;

      setSuccessMsg('Your password has been successfully updated! Redirecting to your dashboard...');
      setTimeout(() => {
        if (currentUser?.role === 'DRIVER') navigate('/driver', { replace: true });
        else if (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'FLEET_DISPATCHER') navigate('/admin', { replace: true });
        else navigate('/', { replace: true });
      }, 1500);
    } catch (err) {
      setErrorMsg(formatErrorMessage(err, 'password_reset'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '60px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img
          src="/logo.png"
          alt="Atlas Charge Plus+ Logo"
          style={{ width: '56px', height: '56px', objectFit: 'contain', margin: '0 auto 12px', filter: 'drop-shadow(0 4px 12px rgba(5, 150, 105, 0.3))' }}
        />
        <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Set New Password</h1>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Choose a secure password for your Atlas Charge Plus+ account
        </div>
      </div>

      <div className="card-glass">
        {errorMsg && (
          <div style={{ background: 'var(--red-light)', border: '1px solid var(--red-primary)', color: 'var(--red-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <AlertCircle size={16} />
            <div style={{ flex: 1 }}>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'var(--emerald-light)', border: '1px solid var(--emerald-primary)', color: 'var(--emerald-darker)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <CheckCircle2 size={18} />
            <div style={{ flex: 1, fontWeight: 700 }}>{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>New Password</label>
            <input
              className="metric-card"
              type="password"
              style={{ width: '100%', outline: 'none' }}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {password.length > 0 && (
            <div style={{ marginBottom: '14px', background: 'var(--slate-50)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '11px', fontWeight: 800 }}>
                <span>Password Strength:</span>
                <span style={{ color: strengthColor }}>{strengthLevel}</span>
              </div>
              <div style={{ height: '4px', width: '100%', background: 'var(--slate-200)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${(passedCriteriaCount / 5) * 100}%`, background: strengthColor, transition: 'width 0.3s ease' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: passwordCriteria.length ? '#10b981' : 'var(--text-muted)' }}>
                  <Check size={11} /> 8+ Characters
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: passwordCriteria.hasUpper && passwordCriteria.hasLower ? '#10b981' : 'var(--text-muted)' }}>
                  <Check size={11} /> Upper & Lowercase
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: passwordCriteria.hasNumber ? '#10b981' : 'var(--text-muted)' }}>
                  <Check size={11} /> Numbers (0-9)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: passwordCriteria.hasSpecial ? '#10b981' : 'var(--text-muted)' }}>
                  <Check size={11} /> Symbols (!@#$)
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Confirm New Password</label>
            <input
              className="metric-card"
              type="password"
              style={{ width: '100%', outline: 'none' }}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-emerald" disabled={isSubmitting || !!successMsg}>
            {isSubmitting ? 'Updating Password...' : 'Save New Password & Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
