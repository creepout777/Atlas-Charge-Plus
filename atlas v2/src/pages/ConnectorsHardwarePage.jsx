import React, { useState } from 'react';
import { Layers, Zap, Cpu, Plus, Edit3, Trash2, Lock, Archive, CheckCircle2, RotateCcw, Shield, Power } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/layout/Modal.jsx';

export default function ConnectorsHardwarePage() {
  const {
    connectors,
    truckConnectors,
    trucks,
    addConnector,
    updateConnector,
    deleteConnector,
    toggleConnectorActive,
    addTruckConnector,
    updateTruckConnector,
    deleteTruckConnector,
  } = useData();

  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isDispatcher = currentUser?.role === 'FLEET_DISPATCHER';
  const canManage = isSuperAdmin || isDispatcher;

  // --- Modal States ---
  // 1. Connector Standard Modals
  const [showAddConnModal, setShowAddConnModal] = useState(false);
  const [showEditConnModal, setShowEditConnModal] = useState(false);
  const [selectedConnId, setSelectedConnId] = useState(null);
  const [connCode, setConnCode] = useState('');
  const [connDisplayName, setConnDisplayName] = useState('CCS Rapid High-Power');
  const [connStandard, setConnStandard] = useState('CCS_COMBO2');
  const [connVoltage, setConnVoltage] = useState(1000);
  const [connCurrent, setConnCurrent] = useState(350);
  const [connChargingStandard, setConnChargingStandard] = useState('Combined Charging System 2');

  // 2. Truck Connector Assembly Modals
  const [showAddTruckConnModal, setShowAddTruckConnModal] = useState(false);
  const [showEditTruckConnModal, setShowEditTruckConnModal] = useState(false);
  const [selectedTruckConnId, setSelectedTruckConnId] = useState(null);
  const [tcTruckId, setTcTruckId] = useState('');
  const [tcConnTypeId, setTcConnTypeId] = useState('');
  const [tcCableLength, setTcCableLength] = useState(6.5);
  const [tcMaxKw, setTcMaxKw] = useState(150);
  const [tcOperational, setTcOperational] = useState(true);

  // --- Handlers for Connector Types ---
  const openAddConn = () => {
    const autoCode = `CONN_DC_${Math.floor(100 + Math.random() * 900)}`;
    setConnCode(autoCode);
    setConnDisplayName('CCS Rapid DC Ultra');
    setConnStandard('CCS_COMBO2');
    setConnVoltage(1000);
    setConnCurrent(350);
    setConnChargingStandard('Combined Charging System 2');
    setShowAddConnModal(true);
  };

  const openEditConn = (c) => {
    setSelectedConnId(c.id);
    setConnCode(c.code);
    setConnDisplayName(c.display_name);
    setConnStandard(c.standard || 'CCS_COMBO2');
    setConnVoltage(c.max_voltage_v);
    setConnCurrent(c.max_current_a);
    setConnChargingStandard(c.charging_standard);
    setShowEditConnModal(true);
  };

  const handleAddConnSubmit = async (e) => {
    e.preventDefault();
    await addConnector({
      code: connCode,
      display_name: connDisplayName,
      standard: connStandard,
      max_voltage_v: parseInt(connVoltage),
      max_current_a: parseInt(connCurrent),
      charging_standard: connChargingStandard,
      is_active: true,
    });
    setShowAddConnModal(false);
  };

  const handleEditConnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedConnId) return;
    await updateConnector(selectedConnId, {
      display_name: connDisplayName,
      standard: connStandard,
      max_voltage_v: parseInt(connVoltage),
      max_current_a: parseInt(connCurrent),
      charging_standard: connChargingStandard,
    });
    setShowEditConnModal(false);
  };

  const handleDeleteConn = async (c) => {
    try {
      await deleteConnector(c.id);
    } catch (err) {
      console.error('Delete connector failed:', err);
    }
  };

  const handleToggleConnector = async (c) => {
    const newStatus = !(c.is_active !== false);
    await toggleConnectorActive(c.id, newStatus);
  };

  // --- Handlers for Truck Connectors ---
  const openAddTruckConn = () => {
    setTcTruckId(trucks[0]?.id || '');
    setTcConnTypeId(connectors[0]?.id || '');
    setTcCableLength(6.5);
    setTcMaxKw(150);
    setTcOperational(true);
    setShowAddTruckConnModal(true);
  };

  const openEditTruckConn = (tc) => {
    setSelectedTruckConnId(tc.id);
    setTcTruckId(tc.truck_id);
    setTcConnTypeId(tc.connector_type_id);
    setTcCableLength(tc.cable_length_meters);
    setTcMaxKw(tc.max_kw_rating);
    setTcOperational(tc.is_operational);
    setShowEditTruckConnModal(true);
  };

  const handleToggleAssemblyHealth = async (tc) => {
    const nextStatus = !tc.is_operational;
    await updateTruckConnector(tc.id, {
      truck_id: tc.truck_id,
      connector_type_id: tc.connector_type_id,
      cable_length_meters: tc.cable_length_meters,
      max_kw_rating: tc.max_kw_rating,
      is_operational: nextStatus,
    });
  };

  const handleAddTruckConnSubmit = async (e) => {
    e.preventDefault();
    await addTruckConnector({
      truck_id: tcTruckId || trucks[0]?.id,
      connector_type_id: tcConnTypeId || connectors[0]?.id,
      cable_length_meters: parseFloat(tcCableLength),
      max_kw_rating: parseFloat(tcMaxKw),
      is_operational: tcOperational,
    });
    setShowAddTruckConnModal(false);
  };

  const handleEditTruckConnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTruckConnId) return;
    await updateTruckConnector(selectedTruckConnId, {
      truck_id: tcTruckId,
      connector_type_id: tcConnTypeId,
      cable_length_meters: parseFloat(tcCableLength),
      max_kw_rating: parseFloat(tcMaxKw),
      is_operational: tcOperational,
    });
    setShowEditTruckConnModal(false);
  };

  const handleDeleteTruckConn = async (tc) => {
    try {
      await deleteTruckConnector(tc.id);
    } catch (err) {
      console.error('Delete truck connector failed:', err);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '32px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Charging Hardware & Connector Specs</h1>
            <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)' }}>
              <Shield size={12} /> {isSuperAdmin ? 'Executive Hardware Control' : 'Fleet Hardware Specs'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Physical connector protocols & mounted mobile dispensing assemblies
          </div>
        </div>
        {canManage && (
          <button className="btn-emerald" style={{ width: 'auto', fontSize: '13px', padding: '8px 16px' }} onClick={openAddConn}>
            <Plus size={15} /> Add Connector Standard
          </button>
        )}
      </div>

      {/* Grid of Global Connector Standards */}
      {connectors.length === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--slate-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--text-muted)' }}>
            <Cpu size={24} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>No Connector Standards Registered</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>There are currently no charging connector standards configured in the database.</div>
          {canManage && (
            <button className="btn-emerald" style={{ width: 'auto', margin: '0 auto' }} onClick={openAddConn}>
              <Plus size={15} /> Add First Connector Standard
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {(connectors || []).map((c) => {
            const isConnActive = c.is_active !== false;
            return (
              <div
                key={c.id}
                className="card-glass"
                style={{
                  opacity: isConnActive ? 1 : 0.72,
                  border: isConnActive ? '1px solid var(--border-subtle)' : '1px dashed var(--slate-300)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '18px', color: isConnActive ? 'inherit' : 'var(--text-secondary)' }}>
                      {c.display_name} {!isConnActive && <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--amber-primary)' }}>(Archived)</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Code: <code>{c.code}</code> · Standard: <b>{c.standard}</b>
                    </div>
                  </div>
                  <span className="brand-pill" style={{
                    background: isConnActive ? 'var(--emerald-light)' : 'var(--slate-100)',
                    color: isConnActive ? 'var(--emerald-darker)' : 'var(--slate-600)',
                  }}>
                    {isConnActive ? '● Active Standard' : '○ Archived'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: canManage ? '14px' : '0' }}>
                  <div className="metric-card">
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MAX VOLTAGE</div>
                    <div style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-mono)' }}>{c.max_voltage_v} V</div>
                  </div>
                  <div className="metric-card">
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MAX CURRENT</div>
                    <div style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-mono)', color: isConnActive ? 'var(--emerald-dark)' : 'var(--text-secondary)' }}>{c.max_current_a} A</div>
                  </div>
                  <div className="metric-card">
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PROTOCOL</div>
                    <div style={{ fontWeight: 800, fontSize: '12px' }}>{c.standard?.includes('COMBO') ? 'DC Fast' : 'AC Type 2'}</div>
                  </div>
                </div>

                {canManage && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                    <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditConn(c)}>
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      className="btn-outline"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        color: isConnActive ? 'var(--amber-primary)' : 'var(--emerald-dark)',
                        borderColor: isConnActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                      }}
                      onClick={() => handleToggleConnector(c)}
                    >
                      {isConnActive ? <><Archive size={13} /> Archive</> : <><RotateCcw size={13} /> Restore</>}
                    </button>
                    {isSuperAdmin && (
                      <button className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--red-primary)' }} onClick={() => handleDeleteConn(c)} title="Safely remove or archive">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Truck Connector Assemblies */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Mounted Mobile Truck Assemblies</h3>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Physical cables installed on fleet mobile battery vehicles</div>
        </div>
        {canManage && (
          <button className="btn-emerald" style={{ width: 'auto', fontSize: '12px', padding: '6px 14px' }} onClick={openAddTruckConn}>
            <Plus size={14} /> Mount Connector to Truck
          </button>
        )}
      </div>

      {truckConnectors.length === 0 ? (
        <div className="card-glass" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--slate-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--text-muted)' }}>
            <Layers size={24} />
          </div>
          <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>No Mounted Assemblies</div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>There are currently no dispenser assemblies attached to mobile units in the database.</div>
          {canManage && (
            <button className="btn-emerald" style={{ width: 'auto', margin: '0 auto' }} onClick={openAddTruckConn}>
              <Plus size={14} /> Mount First Connector
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {(truckConnectors || []).map((tc) => {
            const parentTruck = (trucks || []).find(t => t.id === tc.truck_id);
            const parentConn = (connectors || []).find(c => c.id === tc.connector_type_id);
            return (
              <div key={tc.id} className="card-glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="brand-pill" style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', fontSize: '10px' }}>
                      {parentTruck ? parentTruck.truck_code : 'TRUCK-ASSEMBLY'}
                    </span>
                    
                    {/* Status Toggle Button directly on the card */}
                    <button
                      onClick={() => canManage && handleToggleAssemblyHealth(tc)}
                      style={{
                        background: tc.is_operational ? 'var(--emerald-light)' : 'var(--red-light)',
                        color: tc.is_operational ? 'var(--emerald-darker)' : 'var(--red-primary)',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: '1px solid ' + (tc.is_operational ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'),
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 8px',
                        cursor: canManage ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title={canManage ? 'Click to toggle hardware status' : ''}
                    >
                      <Power size={11} /> {tc.is_operational ? 'Operational' : 'Fault'}
                    </button>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '2px' }}>{parentConn?.display_name || 'CCS Fast Connector'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    Mounted on: <b>{parentTruck?.display_name || 'Atlas Mobile Unit'}</b>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: canManage ? '12px' : '0' }}>
                    <div className="metric-card">
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CABLE LENGTH</div>
                      <div style={{ fontWeight: 800, fontSize: '13px' }}>{tc.cable_length_meters}m</div>
                    </div>
                    <div className="metric-card">
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MAX RATING</div>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--emerald-dark)' }}>{tc.max_kw_rating} kW</div>
                    </div>
                  </div>
                </div>

                {canManage && (
                  <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                    <button className="btn-outline" style={{ flex: 1, padding: '4px 8px', fontSize: '11px' }} onClick={() => openEditTruckConn(tc)}>
                      <Edit3 size={12} /> Edit
                    </button>
                    <button
                      className="btn-outline"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: tc.is_operational ? 'var(--amber-primary)' : 'var(--emerald-dark)',
                      }}
                      onClick={() => handleToggleAssemblyHealth(tc)}
                      title="Toggle Operational / Fault"
                    >
                      {tc.is_operational ? 'Set Fault' : 'Set Operational'}
                    </button>
                    {isSuperAdmin && (
                      <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--red-primary)' }} onClick={() => handleDeleteTruckConn(tc)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODALS --- */}
      <Modal isOpen={showAddConnModal} onClose={() => setShowAddConnModal(false)} title="Register New Connector Standard">
        <form onSubmit={handleAddConnSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Standard Code</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={connCode} onChange={e => setConnCode(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Display Name</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={connDisplayName} onChange={e => setConnDisplayName(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Max Voltage (V)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={connVoltage} onChange={e => setConnVoltage(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Max Current (A)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={connCurrent} onChange={e => setConnCurrent(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Charging Standard Description</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={connChargingStandard} onChange={e => setConnChargingStandard(e.target.value)} required />
          </div>
          <button type="submit" className="btn-emerald">Save Connector Standard</button>
        </form>
      </Modal>

      <Modal isOpen={showEditConnModal} onClose={() => setShowEditConnModal(false)} title="Edit Connector Standard">
        <form onSubmit={handleEditConnSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Display Name</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={connDisplayName} onChange={e => setConnDisplayName(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Max Voltage (V)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={connVoltage} onChange={e => setConnVoltage(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Max Current (A)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={connCurrent} onChange={e => setConnCurrent(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Charging Standard Description</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={connChargingStandard} onChange={e => setConnChargingStandard(e.target.value)} required />
          </div>
          <button type="submit" className="btn-emerald">Apply Updates</button>
        </form>
      </Modal>

      <Modal isOpen={showAddTruckConnModal} onClose={() => setShowAddTruckConnModal(false)} title="Mount Dispenser Connector to Truck">
        <form onSubmit={handleAddTruckConnSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Target Mobile Unit</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={tcTruckId} onChange={e => setTcTruckId(e.target.value)} required>
              {(trucks || []).map(t => (
                <option key={t.id} value={t.id}>{t.display_name} ({t.truck_code})</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Connector Protocol</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={tcConnTypeId} onChange={e => setTcConnTypeId(e.target.value)} required>
              {(connectors || []).map(c => (
                <option key={c.id} value={c.id}>{c.display_name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Cable Length (Meters)</label>
              <input className="metric-card" type="number" step="0.5" style={{ width: '100%', outline: 'none' }} value={tcCableLength} onChange={e => setTcCableLength(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Max Output Rating (kW)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={tcMaxKw} onChange={e => setTcMaxKw(e.target.value)} required />
            </div>
          </div>
          <button type="submit" className="btn-emerald">Mount Connector Assembly</button>
        </form>
      </Modal>

      <Modal isOpen={showEditTruckConnModal} onClose={() => setShowEditTruckConnModal(false)} title="Edit Mounted Connector Assembly">
        <form onSubmit={handleEditTruckConnSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Target Mobile Unit</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={tcTruckId} onChange={e => setTcTruckId(e.target.value)} required>
              {(trucks || []).map(t => (
                <option key={t.id} value={t.id}>{t.display_name} ({t.truck_code})</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Connector Protocol</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={tcConnTypeId} onChange={e => setTcConnTypeId(e.target.value)} required>
              {(connectors || []).map(c => (
                <option key={c.id} value={c.id}>{c.display_name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Cable Length (Meters)</label>
              <input className="metric-card" type="number" step="0.5" style={{ width: '100%', outline: 'none' }} value={tcCableLength} onChange={e => setTcCableLength(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Max Output Rating (kW)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={tcMaxKw} onChange={e => setTcMaxKw(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Hardware Status</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={tcOperational ? 'true' : 'false'} onChange={e => setTcOperational(e.target.value === 'true')}>
              <option value="true">🟢 Operational (Online & Ready)</option>
              <option value="false">🔴 Fault / Maintenance (Offline)</option>
            </select>
          </div>
          <button type="submit" className="btn-emerald">Save Assembly Updates</button>
        </form>
      </Modal>
    </div>
  );
}
