import React, { useState, useEffect } from 'react';
import { User, Bell, Gift, Shield, Check, Edit3, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../services/api/authService.js';
import Modal from '../components/layout/Modal.jsx';

export default function ClientProfilePage() {
  const { currentUser, session, updateUserProfile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [referralCode, setReferralCode] = useState('ATLAS-PROMO');

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.full_name || '');
      setEditPhone(currentUser.phone_number || '');
    }
  }, [currentUser]);

  useEffect(() => {
    async function loadClientProfile() {
      if (session?.user?.id) {
        try {
          const { data } = await authService.getClientProfile(session.user.id);
          if (data?.referral_code) {
            setReferralCode(data.referral_code);
          }
          if (data?.notification_preferences_json) {
            setPushEnabled(data.notification_preferences_json.push !== false);
            setEmailEnabled(data.notification_preferences_json.email !== false);
          }
        } catch {
          // Defaults used
        }
      }
    }
    loadClientProfile();
  }, [session]);

  const copyCode = () => {
    navigator.clipboard?.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    try {
      await updateUserProfile({
        fullName: editName,
        phoneNumber: editPhone,
        notificationPreferences: { push: pushEnabled, email: emailEnabled }
      });
      setStatusMsg('Profile successfully updated in PostgreSQL (public.users)!');
      setTimeout(() => {
        setShowEditModal(false);
        setStatusMsg('');
      }, 1000);
    } catch (err) {
      setStatusMsg('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePush = async (checked) => {
    setPushEnabled(checked);
    if (currentUser) {
      await updateUserProfile({ notificationPreferences: { push: checked, email: emailEnabled } });
    }
  };

  const handleToggleEmail = async (checked) => {
    setEmailEnabled(checked);
    if (currentUser) {
      await updateUserProfile({ notificationPreferences: { push: pushEnabled, email: checked } });
    }
  };

  if (!currentUser) return null;

  return (
    <div style={{ maxWidth: '700px', margin: '32px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Account & Profile Settings</h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Manage your personal details, referral rewards & notification preferences</div>
        </div>
        <button className="btn-emerald" style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }} onClick={() => setShowEditModal(true)}>
          <Edit3 size={15} /> Edit Profile
        </button>
      </div>

      {/* User Card */}
      <div className="card-glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '56px', height: '56px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-dark)', fontWeight: 900, fontSize: '20px' }}>
            {currentUser.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 900 }}>{currentUser.full_name || 'User'}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{currentUser.email} · {currentUser.phone_number || 'No phone set'}</div>
            <span className="brand-pill" style={{ marginTop: '6px', display: 'inline-block' }}>Role: {currentUser.role}</span>
          </div>
        </div>

        <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowEditModal(true)}>
          Edit Info
        </button>
      </div>

      {/* Referral Program */}
      {currentUser.role === 'CLIENT' && (
        <div className="card-glass" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Gift size={18} color="var(--emerald-dark)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Referral Program (client_profiles)</h3>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Share your unique invite code with friends to give them £10 off their first mobile charging dispatch.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="metric-card"
              readOnly
              value={referralCode}
              style={{ width: '100%', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--emerald-darker)', outline: 'none' }}
            />
            <button className="btn-emerald" style={{ width: 'auto', whiteSpace: 'nowrap' }} onClick={copyCode}>
              {copied ? <Check size={16} /> : 'Copy Code'}
            </button>
          </div>
        </div>
      )}

      {/* Notifications Preferences */}
      <div className="card-glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Bell size={18} color="var(--emerald-dark)" />
          <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Communication & Push Notifications</h3>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px' }}>Push Notifications (FCM Live Token)</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Receive driver arrival alerts & live charge % updates</div>
          </div>
          <input type="checkbox" checked={pushEnabled} onChange={e => handleTogglePush(e.target.checked)} style={{ accentColor: '#10b981', transform: 'scale(1.3)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px' }}>Itemized VAT Email Invoices</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Receive PDF tax invoices immediately upon charging completion</div>
          </div>
          <input type="checkbox" checked={emailEnabled} onChange={e => handleToggleEmail(e.target.checked)} style={{ accentColor: '#10b981', transform: 'scale(1.3)' }} />
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Account Profile (public.users)">
        <form onSubmit={handleSaveProfile}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Full Name</label>
            <input
              className="metric-card"
              style={{ width: '100%', outline: 'none' }}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Phone Number (UK E.164 format)</label>
            <input
              className="metric-card"
              style={{ width: '100%', outline: 'none' }}
              value={editPhone}
              onChange={e => setEditPhone(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Email Address (Read-only)</label>
            <input
              className="metric-card"
              style={{ width: '100%', outline: 'none', background: 'var(--slate-100)', color: 'var(--text-muted)' }}
              value={currentUser.email}
              disabled
            />
          </div>

          {statusMsg && (
            <div style={{ marginBottom: '12px', fontSize: '13px', color: statusMsg.startsWith('Error') ? 'var(--red-primary)' : 'var(--emerald-primary)', fontWeight: 700 }}>
              {statusMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-emerald" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
