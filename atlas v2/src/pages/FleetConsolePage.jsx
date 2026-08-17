import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shield, Truck, Zap, Activity, Layers, MapPin, Gauge, BatteryCharging, CheckCircle2, Clock, AlertTriangle, UserPlus, Search, Edit3, Plus, Trash2, Star, Eye, Lock } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useOrder } from '../context/OrderContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/layout/Modal.jsx';

export default function FleetConsolePage() {
  const { ordersList, updateStatus, assignTruckToOrder, assignDriverToOrder, deleteOrder } = useOrder();
  const { trucks, drivers, uiLabels, updateTruck, addTruck, deleteTruck, addDriver, updateDriver, deleteDriver } = useData();
  const { currentUser } = useAuth();

  // Role permissions: ONLY SuperAdmin has write/commission/edit/delete; Dispatcher is strictly read-only watch
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'trucks' | 'drivers' | 'dispatches' | 'labels'
  const [searchLabel, setSearchLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const truckMarkersRef = useRef([]);

  const totalStoredKwh = (trucks || []).reduce((sum, t) => sum + (t.current_stored_kwh || 0), 0);
  const totalCapacityKwh = (trucks || []).reduce((sum, t) => sum + (t.battery_capacity_kwh || 200), 0);
  const activeDispatches = (ordersList || []).filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELED');

  // --- Modals State ---
  // 1. Edit Truck (SuperAdmin Only)
  const [showEditTruckModal, setShowEditTruckModal] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [truckCode, setTruckCode] = useState('');
  const [truckDisplayName, setTruckDisplayName] = useState('');
  const [truckPlate, setTruckPlate] = useState('');
  const [truckStatus, setTruckStatus] = useState('AVAILABLE');
  const [truckAddress, setTruckAddress] = useState('');
  const [truckStoredKwh, setTruckStoredKwh] = useState(160);
  const [truckCapacityKwh, setTruckCapacityKwh] = useState(200);
  const [truckMaxOutput, setTruckMaxOutput] = useState(150);

  // 2. Commission New Truck (SuperAdmin Only)
  const [showAddTruckModal, setShowAddTruckModal] = useState(false);
  const [newTruckCode, setNewTruckCode] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newCapacity, setNewCapacity] = useState(200);
  const [newOutput, setNewOutput] = useState(150);
  const [newDepotAddress, setNewDepotAddress] = useState('Stratford Mobility Hub, London E15 4QZ');

  // 3. Driver Management (SuperAdmin Only)
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showEditDriverModal, setShowEditDriverModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPassword, setDriverPassword] = useState('Password123!');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [driverExpiry, setDriverExpiry] = useState('2028-12-31');
  const [driverTruckId, setDriverTruckId] = useState('');
  const [driverDutyStatus, setDriverDutyStatus] = useState('AVAILABLE');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // 4. Edit Order Dispatch (SuperAdmin Only)
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState('WAITING_APPROVAL');

  // Initialize Fleet GPS Map in Overview Tab
  useEffect(() => {
    if (activeTab !== 'overview' && activeTab !== 'trucks') return;
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      const map = L.map(mapContainerRef.current, {
        center: [51.5074, -0.1278],
        zoom: 12,
        zoomControl: false,
      });
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      // Render Truck Markers if trucks exist
      truckMarkersRef.current = (trucks || []).map((truck) => {
        const lat = truck.current_lat || truck.base_lat || 51.5074;
        const lng = truck.current_lng || truck.base_lng || -0.1278;
        const icon = L.divIcon({
          className: 'custom-fleet-marker',
          html: `
            <div class="truck-heading-marker" title="${truck.display_name}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        return L.marker([lat, lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${truck.display_name}</b><br/>${truck.license_plate}<br/>${truck.current_stored_kwh} kWh stored`);
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab, trucks]);

  // --- Handlers (SuperAdmin only) ---
  const openAddTruck = () => {
    setErrorMessage('');
    const nextNumber = (trucks?.length || 0) + 1;
    const autoCode = `TITAN-${nextNumber < 10 ? '0' + nextNumber : nextNumber}`;
    const suffixes = ['EVX', 'ZAP', 'VOLT', 'CHG', 'PWR', 'AMP'];
    const chosenSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    setNewTruckCode(autoCode);
    setNewDisplayName(`Atlas Titan Mobile #${nextNumber}`);
    setNewPlate(`EK${Math.floor(24 + Math.random() * 70)} ${chosenSuffix}`);
    setNewCapacity(200);
    setNewOutput(150);
    setNewDepotAddress('Stratford Mobility Hub, London E15 4QZ');
    setShowAddTruckModal(true);
  };

  const openEditTruck = (truck) => {
    setErrorMessage('');
    setSelectedTruck(truck);
    setTruckCode(truck.truck_code || '');
    setTruckDisplayName(truck.display_name || '');
    setTruckPlate(truck.license_plate || '');
    setTruckStatus(truck.operational_status || 'AVAILABLE');
    setTruckAddress(truck.base_address || '');
    setTruckStoredKwh(truck.current_stored_kwh || 160);
    setTruckCapacityKwh(truck.battery_capacity_kwh || 200);
    setTruckMaxOutput(truck.max_output_kw || 150);
    setShowEditTruckModal(true);
  };

  const handleSaveTruck = async (e) => {
    e.preventDefault();
    if (!selectedTruck) return;
    setErrorMessage('');
    try {
      await updateTruck(selectedTruck.id, {
        display_name: truckDisplayName,
        license_plate: truckPlate,
        operational_status: truckStatus,
        base_address: truckAddress,
        battery_capacity_kwh: parseFloat(truckCapacityKwh),
        current_stored_kwh: parseFloat(truckStoredKwh),
        max_output_kw: parseFloat(truckMaxOutput),
      });
      setShowEditTruckModal(false);
    } catch (err) {
      setErrorMessage('Error updating mobile unit: ' + err.message);
    }
  };

  const handleAddTruckSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      await addTruck({
        truck_code: newTruckCode,
        display_name: newDisplayName,
        license_plate: newPlate,
        battery_capacity_kwh: parseFloat(newCapacity),
        current_stored_kwh: parseFloat(newCapacity) * 0.8,
        max_output_kw: parseFloat(newOutput),
        operational_status: 'AVAILABLE',
        base_address: newDepotAddress,
        base_lat: 51.5430,
        base_lng: -0.0020,
      });
      setShowAddTruckModal(false);
    } catch (err) {
      setErrorMessage('Error commissioning unit: ' + err.message);
    }
  };

  const handleDeleteTruckClick = async (truck) => {
    try {
      await deleteTruck(truck.id);
    } catch (err) {
      console.error('Could not decommission unit:', err);
    }
  };

  const openAddDriver = () => {
    setErrorMessage('');
    const rand = Math.floor(100 + Math.random() * 900);
    const names = ['Dave Miller', 'Sarah Jenkins', 'Liam Vance', 'Elena Rostova', 'Jack Thompson', 'Zack Taylor', 'Marcus Webb'];
    const chosenName = names[Math.floor(Math.random() * names.length)];
    setDriverName(chosenName);
    setDriverEmail(`${chosenName.toLowerCase().replace(' ', '.')}.${rand}@atlascharge.com`);
    setDriverPassword('Password123!');
    setDriverPhone(`+44791${Math.floor(100000 + Math.random() * 900000)}`);
    setDriverLicense(`UK-DRV-${Math.floor(100000 + Math.random() * 900000)}`);
    setDriverExpiry('2028-12-31');
    setDriverTruckId(trucks[0]?.id || '');
    setDriverDutyStatus('AVAILABLE');
    setShowAddDriverModal(true);
  };

  const openEditDriver = (d) => {
    setErrorMessage('');
    setSelectedDriver(d);
    setDriverName(d.full_name || '');
    setDriverEmail(d.email || '');
    setDriverPhone(d.phone_number || '');
    setDriverLicense(d.license_number || '');
    setDriverExpiry(d.license_expiry_date || '2028-12-31');
    setDriverTruckId(d.assigned_truck_id || '');
    setDriverDutyStatus(d.duty_status || 'AVAILABLE');
    setShowEditDriverModal(true);
  };

  const handleAddDriverSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const res = await addDriver({
        full_name: driverName,
        email: driverEmail,
        password: driverPassword,
        phone_number: driverPhone,
        license_number: driverLicense,
        license_expiry_date: driverExpiry,
        assigned_truck_id: driverTruckId || null,
        duty_status: driverDutyStatus,
      });
      setCreatedCredentials({
        name: driverName,
        email: driverEmail,
        password: driverPassword,
      });
      setShowAddDriverModal(false);
    } catch (err) {
      setErrorMessage('Error registering technician: ' + err.message);
    }
  };

  const handleEditDriverSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriver) return;
    setErrorMessage('');
    try {
      await updateDriver(selectedDriver.user_id, {
        full_name: driverName,
        email: driverEmail,
        phone_number: driverPhone,
        license_number: driverLicense,
        license_expiry_date: driverExpiry,
        assigned_truck_id: driverTruckId || null,
        duty_status: driverDutyStatus,
        is_on_duty: driverDutyStatus === 'AVAILABLE',
      });
      setShowEditDriverModal(false);
    } catch (err) {
      setErrorMessage('Error saving driver profile: ' + err.message);
    }
  };

  const handleDeleteDriverClick = async (d) => {
    try {
      await deleteDriver(d.user_id);
    } catch (err) {
      console.error('Could not decommission technician:', err);
    }
  };

  const openEditOrder = (order) => {
    setSelectedOrder(order);
    setOrderStatus(order.status);
    setShowEditOrderModal(true);
  };

  const handleSaveOrderStatus = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    await updateStatus(selectedOrder.id, { status: orderStatus });
    setShowEditOrderModal(false);
  };

  const handleDeleteOrderClick = async (orderId) => {
    try {
      await deleteOrder(orderId);
    } catch (err) {
      console.error('Could not delete order:', err);
    }
  };

  const filteredLabels = (uiLabels || []).filter(l =>
    l.label_key.toLowerCase().includes(searchLabel.toLowerCase()) ||
    l.label_value.toLowerCase().includes(searchLabel.toLowerCase()) ||
    l.category.toLowerCase().includes(searchLabel.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '28px auto', padding: '0 20px' }}>
      {/* Top Banner & Mode */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Fleet Operations Console</h1>
            <span className="brand-pill" style={{
              background: isSuperAdmin ? 'var(--emerald-light)' : 'var(--slate-100)',
              color: isSuperAdmin ? 'var(--emerald-darker)' : 'var(--slate-700)',
              fontWeight: 800
            }}>
              {isSuperAdmin ? '● SuperAdmin: Full Write & CRUD' : '● Dispatcher: Read-Only Watch Mode'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time telemetry, mobile battery fleet status & field technician coordination
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--slate-100)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          {[
            { id: 'overview', label: 'Fleet Map' },
            { id: 'trucks', label: `Mobile Units (${trucks.length})` },
            { id: 'drivers', label: `Drivers (${drivers.length})` },
            { id: 'dispatches', label: `Dispatches (${ordersList.length})` },
            { id: 'labels', label: `UI Labels (${uiLabels.length})` },
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

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <div className="card-glass">
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACTIVE DISPATCHES</div>
          <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--emerald-dark)' }}>
            {activeDispatches.length}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pending & en-route requests</div>
        </div>

        <div className="card-glass">
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STORED ENERGY BUFFER</div>
          <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0284c7' }}>
            {totalStoredKwh.toFixed(0)} <span style={{ fontSize: '14px' }}>/ {totalCapacityKwh} kWh</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ready for mobile DC dispensing</div>
        </div>

        <div className="card-glass">
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>FLEET READINESS</div>
          <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--emerald-darker)' }}>
            {trucks.filter(t => t.operational_status === 'AVAILABLE').length} <span style={{ fontSize: '14px' }}>/ {trucks.length} Units</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Available for instant dispatch</div>
        </div>

        <div className="card-glass">
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ACTIVE TECHNICIANS</div>
          <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'var(--font-mono)', color: 'var(--slate-800)' }}>
            {drivers.filter(d => d.duty_status === 'AVAILABLE').length} <span style={{ fontSize: '14px' }}>/ {drivers.length} On Duty</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Certified mobile operators</div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & MAP */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div className="card-glass" style={{ padding: 0, overflow: 'hidden', height: '480px', position: 'relative' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="card-glass">
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '10px' }}>Active Fleet Units</h3>
              {trucks.length === 0 ? (
                <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No mobile units active in fleet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(trucks || []).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13px' }}>{t.display_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.license_plate} · {t.current_stored_kwh} kWh</div>
                      </div>
                      <span className="brand-pill" style={{
                        background: t.operational_status === 'AVAILABLE' ? 'var(--emerald-light)' : t.operational_status === 'CHARGING' ? 'var(--amber-light)' : 'var(--slate-100)',
                        color: t.operational_status === 'AVAILABLE' ? 'var(--emerald-darker)' : t.operational_status === 'CHARGING' ? 'var(--amber-primary)' : 'var(--slate-700)',
                        fontSize: '10px'
                      }}>
                        ● {t.operational_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-glass">
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '10px' }}>Recent Dispatches</h3>
              {ordersList.length === 0 ? (
                <div style={{ padding: '24px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No dispatches recorded yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(ordersList || []).slice(0, 4).map(o => (
                    <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{o.target_address}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ref: {o.order_reference || o.id?.slice(0, 8)}</div>
                      </div>
                      <span className="brand-pill" style={{ fontSize: '10px' }}>{o.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MOBILE CHARGING UNITS */}
      {activeTab === 'trucks' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Mobile Charging Units (fleet_trucks)</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                High-capacity mobile DC fast-charging vehicles equipped with CCS & Type 2 dispensers
              </div>
            </div>
            {isSuperAdmin && (
              <button className="btn-emerald" style={{ width: 'auto', fontSize: '13px', padding: '8px 16px' }} onClick={openAddTruck}>
                <Plus size={15} /> Commission New Mobile Unit
              </button>
            )}
          </div>

          {trucks.length === 0 ? (
            <div className="card-glass" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--slate-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--text-muted)' }}>
                <Truck size={24} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>No Mobile Units in Fleet</div>
              <div style={{ fontSize: '13px', marginBottom: '16px' }}>There are currently no mobile charging units registered in the database.</div>
              {isSuperAdmin && (
                <button className="btn-emerald" style={{ width: 'auto', margin: '0 auto' }} onClick={openAddTruck}>
                  <Plus size={15} /> Commission First Mobile Unit
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {(trucks || []).map((truck) => (
                <div key={truck.id} className="card-glass">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '18px' }}>{truck.display_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Code: <b>{truck.truck_code}</b> · Plate: <b>{truck.license_plate}</b>
                      </div>
                    </div>
                    <span className="brand-pill" style={{
                      background: truck.operational_status === 'AVAILABLE' ? 'var(--emerald-light)' : truck.operational_status === 'CHARGING' ? 'var(--amber-light)' : 'var(--slate-100)',
                      color: truck.operational_status === 'AVAILABLE' ? 'var(--emerald-darker)' : truck.operational_status === 'CHARGING' ? 'var(--amber-primary)' : 'var(--slate-700)',
                      fontWeight: 800
                    }}>
                      ● {truck.operational_status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    <div className="metric-card">
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>BUFFER STORED</div>
                      <div style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-mono)' }}>{truck.current_stored_kwh} / {truck.battery_capacity_kwh} kWh</div>
                    </div>
                    <div className="metric-card">
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MAX DC OUTPUT</div>
                      <div style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--emerald-dark)' }}>{truck.max_output_kw} kW</div>
                    </div>
                    <div className="metric-card">
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STATUS</div>
                      <div style={{ fontWeight: 800, fontSize: '13px' }}>{truck.operational_status}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--slate-50)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: isSuperAdmin ? '12px' : '0' }}>
                    <b>Base Location:</b> {truck.base_address} ({truck.base_lat?.toFixed(4)}, {truck.base_lng?.toFixed(4)})
                  </div>

                  {/* ONLY SuperAdmin sees edit and delete buttons */}
                  {isSuperAdmin && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                      <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditTruck(truck)}>
                        <Edit3 size={13} /> Edit Status / Depot
                      </button>
                      <button className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--red-primary)' }} onClick={() => handleDeleteTruckClick(truck)}>
                        <Trash2 size={13} /> Decommission
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TECHNICIANS & DRIVERS */}
      {activeTab === 'drivers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Fleet Technicians & Drivers (driver_profiles)</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {isSuperAdmin ? 'Full control over technician credentials, truck assignments & duty status' : 'Technician status and assigned mobile units (Read-only monitor)'}
              </div>
            </div>
            {isSuperAdmin && (
              <button className="btn-emerald" style={{ width: 'auto', fontSize: '13px', padding: '8px 16px' }} onClick={openAddDriver}>
                <UserPlus size={15} /> Register New Technician
              </button>
            )}
          </div>

          {drivers.length === 0 ? (
            <div className="card-glass" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--slate-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--text-muted)' }}>
                <UserPlus size={24} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>No Drivers or Technicians Registered</div>
              <div style={{ fontSize: '13px', marginBottom: '16px' }}>There are currently no field technicians or drivers registered in the database.</div>
              {isSuperAdmin && (
                <button className="btn-emerald" style={{ width: 'auto', margin: '0 auto' }} onClick={openAddDriver}>
                  <UserPlus size={15} /> Register First Technician
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {(drivers || []).map((drv) => {
                const assignedTruck = (trucks || []).find(t => t.id === drv.assigned_truck_id);
                return (
                  <div key={drv.user_id} className="card-glass">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '42px', height: '42px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--emerald-darker)' }}>
                          {drv.full_name?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '16px' }}>{drv.full_name || 'Technician Driver'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{drv.email || 'driver@atlascharge.com'} · {drv.phone_number || '+447911999888'}</div>
                        </div>
                      </div>
                      <span className="brand-pill" style={{
                        background: drv.duty_status === 'AVAILABLE' ? 'var(--emerald-light)' : drv.duty_status === 'RESTING' ? 'var(--amber-light)' : 'var(--slate-100)',
                        color: drv.duty_status === 'AVAILABLE' ? 'var(--emerald-darker)' : drv.duty_status === 'RESTING' ? 'var(--amber-primary)' : 'var(--slate-700)',
                        fontWeight: 800
                      }}>
                        ● {drv.duty_status || 'AVAILABLE'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                      <div className="metric-card">
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RATING</div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Star size={13} fill="#f59e0b" /> {drv.rating_score || '5.00'}
                        </div>
                      </div>
                      <div className="metric-card">
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>JOBS COMPLETED</div>
                        <div style={{ fontWeight: 800, fontSize: '14px', fontFamily: 'var(--font-mono)' }}>{drv.total_completed_jobs || 0}</div>
                      </div>
                      <div className="metric-card">
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>LICENSE EXPIRY</div>
                        <div style={{ fontWeight: 800, fontSize: '12px' }}>{drv.license_expiry_date || '2028-12-31'}</div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--slate-50)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: isSuperAdmin ? '14px' : '0', fontSize: '12px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>ASSIGNED MOBILE UNIT:</div>
                      {isSuperAdmin ? (
                        <select
                          className="metric-card"
                          style={{ width: '100%', outline: 'none', fontSize: '12px', padding: '6px 8px', background: '#fff' }}
                          value={drv.assigned_truck_id || ''}
                          onChange={e => updateDriver(drv.user_id, { assigned_truck_id: e.target.value || null })}
                        >
                          <option value="">-- No Truck Assigned (Standby) --</option>
                          {(trucks || []).map(t => (
                            <option key={t.id} value={t.id}>{t.display_name} ({t.truck_code}) - {t.operational_status}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontWeight: 700 }}>
                          {assignedTruck ? `${assignedTruck.display_name} (${assignedTruck.truck_code})` : 'Standby (No truck assigned)'}
                        </div>
                      )}
                    </div>

                    {/* ONLY SuperAdmin sees edit and delete buttons */}
                    {isSuperAdmin && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                        <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditDriver(drv)}>
                          <Edit3 size={13} /> Edit Duty / License
                        </button>
                        <button className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--red-primary)' }} onClick={() => handleDeleteDriverClick(drv)}>
                          <Trash2 size={13} /> Decommission Driver
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DISPATCH HISTORY */}
      {activeTab === 'dispatches' && (
        <div className="card-glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Complete Dispatches Log (orders)</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {isSuperAdmin ? 'Full Administrative Control (C/R/U/D)' : 'Dispatcher Real-Time Live Watch Mode (Read-Only)'}
              </div>
            </div>
            <span className="brand-pill">
              {isSuperAdmin ? 'SuperAdmin Full Audit Mode' : 'Dispatcher Monitor Mode'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 8px' }}>Reference</th>
                  <th style={{ padding: '10px 8px' }}>Target Address</th>
                  <th style={{ padding: '10px 8px' }}>Assigned Mobile Unit</th>
                  <th style={{ padding: '10px 8px' }}>Assigned Driver</th>
                  <th style={{ padding: '10px 8px' }}>Status</th>
                  <th style={{ padding: '10px 8px' }}>Billed</th>
                  {isSuperAdmin && <th style={{ padding: '10px 8px' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(ordersList || []).map((o) => {
                  const assignedTrk = (trucks || []).find(t => t.id === o.assigned_truck_id);
                  const assignedDrv = (drivers || []).find(d => d.user_id === o.assigned_driver_id);
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{o.order_reference || o.id?.slice(0, 8)}</td>
                      <td style={{ padding: '10px 8px' }}>{o.target_address}</td>
                      <td style={{ padding: '10px 8px' }}>
                        {isSuperAdmin ? (
                          <select
                            className="metric-card"
                            style={{ padding: '4px 6px', fontSize: '11px', outline: 'none' }}
                            value={o.assigned_truck_id || ''}
                            onChange={e => assignTruckToOrder(o.id, e.target.value || null)}
                          >
                            <option value="">-- Unassigned --</option>
                            {(trucks || []).map(t => (
                              <option key={t.id} value={t.id}>{t.display_name} ({t.truck_code})</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                            {assignedTrk ? `${assignedTrk.display_name}` : 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {isSuperAdmin ? (
                          <select
                            className="metric-card"
                            style={{ padding: '4px 6px', fontSize: '11px', outline: 'none' }}
                            value={o.assigned_driver_id || ''}
                            onChange={e => assignDriverToOrder(o.id, e.target.value || null)}
                          >
                            <option value="">-- Unassigned --</option>
                            {(drivers || []).map(d => (
                              <option key={d.user_id} value={d.user_id}>{d.full_name}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                            {assignedDrv ? `${assignedDrv.full_name}` : 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px' }}><span className="brand-pill">{o.status}</span></td>
                      <td style={{ padding: '10px 8px', fontWeight: 800 }}>£{o.estimated_total_amount?.toFixed(2) || '17.25'}</td>
                      {isSuperAdmin && (
                        <td style={{ padding: '10px 8px', display: 'flex', gap: '6px' }}>
                          <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => openEditOrder(o)}>
                            <Edit3 size={12} /> Status
                          </button>
                          <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--red-primary)' }} onClick={() => handleDeleteOrderClick(o.id)}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: UI LABELS DICTIONARY (Read-Only) */}
      {activeTab === 'labels' && (
        <div className="card-glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>System UI Localization Dictionary (system_ui_labels)</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                System dictionary values managed by core platform configuration
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--slate-50)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Filter labels..."
                value={searchLabel}
                onChange={e => setSearchLabel(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 8px' }}>Label Key</th>
                  <th style={{ padding: '10px 8px' }}>Category</th>
                  <th style={{ padding: '10px 8px' }}>Locale</th>
                  <th style={{ padding: '10px 8px' }}>Resolved Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredLabels.map((lbl) => (
                  <tr key={lbl.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{lbl.label_key}</td>
                    <td style={{ padding: '10px 8px' }}><span className="brand-pill">{lbl.category}</span></td>
                    <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>{lbl.locale}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 700 }}>{lbl.label_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- EDIT TRUCK MODAL (SuperAdmin Only) --- */}
      <Modal isOpen={showEditTruckModal} onClose={() => setShowEditTruckModal(false)} title={`Edit Mobile Unit (${selectedTruck?.display_name})`}>
        <form onSubmit={handleSaveTruck}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Unit Code (Auto-Locked)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--slate-100)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <Lock size={14} color="var(--text-muted)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--slate-700)', fontSize: '13px' }}>
                  {truckCode}
                </span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Display Name</label>
              <input
                className="metric-card"
                style={{ width: '100%', outline: 'none' }}
                value={truckDisplayName}
                onChange={e => setTruckDisplayName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>License Plate</label>
              <input
                className="metric-card"
                style={{ width: '100%', outline: 'none' }}
                value={truckPlate}
                onChange={e => setTruckPlate(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Operational Status</label>
              <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={truckStatus} onChange={e => setTruckStatus(e.target.value)}>
                <option value="AVAILABLE">AVAILABLE (Ready for Dispatch)</option>
                <option value="EN_ROUTE">EN_ROUTE (Navigating to Target)</option>
                <option value="CHARGING">CHARGING (Delivering DC Power)</option>
                <option value="MAINTENANCE">MAINTENANCE (Depot Inspection)</option>
                <option value="RETURNING">RETURNING (Driving to Base)</option>
                <option value="OFFLINE">OFFLINE</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Battery Capacity (kWh)</label>
              <input
                className="metric-card"
                type="number"
                step="1"
                style={{ width: '100%', outline: 'none' }}
                value={truckCapacityKwh}
                onChange={e => setTruckCapacityKwh(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Current Stored Buffer (kWh)</label>
              <input
                className="metric-card"
                type="number"
                step="1"
                style={{ width: '100%', outline: 'none' }}
                value={truckStoredKwh}
                onChange={e => setTruckStoredKwh(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Max DC Output (kW)</label>
              <input
                className="metric-card"
                type="number"
                step="1"
                style={{ width: '100%', outline: 'none' }}
                value={truckMaxOutput}
                onChange={e => setTruckMaxOutput(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Base Depot Address</label>
              <input
                className="metric-card"
                style={{ width: '100%', outline: 'none' }}
                value={truckAddress}
                onChange={e => setTruckAddress(e.target.value)}
                required
              />
            </div>
          </div>

          {errorMessage && (
            <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--red-primary)', fontWeight: 700 }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="btn-emerald">
            Save Truck Updates to Database
          </button>
        </form>
      </Modal>

      {/* --- COMMISSION MOBILE UNIT MODAL (SuperAdmin Only) --- */}
      <Modal isOpen={showAddTruckModal} onClose={() => setShowAddTruckModal(false)} title="Commission New Mobile Unit (SuperAdmin)">
        <form onSubmit={handleAddTruckSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Generated Unit Code (Auto-Locked)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--slate-100)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <Lock size={14} color="var(--text-muted)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--slate-700)', fontSize: '13px' }}>
                  {newTruckCode}
                </span>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Display Name</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>License Plate</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={newPlate} onChange={e => setNewPlate(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Max DC Output (kW)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={newOutput} onChange={e => setNewOutput(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Base Depot Address</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={newDepotAddress} onChange={e => setNewDepotAddress(e.target.value)} required />
          </div>

          {errorMessage && (
            <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--red-primary)', fontWeight: 700 }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="btn-emerald">
            Commission Unit into Fleet
          </button>
        </form>
      </Modal>

      {/* --- EDIT ORDER DISPATCH MODAL (SuperAdmin Only) --- */}
      <Modal isOpen={showEditOrderModal} onClose={() => setShowEditOrderModal(false)} title={`Manage Order #${selectedOrder?.order_reference || selectedOrder?.id?.slice(0, 8)}`}>
        <form onSubmit={handleSaveOrderStatus}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Target: <b>{selectedOrder?.target_address}</b>
            </div>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Override Status</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={orderStatus} onChange={e => setOrderStatus(e.target.value)}>
              <option value="WAITING_APPROVAL">WAITING_APPROVAL (Pending Dispatch)</option>
              <option value="EN_ROUTE">EN_ROUTE (Technician Mobilized)</option>
              <option value="ARRIVED">ARRIVED (On Scene)</option>
              <option value="CHARGING">CHARGING (Delivering DC Power)</option>
              <option value="COMPLETED">COMPLETED (Charge Done)</option>
              <option value="CANCELED">CANCELED (Abort Request)</option>
            </select>
          </div>

          <button type="submit" className="btn-emerald">
            Apply Status Update
          </button>
        </form>
      </Modal>

      {/* --- REGISTER NEW TECHNICIAN MODAL (SuperAdmin Only) --- */}
      <Modal isOpen={showAddDriverModal} onClose={() => setShowAddDriverModal(false)} title="Register New Field Technician (driver_profiles)">
        <form onSubmit={handleAddDriverSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Full Name</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverName} onChange={e => setDriverName(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Email Address</label>
              <input className="metric-card" type="email" style={{ width: '100%', outline: 'none' }} value={driverEmail} onChange={e => setDriverEmail(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Account Password (Credentials for Technician)</label>
              <input className="metric-card" type="text" style={{ width: '100%', outline: 'none' }} value={driverPassword} onChange={e => setDriverPassword(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Phone Number</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverPhone} onChange={e => setDriverPhone(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>DVLA License Number</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverLicense} onChange={e => setDriverLicense(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>License Expiry Date</label>
              <input className="metric-card" type="date" style={{ width: '100%', outline: 'none' }} value={driverExpiry} onChange={e => setDriverExpiry(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Assign Initial Mobile Unit</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverTruckId} onChange={e => setDriverTruckId(e.target.value)}>
              <option value="">-- No Truck Assigned --</option>
              {(trucks || []).map(t => (
                <option key={t.id} value={t.id}>{t.display_name} ({t.truck_code})</option>
              ))}
            </select>
          </div>

          {errorMessage && (
            <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--red-primary)', fontWeight: 700 }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="btn-emerald">
            Register Technician into Fleet
          </button>
        </form>
      </Modal>

      {/* --- CREDENTIALS CONFIRMATION MODAL (SuperAdmin Only) --- */}
      <Modal isOpen={!!createdCredentials} onClose={() => setCreatedCredentials(null)} title="Technician Account Provisioned Successfully">
        <div style={{ padding: '8px 0' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--emerald-darker)' }}>
            <CheckCircle2 size={28} />
          </div>
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>
            {createdCredentials?.name} is Registered!
          </div>
          <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Provide these login credentials to the driver. They can sign in at <code>/login</code> to access the Technician Cockpit.
          </div>

          <div style={{ background: 'var(--slate-900)', color: '#fff', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--slate-400)' }}>Email (Login):</span>
              <b style={{ fontFamily: 'var(--font-mono)' }}>{createdCredentials?.email}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--slate-400)' }}>Password:</span>
              <b style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>{createdCredentials?.password}</b>
            </div>
          </div>

          <button className="btn-emerald" onClick={() => setCreatedCredentials(null)}>
            Done
          </button>
        </div>
      </Modal>

      {/* --- EDIT TECHNICIAN MODAL (SuperAdmin Only) --- */}
      <Modal isOpen={showEditDriverModal} onClose={() => setShowEditDriverModal(false)} title={`Edit Technician (${selectedDriver?.full_name})`}>
        <form onSubmit={handleEditDriverSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Full Name</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverName} onChange={e => setDriverName(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Email Address</label>
              <input className="metric-card" type="email" style={{ width: '100%', outline: 'none' }} value={driverEmail} onChange={e => setDriverEmail(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Phone Number</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverPhone} onChange={e => setDriverPhone(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Duty Status</label>
              <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverDutyStatus} onChange={e => setDriverDutyStatus(e.target.value)}>
                <option value="AVAILABLE">AVAILABLE (On Duty)</option>
                <option value="RESTING">RESTING (On Break)</option>
                <option value="OFF_DUTY">OFF_DUTY (Standby)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>License Number</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverLicense} onChange={e => setDriverLicense(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>License Expiry</label>
              <input className="metric-card" type="date" style={{ width: '100%', outline: 'none' }} value={driverExpiry} onChange={e => setDriverExpiry(e.target.value)} required />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Assigned Mobile Unit</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverTruckId} onChange={e => setDriverTruckId(e.target.value)}>
              <option value="">-- No Truck Assigned --</option>
              {(trucks || []).map(t => (
                <option key={t.id} value={t.id}>{t.display_name} ({t.truck_code})</option>
              ))}
            </select>
          </div>

          {errorMessage && (
            <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--red-primary)', fontWeight: 700 }}>
              {errorMessage}
            </div>
          )}

          <button type="submit" className="btn-emerald">
            Save Driver Profile Updates
          </button>
        </form>
      </Modal>
    </div>
  );
}
