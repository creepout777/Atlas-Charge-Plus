import React, { useState } from 'react';
import { CreditCard, Download, CheckCircle2, FileText, X } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import Modal from '../components/layout/Modal.jsx';

export default function InvoicesHistoryPage() {
  const { invoices } = useData();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const openInvoiceModal = (inv) => {
    setSelectedInvoice(inv);
    setShowModal(true);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Billing & Itemized VAT Invoices</h1>
      </div>

      {invoices.length === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--slate-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--slate-500)' }}>
            <CreditCard size={24} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>No Invoices Yet</div>
          <div style={{ fontSize: '13px' }}>Your completed rapid charging session receipts will appear here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {invoices.map((inv) => (
            <div key={inv.id} className="card-glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '44px', height: '44px', background: 'var(--emerald-light)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald-dark)' }}>
                  <CreditCard size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '16px' }}>Invoice #{inv.invoice_number}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Session Date: {new Date(inv.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Callout: £{(inv.base_callout_amount || 5.0).toFixed(2)} · Energy: £{(inv.energy_delivered_amount || 12.25).toFixed(2)}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>£{(inv.total_billed_amount || 17.25).toFixed(2)}</div>
                  <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)' }}>
                    ● {inv.billing_status || 'PAID'}
                  </span>
                </div>
                <button className="btn-outline" style={{ padding: '8px 12px', fontSize: '12px' }} onClick={() => openInvoiceModal(inv)}>
                  <FileText size={14} /> Itemized View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Itemized VAT Invoice Detail Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Tax Invoice: #${selectedInvoice?.invoice_number}`}>
        {selectedInvoice && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ISSUED DATE</div>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>
                  {new Date(selectedInvoice.issued_at).toLocaleString('en-GB')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STATUS</div>
                <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)' }}>
                  ● {selectedInvoice.billing_status}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Mobile Rapid Unit Callout Fee</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>£{(selectedInvoice.base_callout_amount || 5.0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>High-Voltage DC Energy Delivered</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>£{(selectedInvoice.energy_delivered_amount || 12.25).toFixed(2)}</span>
              </div>
              {selectedInvoice.rush_hour_surcharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--amber-primary)' }}>
                  <span>Peak Window Rush Hour Surcharge</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>£{selectedInvoice.rush_hour_surcharge.toFixed(2)}</span>
                </div>
              )}
              <div style={{ borderTop: '2px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '16px' }}>Total Amount (inc. 20% VAT)</span>
                <span style={{ fontWeight: 900, fontSize: '20px', fontFamily: 'var(--font-mono)', color: 'var(--emerald-darker)' }}>
                  £{(selectedInvoice.total_billed_amount || 17.25).toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ background: 'var(--slate-50)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Atlas Charge Plus+ Ltd · VAT Reg GB 992 108 441 · High-power DC mobile dispensing receipt.
            </div>

            <button className="btn-emerald" onClick={() => alert(`Receipt downloaded for ${selectedInvoice.invoice_number}`)}>
              <Download size={15} /> Download PDF VAT Receipt
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
