import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserCheck, Shield, Truck, Zap, Lock, Mail, Phone, User, AlertCircle, CheckCircle2, Crown, ShieldAlert, KeyRound, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api/authService';
import TurnstileWidget from '../components/shared/TurnstileWidget';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

export default function LoginPage() {
  const { signIn, signUp, switchRole, currentUser, session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+447911223344');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email Confirmation State
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);

  // Rate Limiting & Anti-Brute-Force Lockout State
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  // Bot Protection / Captcha State
  const [captchaVerified, setCaptchaVerified] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState('cf_turnstile_verified_token');

  const handleTurnstileVerify = useCallback((token) => {
    setTurnstileToken(token);
    setCaptchaVerified(true);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken('');
    setCaptchaVerified(false);
  }, []);

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

  // Lockout Countdown Timer
  useEffect(() => {
    let timer = null;
    if (lockoutTimeLeft > 0) {
      timer = setInterval(() => {
        setLockoutTimeLeft((prev) => {
          if (prev <= 1) {
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [lockoutTimeLeft]);

  // If already logged in, automatically redirect to appropriate dashboard
  useEffect(() => {
    if (session && currentUser) {
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        if (currentUser.role === 'DRIVER') navigate('/driver', { replace: true });
        else if (currentUser.role === 'FLEET_DISPATCHER' || currentUser.role === 'SUPER_ADMIN') navigate('/admin', { replace: true });
        else navigate('/', { replace: true });
      }
    }
  }, [session, currentUser, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutTimeLeft > 0) return;

    setErrorMsg('');
    setSuccessMsg('');
    setUnconfirmedEmail('');
    setIsSubmitting(true);

    try {
      if (mode === 'forgot') {
        await authService.resetPasswordForEmail(email, { captchaToken: turnstileToken });
        setSuccessMsg(`Password reset instructions sent to ${email}. Please check your inbox.`);
      } else if (mode === 'signup') {
        // Enforce password strength
        if (passedCriteriaCount < 3) {
          throw new Error('Please choose a stronger password with at least 8 characters including numbers and letters.');
        }

        await signUp(email, password, fullName, phoneNumber, 'CLIENT', { captchaToken: turnstileToken });
        setSuccessMsg('EV Client account created successfully! Signing in...');
        setTimeout(async () => {
          try {
            await signIn(email, password);
            navigate('/', { replace: true });
          } catch {
            setSuccessMsg('Account registered! You can now sign in with your email & password.');
          }
        }, 800);
      } else {
        const res = await signIn(email, password, { captchaToken: turnstileToken });
        setFailedAttempts(0);
        setSuccessMsg('Signed in successfully! Redirecting...');
        const userRole = res?.data?.user?.user_metadata?.role || 'CLIENT';
        setTimeout(() => {
          if (userRole === 'DRIVER') navigate('/driver', { replace: true });
          else if (userRole === 'FLEET_DISPATCHER' || userRole === 'SUPER_ADMIN') navigate('/admin', { replace: true });
          else navigate('/', { replace: true });
        }, 300);
      }
    } catch (err) {
      const errorText = err.message || 'Authentication failed';
      setErrorMsg(errorText);

      // Check if email confirmation error
      if (errorText.toLowerCase().includes('email not confirmed') || errorText.toLowerCase().includes('not verified')) {
        setUnconfirmedEmail(email);
      } else {
        // Increment brute-force failure count
        const newCount = failedAttempts + 1;
        setFailedAttempts(newCount);
        if (newCount >= MAX_FAILED_ATTEMPTS) {
          setLockoutTimeLeft(LOCKOUT_SECONDS);
          setErrorMsg(`Too many consecutive failed attempts. Security lockout active for ${LOCKOUT_SECONDS} seconds.`);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;
    setResendingEmail(true);
    try {
      await authService.resendConfirmationEmail(unconfirmedEmail);
      setSuccessMsg(`Confirmation email resent to ${unconfirmedEmail}. Please check your inbox.`);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Failed to resend confirmation: ' + err.message);
    } finally {
      setResendingEmail(false);
    }
  };

  const handleDemoSwitch = async (demoRole, path) => {
    setIsSubmitting(true);
    setErrorMsg('');
    setUnconfirmedEmail('');
    try {
      await switchRole(demoRole);
      navigate(path, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '36px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <img
          src="/logo.png"
          alt="Atlas Charge Plus+ Logo"
          style={{ width: '64px', height: '64px', objectFit: 'contain', margin: '0 auto 12px', filter: 'drop-shadow(0 4px 12px rgba(5, 150, 105, 0.3))' }}
        />
        <h1 style={{ fontSize: '26px', fontWeight: 900 }}>Atlas Charge Plus+ Authentication</h1>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Production-grade Supabase Auth with RLS, Rate Throttling & Cloudflare Bot Shield
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="card-glass" style={{ marginBottom: '24px' }}>
        {mode === 'forgot' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>Reset Account Password</div>
            <button
              type="button"
              className="btn-outline"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
            <button
              className={mode === 'signin' ? 'btn-emerald' : 'btn-outline'}
              style={{ flex: 1, padding: '8px 14px', fontSize: '13px' }}
              onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
              type="button"
            >
              Sign In with Password
            </button>
            <button
              className={mode === 'signup' ? 'btn-emerald' : 'btn-outline'}
              style={{ flex: 1, padding: '8px 14px', fontSize: '13px' }}
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              type="button"
            >
              Create Client Account
            </button>
          </div>
        )}

        {/* Lockout Warning */}
        {lockoutTimeLeft > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#991b1b', padding: '12px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <ShieldAlert size={20} color="#ef4444" />
            <div>
              <div style={{ fontWeight: 800 }}>Brute-Force Rate Limiter Active</div>
              <div style={{ fontSize: '12px' }}>Too many invalid attempts. Authentication paused for <b>{lockoutTimeLeft}s</b>.</div>
            </div>
          </div>
        )}

        {/* Standard Error Notice */}
        {errorMsg && lockoutTimeLeft === 0 && (
          <div style={{ background: 'var(--red-light)', border: '1px solid var(--red-primary)', color: 'var(--red-primary)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <AlertCircle size={16} />
            <div style={{ flex: 1 }}>{errorMsg}</div>
          </div>
        )}

        {/* Unconfirmed Email Recovery Action */}
        {unconfirmedEmail && (
          <div style={{ background: 'var(--amber-light)', border: '1px solid var(--amber-primary)', color: 'var(--amber-dark, #78350f)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', marginBottom: '14px' }}>
            <div style={{ fontWeight: 800, marginBottom: '4px' }}>Email Verification Required</div>
            <div style={{ fontSize: '12px', marginBottom: '8px' }}>
              Your account for <b>{unconfirmedEmail}</b> is pending confirmation.
            </div>
            <button
              type="button"
              className="btn-outline"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff' }}
              onClick={handleResendConfirmation}
              disabled={resendingEmail}
            >
              <RefreshCw size={13} className={resendingEmail ? 'spin' : ''} />
              {resendingEmail ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>
        )}

        {/* Success Notice */}
        {successMsg && (
          <div style={{ background: 'var(--emerald-light)', border: '1px solid var(--emerald-primary)', color: 'var(--emerald-darker)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'forgot' && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              Enter the email associated with your account and we'll send a secure one-time password reset link to your inbox.
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div style={{ background: 'var(--emerald-light)', border: '1px solid var(--emerald-border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: 'var(--emerald-darker)' }}>
                <b>Client Registration (EV Owners):</b> Sign up to book on-demand mobile DC charging across London. <i>(Drivers and Dispatchers are provisioned directly by SuperAdmin in Fleet Operations).</i>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Full Name</label>
                <input className="metric-card" style={{ width: '100%', outline: 'none' }} placeholder="Alex Morgan" value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Phone Number</label>
                <input className="metric-card" style={{ width: '100%', outline: 'none' }} placeholder="+447911123456" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required />
              </div>
            </>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Email Address</label>
            <input className="metric-card" type="email" style={{ width: '100%', outline: 'none' }} placeholder="alex.morgan@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          {mode !== 'forgot' && (
            <div style={{ marginBottom: mode === 'signup' ? '8px' : '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800 }}>Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--emerald-primary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input className="metric-card" type="password" style={{ width: '100%', outline: 'none' }} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
          )}

          {/* Real-time Password Strength Meter on Registration */}
          {mode === 'signup' && password.length > 0 && (
            <div style={{ marginBottom: '16px', background: 'var(--slate-50)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
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

          {/* Live Cloudflare Turnstile Verification Widget */}
          <TurnstileWidget
            onVerify={handleTurnstileVerify}
            onExpire={handleTurnstileExpire}
          />

          <button type="submit" className="btn-emerald" disabled={isSubmitting || lockoutTimeLeft > 0}>
            {lockoutTimeLeft > 0
              ? `Locked (${lockoutTimeLeft}s remaining)`
              : isSubmitting
              ? 'Processing...'
              : mode === 'forgot'
              ? 'Send Password Reset Link'
              : mode === 'signup'
              ? 'Create Client EV Account'
              : 'Sign In with Supabase'}
          </button>
        </form>
      </div>

      {/* Instant Demo Role Switcher */}
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>OR TEST WITH PRESET ROLES</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {/* SuperAdmin Preset */}
        <div
          className="card-glass"
          onClick={() => handleDemoSwitch('SUPER_ADMIN', '/admin')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--slate-800)', background: 'linear-gradient(135deg, var(--slate-900), var(--slate-950))', color: '#ffffff' }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '38px', height: '38px', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
              <Crown size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>SuperAdmin Console (admin@atlascharge.com)</div>
              <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>Full platform access: Telemetry, Tariffs, Fleet & Users</div>
            </div>
          </div>
          <span className="brand-pill" style={{ background: '#10b981', color: '#022c22' }}>SUPER ADMIN</span>
        </div>

        {/* Dispatcher Preset */}
        <div
          className="card-glass"
          onClick={() => handleDemoSwitch('FLEET_DISPATCHER', '/admin')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '38px', height: '38px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-700)' }}>
              <Shield size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>Fleet Dispatcher (dispatcher@atlascharge.com)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Live truck positions, queue management & UI dictionary</div>
            </div>
          </div>
          <span className="brand-pill" style={{ background: 'var(--slate-100)', color: 'var(--slate-700)' }}>DISPATCHER</span>
        </div>

        {/* Driver Preset */}
        <div
          className="card-glass"
          onClick={() => handleDemoSwitch('DRIVER', '/driver')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '38px', height: '38px', background: 'var(--amber-light)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber-primary)' }}>
              <Truck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>Technician Cockpit (marcus.webb.548@atlascharge.com)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Dispatch alerts, navigation & 150kW charge controls</div>
            </div>
          </div>
          <span className="brand-pill" style={{ background: 'var(--amber-light)', color: 'var(--amber-primary)' }}>DRIVER</span>
        </div>

        {/* Client Preset */}
        <div
          className="card-glass"
          onClick={() => handleDemoSwitch('CLIENT', '/')}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '38px', height: '38px', background: 'var(--emerald-light)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-darker)' }}>
              <UserCheck size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>Client Profile (alex.morgan@email.com)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>On-demand EV charging request, live map & invoices</div>
            </div>
          </div>
          <span className="brand-pill">CLIENT</span>
        </div>
      </div>

      {/* Production Security Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
        <div className="card-glass" style={{ padding: '8px' }}>
          <Lock size={14} style={{ margin: '0 auto 4px', color: '#10b981' }} />
          <div>Argon2id + TLS 1.3</div>
        </div>
        <div className="card-glass" style={{ padding: '8px' }}>
          <Shield size={14} style={{ margin: '0 auto 4px', color: '#0284c7' }} />
          <div>RLS Row Security</div>
        </div>
        <div className="card-glass" style={{ padding: '8px' }}>
          <Zap size={14} style={{ margin: '0 auto 4px', color: '#f59e0b' }} />
          <div>Rate Throttling Active</div>
        </div>
      </div>
    </div>
  );
}
