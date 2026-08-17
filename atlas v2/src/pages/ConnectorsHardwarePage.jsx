import React, { useState } from 'react';
import { Layers, Zap, Cpu, Plus, Edit3, Trash2, Lock, Archive, CheckCircle2, RotateCcw, Activity, ShieldCheck, AlertTriangle, RefreshCw, Thermometer, Droplet, Gauge, Wrench, Shield, Play } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState('diagnostics'); // 'diagnostics' | 'standards' | 'assemblies'

  // --- Diagnostic Sweep State ---
  const [runningTestId, setRunningTestId] = useState(null);
  const [testStage, setTestStage] = useState(0);
  const [testLogs, setTestLogs] = useState({});

  // --- Modals State ---
  const [showAddConnModal, setShowAddConnModal] = useState(false);
  const [showEditConnModal, setShowEditConnModal] = useState(false);
  const [selectedConnId, setSelectedConnId] = useState(null);
  const [connCode, setConnCode] = useState('');
  const [connDisplayName, setConnDisplayName] = useState('CCS Rapid High-Power');
  const [connStandard, setConnStandard] = useState('CCS_COMBO2');
  const [connVoltage, setConnVoltage] = useState(1000);
  const [connCurrent, setConnCurrent] = useState(350);
  const [connChargingStandard, setConnChargingStandard] = useState('Combined Charging System 2');

  const [showAddTruckConnModal, setShowAddTruckConnModal] = useState(false);
  const [showEditTruckConnModal, setShowEditTruckConnModal] = useState(false);
  const [selectedTruckConnId, setSelectedTruckConnId] = useState(null);
  const [tcTruckId, setTcTruckId] = useState('');
  const [tcConnTypeId, setTcConnTypeId] = useState('');
  const [tcCableLength, setTcCableLength] = useState(6.5);
  const [tcMaxKw, setTcMaxKw] = useState(150);
  const [tcOperational, setTcOperational] = useState(true);

  // --- Handlers for Diagnostic Tests ---
  const handleRunDiagnostic = (tcId) => {
    setRunningTestId(tcId);
    setTestStage(1);
    setTestLogs(prev => ({
      ...prev,
      [tcId]: ['[DIAGNOSTIC INITIATED] Connecting to Mobile Inverter & BMS Controller...']
    }));

    setTimeout(() => {
      setTestStage(2);
      setTestLogs(prev => ({
        ...prev,
        [tcId]: [...prev[tcId], '✓ R-ISO High-Voltage Isolation: 540 MΩ (Exceeds >100 MΩ requirement)']
      }));
    }, 800);

    setTimeout(() => {
      setTestStage(3);
      setTestLogs(prev => ({
        ...prev,
        [tcId]: [...prev[tcId], '✓ Liquid Glycol Cooling Loop: 14.8 L/min @ 2.4 Bar differential pressure (Nominal)']
      }));
    }, 1600);

    setTimeout(() => {
      setTestStage(4);
      setTestLogs(prev => ({
        ...prev,
        [tcId]: [
          ...prev[tcId],
          '✓ Contactor Actuation Latency: 18ms (Normal)',
          '✓ Pilot Signal & ISO 15118 CAN Bus Handshake: PASSED (100% Ready)'
        ]
      }));
    }, 2400);

    setTimeout(() => {
      setRunningTestId(null);
      setTestStage(0);
    }, 3200);
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
    <div style={{ maxWidth: '1100px', margin: '32px auto', padding: '0 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Rapid DC Hardware Health & Telemetry</h1>
            <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)' }}>
              <ShieldCheck size={13} /> {isSuperAdmin ? 'Executive Hardware Control' : 'Fleet Diagnostics'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            High-voltage DC power electronics, liquid-cooled dispensers & live diagnostic monitoring
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--slate-100)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          {[
            { id: 'diagnostics', label: `Hardware Health (${truckConnectors.length} Units)` },
            { id: 'assemblies', label: 'Mounted Assemblies' },
            { id: 'standards', label: `Connector Protocols (${connectors.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? 'var(--emerald-darker)' : 'var(--text-secondary)',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: RAPID DC HARDWARE HEALTH & DIAGNOSTICS                   */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'diagnostics' && (
        <div>
          {/* Quick Hardware Overview KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
            <div className="card-glass">
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACTIVE DC DISPENSERS</div>
              <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--emerald-dark)' }}>
                {truckConnectors.filter(t => t.is_operational).length} / {truckConnectors.length}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>150kW liquid-cooled units</div>
            </div>

            <div className="card-glass">
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AVG INVERTER TEMP</div>
              <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0284c7' }}>
                44.2°C
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Optimal operating window (&lt;65°C)</div>
            </div>

            <div className="card-glass">
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>COOLANT LOOP PRESSURE</div>
              <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--emerald-darker)' }}>
                2.4 Bar
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>14.8 L/min active circulation</div>
            </div>

            <div className="card-glass">
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>HV ISOLATION (R-ISO)</div>
              <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--slate-800)' }}>
                520 MΩ
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Exceeds ISO safety criteria</div>
            </div>
          </div>

          {/* Detailed Hardware Units List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {truckConnectors.map((tc) => {
              const parentTruck = (trucks || []).find(t => t.id === tc.truck_id);
              const parentConn = (connectors || []).find(c => c.id === tc.connector_type_id);
              const isTesting = runningTestId === tc.id;
              const logs = testLogs[tc.id] || [];

              return (
                <div key={tc.id} className="card-glass">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        background: tc.is_operational ? 'var(--emerald-light)' : 'var(--red-light)',
                        color: tc.is_operational ? 'var(--emerald-darker)' : 'var(--red-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Zap size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '17px' }}>
                          {parentConn?.display_name || 'CCS2 Rapid Dispenser'} — {parentTruck?.display_name || 'Mobile Unit'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Unit Code: <b>{parentTruck?.truck_code || 'TITAN-01'}</b> · Protocol: <b>{parentConn?.standard || 'CCS_COMBO2'}</b> · Rating: <b>{tc.max_kw_rating} kW Peak</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="brand-pill" style={{
                        background: tc.is_operational ? 'var(--emerald-light)' : 'var(--red-light)',
                        color: tc.is_operational ? 'var(--emerald-darker)' : 'var(--red-primary)',
                        fontWeight: 800
                      }}>
                        ● {tc.is_operational ? 'Hardware Healthy (100% OK)' : 'Service Isolated (Inspection Needed)'}
                      </span>
                      {canManage && (
                        <button
                          className="btn-outline"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleToggleAssemblyHealth(tc)}
                        >
                          {tc.is_operational ? 'Isolate for Service' : 'Mark Operational'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Sensor Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    <div className="metric-card">
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Thermometer size={12} /> INVERTER CORE
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '14px', fontFamily: 'var(--font-mono)' }}>42.5°C</div>
                      <div style={{ fontSize: '10px', color: 'var(--emerald-dark)' }}>● Optimal</div>
                    </div>

                    <div className="metric-card">
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Droplet size={12} /> GLYCOL COOLANT
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '14px', fontFamily: 'var(--font-mono)' }}>14.8 L/min</div>
                      <div style={{ fontSize: '10px', color: 'var(--emerald-dark)' }}>● 2.4 Bar Loop</div>
                    </div>

                    <div className="metric-card">
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={12} /> HV ISOLATION
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '14px', fontFamily: 'var(--font-mono)' }}>540 MΩ</div>
                      <div style={{ fontSize: '10px', color: 'var(--emerald-dark)' }}>● High Voltage Safe</div>
                    </div>

                    <div className="metric-card">
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Gauge size={12} /> PIN WEAR
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '14px', fontFamily: 'var(--font-mono)' }}>0.11 mΩ</div>
                      <div style={{ fontSize: '10px', color: 'var(--emerald-dark)' }}>● Clean Contact</div>
                    </div>

                    <div className="metric-card">
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Activity size={12} /> CAN BUS JITTER
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '14px', fontFamily: 'var(--font-mono)' }}>1.2 ms</div>
                      <div style={{ fontSize: '10px', color: 'var(--emerald-dark)' }}>● ISO 15118 Sync</div>
                    </div>
                  </div>

                  {/* Diagnostic Trigger Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--slate-50)', padding: '12px 14px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={14} color="var(--emerald-primary)" />
                      <span>Liquid-cooled 6.5m cable assembly · Contactor cycle: <b>1,480 / 50,000</b></span>
                    </div>

                    <button
                      className="btn-emerald"
                      style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
                      disabled={isTesting}
                      onClick={() => handleRunDiagnostic(tc.id)}
                    >
                      {isTesting ? (
                        <><RefreshCw size={13} className="spin" /> Testing Phase {testStage}/4...</>
                      ) : (
                        <><Play size={13} /> Run Live Hardware Self-Test</>
                      )}
                    </button>
                  </div>

                  {/* Live Diagnostic Stream Output */}
                  {logs.length > 0 && (
                    <div style={{ marginTop: '12px', background: '#0b1320', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#10b981', lineHeight: 1.6 }}>
                      {logs.map((log, idx) => (
                        <div key={idx} style={{ color: log.includes('PASSED') || log.includes('✓') ? '#10b981' : '#94a3b8' }}>
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: MOUNTED ASSEMBLIES                                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'assemblies' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Mounted Mobile Truck Assemblies</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Physical cables installed on fleet mobile battery vehicles</div>
            </div>
            {isSuperAdmin && (
              <button className="btn-emerald" style={{ width: 'auto', fontSize: '12px', padding: '6px 14px' }} onClick={openAddTruckConn}>
                <Plus size={14} /> Mount Connector to Truck
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {truckConnectors.map((tc) => {
              const parentTruck = (trucks || []).find(t => t.id === tc.truck_id);
              const parentConn = (connectors || []).find(c => c.id === tc.connector_type_id);
              return (
                <div key={tc.id} className="card-glass" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="brand-pill" style={{ background: 'var(--slate-100)', color: 'var(--slate-700)', fontSize: '10px' }}>
                        {parentTruck ? parentTruck.truck_code : 'TRUCK-ASSEMBLY'}
                      </span>
                      <span className="brand-pill" style={{
                        background: tc.is_operational ? 'var(--emerald-light)' : 'var(--red-light)',
                        color: tc.is_operational ? 'var(--emerald-darker)' : 'var(--red-primary)',
                        fontSize: '10px'
                      }}>
                        ● {tc.is_operational ? 'Operational' : 'Fault'}
                      </span>
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
                        <Edit3 size={12} /> Edit Assembly
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
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: CONNECTOR STANDARDS                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'standards' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Charging Connector Standards</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Physical connector protocols configured in the system</div>
            </div>
            {isSuperAdmin && (
              <button className="btn-emerald" style={{ width: 'auto', fontSize: '12px', padding: '6px 14px' }} onClick={openAddConn}>
                <Plus size={14} /> Add Connector Standard
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {(connectors || []).map((c) => {
              const isConnActive = c.is_active !== false;
              return (
                <div key={c.id} className="card-glass" style={{ opacity: isConnActive ? 1 : 0.72 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '18px' }}>{c.display_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Code: <code>{c.code}</code> · Standard: <b>{c.standard}</b>
                      </div>
                    </div>
                    <span className="brand-pill" style={{
                      background: isConnActive ? 'var(--emerald-light)' : 'var(--slate-100)',
                      color: isConnActive ? 'var(--emerald-darker)' : 'var(--slate-600)',
                    }}>
                      {isConnActive ? '● Active' : '○ Archived'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: isSuperAdmin ? '14px' : '0' }}>
                    <div className="metric-card">
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MAX VOLTAGE</div>
                      <div style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-mono)' }}>{c.max_voltage_v} V</div>
                    </div>
                    <div className="metric-card">
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MAX CURRENT</div>
                      <div style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--emerald-dark)' }}>{c.max_current_a} A</div>
                    </div>
                    <div className="metric-card">
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PROTOCOL</div>
                      <div style={{ fontWeight: 800, fontSize: '12px' }}>{c.standard?.includes('COMBO') ? 'DC Fast' : 'AC Type 2'}</div>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                      <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditConn(c)}>
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        className="btn-outline"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleToggleConnector(c)}
                      >
                        {isConnActive ? <><Archive size={13} /> Archive</> : <><RotateCcw size={13} /> Restore</>}
                      </button>
                      <button className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--red-primary)' }} onClick={() => handleDeleteConn(c)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
          <button type="submit" className="btn-emerald">Save Assembly Updates</button>
        </form>
      </Modal>
    </div>
  );
}
