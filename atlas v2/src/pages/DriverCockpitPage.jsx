import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, Navigation, Zap, CheckCircle2, AlertTriangle, Play, Square, BellRing, Gauge, Battery, Activity, Coffee, Power, Phone, User, Clock, ChevronRight } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { playDispatchChime } from '../services/sound';
import MobileSheet from '../components/layout/MobileSheet';
import Modal from '../components/layout/Modal';
import SpeedometerGauge from '../components/telemetry/SpeedometerGauge';

const DUTY_STATUSES = [
  { value: 'AVAILABLE', label: '🟢 Available (On Duty)', color: 'var(--emerald-light)', text: 'var(--emerald-darker)' },
  { value: 'ON_BREAK', label: '☕ Rest Break', color: '#fef3c7', text: '#b45309' },
  { value: 'DEPOT_RESTOCK', label: '📦 Depot Restock', color: '#f3e8ff', text: '#7e22ce' },
  { value: 'OFF_DUTY', label: '🔴 Off Duty', color: 'var(--slate-100)', text: 'var(--slate-600)' },
];

export default function DriverCockpitPage() {
  const { currentUser } = useAuth();
  const { ordersList, updateStatus, claimOrder, logTelemetry, broadcastGps } = useOrder();
  const { trucks, drivers, vehicles, packages, updateTruck, updateDriver, addInvoice } = useData();

  // Identify logged in driver and assigned mobile unit
  const myDriverProfile = useMemo(() => {
    return drivers.find(d => d.user_id === currentUser?.id) || drivers[0] || null;
  }, [drivers, currentUser]);

  const currentTruck = useMemo(() => {
    if (myDriverProfile?.assigned_truck_id) {
      return trucks.find(t => t.id === myDriverProfile.assigned_truck_id) || trucks[0] || null;
    }
    return trucks[0] || null;
  }, [trucks, myDriverProfile]);

  // Find driver's active job or incoming unassigned job from queue
  const myActiveJob = useMemo(() => {
    return ordersList.find(o => o.assigned_driver_id === currentUser?.id && o.status !== 'COMPLETED' && o.status !== 'CANCELED') || null;
  }, [ordersList, currentUser]);

  const availableQueueJobs = useMemo(() => {
    return ordersList.filter(o => !o.assigned_driver_id && (o.status === 'WAITING_APPROVAL' || o.status === 'PENDING_DISPATCH'));
  }, [ordersList]);

  // Target job for modal alert (either assigned waiting job or first available pool job)
  const incomingJob = myActiveJob && myActiveJob.status === 'WAITING_APPROVAL' ? myActiveJob : (availableQueueJobs[0] || null);

  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [chargingKw, setChargingKw] = useState(0);
  const [deliveredKwh, setDeliveredKwh] = useState(0);
  const [batteryPct, setBatteryPct] = useState(24);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const clientMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const simTimerRef = useRef(null);

  // Play chime and show modal when a job arrives
  useEffect(() => {
    if (incomingJob && !myActiveJob?.status?.includes('EN_ROUTE') && !myActiveJob?.status?.includes('CHARGING')) {
      setShowIncomingModal(true);
      playDispatchChime();
    }
  }, [incomingJob, myActiveJob]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = currentTruck?.current_lat || currentTruck?.base_lat || 51.5074;
    const initialLng = currentTruck?.current_lng || currentTruck?.base_lng || -0.1278;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const truckIcon = L.divIcon({
      className: 'custom-truck-icon',
      html: `
        <div class="truck-heading-marker">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
    truckMarkerRef.current = L.marker([initialLat, initialLng], { icon: truckIcon }).addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [currentTruck]);

  // Update Route and Destination Pin when Active Job changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (myActiveJob && myActiveJob.target_lat && myActiveJob.target_lng) {
      const clientPos = [myActiveJob.target_lat, myActiveJob.target_lng];
      const truckPos = [currentTruck?.current_lat || 51.5074, currentTruck?.current_lng || -0.1278];

      // Render client destination marker
      if (!clientMarkerRef.current) {
        const clientIcon = L.divIcon({
          className: 'custom-client-icon',
          html: '<div class="client-pulse-marker"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        clientMarkerRef.current = L.marker(clientPos, { icon: clientIcon }).addTo(mapInstanceRef.current);
      } else {
        clientMarkerRef.current.setLatLng(clientPos);
      }

      // Draw dashed dispatch route line
      if (!routeLineRef.current) {
        routeLineRef.current = L.polyline([truckPos, clientPos], {
          color: '#10b981',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.85,
        }).addTo(mapInstanceRef.current);
      } else {
        routeLineRef.current.setLatLngs([truckPos, clientPos]);
      }

      mapInstanceRef.current.fitBounds([truckPos, clientPos], { padding: [60, 60] });
    } else {
      if (clientMarkerRef.current) {
        clientMarkerRef.current.remove();
        clientMarkerRef.current = null;
      }
      if (routeLineRef.current) {
        routeLineRef.current.remove();
        routeLineRef.current = null;
      }
    }
  }, [myActiveJob, currentTruck]);

  // 150kW DC Charging session simulator
  useEffect(() => {
    if (myActiveJob && myActiveJob.status === 'CHARGING') {
      const targetKw = currentTruck?.max_output_kw || 150;
      setChargingKw(targetKw);

      simTimerRef.current = setInterval(() => {
        setDeliveredKwh(prev => {
          const next = parseFloat((prev + 0.35).toFixed(2));
          logTelemetry({
            order_id: myActiveJob.id,
            recorded_at: new Date().toISOString(),
            current_output_kw: parseFloat((targetKw + (Math.random() * 4 - 2)).toFixed(2)),
            energy_deliv_kwh: next,
            battery_pct: Math.min(100, Math.round(24 + (next / 40 * 76))),
            port_temp_c: 38.5,
          });
          return next;
        });
        setBatteryPct(prev => Math.min(100, prev + 1));
      }, 1000);
    } else {
      clearInterval(simTimerRef.current);
      setChargingKw(0);
    }

    return () => clearInterval(simTimerRef.current);
  }, [myActiveJob, currentTruck]);

  // Actions
  const handleAcceptOrClaimJob = async () => {
    if (!incomingJob) return;
    try {
      await claimOrder(incomingJob.id, currentUser?.id || myDriverProfile?.user_id, currentTruck?.id);
      if (myDriverProfile) {
        await updateDriver(myDriverProfile.user_id, { duty_status: 'EN_ROUTE', is_on_duty: true });
      }
      if (currentTruck) {
        await updateTruck(currentTruck.id, { operational_status: 'EN_ROUTE' });
      }
      setShowIncomingModal(false);
    } catch (e) {
      console.error('Accept job error:', e);
    }
  };

  const handleArrived = async () => {
    if (!myActiveJob) return;
    await updateStatus(myActiveJob.id, { status: 'ARRIVED' });
  };

  const handleStartCharging = async () => {
    if (!myActiveJob) return;
    setDeliveredKwh(0);
    await updateStatus(myActiveJob.id, { status: 'CHARGING' });
    if (currentTruck) {
      await updateTruck(currentTruck.id, { operational_status: 'CHARGING_ACTIVE' });
    }
    if (myDriverProfile) {
      await updateDriver(myDriverProfile.user_id, { duty_status: 'CHARGING_SESSION' });
    }
  };

  const handleCompleteCharge = async () => {
    if (!myActiveJob) return;
    const finalDelivered = deliveredKwh > 0 ? deliveredKwh : 35.0;
    const callout = parseFloat(myActiveJob.estimated_callout_fee) || 5.00;
    const kwhCost = parseFloat((finalDelivered * 0.35).toFixed(2));
    const totalAmount = parseFloat((callout + kwhCost).toFixed(2));

    try {
      // 1. Complete order
      await updateStatus(myActiveJob.id, {
        status: 'COMPLETED',
        actual_kwh_delivered: finalDelivered,
        actual_duration_minutes: 18,
      });

      // 2. Generate invoice in database
      await addInvoice({
        order_id: myActiveJob.id,
        client_user_id: myActiveJob.client_user_id,
        callout_fee_amount: callout,
        energy_delivered_amount: kwhCost,
        total_billed_amount: totalAmount,
        pdf_url: `https://atlas-charge.com/invoices/inv_${myActiveJob.id?.slice(0, 8)}.pdf`,
      });

      // 3. Update truck stored battery reserve
      if (currentTruck) {
        const newStored = Math.max(0, (currentTruck.current_stored_kwh || 160) - finalDelivered);
        await updateTruck(currentTruck.id, {
          current_stored_kwh: parseFloat(newStored.toFixed(1)),
          operational_status: 'AVAILABLE',
        });
      }

      // 4. Reset driver duty to AVAILABLE
      if (myDriverProfile) {
        await updateDriver(myDriverProfile.user_id, {
          duty_status: 'AVAILABLE',
          total_completed_jobs: (myDriverProfile.total_completed_jobs || 0) + 1,
        });
      }

      setDeliveredKwh(0);
      setChargingKw(0);
    } catch (e) {
      console.error('Complete charge error:', e);
    }
  };

  const handleDutyStatusChange = async (newStatus) => {
    if (!myDriverProfile) return;
    await updateDriver(myDriverProfile.user_id, {
      duty_status: newStatus,
      is_on_duty: newStatus !== 'OFF_DUTY',
    });
  };

  const jobVehicle = vehicles.find(v => v.id === myActiveJob?.vehicle_id);
  const jobPackage = packages.find(p => p.id === myActiveJob?.charge_package_id);

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Leaflet Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top Telemetry HUD */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        zIndex: 500,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.94)',
        backdropFilter: 'blur(12px)',
        padding: '12px 18px',
        borderRadius: 'var(--radius-md)',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--emerald-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>{currentTruck?.display_name || 'Atlas Titan Mobile'}</div>
            <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
              {currentTruck?.truck_code} · {currentTruck?.license_plate} · Tech: <b>{currentUser?.full_name || myDriverProfile?.full_name || 'Field Driver'}</b>
            </div>
          </div>
        </div>

        {/* Duty Status Selector */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <select
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 800,
              outline: 'none',
              cursor: 'pointer',
            }}
            value={myDriverProfile?.duty_status || 'AVAILABLE'}
            onChange={e => handleDutyStatusChange(e.target.value)}
          >
            {DUTY_STATUSES.map(s => (
              <option key={s.value} value={s.value} style={{ background: '#0f172a', color: '#fff' }}>
                {s.label}
              </option>
            ))}
          </select>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>BUFFER BATTERY</div>
            <div style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', fontSize: '15px', color: '#10b981' }}>
              {currentTruck?.current_stored_kwh} / {currentTruck?.battery_capacity_kwh} kWh
            </div>
          </div>
        </div>
      </div>

      {/* Driver Cockpit Bottom Drawer */}
      <MobileSheet>
        {!myActiveJob ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            <Activity size={36} style={{ margin: '0 auto 10px', color: 'var(--emerald-primary)' }} />
            <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--slate-900)' }}>Field Cockpit Standing By</div>
            <div style={{ fontSize: '13px', marginTop: '4px', maxWidth: '340px', margin: '4px auto 14px' }}>
              GPS beacon live. Ready to receive high-power mobile DC rapid charging jobs.
            </div>

            {availableQueueJobs.length > 0 && (
              <button
                className="btn-emerald"
                style={{ width: 'auto', margin: '0 auto', fontSize: '13px', padding: '8px 20px' }}
                onClick={() => setShowIncomingModal(true)}
              >
                <BellRing size={15} /> {availableQueueJobs.length} Unassigned Booking Available — Claim Job
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Active Job Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)' }}>
                  ● Job Status: {myActiveJob.status}
                </span>
                <div style={{ fontWeight: 900, fontSize: '18px', marginTop: '4px' }}>
                  {myActiveJob.target_address || 'Kensington High Street, London'}
                </div>
              </div>
              <span className="brand-pill" style={{ fontFamily: 'var(--font-mono)' }}>
                Ref: {myActiveJob.order_reference || myActiveJob.id?.slice(0, 8)}
              </span>
            </div>

            {/* Target Client EV Card */}
            <div style={{ background: 'var(--slate-50)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>TARGET CLIENT EV</div>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>{jobVehicle ? `${jobVehicle.make} ${jobVehicle.model} (${jobVehicle.license_plate})` : 'Client Electric Vehicle'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Target Energy: <b>{jobPackage?.target_kwh || myActiveJob.target_kwh || 35} kWh</b> (£{myActiveJob.estimated_total_amount || '17.25'})</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href="tel:+447911999888" className="btn-outline" style={{ padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={13} /> Call Client
                </a>
              </div>
            </div>

            {/* State Machine Action Controls */}
            {myActiveJob.status === 'EN_ROUTE' && (
              <button className="btn-emerald" style={{ fontSize: '15px', padding: '12px 0' }} onClick={handleArrived}>
                <Navigation size={18} /> Confirm Arrival On-Site
              </button>
            )}

            {myActiveJob.status === 'ARRIVED' && (
              <button className="btn-emerald" style={{ fontSize: '15px', padding: '12px 0' }} onClick={handleStartCharging}>
                <Zap size={18} /> Connect CCS2 Cable & Start 150kW DC Dispensing
              </button>
            )}

            {myActiveJob.status === 'CHARGING' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                  <SpeedometerGauge currentKw={chargingKw} maxKw={currentTruck?.max_output_kw || 150} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  <div className="metric-card">
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>DELIVERED</div>
                    <div style={{ fontWeight: 900, fontSize: '17px', color: 'var(--emerald-dark)' }}>{deliveredKwh.toFixed(2)} kWh</div>
                  </div>
                  <div className="metric-card">
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>EST. COST</div>
                    <div style={{ fontWeight: 900, fontSize: '17px', color: 'var(--slate-800)' }}>£{(5.00 + (deliveredKwh * 0.35)).toFixed(2)}</div>
                  </div>
                  <div className="metric-card">
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>EV BATTERY</div>
                    <div style={{ fontWeight: 900, fontSize: '17px', color: '#0284c7' }}>{batteryPct}%</div>
                  </div>
                </div>

                <button className="btn-emerald" style={{ background: '#dc2626', borderColor: '#b91c1c', fontSize: '15px', padding: '12px 0' }} onClick={handleCompleteCharge}>
                  <Square size={18} /> Complete Session & Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </MobileSheet>

      {/* MODAL: Incoming Dispatch Job Alert */}
      <Modal isOpen={showIncomingModal && !!incomingJob} onClose={() => setShowIncomingModal(false)} title="🚨 Incoming Rapid DC Dispatch Alert">
        {incomingJob && (
          <div>
            <div style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BellRing size={18} /> Fast Mobile EV Charging Requested
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>DESTINATION ADDRESS</div>
              <div style={{ fontSize: '16px', fontWeight: 900, marginTop: '2px' }}>{incomingJob.target_address || 'London Central'}</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div className="metric-card">
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>REQUESTED ENERGY</div>
                <div style={{ fontSize: '15px', fontWeight: 800 }}>{incomingJob.target_kwh || 35} kWh (150kW DC)</div>
              </div>
              <div className="metric-card">
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ESTIMATED TOTAL</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--emerald-dark)' }}>£{incomingJob.estimated_total_amount || '17.25'}</div>
              </div>
            </div>

            <button className="btn-emerald" style={{ fontSize: '15px', padding: '12px 0' }} onClick={handleAcceptOrClaimJob}>
              <CheckCircle2 size={18} /> Accept & Start Navigation (EN ROUTE)
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
