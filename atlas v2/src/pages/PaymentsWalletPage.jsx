import React, { useState } from 'react';
import { CreditCard, Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import Modal from '../components/layout/Modal';

export default function PaymentsWalletPage() {
  const { paymentMethods, addPaymentMethod, setDefaultPaymentMethod, deletePaymentMethod } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [provider, setProvider] = useState('STRIPE');
  const [cardBrand, setCardBrand] = useState('Mastercard');
  const [last4, setLast4] = useState('8832');

  const handleAdd = async (e) => {
    e.preventDefault();
    await addPaymentMethod({
      provider,
      card_brand: cardBrand,
      card_last4: last4,
      is_default: false,
    });
    setShowAddModal(false);
  };

  const handleSetDefault = async (m) => {
    await setDefaultPaymentMethod(m.id);
  };

  const handleDelete = async (m) => {
    await deletePaymentMethod(m.id);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '32px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Payment Methods & Wallet</h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Live database sync with Supabase PostgreSQL (<code>payment_methods</code>)
          </div>
        </div>
        <button className="btn-emerald" style={{ width: 'auto' }} onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Add Payment Method
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {paymentMethods.map((m) => (
          <div key={m.id || m.card_last4} className="card-glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--slate-900)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <CreditCard size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '16px' }}>{m.card_brand} •••• {m.card_last4}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Provider: {m.provider}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {m.is_default ? (
                <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)' }}>
                  ● Default Payment Method
                </span>
              ) : (
                <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleSetDefault(m)}>
                  Make Default
                </button>
              )}

              <button className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--red-primary)' }} title="Delete Payment Method" onClick={() => handleDelete(m)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Payment Method Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Payment Method (payment_methods)">
        <form onSubmit={handleAdd}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Provider</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={provider} onChange={e => setProvider(e.target.value)}>
              <option value="STRIPE">Stripe Card Processing</option>
              <option value="APPLE_PAY">Apple Pay Express</option>
              <option value="GOOGLE_PAY">Google Pay</option>
              <option value="PAYPAL">PayPal</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Card Brand</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={cardBrand} onChange={e => setCardBrand(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Last 4 Digits</label>
              <input className="metric-card" maxLength={4} style={{ width: '100%', outline: 'none' }} value={last4} onChange={e => setLast4(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="btn-emerald">
            Save Payment Method to Database
          </button>
        </form>
      </Modal>
    </div>
  );
}
