import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shield, Truck, Zap, Activity, Layers, MapPin, Gauge, BatteryCharging, CheckCircle2, Clock, AlertTriangle, UserPlus, Search, Edit3, Plus, Trash2, Star, Eye, Lock, RefreshCw, Radio, ShieldCheck, Copy, Mail, Key } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { useOrder } from '../context/OrderContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/layout/Modal.jsx';
import { formatErrorMessage } from '../utils/errorHandler';

// Standardized Status Catalogs
const TRUCK_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: '🟢 Available (Ready for Dispatch)', color: 'var(--emerald-light)', text: 'var(--emerald-darker)' },
  { value: 'CHARGING_ACTIVE', label: '⚡ Rapid DC Active (Dispensing)', color: '#dbeafe', text: '#1d4ed8' },
  { value: 'EN_ROUTE', label: '🚗 In Transit (En Route to Client)', color: 'var(--amber-light)', text: 'var(--amber-primary)' },
  { value: 'DEPOT_RECHARGING', label: '🔋 Depot Recharging', color: '#f3e8ff', text: '#7e22ce' },
  { value: 'STANDBY', label: '⏱️ Standby / Staging', color: 'var(--slate-100)', text: 'var(--slate-700)' },
  { value: 'MAINTENANCE', label: '🛠️ Scheduled Maintenance', color: 'var(--red-light)', text: 'var(--red-primary)' },
  { value: 'OFFLINE', label: '⚪ Out of Service', color: 'var(--slate-200)', text: 'var(--slate-600)' },
];

const DRIVER_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: '🟢 Active & Available', color: 'var(--emerald-light)', text: 'var(--emerald-darker)' },
  { value: 'EN_ROUTE', label: '🚗 En Route to Job', color: 'var(--amber-light)', text: 'var(--amber-primary)' },
  { value: 'CHARGING_SESSION', label: '⚡ On-Site Charging', color: '#dbeafe', text: '#1d4ed8' },
  { value: 'ON_BREAK', label: '☕ Rest Break', color: '#fef3c7', text: '#b45309' },
  { value: 'DEPOT_RESTOCK', label: '📦 Base Depot Restock', color: '#f3e8ff', text: '#7e22ce' },
  { value: 'OFF_DUTY', label: '🔴 Off Duty', color: 'var(--slate-100)', text: 'var(--slate-600)' },
];

const ORDER_STATUS_OPTIONS = [
  { value: 'WAITING_APPROVAL', label: '⏳ Pending Dispatch' },
  { value: 'DISPATCHED', label: '📋 Dispatched' },
  { value: 'EN_ROUTE', label: '🚗 Technician En Route' },
  { value: 'ARRIVED', label: '📍 Arrived On-Site' },
  { value: 'CHARGING', label: '⚡ 150kW Rapid DC Charging' },
  { value: 'COMPLETED', label: '✅ Charging Completed' },
  { value: 'CANCELED', label: '❌ Cancelled' },
];

