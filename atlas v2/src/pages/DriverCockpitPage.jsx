import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, Navigation, Zap, CheckCircle2, AlertTriangle, Play, Square, BellRing, Gauge, Battery, Activity } from 'lucide-react';
import { useOrder } from '../context/OrderContext';
import { useData } from '../context/DataContext';
import { playDispatchChime } from '../services/sound';
import MobileSheet from '../components/layout/MobileSheet';
import Modal from '../components/layout/Modal';
import SpeedometerGauge from '../components/telemetry/SpeedometerGauge';

export default function DriverCockpitPage() {
  const { activeOrder, updateStatus, logTelemetry, broadcastGps, ordersList } = useOrder();
  const { trucks, tariffs } = useData();

  const currentTruck = (trucks && trucks.length > 0) ? trucks[0] : null;
  const activeTariff = (tariffs && tariffs.length > 0) ? tariffs[0] : null;

  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [chargingKw, setChargingKw] = useState(0);
  const [deliveredKwh, setDeliveredKwh] = useState(0);
  const [batteryPct, setBatteryPct] = useState(24);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const truckMarkerRef = useRef(null);
  const simTimerRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = currentTruck?.base_lat || 51.5074;
    const initialLng = currentTruck?.base_lng || -0.1278;

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

    if (currentTruck) {
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
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [currentTruck]);

  // Listen for incoming orders
  useEffect(() => {
    if (activeOrder && activeOrder.status === 'WAITING_APPROVAL') {
      setShowIncomingModal(true);
      playDispatchChime();
    }
  }, [activeOrder]);

  // Charging session simulator
  useEffect(() => {
    if (activeOrder && activeOrder.status === 'CHARGING') {
      const targetKw = currentTruck?.max_output_kw || 150;
      setChargingKw(targetKw);
      simTimerRef.current = setInterval(() => {
        setDeliveredKwh(prev => {
          const next = prev + 0.25;
          logTelemetry({
            order_id: activeOrder.id,
            recorded_at: new Date().toISOString(),
            current_output_kw: parseFloat((targetKw + (Math.random() * 4 - 2)).toFixed(2)),
            energy_deliv_kwh: parseFloat(next.toFixed(2)),
            battery_pct: Math.min(100, Math.round(24 + (next / 50 * 76))),
            port_temp_c: 34.2,
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
  }, [activeOrder, currentTruck]);

  const handleAcceptJob = async () => {
    if (!activeOrder) return;
    await updateStatus(activeOrder.id, { status: 'EN_ROUTE', assigned_truck_id: currentTruck?.id });
    setShowIncomingModal(false);
  };

  const handleArrived = async () => {
    if (!activeOrder) return;
    await updateStatus(activeOrder.id, { status: 'ARRIVED' });
  };

  const handleStartCharging = async () => {
    if (!activeOrder) return;
    setDeliveredKwh(0);
    await updateStatus(activeOrder.id, { status: 'CHARGING' });
  };

  const handleCompleteCharge = async () => {
    if (!activeOrder) return;
    await updateStatus(activeOrder.id, {
      status: 'COMPLETED',
      total_energy_delivered_kwh: deliveredKwh,
    });
    setDeliveredKwh(0);
    setChargingKw(0);
  };

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Map */}
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
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(12px)',
        padding: '12px 18px',
        borderRadius: 'var(--radius-md)',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--emerald-primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Truck size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>{currentTruck?.display_name || 'No Unit Assigned'}</div>
            <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
              {currentTruck ? `${currentTruck.truck_code} · ${currentTruck.license_plate}` : 'Standby / Fleet Offline'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>BUFFER BATTERY</div>
            <div style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', fontSize: '15px', color: '#10b981' }}>
              {currentTruck ? `${currentTruck.current_stored_kwh} / ${currentTruck.battery_capacity_kwh} kWh` : '--'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>MAX DISPENSE</div>
            <div style={{ fontWeight: 900, fontFamily: 'var(--font-mono)', fontSize: '15px', color: '#0284c7' }}>
              {currentTruck ? `${currentTruck.max_output_kw} kW` : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Driver Cockpit Sheet */}
      <MobileSheet>
        {!activeOrder ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)' }}>
            <Activity size={32} style={{ margin: '0 auto 10px', color: 'var(--emerald-primary)' }} />
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--slate-900)' }}>Driver Cockpit Standing By</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>GPS beacon live. Awaiting incoming client rapid charge dispatch orders.</div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span className="brand-pill" style={{ background: 'var(--emerald-light)', color: 'var(--emerald-darker)' }}>
                  ● Dispatch Status: {activeOrder.status}
                </span>
                <div style={{ fontWeight: 900, fontSize: '17px', marginTop: '4px' }}>
                  {activeOrder.target_address || 'London City Road'}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ESTIMATED FARE</div>
                <div style={{ fontWeight: 900, fontSize: '16px', color: 'var(--emerald-darker)' }}>
                  £{activeOrder.estimated_total_amount ? activeOrder.estimated_total_amount.toFixed(2) : '17.25'}
                </div>
              </div>
            </div>

            {/* CHARGING ACTIVE VIEW */}
            {activeOrder.status === 'CHARGING' && (
              <div style={{ background: 'var(--slate-900)', color: '#fff', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={18} color="#10b981" />
                    <span style={{ fontWeight: 800, fontSize: '14px' }}>Active 150 kW Rapid DC Dispense</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#10b981', fontFamily: 'var(--font-mono)' }}>{chargingKw} kW Active</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>DELIVERED</div>
                    <div style={{ fontWeight: 900, fontSize: '16px', fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                      {deliveredKwh.toFixed(2)} kWh
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>VEHICLE BATTERY</div>
                    <div style={{ fontWeight: 900, fontSize: '16px', fontFamily: 'var(--font-mono)' }}>
                      {batteryPct}%
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>CURRENT RATE</div>
                    <div style={{ fontWeight: 900, fontSize: '16px', fontFamily: 'var(--font-mono)', color: '#0284c7' }}>
                      £{activeTariff ? activeTariff.per_kwh_rate.toFixed(2) : '0.35'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {activeOrder.status === 'EN_ROUTE' && (
                <button className="btn-emerald" onClick={handleArrived}>
                  <CheckCircle2 size={16} /> Mark Arrived on Scene
                </button>
              )}
              {activeOrder.status === 'ARRIVED' && (
                <button className="btn-emerald" onClick={handleStartCharging}>
                  <Zap size={16} /> Connect Cable & Begin Rapid Charge
                </button>
              )}
              {activeOrder.status === 'CHARGING' && (
                <button className="btn-emerald" style={{ background: 'var(--slate-900)' }} onClick={handleCompleteCharge}>
                  <Square size={16} fill="#fff" /> Stop & Finalize Dispatch Session
                </button>
              )}
            </div>
          </div>
        )}
      </MobileSheet>

      {/* INCOMING DISPATCH MODAL */}
      <Modal isOpen={showIncomingModal} onClose={() => setShowIncomingModal(false)} title="New Rapid Charge Dispatch Alert">
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ width: '56px', height: '56px', background: 'var(--emerald-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--emerald-dark)' }}>
            <BellRing size={28} />
          </div>
          <div style={{ fontWeight: 900, fontSize: '18px', marginBottom: '4px' }}>Rapid Charge Request Near You</div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Location: <b>{activeOrder?.target_address}</b>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-outline" style={{ flex: 1 }} onClick={() => setShowIncomingModal(false)}>
              Decline
            </button>
            <button className="btn-emerald" style={{ flex: 2 }} onClick={handleAcceptJob}>
              Accept & Mobilize
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
