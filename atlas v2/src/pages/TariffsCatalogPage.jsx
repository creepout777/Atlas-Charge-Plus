import React, { useState } from 'react';
import { Clock, Zap, Calculator, ShieldCheck, Edit3, Plus, Trash2, Lock, Archive, CheckCircle2, RotateCcw } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/layout/Modal.jsx';

export default function TariffsCatalogPage() {
  const {
    tariffs,
    packages,
    updateTariff,
    addTariff,
    deleteTariff,
    toggleTariffActive,
    updatePackage,
    addPackage,
    deletePackage,
    togglePackageActive,
  } = useData();
  const { currentUser } = useAuth();

  // Role Security Check: ONLY SuperAdmin has access to edit/create/delete tariffs and packages
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [calcKwh, setCalcKwh] = useState(40);
  const tariff = (tariffs && tariffs.length > 0) ? (tariffs.find(t => t.is_active !== false) || tariffs[0]) : null;

  // --- Modal States ---
  const [showEditTariffModal, setShowEditTariffModal] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState(null);
  const [editCallout, setEditCallout] = useState(5.0);
  const [editKwhRate, setEditKwhRate] = useState(0.35);
  const [editMultiplier, setEditMultiplier] = useState(1.20);
  const [editDisplayName, setEditDisplayName] = useState('');

  const [showAddTariffModal, setShowAddTariffModal] = useState(false);
  const [newTariffCode, setNewTariffCode] = useState('');
  const [newTariffName, setNewTariffName] = useState('London Metro Dynamic Rate');
  const [newTariffCallout, setNewTariffCallout] = useState(6.50);
  const [newTariffRate, setNewTariffRate] = useState(0.38);
  const [newTariffMultiplier, setNewTariffMultiplier] = useState(1.20);

  const [showEditPkgModal, setShowEditPkgModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [editPkgName, setEditPkgName] = useState('');
  const [editPkgKwh, setEditPkgKwh] = useState(30);
  const [editPkgDesc, setEditPkgDesc] = useState('');
  const [editPkgEstimate, setEditPkgEstimate] = useState('');

  const [showAddPkgModal, setShowAddPkgModal] = useState(false);
  const [newPkgCode, setNewPkgCode] = useState('');
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgKwh, setNewPkgKwh] = useState(50);
  const [newPkgDesc, setNewPkgDesc] = useState('Rapid mobile DC charging tier for EVs');
  const [newPkgEstimate, setNewPkgEstimate] = useState('+150 miles in 18 mins');

  // --- Handlers ---
  const openAddTariff = () => {
    const autoCode = `TRF_LON_${Math.floor(1000 + Math.random() * 9000)}`;
    setNewTariffCode(autoCode);
    setNewTariffName('London Metro Dynamic Rate');
    setNewTariffCallout(6.50);
    setNewTariffRate(0.38);
    setNewTariffMultiplier(1.20);
    setShowAddTariffModal(true);
  };

  const openEditTariff = (t) => {
    const target = t || tariff;
    if (!target) return;
    setSelectedTariff(target);
    setEditCallout(target.base_callout_fee ?? 5.0);
    setEditKwhRate(target.per_kwh_rate ?? 0.35);
    setEditMultiplier(target.rush_hour_multiplier ?? 1.20);
    setEditDisplayName(target.display_name || 'Regional Tariff');
    setShowEditTariffModal(true);
  };

  const handleSaveTariff = async (e) => {
    e.preventDefault();
    if (!selectedTariff) return;
    await updateTariff(selectedTariff.id, {
      base_callout_fee: parseFloat(editCallout),
      per_kwh_rate: parseFloat(editKwhRate),
      rush_hour_multiplier: parseFloat(editMultiplier),
      display_name: editDisplayName,
    });
    setShowEditTariffModal(false);
  };

  const handleAddTariffSubmit = async (e) => {
    e.preventDefault();
    await addTariff({
      code: newTariffCode,
      display_name: newTariffName,
      base_callout_fee: parseFloat(newTariffCallout),
      per_kwh_rate: parseFloat(newTariffRate),
      rush_hour_multiplier: parseFloat(newTariffMultiplier),
      currency_code: 'GBP',
      currency_symbol: '£',
      is_active: true,
    });
    setShowAddTariffModal(false);
  };

  const handleDeleteTariffClick = async (t) => {
    await deleteTariff(t.id);
  };

  const handleToggleTariff = async (t) => {
    const newStatus = !(t.is_active !== false);
    await toggleTariffActive(t.id, newStatus);
  };

  const openAddPackage = () => {
    const nextTier = (packages?.length || 0) + 1;
    const autoCode = `PKG_TIER_${nextTier}_${Math.floor(100 + Math.random() * 900)}`;
    setNewPkgCode(autoCode);
    setNewPkgName(`Charge Tier ${nextTier} - High Power`);
    setNewPkgKwh(nextTier * 25);
    setNewPkgDesc('Rapid mobile DC charging tier for EVs');
    setNewPkgEstimate(`+${nextTier * 80} miles in ${nextTier * 8} mins`);
    setShowAddPkgModal(true);
  };

  const openEditPackage = (pkg) => {
    setSelectedPkg(pkg);
    setEditPkgName(pkg.display_name);
    setEditPkgKwh(pkg.target_kwh);
    setEditPkgDesc(pkg.description);
    setEditPkgEstimate(pkg.display_estimate_label);
    setShowEditPkgModal(true);
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!selectedPkg) return;
    await updatePackage(selectedPkg.id, {
      display_name: editPkgName,
      target_kwh: parseFloat(editPkgKwh),
      description: editPkgDesc,
      display_estimate_label: editPkgEstimate,
    });
    setShowEditPkgModal(false);
  };

  const handleAddPackageSubmit = async (e) => {
    e.preventDefault();
    await addPackage({
      code: newPkgCode,
      display_name: newPkgName,
      target_kwh: parseFloat(newPkgKwh),
      description: newPkgDesc,
      display_estimate_label: newPkgEstimate,
      is_active: true,
    });
    setShowAddPkgModal(false);
  };

  const handleDeletePackageClick = async (pkg) => {
    await deletePackage(pkg.id);
  };

  const handleTogglePackage = async (pkg) => {
    const newStatus = !(pkg.is_active !== false);
    await togglePackageActive(pkg.id, newStatus);
  };

  const baseFee = tariff ? tariff.base_callout_fee : 5.0;
  const rateKwh = tariff ? tariff.per_kwh_rate : 0.35;
  const multiplier = tariff ? tariff.rush_hour_multiplier : 1.20;

  const standardTotal = baseFee + (calcKwh * rateKwh);
  const peakTotal = (baseFee + (calcKwh * rateKwh)) * multiplier;

  return (
    <div style={{ maxWidth: '960px', margin: '32px auto', padding: '0 20px' }}>      {/* Header */}
      <div className="card-header-flex" style={{ marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Pricing Tariffs & Charge Packages</h1>
        </div>
        {isSuperAdmin && (
          <button className="btn-emerald" style={{ width: 'auto', fontSize: '13px', padding: '8px 16px' }} onClick={openAddTariff}>
            <Plus size={15} /> Create New Tariff
          </button>
        )}
      </div>

      {/* Pricing Tariffs Grid */}
      {tariffs.length === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--slate-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--text-muted)' }}>
            <Zap size={24} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>No Regional Tariffs Published</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>There are currently no pricing tariffs configured in the database.</div>
          {isSuperAdmin && (
            <button className="btn-emerald" style={{ width: 'auto', margin: '0 auto' }} onClick={openAddTariff}>
              <Plus size={15} /> Create First Regional Tariff
            </button>
          )}
        </div>
      ) : (
        <div className="responsive-grid-2" style={{ marginBottom: '28px' }}>
          {tariffs.map((t) => {
            const isActive = t.is_active !== false;
            return (
              <div
                key={t.id}
                className="card-glass"
                style={{
                  opacity: isActive ? 1 : 0.72,
                  border: isActive ? '1px solid var(--border-subtle)' : '1px dashed var(--slate-300)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: isActive ? 'inherit' : 'var(--text-secondary)' }}>
                      {t.display_name} {!isActive && <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--amber-primary)' }}>(Archived)</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Code: <code>{t.code}</code> · {t.currency_code || 'GBP'} ({t.currency_symbol || '£'})</div>
                  </div>
                  <span className="brand-pill" style={{
                    background: isActive ? 'var(--emerald-light)' : 'var(--slate-100)',
                    color: isActive ? 'var(--emerald-darker)' : 'var(--slate-600)',
                  }}>
                    {isActive ? '● Active Tariff' : '○ Archived'}
                  </span>
                </div>

                <div className="card-specs-grid" style={{ marginBottom: isSuperAdmin ? '14px' : '0' }}>
                  <div className="metric-card">
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>BASE CALLOUT</div>
                    <div style={{ fontWeight: 800, fontSize: '16px', fontFamily: 'var(--font-mono)' }}>{t.currency_symbol || '£'}{(t.base_callout_fee || 5.0).toFixed(2)}</div>
                  </div>
                  <div className="metric-card">
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ENERGY RATE</div>
                    <div style={{ fontWeight: 800, fontSize: '16px', fontFamily: 'var(--font-mono)', color: isActive ? 'var(--emerald-dark)' : 'var(--text-secondary)' }}>{t.currency_symbol || '£'}{(t.per_kwh_rate || 0.35).toFixed(2)} / kWh</div>
                  </div>
                  <div className="metric-card">
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RUSH HOUR MULTIPLIER</div>
                    <div style={{ fontWeight: 800, fontSize: '16px', fontFamily: 'var(--font-mono)', color: 'var(--amber-primary)' }}>{t.rush_hour_multiplier || 1.2}× Peak</div>
                  </div>
                  <div className="metric-card">
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PEAK WINDOW</div>
                    <div style={{ fontWeight: 800, fontSize: '12px' }}>{t.start_peak_time || '17:00'} – {t.end_peak_time || '20:00'}</div>
                  </div>
                </div>

                {/* ONLY SuperAdmin can see edit/archive/delete buttons on tariffs */}
                {isSuperAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', flexWrap: 'wrap' }}>
                    <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditTariff(t)}>
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      className="btn-outline"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        color: isActive ? 'var(--amber-primary)' : 'var(--emerald-dark)',
                        borderColor: isActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                      }}
                      onClick={() => handleToggleTariff(t)}
                    >
                      {isActive ? <><Archive size={13} /> Archive</> : <><RotateCcw size={13} /> Restore</>}
                    </button>
                    <button className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--red-primary)' }} onClick={() => handleDeleteTariffClick(t)} title="Safely remove or archive">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Charge Packages */}
      <div className="card-header-flex">
        <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Pre-Configured Charge Packages</h3>
        {isSuperAdmin && (
          <button className="btn-emerald" style={{ width: 'auto', fontSize: '12px', padding: '6px 12px' }} onClick={openAddPackage}>
            <Plus size={13} /> Add Package Tier
          </button>
        )}
      </div>

      {packages.length === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--slate-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--text-muted)' }}>
            <Clock size={24} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>No Pre-Configured Charge Packages</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>There are currently no package tiers configured in the database.</div>
          {isSuperAdmin && (
            <button className="btn-emerald" style={{ width: 'auto', margin: '0 auto' }} onClick={openAddPackage}>
              <Plus size={15} /> Add First Package Tier
            </button>
          )}
        </div>
      ) : (
        <div className="responsive-grid-3" style={{ marginBottom: '28px' }}>
          {packages.map((pkg) => {
            const isPkgActive = pkg.is_active !== false;
            return (
              <div
                key={pkg.id}
                className="card-glass"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: isPkgActive ? 1 : 0.72,
                  border: isPkgActive ? '1px solid var(--border-subtle)' : '1px dashed var(--slate-300)',
                  transition: 'all 0.2s',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="brand-pill">Tier {pkg.display_order || 1}</span>
                    <span className="brand-pill" style={{
                      background: isPkgActive ? 'var(--emerald-light)' : 'var(--slate-100)',
                      color: isPkgActive ? 'var(--emerald-darker)' : 'var(--slate-600)',
                      fontSize: '11px',
                    }}>
                      {isPkgActive ? '● Active' : '○ Archived'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>{pkg.display_name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>Code: {pkg.code}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{pkg.description}</div>
                </div>
                <div>
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isSuperAdmin ? '10px' : '0' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{pkg.target_kwh} kWh</div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: isPkgActive ? 'var(--emerald-darker)' : 'var(--text-secondary)' }}>
                      £{(baseFee + (pkg.target_kwh * rateKwh)).toFixed(2)}
                    </div>
                  </div>
                  {/* ONLY SuperAdmin can see edit/archive/delete buttons on packages */}
                  {isSuperAdmin && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button className="btn-outline" style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }} onClick={() => openEditPackage(pkg)}>
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        className="btn-outline"
                        style={{
                          padding: '5px 8px',
                          fontSize: '12px',
                          color: isPkgActive ? 'var(--amber-primary)' : 'var(--emerald-dark)',
                        }}
                        onClick={() => handleTogglePackage(pkg)}
                        title={isPkgActive ? 'Archive package' : 'Restore package'}
                      >
                        {isPkgActive ? <Archive size={13} /> : <RotateCcw size={13} />}
                      </button>
                      <button className="btn-outline" style={{ padding: '5px 8px', fontSize: '12px', color: 'var(--red-primary)' }} onClick={() => handleDeletePackageClick(pkg)} title="Safely remove or archive">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Price Estimator */}
      <div className="card-glass" style={{ background: 'var(--slate-900)', color: '#fff', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Calculator size={20} color="#10b981" />
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Instant Charging Price Calculator</h3>
        </div>
        <div className="grid-2col" style={{ alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span>Target Energy: <b>{calcKwh} kWh</b></span>
              <span style={{ color: 'var(--slate-400)' }}>Approx. +{(calcKwh / 78.1 * 100).toFixed(0)}% Battery</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={calcKwh}
              onChange={e => setCalcKwh(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--slate-400)', marginTop: '4px' }}>
              <span>10 kWh (Top-up)</span>
              <span>50 kWh (Standard)</span>
              <span>100 kWh (Commercial)</span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginBottom: '4px' }}>ESTIMATED TOTAL (OFF-PEAK)</div>
            <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#10b981' }}>
              £{standardTotal.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--amber-primary)', marginTop: '6px' }}>
              Rush Hour Rate (17:00-20:00): £{peakTotal.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* --- EDIT TARIFF MODAL (SuperAdmin Only) --- */}
      <Modal isOpen={showEditTariffModal} onClose={() => setShowEditTariffModal(false)} title={`Edit Tariff Rates (${selectedTariff?.display_name})`}>
        <form onSubmit={handleSaveTariff}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>System Tariff Code (Auto-Locked)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--slate-100)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <Lock size={14} color="var(--text-muted)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--slate-700)', fontSize: '13px' }}>
                {selectedTariff?.code || 'TRF_LOCKED'}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Display Name</label>
            <input
              className="metric-card"
              style={{ width: '100%', outline: 'none' }}
              value={editDisplayName}
              onChange={e => setEditDisplayName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Base Callout Fee (£)</label>
              <input
                className="metric-card"
                type="number"
                step="0.50"
                style={{ width: '100%', outline: 'none' }}
                value={editCallout}
                onChange={e => setEditCallout(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Per-kWh Energy Rate (£)</label>
              <input
                className="metric-card"
                type="number"
                step="0.01"
                style={{ width: '100%', outline: 'none' }}
                value={editKwhRate}
                onChange={e => setEditKwhRate(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Rush Hour Multiplier (e.g. 1.20 = +20%)</label>
            <input
              className="metric-card"
              type="number"
              step="0.05"
              style={{ width: '100%', outline: 'none' }}
              value={editMultiplier}
              onChange={e => setEditMultiplier(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-emerald">
            Save Tariff Changes to Database
          </button>
        </form>
      </Modal>

      {/* --- ADD TARIFF MODAL (SuperAdmin Only) --- */}
      <Modal isOpen={showAddTariffModal} onClose={() => setShowAddTariffModal(false)} title="Create New Regional Tariff (SuperAdmin)">
        <form onSubmit={handleAddTariffSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Generated Tariff Code (Auto-Locked)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--slate-100)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <Lock size={14} color="var(--text-muted)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--slate-700)', fontSize: '13px' }}>
                {newTariffCode}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Display Name</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={newTariffName} onChange={e => setNewTariffName(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Base Callout Fee (£)</label>
              <input className="metric-card" type="number" step="0.5" style={{ width: '100%', outline: 'none' }} value={newTariffCallout} onChange={e => setNewTariffCallout(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Per-kWh Rate (£)</label>
              <input className="metric-card" type="number" step="0.01" style={{ width: '100%', outline: 'none' }} value={newTariffRate} onChange={e => setNewTariffRate(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="btn-emerald">
            Publish Tariff to Database
          </button>
        </form>
      </Modal>

      {/* --- EDIT PACKAGE MODAL (SuperAdmin Only) --- */}
      <Modal isOpen={showEditPkgModal} onClose={() => setShowEditPkgModal(false)} title={`Edit Charge Package (${selectedPkg?.display_name})`}>
        <form onSubmit={handleSavePackage}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Package Code (Auto-Locked)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--slate-100)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <Lock size={14} color="var(--text-muted)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--slate-700)', fontSize: '13px' }}>
                {selectedPkg?.code || 'PKG_LOCKED'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Package Name</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={editPkgName} onChange={e => setEditPkgName(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Target Energy (kWh)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={editPkgKwh} onChange={e => setEditPkgKwh(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Marketing Label / Estimate</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={editPkgEstimate} onChange={e => setEditPkgEstimate(e.target.value)} required />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Description</label>
            <textarea className="metric-card" rows={2} style={{ width: '100%', outline: 'none' }} value={editPkgDesc} onChange={e => setEditPkgDesc(e.target.value)} required />
          </div>

          <button type="submit" className="btn-emerald">
            Save Package Changes
          </button>
        </form>
      </Modal>

      {/* --- ADD PACKAGE MODAL (SuperAdmin Only) --- */}
      <Modal isOpen={showAddPkgModal} onClose={() => setShowAddPkgModal(false)} title="Create New Charge Tier (SuperAdmin)">
        <form onSubmit={handleAddPackageSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Generated Tier Code (Auto-Locked)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--slate-100)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <Lock size={14} color="var(--text-muted)" />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--slate-700)', fontSize: '13px' }}>
                {newPkgCode}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Display Name</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={newPkgName} onChange={e => setNewPkgName(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Target Energy (kWh)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={newPkgKwh} onChange={e => setNewPkgKwh(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Estimate Tag</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={newPkgEstimate} onChange={e => setNewPkgEstimate(e.target.value)} required />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Description</label>
            <textarea className="metric-card" rows={2} style={{ width: '100%', outline: 'none' }} value={newPkgDesc} onChange={e => setNewPkgDesc(e.target.value)} required />
          </div>

          <button type="submit" className="btn-emerald">
            Publish Package Tier
          </button>
        </form>
      </Modal>
    </div>
  );
}