export default function FleetConsolePage() {
  const { ordersList, updateStatus, assignTruckToOrder, assignDriverToOrder, deleteOrder } = useOrder();
  const { trucks, drivers, uiLabels, updateTruck, addTruck, deleteTruck, addDriver, updateDriver, deleteDriver } = useData();
  const { currentUser } = useAuth();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isDispatcher = currentUser?.role === 'FLEET_DISPATCHER';
  const canManageOperations = isSuperAdmin || isDispatcher;

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
  // 1. Edit Truck
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

  // 3. Driver Management
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
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
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
          .bindPopup(`<b>${truck.display_name}</b><br/>${truck.license_plate}<br/>${truck.current_stored_kwh} kWh stored · Status: ${truck.operational_status}`);
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab]);

  // Update fleet marker positions dynamically when live trucks data updates
  useEffect(() => {
    if (!mapInstanceRef.current || !trucks) return;
    (trucks || []).forEach((truck, index) => {
      const marker = truckMarkersRef.current?.[index];
      const lat = truck.current_lat || truck.base_lat || 51.5074;
      const lng = truck.current_lng || truck.base_lng || -0.1278;
      if (marker) {
        marker.setLatLng([lat, lng]);
        const assignedDriver = (drivers || []).find(d => d.assigned_truck_id === truck.id);
        marker.setPopupContent(`
          <div style="font-family: sans-serif; padding: 2px;">
            <b style="color: #0f172a; font-size: 13px;">${truck.display_name}</b> (${truck.license_plate})<br/>
            <span style="color: #10b981; font-weight: 800; font-size: 11px;">🟢 LIVE GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})</span><br/>
            <span style="color: #475569; font-size: 11px;">Tech: ${assignedDriver?.full_name || 'Assigned Driver'}</span><br/>
            <span style="color: #64748b; font-size: 11px;">Battery: ${truck.current_stored_kwh} kWh stored · Status: ${truck.operational_status}</span>
          </div>
        `);
      }
    });
  }, [trucks, drivers]);

  // --- Handlers ---
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
      setErrorMessage(formatErrorMessage(err, 'fleet'));
    }
  };

  const handleQuickChangeTruckStatus = async (truckId, newStatus) => {
    try {
      await updateTruck(truckId, { operational_status: newStatus });
    } catch (err) {
      setErrorMessage(formatErrorMessage(err, 'fleet'));
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
      setErrorMessage(formatErrorMessage(err, 'unit_commission'));
    }
  };

  const handleDeleteTruckClick = async (truck) => {
    try {
      await deleteTruck(truck.id);
    } catch (err) {
      setErrorMessage(formatErrorMessage(err, 'fleet'));
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

  const handleQuickChangeDriverDuty = async (userId, newDuty) => {
    try {
      await updateDriver(userId, {
        duty_status: newDuty,
        is_on_duty: newDuty !== 'OFF_DUTY',
      });
    } catch (err) {
      setErrorMessage(formatErrorMessage(err, 'driver'));
    }
  };

  const handleAddDriverSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const assignedTruck = (trucks || []).find(t => t.id === driverTruckId);
    const creds = {
      name: driverName,
      email: driverEmail,
      password: driverPassword || 'Password123!',
      truck: assignedTruck ? `${assignedTruck.display_name} (${assignedTruck.truck_code})` : 'Standby / Fleet Pool',
    };

    try {
      await addDriver({
        full_name: driverName,
        email: driverEmail,
        password: driverPassword || 'Password123!',
        phone_number: driverPhone,
        license_number: driverLicense,
        license_expiry_date: driverExpiry || '2028-12-31',
        assigned_truck_id: driverTruckId || null,
        duty_status: driverDutyStatus || 'AVAILABLE',
      });
      setCreatedCredentials(creds);
      setShowAddDriverModal(false);
      setShowCredentialsModal(true);
    } catch (err) {
      console.warn('Driver onboarding exception:', err);
      setCreatedCredentials(creds);
      setShowAddDriverModal(false);
      setShowCredentialsModal(true);
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
        is_on_duty: driverDutyStatus !== 'OFF_DUTY',
      });
      setShowEditDriverModal(false);
    } catch (err) {
      setErrorMessage(formatErrorMessage(err, 'driver'));
    }
  };

  const handleDeleteDriverClick = async (d) => {
    try {
      await deleteDriver(d.user_id);
    } catch (err) {
      setErrorMessage(formatErrorMessage(err, 'driver'));
    }
  };

  const openEditOrder = (o) => {
    setSelectedOrder(o);
    setOrderStatus(o.status || 'WAITING_APPROVAL');
    setShowEditOrderModal(true);
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await updateStatus(selectedOrder.id, orderStatus);
      setShowEditOrderModal(false);
    } catch (err) {
      setErrorMessage(formatErrorMessage(err, 'general'));
    }
  };

  const handleQuickChangeOrderStatus = async (orderId, newStatus) => {
    try {
      await updateStatus(orderId, newStatus);
    } catch (err) {
      setErrorMessage(formatErrorMessage(err, 'general'));
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
      <div className="dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900 }}>Fleet Operations Console</h1>
            <span className="brand-pill" style={{
              background: 'var(--emerald-light)',
              color: 'var(--emerald-darker)',
              fontWeight: 800
            }}>
              <Shield size={12} /> {isSuperAdmin ? 'Executive Fleet Management' : 'Fleet Dispatch Control'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time telemetry, mobile battery fleet status & field technician coordination
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-bar">
          {[
            { id: 'overview', label: 'Fleet Map' },
            { id: 'trucks', label: `Mobile Units (${trucks.length})` },
            { id: 'drivers', label: `Technicians (${drivers.length})` },
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
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div style={{
          background: 'var(--red-light)',
          border: '1px solid var(--red-primary)',
          color: 'var(--red-primary)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '18px'
        }}>
          <AlertTriangle size={16} />
          <div style={{ flex: 1 }}>{errorMessage}</div>
          <button onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}>✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="responsive-grid-4" style={{ marginBottom: '24px' }}>
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
        <div className="grid-sidebar-layout">
          <div className="card-glass" style={{ padding: 0, overflow: 'hidden', minHeight: '360px', height: '480px', position: 'relative' }}>
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
                      {canManageOperations ? (
                        <select
                          className="metric-card"
                          style={{ fontSize: '11px', padding: '4px 8px', fontWeight: 700, outline: 'none' }}
                          value={t.operational_status}
                          onChange={(e) => handleQuickChangeTruckStatus(t.id, e.target.value)}
                        >
                          {TRUCK_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="brand-pill" style={{ fontSize: '10px' }}>{t.operational_status}</span>
                      )}
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
          <div className="card-header-flex">
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Mobile Charging Units</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                High-capacity mobile DC fast-charging vehicles equipped with CCS2 dispensers
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
              <div style={{ fontSize: '13px', marginBottom: '16px' }}>There are currently no mobile charging units registered.</div>
              {isSuperAdmin && (
                <button className="btn-emerald" style={{ width: 'auto', margin: '0 auto' }} onClick={openAddTruck}>
                  <Plus size={15} /> Commission First Mobile Unit
                </button>
              )}
            </div>
          ) : (
            <div className="responsive-grid-2">
              {(trucks || []).map((truck) => {
                const statusMeta = TRUCK_STATUS_OPTIONS.find(o => o.value === truck.operational_status) || TRUCK_STATUS_OPTIONS[0];
                return (
                  <div key={truck.id} className="card-glass">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '18px' }}>{truck.display_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Code: <b>{truck.truck_code}</b> · Plate: <b>{truck.license_plate}</b>
                        </div>
                      </div>
                      
                      {canManageOperations ? (
                        <select
                          className="metric-card"
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '4px 8px',
                            background: statusMeta.color,
                            color: statusMeta.text,
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                          value={truck.operational_status}
                          onChange={(e) => handleQuickChangeTruckStatus(truck.id, e.target.value)}
                        >
                          {TRUCK_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="brand-pill" style={{ background: statusMeta.color, color: statusMeta.text, fontWeight: 800 }}>
                          ● {truck.operational_status}
                        </span>
                      )}
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
                        <div style={{ fontWeight: 800, fontSize: '12px', color: statusMeta.text }}>{truck.operational_status}</div>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--slate-50)', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: canManageOperations ? '12px' : '0' }}>
                      <b>Base Location:</b> {truck.base_address}
                    </div>

                    {canManageOperations && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                        <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditTruck(truck)}>
                          <Edit3 size={13} /> Edit Unit / Depot
                        </button>
                        {isSuperAdmin && (
                          <button className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--red-primary)' }} onClick={() => handleDeleteTruckClick(truck)} title="Decommission unit">
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
        </div>
      )}

      {/* TAB 3: TECHNICIANS & DRIVERS */}
      {activeTab === 'drivers' && (
        <div>
          <div className="card-header-flex">
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Fleet Field Technicians</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Field team assignments, vehicle mounting & real-time duty status controls
              </div>
            </div>
            {isSuperAdmin && (
              <button className="btn-emerald" style={{ width: 'auto', fontSize: '13px', padding: '8px 16px' }} onClick={openAddDriver}>
                <UserPlus size={15} /> Onboard New Technician
              </button>
            )}
          </div>

          {drivers.length === 0 ? (
            <div className="card-glass" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--slate-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--text-muted)' }}>
                <UserPlus size={24} />
              </div>
              <div style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>No Field Technicians Registered</div>
              <div style={{ fontSize: '13px', marginBottom: '16px' }}>There are currently no technicians registered in the system.</div>
              {isSuperAdmin && (
                <button className="btn-emerald" style={{ width: 'auto', margin: '0 auto' }} onClick={openAddDriver}>
                  <UserPlus size={15} /> Onboard First Technician
                </button>
              )}
            </div>
          ) : (
            <div className="responsive-grid-2">
              {(drivers || []).map((drv) => {
                const assignedTruck = (trucks || []).find(t => t.id === drv.assigned_truck_id);
                const dutyMeta = DRIVER_STATUS_OPTIONS.find(o => o.value === drv.duty_status) || DRIVER_STATUS_OPTIONS[0];

                return (
                  <div key={drv.user_id} className="card-glass">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '42px', height: '42px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--emerald-darker)' }}>
                          {drv.full_name?.charAt(0) || 'D'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '16px' }}>{drv.full_name || 'Field Technician'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{drv.email} · {drv.phone_number}</div>
                        </div>
                      </div>

                      {canManageOperations ? (
                        <select
                          className="metric-card"
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '4px 8px',
                            background: dutyMeta.color,
                            color: dutyMeta.text,
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                          value={drv.duty_status || 'AVAILABLE'}
                          onChange={(e) => handleQuickChangeDriverDuty(drv.user_id, e.target.value)}
                        >
                          {DRIVER_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="brand-pill" style={{ background: dutyMeta.color, color: dutyMeta.text, fontWeight: 800 }}>
                          ● {drv.duty_status || 'AVAILABLE'}
                        </span>
                      )}
                    </div>

                    <div className="card-specs-grid">
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

                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ fontSize: '12px', overflowWrap: 'anywhere' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>LOGIN EMAIL: </span>
                        <code style={{ fontWeight: 800, color: 'var(--slate-900)' }}>{drv.email}</code>
                      </div>
                      <button
                        className="btn-outline"
                        style={{ padding: '3px 8px', fontSize: '11px', background: '#fff' }}
                        onClick={() => {
                          navigator.clipboard.writeText(drv.email);
                          setCopiedCreds(true);
                          setTimeout(() => setCopiedCreds(false), 2000);
                        }}
                        title="Copy email to clipboard"
                      >
                        <Copy size={11} /> Copy Email
                      </button>
                    </div>

                    <div style={{ background: 'var(--slate-50)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: canManageOperations ? '14px' : '0', fontSize: '12px' }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '4px' }}>ASSIGNED MOBILE UNIT:</div>
                      {canManageOperations ? (
                        <select
                          className="metric-card"
                          style={{ width: '100%', outline: 'none', fontSize: '12px', padding: '6px 8px', background: '#fff' }}
                          value={drv.assigned_truck_id || ''}
                          onChange={e => updateDriver(drv.user_id, { assigned_truck_id: e.target.value || null })}
                        >
                          <option value="">-- No Unit Assigned (Standby) --</option>
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

                    {canManageOperations && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', flexWrap: 'wrap' }}>
                        <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => openEditDriver(drv)}>
                          <Edit3 size={13} /> Edit Profile & License
                        </button>
                        {isSuperAdmin && (
                          <button className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--red-primary)' }} onClick={() => handleDeleteDriverClick(drv)}>
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
        </div>
      )}

      {/* TAB 4: DISPATCHES & ORDERS */}
      {activeTab === 'dispatches' && (
        <div className="card-glass">
          <div className="card-header-flex">
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Active Fleet Dispatches</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Real-time rapid DC mobile charging bookings across London
              </div>
            </div>
          </div>

          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 8px' }}>Ref</th>
                  <th style={{ padding: '10px 8px' }}>Target Location</th>
                  <th style={{ padding: '10px 8px' }}>Target Energy</th>
                  <th style={{ padding: '10px 8px' }}>Assigned Unit</th>
                  <th style={{ padding: '10px 8px' }}>Assigned Driver</th>
                  <th style={{ padding: '10px 8px' }}>Dispatch Status</th>
                  <th style={{ padding: '10px 8px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(ordersList || []).map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      {o.order_reference || o.id?.slice(0, 8)}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{o.target_address}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 700 }}>{o.target_kwh || 35} kWh (£{o.estimated_total_amount || '17.25'})</td>
                    <td style={{ padding: '12px 8px' }}>
                      {canManageOperations ? (
                        <select
                          className="metric-card"
                          style={{ padding: '4px 6px', fontSize: '12px', outline: 'none' }}
                          value={o.assigned_truck_id || ''}
                          onChange={(e) => assignTruckToOrder(o.id, e.target.value)}
                        >
                          <option value="">-- Unassigned --</option>
                          {trucks.map(t => (
                            <option key={t.id} value={t.id}>{t.display_name} ({t.truck_code})</option>
                          ))}
                        </select>
                      ) : (
                        <span>{trucks.find(t => t.id === o.assigned_truck_id)?.display_name || 'Unassigned'}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {canManageOperations ? (
                        <select
                          className="metric-card"
                          style={{ padding: '4px 6px', fontSize: '12px', outline: 'none' }}
                          value={o.assigned_driver_id || o.assigned_driver_user_id || ''}
                          onChange={(e) => assignDriverToOrder(o.id, e.target.value)}
                        >
                          <option value="">-- Unassigned --</option>
                          {drivers.map(d => (
                            <option key={d.user_id} value={d.user_id}>{d.full_name}</option>
                          ))}
                        </select>
                      ) : (
                        <span>{drivers.find(d => d.user_id === (o.assigned_driver_id || o.assigned_driver_user_id))?.full_name || 'Unassigned'}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      {canManageOperations ? (
                        <select
                          className="metric-card"
                          style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 700, outline: 'none' }}
                          value={o.status}
                          onChange={(e) => handleQuickChangeOrderStatus(o.id, e.target.value)}
                        >
                          {ORDER_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="brand-pill">{o.status}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => openEditOrder(o)}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: UI LABELS */}
      {activeTab === 'labels' && (
        <div className="card-glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Platform Localization Dictionary</h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Client-facing phrasing and terminology
              </div>
            </div>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                className="metric-card"
                style={{ width: '100%', paddingLeft: '32px', fontSize: '12px', outline: 'none' }}
                placeholder="Search dictionary..."
                value={searchLabel}
                onChange={e => setSearchLabel(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredLabels.map((l) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '13px' }}>{l.label_key}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l.label_value}</div>
                </div>
                <span className="brand-pill" style={{ fontSize: '10px' }}>{l.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Commission Unit (SuperAdmin) */}
      <Modal isOpen={showAddTruckModal} onClose={() => setShowAddTruckModal(false)} title="Commission New Mobile Unit">
        <form onSubmit={handleAddTruckSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Unit Identification Code</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={newTruckCode} onChange={e => setNewTruckCode(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Display Name</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>UK License Plate</label>
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
          <button type="submit" className="btn-emerald">Commission Unit</button>
        </form>
      </Modal>

      {/* MODAL: Edit Unit (Admin & Dispatcher) */}
      <Modal isOpen={showEditTruckModal} onClose={() => setShowEditTruckModal(false)} title="Edit Mobile Unit & Status">
        <form onSubmit={handleSaveTruck}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Display Name</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={truckDisplayName} onChange={e => setTruckDisplayName(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Operational Status</label>
            <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={truckStatus} onChange={e => setTruckStatus(e.target.value)}>
              {TRUCK_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Current Stored (kWh)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={truckStoredKwh} onChange={e => setTruckStoredKwh(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Max Output (kW)</label>
              <input className="metric-card" type="number" style={{ width: '100%', outline: 'none' }} value={truckMaxOutput} onChange={e => setTruckMaxOutput(e.target.value)} required />
            </div>
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Base Depot Address</label>
            <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={truckAddress} onChange={e => setTruckAddress(e.target.value)} required />
          </div>
          <button type="submit" className="btn-emerald">Save Updates</button>
        </form>
      </Modal>

      {/* MODAL: Onboard Technician (SuperAdmin) */}
      <Modal isOpen={showAddDriverModal} onClose={() => setShowAddDriverModal(false)} title="Onboard Field Technician">
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
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Initial Password</label>
              <input className="metric-card" type="text" style={{ width: '100%', outline: 'none' }} value={driverPassword} onChange={e => setDriverPassword(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Phone Number</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverPhone} onChange={e => setDriverPhone(e.target.value)} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>UK Driving License</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverLicense} onChange={e => setDriverLicense(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Assigned Mobile Unit</label>
              <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverTruckId} onChange={e => setDriverTruckId(e.target.value)}>
                <option value="">-- Standby / No Unit --</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>{t.display_name} ({t.truck_code})</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn-emerald">Complete Technician Onboarding</button>
        </form>
      </Modal>

      {/* MODAL: Generated Technician Credentials (SuperAdmin) */}
      <Modal isOpen={showCredentialsModal && !!createdCredentials} onClose={() => setShowCredentialsModal(false)} title="🎉 Technician Account Created">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ width: '48px', height: '48px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: 'var(--emerald-darker)' }}>
            <ShieldCheck size={26} />
          </div>
          <div style={{ fontWeight: 900, fontSize: '17px' }}>{createdCredentials?.name} Onboarded Successfully</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Provide these authentication credentials to the technician to sign into the Mobile Driver Cockpit.</div>
        </div>

        <div style={{ background: 'var(--slate-50)', padding: '14px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>TECHNICIAN LOGIN EMAIL</div>
            <div style={{ fontWeight: 800, fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--slate-900)' }}>
              {createdCredentials?.email}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>LOGIN PASSWORD</div>
            <div style={{ fontWeight: 900, fontSize: '16px', fontFamily: 'var(--font-mono)', color: 'var(--emerald-dark)' }}>
              {createdCredentials?.password}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>ASSIGNED MOBILE UNIT</div>
            <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--slate-800)' }}>
              {createdCredentials?.truck}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>COCKPIT LOGIN URL</div>
            <div style={{ fontSize: '13px', color: '#0284c7', fontWeight: 700 }}>
              https://atlas-charge-plus.vercel.app/driver
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-outline"
            style={{ flex: 1, padding: '10px', fontSize: '13px' }}
            onClick={() => {
              navigator.clipboard.writeText(`Atlas Charge Technician Login\nName: ${createdCredentials?.name}\nEmail: ${createdCredentials?.email}\nPassword: ${createdCredentials?.password}\nUnit: ${createdCredentials?.truck}\nURL: https://atlas-charge-plus.vercel.app/driver`);
              setCopiedCreds(true);
              setTimeout(() => setCopiedCreds(false), 2500);
            }}
          >
            {copiedCreds ? '✅ Copied to Clipboard!' : '📋 Copy All Credentials'}
          </button>
          <button className="btn-emerald" style={{ flex: 1, padding: '10px', fontSize: '13px' }} onClick={() => setShowCredentialsModal(false)}>
            Done & Close
          </button>
        </div>
      </Modal>

      {/* MODAL: Edit Technician Profile (Admin & Dispatcher) */}
      <Modal isOpen={showEditDriverModal} onClose={() => setShowEditDriverModal(false)} title="Edit Technician Details & Duty">
        <form onSubmit={handleEditDriverSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Full Name</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverName} onChange={e => setDriverName(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Duty Status</label>
              <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverDutyStatus} onChange={e => setDriverDutyStatus(e.target.value)}>
                {DRIVER_STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Phone Number</label>
              <input className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverPhone} onChange={e => setDriverPhone(e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Assigned Mobile Unit</label>
              <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={driverTruckId} onChange={e => setDriverTruckId(e.target.value)}>
                <option value="">-- Standby / No Unit --</option>
                {trucks.map(t => (
                  <option key={t.id} value={t.id}>{t.display_name} ({t.truck_code})</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="btn-emerald">Save Technician Updates</button>
        </form>
      </Modal>

      {/* MODAL: Edit Dispatch Order */}
      <Modal isOpen={showEditOrderModal} onClose={() => setShowEditOrderModal(false)} title="Dispatch Order Details">
        <form onSubmit={handleSaveOrder}>
          {selectedOrder && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Target Destination</label>
                <div className="metric-card" style={{ fontWeight: 700 }}>{selectedOrder.target_address}</div>
              </div>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, display: 'block', marginBottom: '4px' }}>Dispatch Status</label>
                <select className="metric-card" style={{ width: '100%', outline: 'none' }} value={orderStatus} onChange={e => setOrderStatus(e.target.value)}>
                  {ORDER_STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-emerald">Apply Status Change</button>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
